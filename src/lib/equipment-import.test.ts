import { describe, expect, it } from "vitest";
import {
  IMPORT_HEADERS,
  matrixToImportRows,
  parseCsv,
  planEquipmentImport,
  type ImportRow,
} from "./equipment-import";

const categories = [{ id: "cat-1", code: "IOT", name: "Thiết bị IoT" }];
const row: ImportRow = {
  row: 7,
  category: "IOT",
  code: "",
  name: "ESP32",
  quantity: 1,
  location: "",
  status: "ACTIVE",
  note: "",
};
describe("equipment import validation and allocation", () => {
  it("uses existing category codes/names and preserves explicit codes", () => {
    const result = planEquipmentImport(
      [{ ...row, category: "thiết bị iot", code: "00012" }],
      categories,
      [],
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0].code).toBe("00012");
    expect(result.rows[0].categoryId).toBe("cat-1");
  });
  it("reserves explicit, existing and soft-deleted codes before allocating", () => {
    const result = planEquipmentImport(
      [row, { ...row, row: 8, code: "IOT-003" }, { ...row, row: 9 }],
      categories,
      ["IOT-001", "IOT-002"],
    );
    expect(result.rows.map((r) => r.code)).toEqual([
      "IOT-004",
      "IOT-003",
      "IOT-005",
    ]);
  });
  it("handles very large numeric suffixes without rounding or looping", () => {
    expect(
      planEquipmentImport([row], categories, ["IOT-9007199254740992"]).rows[0]
        .code,
    ).toBe("IOT-9007199254740993");
  });
  it("rejects duplicate codes case/accent insensitively and never upserts", () => {
    expect(
      planEquipmentImport([{ ...row, code: "á-1" }], categories, ["A-1"])
        .errors,
    ).toHaveLength(1);
    expect(
      planEquipmentImport(
        [
          { ...row, code: "X" },
          { ...row, row: 8, code: "x" },
        ],
        categories,
        [],
      ).errors[0].row,
    ).toBe(8);
  });
  it("rejects unknown and ambiguous categories", () => {
    expect(
      planEquipmentImport([{ ...row, category: "missing" }], categories, [])
        .errors,
    ).toHaveLength(1);
    expect(
      planEquipmentImport(
        [{ ...row, category: "Thiết bị IoT" }],
        [...categories, { ...categories[0], id: "cat-2", code: "IOT2" }],
        [],
      ).errors,
    ).toHaveLength(1);
  });
  it.each([0, -1, 1.5, NaN, 2147483648])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(
        planEquipmentImport([{ ...row, quantity }], categories, []).errors,
      ).toHaveLength(1);
    },
  );
  it("rejects invalid fields and empty/oversized files", () => {
    for (const rows of [
      [],
      Array(501).fill(row),
      [{ ...row, name: "" }],
      [{ ...row, code: "a".repeat(51) }],
      [{ ...row, status: "wrong" }],
    ])
      expect(
        planEquipmentImport(rows, categories, []).errors.length,
      ).toBeGreaterThan(0);
  });
});
describe("CSV and matrix parsing", () => {
  it("supports BOM, quoted commas, escaped quotes, multiline and CRLF", () => {
    expect(parseCsv('\uFEFFa,b\r\n"ESP,32","USB ""C""\nline"\r\n')).toEqual([
      ["a", "b"],
      ["ESP,32", 'USB "C"\nline'],
    ]);
  });
  it.each([";", "\t"])("supports delimiter %s", (delimiter) => {
    expect(
      parseCsv(["a", "b"].join(delimiter) + "\n1" + delimiter + "2"),
    ).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("rejects malformed quotes", () => {
    expect(() => parseCsv('a,b\n"unclosed,x')).toThrow();
    expect(() => parseCsv('a,b\n"value"oops,1')).toThrow();
  });
  it("finds template header and defaults quantity and status", () => {
    const result = matrixToImportRows([
      ["Title"],
      IMPORT_HEADERS,
      ["IOT", "0001", "ESP32"],
      ["", "", ""],
    ]);
    expect(result[0]).toMatchObject({
      row: 3,
      code: "0001",
      quantity: 1,
      status: "ACTIVE",
    });
  });
  it("rejects wrong headers and unlabelled nonempty columns", () => {
    for (const matrix of [
      [["Bad header"]],
      [
        [...IMPORT_HEADERS, "Other"],
        ["IOT", "", "ESP"],
      ],
      [IMPORT_HEADERS, ["IOT", "", "ESP", "", "", "", "", "extra"]],
    ])
      expect(() => matrixToImportRows(matrix)).toThrow();
  });
  it("does not treat invalid or zero quantities as default one", () => {
    for (const quantity of ["0", "-2", "1.5", "1,000", "abc"]) {
      const parsed = matrixToImportRows([
        IMPORT_HEADERS,
        ["IOT", "", "ESP32", quantity],
      ]);
      expect(planEquipmentImport(parsed, categories, []).errors).toHaveLength(
        1,
      );
    }
  });
});
