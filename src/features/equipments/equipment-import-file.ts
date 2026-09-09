import ExcelJS from "exceljs";
import {
  IMPORT_HEADERS,
  MAX_IMPORT_ROWS,
  matrixToImportRows,
  parseCsv,
  type ImportCategory,
} from "../../lib/equipment-import";

export async function readEquipmentFile(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("File vượt quá 5 MB. Hãy chia nhỏ file trước khi nhập.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
    return matrixToImportRows(parseCsv(text));
  }
  if (extension !== "xlsx")
    throw new Error(
      "Chỉ hỗ trợ .xlsx và .csv UTF-8. Với file .xls, hãy Save As thành .xlsx.",
    );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet =
    workbook.getWorksheet("Nhap thiet bi") || workbook.worksheets[0];
  if (!sheet) throw new Error("File Excel không có trang dữ liệu.");
  if (sheet.rowCount > MAX_IMPORT_ROWS + 20 || sheet.columnCount > 30)
    throw new Error(
      "Trang dữ liệu quá lớn. Dùng mẫu và nhập tối đa 500 dòng mỗi lần.",
    );
  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let col = 1; col <= sheet.columnCount; col++) {
      const cell = row.getCell(col);
      const value = cell.value;
      if (value && typeof value === "object") {
        if (
          "formula" in value ||
          "sharedFormula" in value ||
          "error" in value ||
          value instanceof Date
        ) {
          throw new Error(
            `Ô ${cell.address}: dùng giá trị trực tiếp, không dùng công thức, ngày tháng hoặc ô lỗi.`,
          );
        }
      }
      cells.push(cell.text);
    }
    matrix.push(cells);
  });
  return matrixToImportRows(matrix);
}

