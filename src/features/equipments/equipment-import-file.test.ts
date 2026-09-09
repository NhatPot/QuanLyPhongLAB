import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  createEquipmentTemplate,
  readEquipmentFile,
} from "./equipment-import-file";

const categories = [{ id: "cat-1", code: "IOT", name: "Thiết bị IoT" }];
describe("Excel template and file import roundtrip", () => {
  it("exports styled input, live category validation and a separate guide", async () => {
    const book = createEquipmentTemplate(categories);
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(await book.xlsx.writeBuffer());
    expect(loaded.worksheets.map((s) => s.name)).toEqual([
      "Nhap thiet bi",
      "Danh muc",
      "Huong dan",
    ]);
    const sheet = loaded.worksheets[0];
    expect(sheet.views[0]).toMatchObject({
      state: "frozen",
      ySplit: 6,
      showGridLines: false,
    });
    expect(sheet.getCell("A7").dataValidation.formulae).toEqual([
      "EquipmentCategoryCodes",
    ]);
    expect(loaded.getWorksheet("Danh muc")?.getCell("A5").value).toBe("IOT");
    expect(sheet.getCell("C6").font.bold).toBe(true);
    expect(sheet.getCell("B7").numFmt).toBe("@");
    expect(sheet.getCell("D7").value).toBeNull();
  });
  it("imports filled template without importing guide examples or styled blank rows", async () => {
    const book = createEquipmentTemplate(categories);
    book.worksheets[0].getRow(7).values = [
      "IOT",
      "0001",
      "Bộ kit ESP32",
      12,
      "Tủ A",
      "",
      "Kèm cáp",
    ];
    const file = new File(
      [new Uint8Array(await book.xlsx.writeBuffer())],
      "equipment.xlsx",
    );
    const rows = await readEquipmentFile(file);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      row: 7,
      quantity: 12,
      code: "0001",
      status: "ACTIVE",
      note: "Kèm cáp",
    });
  });
  it("rejects formula cells rather than trusting cached results", async () => {
    const book = createEquipmentTemplate(categories);
    book.worksheets[0].getRow(7).values = [
      "IOT",
      "",
      "ESP32",
      { formula: "1+1", result: 2 },
    ];
    await expect(
      readEquipmentFile(
        new File([new Uint8Array(await book.xlsx.writeBuffer())], "test.xlsx"),
      ),
    ).rejects.toThrow("D7");
  });
  it("rejects blank template, unsupported extensions and oversized files", async () => {
    const book = createEquipmentTemplate(categories);
    await expect(
      readEquipmentFile(
        new File([new Uint8Array(await book.xlsx.writeBuffer())], "blank.xlsx"),
      ),
    ).rejects.toThrow("1 đến 500");
    await expect(readEquipmentFile(new File(["x"], "old.xls"))).rejects.toThrow(
      ".xlsx",
    );
    await expect(
      readEquipmentFile(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.csv"),
      ),
    ).rejects.toThrow("5 MB");
  });
  it("reads CSV UTF-8 with Vietnamese and leading-zero codes", async () => {
    const file = new File(
      ["\uFEFFMã danh mục,Mã thiết bị,Tên thiết bị\r\nIOT,0009,Thiết bị ESP32"],
      "list.csv",
    );
    expect((await readEquipmentFile(file))[0]).toMatchObject({
      code: "0009",
      name: "Thiết bị ESP32",
      quantity: 1,
    });
  });
});
