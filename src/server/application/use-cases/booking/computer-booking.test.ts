import { describe, it, expect, vi } from "vitest";
import { BookingRequest } from "../../../domain/entities/BookingRequest";
import { Computer } from "../../../domain/entities/Computer";
import { LabProfile } from "../../../domain/entities/LabProfile";
import { CreateBookingUseCase } from "./CreateBookingUseCase";
import { ApproveBookingUseCase } from "./ApproveBookingUseCase";
import { CheckAvailabilityUseCase } from "./CheckAvailabilityUseCase";
import { CheckInBookingUseCase } from "./CheckInBookingUseCase";
import { CheckOutBookingUseCase } from "./CheckOutBookingUseCase";
import { GetComputerBookingHistoryUseCase } from "./GetComputerBookingHistoryUseCase";
import { UniqueEntityId } from "../../../domain/value-objects/UniqueEntityId";

const PC = "10000000-0000-4000-8000-000000000001";
const OTHER_PC = "10000000-0000-4000-8000-000000000002";
const PERSON = "20000000-0000-4000-8000-000000000001";
const STAFF = "20000000-0000-4000-8000-000000000002";
function fixture() {
  const item = {
    computerId: PC,
    computerCode: "PC-01",
    computerName: "Máy 01",
    requesterId: PERSON,
    requesterName: "Người đăng ký",
    requesterUsername: "student",
    requesterEmail: "student@example.edu.vn",
    receivedAt: null as Date | null,
    returnedAt: null as Date | null,
  };
  const booking = BookingRequest.create({
    requestCode: "BR-TEST",
    requesterId: PERSON,
    bookingType: "COMPUTERS_ONLY",
    purpose: "Thực hành IoT",
    startTime: new Date(Date.now() + 5 * 60000),
    endTime: new Date(Date.now() + 60 * 60000),
    numberOfComputers: 1,
    numberOfPeople: 1,
    status: "APPROVED",
    computerItems: [item],
  });
  const computer = Computer.create(
    { code: "PC-01", name: "Máy 01", status: "ACTIVE" },
    new UniqueEntityId(PC),
  );
  const transaction = {};
  const repo = {
    findById: vi.fn(async () => booking),
    save: vi.fn(),
    lockAvailability: vi.fn(),
  };
  const computers = {
    findById: vi.fn(async () => computer),
    save: vi.fn(),
    countActive: vi.fn(async () => 2),
    list: vi.fn(async () => ({ data: [], total: 0 })),
  };
  const assignments = {
    listAvailability: vi.fn(async () => [
      {
        id: PC,
        code: "PC-01",
        name: "Máy 01",
        position: null,
        status: "ACTIVE",
        available: true,
      },
      {
        id: OTHER_PC,
        code: "PC-02",
        name: "Máy 02",
        position: null,
        status: "ACTIVE",
        available: true,
      },
    ]),
    saveSelection: vi.fn(),
    findByBooking: vi.fn(async () => [item]),
    recordReceipt: vi.fn(),
    recordReturn: vi.fn(),
    history: vi.fn(async () => ({ data: [], total: 0 })),
  };
  const uow = {
    complete: async (fn: () => Promise<unknown>) => fn(),
    getTransaction: () => transaction,
  };
  const audit = { save: vi.fn() };
  const equipment = {
    findByBookingId: vi.fn(async () => []),
    saveMany: vi.fn(),
  };
  const logs = {
    checkIn: vi.fn(async () => ({ checkInTime: new Date() })),
    checkOut: vi.fn(async () => ({ checkOutTime: new Date() })),
  };
  const activity = {
    transition: vi.fn(),
    closeUsageByBooking: vi.fn(),
    findActiveUsageByBooking: vi.fn(async () => []),
  };
  const lab = LabProfile.create({
    labCode: "LAB",
    labName: "Lab",
    location: "LHU",
    status: "ACTIVE",
    capacity: 40,
  });
  const overlap = {
    hasFullLabBooking: false,
    totalReservedComputers: 0,
    reservedEquipments: {},
    conflicts: [],
  };
  const check = new CheckAvailabilityUseCase(
    { get: async () => lab } as never,
    computers as never,
    { findById: async (id: string) => ({ id: new UniqueEntityId(id), isLendable: true, status: "ACTIVE", totalQuantity: 10, availableQuantity: 10, brokenQuantity: 0, maintenanceQuantity: 0, lostQuantity: 0 }) } as never,
    { getOverlappingBookings: async () => overlap } as never,
    assignments as never,
  );
  const create = new CreateBookingUseCase(
    repo as never,
    equipment as never,
    check,
    uow as never,
    audit as never,
    {
      findById: async () => ({ status: "ACTIVE", fullName: "Người đăng ký" }),
    } as never,
    undefined,
    assignments as never,
  );
  const checkIn = new CheckInBookingUseCase(
    repo as never,
    logs as never,
    computers as never,
    activity as never,
    uow as never,
    audit as never,
    {} as never,
    equipment as never,
    assignments as never,
  );
  const checkOut = new CheckOutBookingUseCase(
    repo as never,
    logs as never,
    computers as never,
    activity as never,
    uow as never,
    audit as never,
    assignments as never,
  );
  const input = {
    actorUserId: PERSON,
    actorRoles: ["STUDENT"],
    actorPermissions: ["BOOKING_CREATE"],
    bookingType: "COMPUTERS_ONLY" as const,
    purpose: "Thực hành IoT",
    startTime: booking.startTime,
    endTime: booking.endTime,
    numberOfPeople: 1,
    numberOfComputers: 1,
    computerIds: [PC],
    equipments: [],
  };
  return {
    item,
    booking,
    computer,
    repo,
    computers,
    assignments,
    uow,
    audit,
    equipment,
    logs,
    activity,
    overlap,
    check,
    create,
    checkIn,
    checkOut,
    input,
    transaction,
  };
}

