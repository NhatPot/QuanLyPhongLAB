import { z } from "zod";

export const MAX_IMPORT_ROWS = 500;
export const IMPORT_HEADERS = [
  "Mã danh mục",
  "Mã thiết bị",
  "Tên thiết bị",
  "Số lượng",
  "Vị trí",
  "Trạng thái",
  "Ghi chú",
];
export const importRowSchema = z.object({
  row: z.number().int().positive(),
  category: z.string().trim().min(1, "Chưa nhập mã danh mục.").max(255),
  code: z.string().trim().max(50, "Mã thiết bị tối đa 50 ký tự."),
  name: z
    .string()
    .trim()
    .min(1, "Chưa nhập tên thiết bị.")
    .max(255, "Tên thiết bị tối đa 255 ký tự."),
  quantity: z
    .number()
    .int("Số lượng phải là số nguyên.")
    .min(1, "Số lượng phải từ 1.")
    .max(2147483647, "Số lượng vượt giới hạn."),
  location: z.string().trim().max(255, "Vị trí tối đa 255 ký tự."),
  status: z.enum(["ACTIVE", "LOCKED", "INACTIVE"], {
    errorMap: () => ({
      message: "Trạng thái phải là ACTIVE, LOCKED hoặc INACTIVE.",
    }),
  }),
  note: z.string().trim().max(2000, "Ghi chú tối đa 2.000 ký tự."),
});
export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportIssue = { row: number; message: string };
export type ImportCategory = { id: string; code: string; name: string };
export type PlannedEquipment = ImportRow & {
  categoryId: string;
  categoryName: string;
};
export type ImportPreview = {
  rows: PlannedEquipment[];
  errors: ImportIssue[];
  imported: number;
};
export const normalizeImportText = (text: string) =>
  text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase();

/** Create-only import: never silently replace equipment or add to existing stock. */
export function planEquipmentImport(
  rawRows: unknown[],
  categories: ImportCategory[],
  existingCodes: string[],
): ImportPreview {
  const errors: ImportIssue[] = [];
  const rows: PlannedEquipment[] = [];
  if (!rawRows.length || rawRows.length > MAX_IMPORT_ROWS) {
    return {
      rows,
      errors: [
        {
          row: 0,
          message: `File phải có từ 1 đến ${MAX_IMPORT_ROWS} dòng thiết bị.`,
        },
      ],
      imported: 0,
    };
  }
  const occupied = new Set(existingCodes.map(normalizeImportText));
  const requested = new Set<string>();
  for (const [index, raw] of rawRows.entries()) {
    const parsed = importRowSchema.safeParse(raw);
    const rowNumber =
      typeof raw === "object" &&
      raw &&
      "row" in raw &&
      typeof raw.row === "number"
        ? raw.row
        : index + 1;
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues.map((i) => i.message).join(" "),
      });
      continue;
    }
    const row = parsed.data;
    const key = normalizeImportText(row.category);
    const byCode = categories.filter(
      (c) => normalizeImportText(c.code) === key,
    );
    const matches = byCode.length
      ? byCode
      : categories.filter((c) => normalizeImportText(c.name) === key);
    if (matches.length !== 1) {
      errors.push({
        row: row.row,
        message: matches.length
          ? "Tên danh mục không duy nhất. Hãy dùng mã danh mục."
          : `Không tìm thấy danh mục “${row.category}”. Hãy dùng mã trong mẫu mới nhất.`,
      });
      continue;
    }
    const codeKey = normalizeImportText(row.code);
    if (row.code && (occupied.has(codeKey) || requested.has(codeKey))) {
      errors.push({
        row: row.row,
        message: `Mã “${row.code}” đã tồn tại hoặc bị lặp trong file. Không ghi đè thiết bị.`,
      });
      continue;
    }
    if (row.code) requested.add(codeKey);
    rows.push({
      ...row,
      categoryId: matches[0].id,
      categoryName: matches[0].name,
    });
  }
  // Reserve all manually entered codes before assigning automatic codes.
  requested.forEach((code) => occupied.add(code));
  for (const row of rows) {
    if (row.code) continue;
    const category = categories.find((c) => c.id === row.categoryId)!;
    const prefix =
      category.code
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "EQUIPMENT";
    let sequence = BigInt(0);
    for (const code of occupied) {
      if (
        code.startsWith(`${prefix}-`) &&
        /^\d+$/.test(code.slice(prefix.length + 1))
      ) {
        const suffix = BigInt(code.slice(prefix.length + 1));
        if (suffix > sequence) sequence = suffix;
      }
    }
    do {
      sequence += BigInt(1);
      row.code = `${prefix}-${String(sequence).padStart(3, "0")}`;
    } while (occupied.has(normalizeImportText(row.code)));
    if (row.code.length > 50)
      errors.push({
        row: row.row,
        message: "Không thể tự cấp mã ngắn hơn 50 ký tự. Hãy nhập mã thiết bị.",
      });
    occupied.add(normalizeImportText(row.code));
  }
  return { rows, errors, imported: 0 };
}