export function createEquipmentTemplate(categories: ImportCategory[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LHU IT LAB";
  workbook.created = new Date();
  const navy = "123654",
    blue = "245DDD",
    ink = "17324D",
    muted = "486178";
  const sheet = workbook.addWorksheet("Nhap thiet bi", {
    views: [
      { state: "frozen", ySplit: 6, showGridLines: false, zoomScale: 85 },
    ],
  });
  sheet.columns = [24, 24, 40, 14, 28, 20, 46].map((width) => ({ width }));
  sheet.mergeCells("A1:G2");
  sheet.getCell("A1").value = "LHU IT LAB   /   NHẬP DANH SÁCH THIẾT BỊ";
  sheet.getCell("A1").font = {
    name: "Calibri",
    size: 22,
    bold: true,
    color: { argb: "FFFFFF" },
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: navy },
  };
  sheet.getCell("A1").alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 26;
  for (const [r, text] of [
    [
      3,
      "Bắt đầu từ dòng 7. Bắt buộc: Mã danh mục và Tên thiết bị. Mỗi dòng là một loại thiết bị, số lượng là số chiếc.",
    ],
    [
      4,
      "Mã thiết bị để trống: tự cấp mã. Số lượng để trống: 1. Trạng thái để trống: ACTIVE. Không ghi đè mã đã có.",
    ],
    [
      5,
      "Chọn mã danh mục bằng danh sách xổ xuống. Xem sheet Danh muc và Huong dan. Tối đa 500 dòng / file.",
    ],
  ] as const) {
    sheet.mergeCells(`A${r}:G${r}`);
    sheet.getCell(`A${r}`).value = text;
    sheet.getCell(`A${r}`).font = {
      name: "Calibri",
      size: 12,
      color: { argb: muted },
    };
    sheet.getCell(`A${r}`).alignment = {
      vertical: "middle",
      indent: 1,
      wrapText: true,
    };
    sheet.getRow(r).height = 25;
  }
  sheet.getRow(6).values = IMPORT_HEADERS;
  sheet.getRow(6).height = 32;
  sheet.getRow(6).eachCell((cell, col) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col === 1 || col === 3 ? blue : navy },
    };
    cell.font = {
      name: "Calibri",
      size: 12,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    cell.alignment = { vertical: "middle", indent: 1 };
  });
  const catalog = workbook.addWorksheet("Danh muc", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 4 }],
  });
  catalog.columns = [{ width: 26 }, { width: 48 }, { width: 55 }];
  catalog.mergeCells("A1:C2");
  catalog.getCell("A1").value = "DANH MỤC THIẾT BỊ HIỆN CÓ";
  catalog.mergeCells("A3:C3");
  catalog.getCell("A3").value =
    "Nguồn: danh mục trong hệ thống tại thời điểm tải mẫu. Dùng mã ở cột A.";
  catalog.getRow(4).values = ["Mã danh mục", "Tên danh mục", "Cách sử dụng"];
  categories.forEach((category, i) =>
    catalog.addRow([
      category.code,
      category.name,
      i === 0 ? "Chọn mã này trong cột Mã danh mục ở sheet Nhap thiet bi." : "",
    ]),
  );
  if (categories.length)
    workbook.definedNames.add(
      `'Danh muc'!$A$5:$A$${categories.length + 4}`,
      "EquipmentCategoryCodes",
    );
  for (let r = 7; r <= MAX_IMPORT_ROWS + 6; r++) {
    const row = sheet.getRow(r);
    row.height = 28;
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Calibri", size: 12, color: { argb: ink } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: r % 2 ? "F0F6FF" : "FFFFFF" },
      };
      cell.border = { bottom: { style: "hair", color: { argb: "DCE6F0" } } };
      cell.alignment = { vertical: "middle", indent: 1, wrapText: true };
      cell.numFmt = c === 4 ? "0" : "@";
    }
    if (categories.length)
      row.getCell(1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ["EquipmentCategoryCodes"],
        showErrorMessage: true,
        errorTitle: "Mã danh mục chưa hợp lệ",
        error: "Chọn mã từ danh sách có sẵn.",
        errorStyle: "stop",
      };
    row.getCell(4).dataValidation = {
      type: "whole",
      operator: "between",
      formulae: [1, 2147483647],
      allowBlank: true,
      showErrorMessage: true,
      error: "Nhập số nguyên từ 1.",
      errorStyle: "stop",
    };
    row.getCell(6).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"ACTIVE,LOCKED,INACTIVE"'],
      showErrorMessage: true,
      error: "Chọn ACTIVE, LOCKED hoặc INACTIVE.",
      errorStyle: "stop",
    };
  }
  sheet.autoFilter = "A6:G506";
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:6",
    printArea: "A1:G26",
  };
  const guide = workbook.addWorksheet("Huong dan", {
    views: [{ showGridLines: false }],
  });
  guide.columns = [{ width: 26 }, { width: 68 }, { width: 44 }];
  guide.mergeCells("A1:C2");
  guide.getCell("A1").value = "HƯỚNG DẪN NHẬP THIẾT BỊ";
  guide.mergeCells("A3:C3");
  guide.getCell("A3").value =
    "Chỉ sheet Nhap thiet bi được nhập. Các ví dụ dưới đây chỉ để tham khảo, không được tự nhập vào hệ thống.";
  guide.getRow(4).values = ["Trường dữ liệu", "Cách nhập", "Ví dụ minh họa"];
  const exampleCode = categories[0]?.code || "(mã danh mục của bạn)";
  [
    [
      "Mã danh mục • bắt buộc",
      "Chọn mã trong danh sách xổ xuống. Không tạo danh mục mới khi nhập file.",
      exampleCode,
    ],
    [
      "Mã thiết bị • tùy chọn",
      "Để trống để tự cấp theo mã danh mục. Mã tự nhập phải duy nhất, tối đa 50 ký tự. Giữ định dạng Text để không mất số 0 đầu.",
      "IOT-001 hoặc để trống",
    ],
    [
      "Tên thiết bị • bắt buộc",
      "Tên loại thiết bị, tối đa 255 ký tự.",
      "Kit phát triển ESP32",
    ],
    [
      "Số lượng",
      "Số nguyên từ 1. Bỏ trống sẽ lấy 1. Không phải số lượng cộng thêm cho mã đã tồn tại.",
      "10",
    ],
    ["Vị trí", "Không bắt buộc, tối đa 255 ký tự.", "Tủ A / Ngăn 2"],
    [
      "Trạng thái",
      "ACTIVE: kích hoạt. LOCKED: khóa. INACTIVE: không hoạt động. Bỏ trống sẽ lấy ACTIVE.",
      "ACTIVE",
    ],
    ["Ghi chú", "Không bắt buộc, tối đa 2.000 ký tự.", "Kèm cáp USB"],
    [
      "Kiểm tra và lưu",
      "Tải file lên, xem trước và sửa hết lỗi. Bấm Nhập thiết bị để lưu toàn bộ. File có lỗi sẽ không lưu dòng nào.",
      "Không dùng công thức trong file.",
    ],
    [
      "Định dạng file",
      "Excel .xlsx hoặc CSV UTF-8. CSV chỉ chứa hàng tiêu đề và dữ liệu, không chứa các dòng hướng dẫn.",
      "File .xls cần lưu lại thành .xlsx.",
    ],
    [
      "Mã bị trùng",
      "Không ghi đè hoặc cộng tồn kho. Nếu cần tăng tồn kho thiết bị đã có, sử dụng thao tác Kho.",
      "Không nhập lại file đã lưu thành công.",
    ],
  ].forEach((row) => guide.addRow(row));
  for (const tab of [catalog, guide]) {
    tab.getCell("A1").font = {
      name: "Calibri",
      size: 20,
      bold: true,
      color: { argb: "FFFFFF" },
    };
    tab.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: navy },
    };
    tab.getCell("A1").alignment = { vertical: "middle", indent: 1 };
    tab.getRow(1).height = 26;
    tab.getRow(2).height = 26;
    tab.getRow(3).height = 40;
    tab.getCell("A3").font = {
      name: "Calibri",
      size: 12,
      color: { argb: muted },
    };
    tab.getCell("A3").alignment = { vertical: "middle", wrapText: true };
    tab.getRow(4).height = 30;
    tab.getRow(4).eachCell((cell) => {
      cell.font = {
        name: "Calibri",
        bold: true,
        size: 12,
        color: { argb: "FFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: blue },
      };
      cell.alignment = { vertical: "middle", indent: 1 };
    });
    for (let r = 5; r <= tab.rowCount; r++) {
      tab.getRow(r).height = tab === guide ? 64 : 48;
      tab.getRow(r).eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Calibri", size: 12, color: { argb: ink } };
        cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: r % 2 ? "F0F6FF" : "FFFFFF" },
        };
      });
    }
  }
  return workbook;
}

export async function downloadEquipmentTemplate(
  categories: ImportCategory[],
  format: "xlsx" | "csv",
) {
  const data =
    format === "xlsx"
      ? new Uint8Array(
          await createEquipmentTemplate(categories).xlsx.writeBuffer(),
        )
      : "\uFEFF" + IMPORT_HEADERS.join(",") + "\r\n";
  const blob = new Blob([data], {
    type:
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Mau-nhap-thiet-bi.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