describe("Booking individual computers", () => {
  it.each(["STUDENT", "TEACHER"])("allows %s to request a machine with borrowed equipment", async (role) => {
    const f = fixture();
    const equipmentId = "30000000-0000-4000-8000-000000000001";
    const result = await f.create.execute({ ...f.input, actorRoles: [role], equipments: [{ equipmentId, quantity: 2 }] });
    expect(result.status).toBe("PENDING");
    expect(f.assignments.saveSelection).toHaveBeenCalled();
    const items = f.equipment.saveMany.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0].equipmentId).toBe(equipmentId);
    expect(items[0].requestedQuantity).toBe(2);
  });
  it.each(["STUDENT", "TEACHER"])("allows %s to borrow equipment without a computer", async (role) => {
    const f = fixture();
    const result = await f.create.execute({ ...f.input, actorRoles: [role], bookingType: "EQUIPMENT_ONLY", computerIds: [], numberOfComputers: 0, equipments: [{ equipmentId: "30000000-0000-4000-8000-000000000001", quantity: 1 }] });
    expect(result.status).toBe("PENDING");
    expect(f.assignments.saveSelection).not.toHaveBeenCalled();
    expect(f.equipment.saveMany).toHaveBeenCalled();
  });
  it("saves the selected machine with the authenticated requester in the booking transaction", async () => {
    const f = fixture();
    const result = await f.create.execute(f.input);
    expect(result.status).toBe("PENDING");
    expect(f.assignments.saveSelection).toHaveBeenCalledWith(
      result.id.toString(),
      [PC],
      PERSON,
      PERSON,
      f.transaction,
    );
    expect(result.computerItems[0].computerCode).toBe("PC-01");
  });
  it("does not let a student name another person as requester", async () => {
    const f = fixture();
    await expect(
      f.create.execute({ ...f.input, requesterId: STAFF }),
    ).rejects.toThrow("không có quyền");
    expect(f.assignments.saveSelection).not.toHaveBeenCalled();
  });
  it.each([{ ids: [] }, { ids: [PC, PC] }, { ids: [PC.toUpperCase(), PC] }])(
    "rejects missing, mismatched or duplicate machine IDs ($ids)",
    async ({ ids }) => {
      const f = fixture();
      await expect(
        f.create.execute({ ...f.input, computerIds: ids }),
      ).rejects.toThrow();
      expect(f.repo.save).not.toHaveBeenCalled();
    },
  );
  it("rejects the requested PC even when another PC is available", async () => {
    const f = fixture();
    f.assignments.listAvailability.mockResolvedValueOnce([
      {
        id: OTHER_PC,
        code: "PC-02",
        name: "Máy 02",
        position: null,
        status: "ACTIVE",
        available: true,
      },
    ]);
    await expect(f.create.execute(f.input)).rejects.toThrow("Một máy");
  });
  it("rechecks the exact IDs while approving", async () => {
    const f = fixture();
    f.booking.props.status = "PENDING";
    f.assignments.listAvailability.mockResolvedValueOnce([
      {
        id: PC,
        code: "PC-01",
        name: "Máy 01",
        position: null,
        status: "ACTIVE",
        available: false,
      },
    ]);
    const approve = new ApproveBookingUseCase(
      f.repo as never,
      f.equipment as never,
      f.check,
      f.uow as never,
      f.audit as never,
    );
    await expect(
      approve.execute(f.booking.id.toString(), STAFF),
    ).rejects.toThrow("Một máy");
    expect(f.repo.lockAvailability).toHaveBeenCalled();
    expect(f.repo.save).not.toHaveBeenCalled();
  });
  it("does not hand over another PC under the same booking", async () => {
    const f = fixture();
    await expect(
      f.checkIn.execute({
        bookingId: "booking",
        userId: STAFF,
        computerIds: [OTHER_PC],
        initialCondition: "Đủ phụ kiện",
      }),
    ).rejects.toThrow("đúng mã máy");
    expect(f.logs.checkIn).not.toHaveBeenCalled();
  });
  it.each(["PENDING", "COMPLETED"] as const)(
    "rejects receipt in %s state",
    async (status) => {
      const f = fixture();
      f.booking.props.status = status;
      await expect(
        f.checkIn.execute({
          bookingId: "booking",
          userId: STAFF,
          initialCondition: "Đủ phụ kiện",
        }),
      ).rejects.toThrow("đã được duyệt");
    },
  );
  it("rejects receipt before the permitted window and after the end", async () => {
    for (const offset of [60, -120]) {
      const f = fixture();
      f.booking.props.startTime = new Date(Date.now() + offset * 60000);
      f.booking.props.endTime = new Date(
        f.booking.startTime.getTime() + 60 * 60000,
      );
      await expect(
        f.checkIn.execute({
          bookingId: "booking",
          userId: STAFF,
          initialCondition: "Đủ phụ kiện",
        }),
      ).rejects.toThrow("15 phút");
    }
  });
  it("records actual receipt and staff identity, linked to the selected booking", async () => {
    const f = fixture();
    const result = await f.checkIn.execute({
      bookingId: "booking",
      userId: STAFF,
      initialCondition: "Chuột, bàn phím đủ; màn hình tốt",
    });
    expect(result.computerIds).toEqual([PC]);
    expect(f.computer.status).toBe("IN_USE");
    expect(f.assignments.recordReceipt).toHaveBeenCalledWith(
      f.booking.id.toString(),
      expect.any(Date),
      f.transaction,
    );
    expect(f.logs.checkIn).toHaveBeenCalledWith(
      expect.objectContaining({
        checkedInBy: STAFF,
        initialCondition: "Chuột, bàn phím đủ; màn hình tốt",
      }),
      f.transaction,
    );
  });
  it("returns the assigned PC even if the monitoring activity log was interrupted", async () => {
    const f = fixture();
    f.booking.props.status = "CHECKED_IN";
    f.computer.changeStatus("IN_USE");
    f.item.receivedAt = new Date();
    const result = await f.checkOut.execute({
      bookingId: "booking",
      userId: STAFF,
      returnCondition: "Đủ phụ kiện, không hỏng",
    });
    expect(result.computerIds).toEqual([PC]);
    expect(f.computer.status).toBe("ACTIVE");
    expect(f.assignments.recordReturn).toHaveBeenCalledWith(
      f.booking.id.toString(),
      expect.any(Date),
      f.transaction,
    );
    expect(f.logs.checkOut).toHaveBeenCalledWith(
      expect.objectContaining({
        checkedOutBy: STAFF,
        returnCondition: "Đủ phụ kiện, không hỏng",
      }),
      f.transaction,
    );
  });
  it("requires a condition record at receipt and return", async () => {
    const f = fixture();
    await expect(
      f.checkIn.execute({ bookingId: "booking", userId: STAFF }),
    ).rejects.toThrow("tình trạng");
    f.booking.props.status = "CHECKED_IN";
    await expect(
      f.checkOut.execute({ bookingId: "booking", userId: STAFF }),
    ).rejects.toThrow("tình trạng");
  });
  it("preserves broken status when a PC is returned", async () => {
    const f = fixture();
    f.booking.props.status = "CHECKED_IN";
    f.computer.changeStatus("BROKEN");
    f.item.receivedAt = new Date();
    await f.checkOut.execute({
      bookingId: "booking",
      userId: STAFF,
      returnCondition: "Màn hình hỏng, đã báo sự cố",
    });
    expect(f.computer.status).toBe("BROKEN");
    expect(f.computers.save).not.toHaveBeenCalled();
  });
  it.each([["STUDENT"], ["TEACHER"]])(
    "hides other users machine history from %s",
    async (role) => {
      const f = fixture();
      const history = new GetComputerBookingHistoryUseCase(
        f.assignments as never,
      );
      await expect(history.execute(PC, 1, [role])).rejects.toThrow(
        "Chỉ nhân sự",
      );
      expect(f.assignments.history).not.toHaveBeenCalled();
    },
  );
  it("allows authorized lab staff to inspect history", async () => {
    const f = fixture();
    await new GetComputerBookingHistoryUseCase(f.assignments as never).execute(
      PC,
      1,
      ["LAB_STAFF"],
    );
    expect(f.assignments.history).toHaveBeenCalledWith(PC, 1);
  });
});