/** RFC-style quoted CSV, including Excel's semicolon/tab delimiters and BOM. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/)[0];
  const unquoted = firstLine.replace(/"(?:[^"]|"")*"/g, "");
  const delimiter = [",", ";", "\t"].sort(
    (a, b) => unquoted.split(b).length - unquoted.split(a).length,
  )[0];
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else value += char;
    } else if (char === delimiter || char === "\n" || char === "\r") {
      row.push(value);
      value = "";
      closed = false;
      if (char !== delimiter) {
        rows.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else if (char === '"' && !value && !closed) quoted = true;
    else {
      if (closed || char === '"')
        throw new Error(
          "CSV có dấu ngoặc kép không hợp lệ. Hãy lưu lại dưới dạng CSV UTF-8.",
        );
      value += char;
    }
  }
  if (quoted) throw new Error("CSV thiếu dấu ngoặc kép đóng.");
  if (value || row.length || closed) rows.push([...row, value]);
  return rows;
}

export function matrixToImportRows(matrix: string[][]): ImportRow[] {
  const keys = IMPORT_HEADERS.map(normalizeImportText);
  const headerIndex = matrix
    .slice(0, 20)
    .findIndex((row) =>
      keys
        .filter((_, i) => i === 0 || i === 2)
        .every((key) => row.some((cell) => normalizeImportText(cell) === key)),
    );
  if (headerIndex < 0)
    throw new Error(
      "Không tìm thấy cột Mã danh mục và Tên thiết bị. Hãy dùng mẫu tải từ hệ thống.",
    );
  const headers = matrix[headerIndex].map(normalizeImportText);
  if (headers.some((h, i) => h && headers.indexOf(h) !== i))
    throw new Error("File có tên cột bị lặp.");
  if (headers.some((h) => h && !keys.includes(h)))
    throw new Error(
      "File có cột không được hỗ trợ. Giữ nguyên tên cột theo mẫu.",
    );
  const indexes = keys.map((key) => headers.indexOf(key));
  const rows: ImportRow[] = [];
  matrix.slice(headerIndex + 1).forEach((cells, i) => {
    if (!cells.some((cell) => cell.trim())) return;
    if (cells.some((cell, index) => cell.trim() && !headers[index]))
      throw new Error(
        `Dòng ${headerIndex + i + 2}: có dữ liệu ở cột không có tiêu đề.`,
      );
    const get = (index: number) => (cells[indexes[index]] ?? "").trim();
    rows.push({
      row: headerIndex + i + 2,
      category: get(0),
      code: get(1),
      name: get(2),
      quantity: get(3) ? (/^\d+$/.test(get(3)) ? Number(get(3)) : -1) : 1,
      location: get(4),
      status: (get(5).toUpperCase() || "ACTIVE") as ImportRow["status"],
      note: get(6),
    });
  });
  if (!rows.length || rows.length > MAX_IMPORT_ROWS)
    throw new Error(`File phải có từ 1 đến ${MAX_IMPORT_ROWS} dòng thiết bị.`);
  return rows;
}
