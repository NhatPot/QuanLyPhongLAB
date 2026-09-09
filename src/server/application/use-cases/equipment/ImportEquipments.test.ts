import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  begin: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  on: vi.fn(),
  query: vi.fn(),
  save: vi.fn(),
  audit: vi.fn(),
  transactions: [] as unknown[],
}));
vi.mock("mssql", () => ({
  default: {
    ISOLATION_LEVEL: { SERIALIZABLE: 4 },
    Transaction: class {
      begin = mocks.begin;
      commit = mocks.commit;
      rollback = mocks.rollback;
      on = mocks.on;
    },
    Request: class {
      constructor(transaction: unknown) {
        mocks.transactions.push(transaction);
      }
      query = mocks.query;
    },
  },
}));
vi.mock("../../../infrastructure/database/sqlserver/connection", () => ({
  SqlConnectionFactory: { getPool: vi.fn(async () => ({})) },
}));
vi.mock(
  "../../../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository",
  () => ({
    SqlEquipmentRepository: class {
      save = mocks.save;
    },
  }),
);
vi.mock(
  "../../../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository",
  () => ({
    SqlAuditLogRepository: class {
      save = mocks.audit;
    },
  }),
);
import { importEquipments } from "./ImportEquipments";
import type { ImportRow } from "../../../../lib/equipment-import";
const row: ImportRow = {
  row: 7,
  category: "IOT",
  name: "ESP32",
  code: "",
  quantity: 3,
  location: "",
  status: "ACTIVE",
  note: "",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transactions.length = 0;
  mocks.rollback.mockResolvedValue(undefined);
  mocks.query
    .mockResolvedValueOnce({
      recordset: [{ id: "cat-1", code: "IOT", name: "IoT" }],
    })
    .mockResolvedValueOnce({ recordset: [{ code: "IOT-001" }] });
});
describe("atomic equipment import", () => {
  it("preview never writes and rolls back its locks", async () => {
    const result = await importEquipments([row], false, "actor");
    expect(result.rows[0].code).toBe("IOT-002");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.rollback).toHaveBeenCalledOnce();
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it("uses the same serializable transaction for equipment and audit writes", async () => {
    const result = await importEquipments(
      [row, { ...row, row: 8 }],
      true,
      "actor",
    );
    expect(result.imported).toBe(2);
    expect(mocks.begin).toHaveBeenCalledWith(4);
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.save.mock.calls[0][0].availableQuantity).toBe(3);
    expect(mocks.save.mock.calls[0][1]).toBe(mocks.transactions[0]);
    expect(mocks.audit.mock.calls[0][1]).toBe(mocks.transactions[0]);
    expect(mocks.commit).toHaveBeenCalledOnce();
    expect(mocks.rollback).not.toHaveBeenCalled();
  });
  it("rejects the entire file when one row is invalid", async () => {
    const result = await importEquipments(
      [row, { ...row, row: 8, quantity: 0 }],
      true,
      "actor",
    );
    expect(result.errors[0].row).toBe(8);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });
  it("rolls back already staged equipment if a later insert fails", async () => {
    mocks.save
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("unique constraint"));
    await expect(
      importEquipments([row, { ...row, row: 8 }], true, "actor"),
    ).rejects.toThrow("unique constraint");
    expect(mocks.save).toHaveBeenCalledTimes(2);
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });
  it("rolls back all equipment if the audit write fails", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("audit failure"));
    await expect(importEquipments([row], true, "actor")).rejects.toThrow(
      "audit failure",
    );
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.rollback).toHaveBeenCalledOnce();
  });
});
