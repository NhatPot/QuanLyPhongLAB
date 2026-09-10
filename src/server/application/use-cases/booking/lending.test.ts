import { describe, expect, it, vi } from "vitest";
import { Equipment } from "../../../domain/entities/Equipment";
import { LabProfile } from "../../../domain/entities/LabProfile";
import { IEquipmentRepository } from "../../../domain/repositories/IEquipmentRepository";
import { IEquipmentCategoryRepository } from "../../../domain/repositories/IEquipmentCategoryRepository";
import { IComputerRepository } from "../../../domain/repositories/IComputerRepository";
import { ILabProfileRepository } from "../../../domain/repositories/ILabProfileRepository";
import { IAvailabilityQueryService } from "../../../domain/services/IAvailabilityQueryService";
import { lendableQuantity } from "../../../domain/services/lending-availability";
import { CheckAvailabilityUseCase } from "./CheckAvailabilityUseCase";
import { GetLendingCatalogUseCase } from "./GetLendingCatalogUseCase";
import { GetEquipmentUseCase } from "../equipment/GetEquipmentUseCase";
import { canManageLabAssets } from "../../../../lib/lending-policy";
import { ApproveBookingUseCase } from "./ApproveBookingUseCase";
import { CheckInBookingUseCase } from "./CheckInBookingUseCase";

function fixture(isLendable = true) {
  const equipment = Equipment.create({
    code: "IOT-001",
    name: "ESP32",
    categoryId: "cat",
    isLendable,
    status: "ACTIVE",
    totalQuantity: 10,
    availableQuantity: 7,
    borrowedQuantity: 0,
    reservedQuantity: 0,
    brokenQuantity: 2,
    maintenanceQuantity: 1,
    lostQuantity: 0,
    note: "Internal note",
  });
  const list = vi.fn(async () => ({ data: [equipment], total: 1 }));
  const eqRepo = {
    findById: vi.fn(async () => equipment),
    list,
  } as unknown as IEquipmentRepository;
  const compRepo = {
    countActive: vi.fn(async () => 10),
    list: vi.fn(async () => ({ data: [], total: 3 })),
  } as unknown as IComputerRepository;
  const lab = LabProfile.create({
    labCode: "LAB",
    labName: "Lab",
    location: "LHU",
    capacity: 40,
    status: "ACTIVE",
  });
  const labRepo = {
    get: vi.fn(async () => lab),
  } as unknown as ILabProfileRepository;
  const overlap = {
    hasFullLabBooking: false,
    totalReservedComputers: 3,
    reservedEquipments: { [equipment.id.toString()]: 2 },
    conflicts: [],
  };
  const availability = {
    getOverlappingBookings: vi.fn(async () => overlap),
  } as IAvailabilityQueryService;
  const categoryRepo = {
    list: vi.fn(async () => []),
  } as unknown as IEquipmentCategoryRepository;
  const check = new CheckAvailabilityUseCase(
    labRepo,
    compRepo,
    eqRepo,
    availability,
  );
  const catalog = new GetLendingCatalogUseCase(
    eqRepo,
    categoryRepo,
    compRepo,
    labRepo,
    availability,
  );
  const input = {
    bookingType: "EQUIPMENT_ONLY" as const,
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 7200000),
    numberOfPeople: 1,
    numberOfComputers: 0,
    equipments: [{ equipmentId: equipment.id.toString(), quantity: 3 }],
  };
  return {
    equipment,
    eqRepo,
    compRepo,
    list,
    lab,
    overlap,
    check,
    catalog,
    input,
  };
}

describe("Equipment lending policy", () => {
  it("holds the approval lock before rechecking availability and saving", async () => {
    const events: string[] = [];
    const transaction = {};
    const booking = {
      id: { toString: () => "booking" },
      status: "PENDING",
      props: {},
      approve: vi.fn(),
    };
    const repo = {
      lockAvailability: vi.fn(async (tx) => {
        expect(tx).toBe(transaction);
        events.push("lock");
      }),
      findById: vi.fn(async () => {
        events.push("read");
        return booking;
      }),
      save: vi.fn(async () => {
        events.push("save");
      }),
    };
    const check = {
      execute: vi.fn(async () => {
        events.push("check");
        return { available: true };
      }),
    };
    const items = { findByBookingId: vi.fn(async () => []), saveMany: vi.fn() };
    const uow = {
      complete: async (fn: () => Promise<unknown>) => fn(),
      getTransaction: () => transaction,
    };
    const useCase = new ApproveBookingUseCase(
      repo as never,
      items as never,
      check as never,
      uow as never,
      { save: vi.fn() } as never,
    );
    await useCase.execute("booking", "admin");
    expect(events).toEqual(["lock", "read", "check", "save"]);
    check.execute.mockImplementationOnce(async () => ({
      available: false,
      reasons: [{ message: "Not lendable" }],
    }));
    repo.save.mockClear();
    await expect(useCase.execute("booking", "admin")).rejects.toThrow(
      "Not lendable",
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("does not hand over an approved item after it becomes internal", async () => {
    const f = fixture(false);
    const booking = {
      id: { toString: () => "booking" },
      numberOfPeople: 1,
      numberOfComputers: 0,
      computerItems: [],
      status: 'APPROVED',
      startTime: new Date(Date.now() + 60000),
      endTime: new Date(Date.now() + 3600000),
      checkIn: vi.fn(),
    };
    const repo = { findById: vi.fn(async () => booking), save: vi.fn(), lockAvailability: vi.fn() };
    const logs = { checkIn: vi.fn() };
    const uow = {
      complete: async (fn: () => Promise<unknown>) => fn(),
      getTransaction: () => ({}),
    };
    const useCase = new CheckInBookingUseCase(
      repo as never,
      logs as never,
      f.compRepo,
      {} as never,
      uow as never,
      { save: vi.fn() } as never,
      f.eqRepo,
      {
        findByBookingId: vi.fn(async () => [
          { equipmentId: f.equipment.id.toString() },
        ]),
      } as never,
    );
    await expect(
      useCase.execute({ bookingId: "booking", userId: "staff" }),
    ).rejects.toThrow("Không thể bàn giao");
    expect(logs.checkIn).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it("defaults unclassified equipment to internal", () => {
    const { equipment } = fixture();
    delete equipment.props.isLendable;
    expect(equipment.isLendable).toBe(false);
    expect(lendableQuantity(equipment, 0)).toBe(0);
  });
  it.each([
    { roles: ["STUDENT"] },
    { roles: ["TEACHER"] },
    { roles: ["STUDENT", "TEACHER"] },
    { roles: [] },
  ])(
    "does not give internal visibility to borrower roles $roles",
    ({ roles }) => expect(canManageLabAssets(roles)).toBe(false),
  );
  it.each(["ADMIN", "LAB_STAFF", "MANAGER", "COLLABORATOR"])(
    "allows internal visibility for operational role %s",
    (role) => expect(canManageLabAssets([role])).toBe(true),
  );
  it("hides internal equipment by direct ID as well as in the catalog", async () => {
    const f = fixture(false);
    expect(
      (
        await new GetEquipmentUseCase(f.eqRepo).execute(
          f.equipment.id.toString(),
          true,
        )
      ).isFailure,
    ).toBe(true);
    expect(
      (
        await new GetEquipmentUseCase(f.eqRepo).execute(
          f.equipment.id.toString(),
          false,
        )
      ).isSuccess,
    ).toBe(true);
    expect((await f.catalog.execute(f.input)).data).toEqual([]);
  });
  it("rejects direct booking IDs for internal equipment without leaking the name", async () => {
    const f = fixture(false);
    const result = await f.check.execute(f.input);
    expect(result.available).toBe(false);
    expect(JSON.stringify(result)).not.toContain("ESP32");
  });
  it.each(["LOCKED", "INACTIVE"] as const)(
    "rejects equipment status %s",
    async (status) => {
      const f = fixture();
      f.equipment.props.status = status;
      expect((await f.check.execute(f.input)).available).toBe(false);
    },
  );
  it("subtracts scheduled peak usage and excludes broken, maintenance and lost stock", async () => {
    const f = fixture();
    expect((await f.check.execute(f.input)).equipments[0].available).toBe(5);
    f.input.equipments[0].quantity = 6;
    expect((await f.check.execute(f.input)).available).toBe(false);
  });
  it("returns only borrower-safe catalog fields, with server-side filtering", async () => {
    const f = fixture();
    const result = await f.catalog.execute(f.input);
    expect(f.list).toHaveBeenCalledWith(
      expect.objectContaining({ lendableOnly: true, status: "ACTIVE" }),
    );
    expect(result.data[0]).not.toHaveProperty("note");
    expect(result.data[0]).not.toHaveProperty("managerId");
    expect(result.data[0].availableQuantity).toBe(5);
  });
  it("does not subtract physically in-use computers twice", async () => {
    const f = fixture();
    expect((await f.catalog.execute(f.input)).computers.available).toBe(10);
    f.overlap.totalReservedComputers = 8;
    expect((await f.catalog.execute(f.input)).computers.available).toBe(5);
  });
  it("blocks computer requests during full-lab reservations", async () => {
    const f = fixture();
    f.overlap.hasFullLabBooking = true;
    expect((await f.catalog.execute(f.input)).computers.available).toBe(0);
    expect(
      (
        await f.check.execute({
          ...f.input,
          bookingType: "COMPUTERS_ONLY",
          numberOfComputers: 1,
          equipments: [],
        })
      ).available,
    ).toBe(false);
  });
  it("blocks registration when the lab is closed", async () => {
    const f = fixture();
    f.lab.changeStatus("INACTIVE");
    expect((await f.catalog.execute(f.input)).data[0].availableQuantity).toBe(
      0,
    );
    expect((await f.check.execute(f.input)).available).toBe(false);
  });
  it("rejects duplicate equipment rows and invalid quantities", async () => {
    const f = fixture();
    await expect(
      f.check.execute({
        ...f.input,
        equipments: [...f.input.equipments, ...f.input.equipments],
      }),
    ).rejects.toThrow("lặp");
    for (const quantity of [0, -1, 1.5])
      await expect(
        f.check.execute({
          ...f.input,
          equipments: [{ equipmentId: f.equipment.id.toString(), quantity }],
        }),
      ).rejects.toThrow("số lượng");
  });
  it("rejects past, invalid and reversed catalog periods", async () => {
    const f = fixture();
    for (const startTime of [
      new Date(0),
      new Date("invalid"),
      new Date(f.input.endTime.getTime() + 1),
    ])
      await expect(
        f.catalog.execute({ ...f.input, startTime }),
      ).rejects.toThrow("Chọn giờ");
  });
});
