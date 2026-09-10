"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import {
  equipmentApi,
  type EquipmentCategoryData,
} from "@/services/equipment-api";
import type { ImportPreview } from "@/lib/equipment-import";

const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const errorMessage = (error: unknown) => {
  const response = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response;
  return (
    response?.data?.error?.message ||
    (error instanceof Error
      ? error.message
      : "Không thể xử lý file. Hãy thử lại.")
  );
};

export function EquipmentImportDialog({
  categories,
  onImported,
}: {
  categories: EquipmentCategoryData[] | undefined;
  onImported: (count: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"read" | "save" | "template" | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const [previewPage, setPreviewPage] = useState(1);
  const ready = !!categories?.length;

  async function download(format: "xlsx" | "csv") {
    if (working.current) return;
    working.current = true;
    setBusy("template");
    setError("");
    try {
      const { downloadEquipmentTemplate } =
        await import("./equipment-import-file");
      await downloadEquipmentTemplate(categories || [], format);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      working.current = false;
    }
  }
  async function read(file: File) {
    if (working.current) return;
    working.current = true;
    setBusy("read");
    setError("");
    setPreview(null);
    setFileName(file.name);
    setPreviewPage(1);
    try {
      const { readEquipmentFile } = await import("./equipment-import-file");
      const rows = await readEquipmentFile(file);
      setPreview(await equipmentApi.importRows(rows, false));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      working.current = false;
    }
  }
  async function save() {
    if (
      working.current ||
      !preview ||
      preview.errors.length ||
      !preview.rows.length
    )
      return;
    working.current = true;
    setBusy("save");
    setError("");
    try {
      // Submit the assigned preview codes, so retrying cannot create duplicates
      // even when a successful response is lost on the network.
      const result = await equipmentApi.importRows(preview.rows, true);
      if (result.errors.length) {
        setPreview(result);
        return;
      }
      setOpen(false);
      setPreview(null);
      setFileName("");
      onImported(result.imported);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      working.current = false;
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (working.current) return;
        setOpen(value);
        if (!value) {
          setPreview(null);
          setFileName("");
          setError("");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className={secondary}>
          <Upload className="h-4 w-4" /> Nhập từ file
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] m-0 bg-slate-900/50 backdrop-blur-sm" />
        <Dialog.Content
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (working.current) event.preventDefault();
          }}
          className="fixed left-1/2 top-1/2 z-[101] m-0 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white text-slate-900 shadow-2xl focus:outline-none"
        >
          <div className="border-b border-slate-200 px-6 py-5 pr-16">
            <Dialog.Title className="text-xl font-bold">
              Nhập thiết bị từ file
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-slate-600">
              Tải mẫu, điền thiết bị và kiểm tra dữ liệu trước khi lưu vào kho.
            </Dialog.Description>
            <Dialog.Close
              disabled={!!busy}
              aria-label="Đóng cửa sổ nhập thiết bị"
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">Mẫu nhập thiết bị</h3>
                <p className="mt-1 max-w-lg text-sm text-slate-600">
                  Mẫu Excel có hướng dẫn và danh sách chọn từ{" "}
                  {categories?.length ?? 0} danh mục hiện có. Mã và số lượng có
                  thể để trống.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  className={secondary}
                  disabled={!!busy || !ready}
                  onClick={() => download("xlsx")}
                >
                  <Download className="h-4 w-4" /> Mẫu Excel
                </button>
                <button
                  type="button"
                  className={secondary}
                  disabled={!!busy || !ready}
                  onClick={() => download("csv")}
                >
                  Mẫu CSV
                </button>
              </div>
            </div>
            {!ready && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                {categories
                  ? "Chưa có danh mục. Hãy tạo danh mục trước khi nhập thiết bị."
                  : "Chưa tải được danh mục. Đóng cửa sổ và tải lại trang để thử lại."}
              </p>
            )}
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-5 sm:flex-row sm:items-center">
              <FileSpreadsheet
                className="h-8 w-8 shrink-0 text-blue-700"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="break-all font-semibold">
                  {fileName || "Chọn danh sách thiết bị cần nhập"}
                </p>
                <p
                  id="equipment-file-help"
                  className="mt-1 text-sm text-slate-600"
                >
                  Excel .xlsx hoặc CSV UTF-8 · Tối đa 500 dòng, 5 MB.
                </p>
              </div>
              <input
                ref={input}
                type="file"
                className="sr-only"
                tabIndex={-1}
                aria-label="File danh sách thiết bị"
                aria-describedby="equipment-file-help"
                accept=".xlsx,.csv"
                disabled={!!busy || !ready}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void read(file);
                }}
              />
              <button
                type="button"
                className={secondary}
                disabled={!!busy || !ready}
                onClick={() => input.current?.click()}
              >
                <Upload className="h-4 w-4" />{" "}
                {fileName ? "Chọn lại file" : "Chọn file"}
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Chỉ thêm thiết bị mới, không ghi đè mã đã có. Số lượng trống = 1;
              mã trống được cấp theo danh mục. Muốn tăng tồn kho thiết bị cũ,
                dùng thao tác Kho.
                Thiết bị nhập từ file mặc định là nội bộ Lab. Sau khi kiểm tra, vào Sửa để bật Cho phép mượn cho từng thiết bị phù hợp.
            </p>
            {busy && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-blue-800"
              >
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                {busy === "save"
                  ? "Đang lưu toàn bộ danh sách…"
                  : busy === "read"
                    ? "Đang đọc file và kiểm tra với dữ liệu hệ thống…"
                    : "Đang tạo mẫu theo danh mục hiện có…"}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            {preview && (
              <section aria-label="Kết quả kiểm tra file" className="space-y-3">
                <p aria-live="polite" className="font-semibold">
                  {preview.errors.length
                    ? `${preview.errors.length} lỗi cần sửa trước khi nhập`
                    : `${preview.rows.length} dòng hợp lệ · ${preview.rows.reduce((sum, row) => sum + row.quantity, 0).toLocaleString("vi-VN")} thiết bị`}
                </p>
                {preview.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="mb-2 font-semibold">
                      Chưa lưu dữ liệu. Sửa các dòng sau trong file rồi chọn lại
                      file:
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {preview.errors.map((issue, i) => (
                        <li key={i}>
                          {issue.row > 0 ? `Dòng ${issue.row}: ` : ""}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.rows.length > 0 && (
                  <>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <caption className="sr-only">
                          Xem trước thiết bị sẽ được thêm vào kho
                        </caption>
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            {[
                              "Dòng",
                              "Mã thiết bị",
                              "Tên thiết bị",
                              "Danh mục",
                              "Số lượng",
                              "Vị trí",
                              "Trạng thái",
                            ].map((label) => (
                              <th
                                scope="col"
                                key={label}
                                className="px-3 py-3 font-semibold"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.rows
                            .slice((previewPage - 1) * 25, previewPage * 25)
                            .map((row) => (
                              <tr key={row.row}>
                                <td className="px-3 py-3 tabular-nums">
                                  {row.row}
                                </td>
                                <td className="max-w-40 break-words px-3 py-3 font-semibold">
                                  {row.code}
                                </td>
                                <td className="max-w-56 break-words px-3 py-3">
                                  {row.name}
                                  {row.note && (
                                    <p className="mt-1 text-xs text-slate-600">
                                      {row.note}
                                    </p>
                                  )}
                                </td>
                                <td className="max-w-40 break-words px-3 py-3">
                                  {row.categoryName}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums">
                                  {row.quantity}
                                </td>
                                <td className="max-w-40 break-words px-3 py-3">
                                  {row.location || "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {
                                    {
                                      ACTIVE: "Kích hoạt",
                                      LOCKED: "Khóa",
                                      INACTIVE: "Không hoạt động",
                                    }[row.status]
                                  }
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.rows.length > 25 && (
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <button
                          className={secondary}
                          disabled={previewPage === 1}
                          onClick={() => setPreviewPage((p) => p - 1)}
                        >
                          Trước
                        </button>
                        <span>
                          Trang {previewPage}/
                          {Math.ceil(preview.rows.length / 25)}
                        </span>
                        <button
                          className={secondary}
                          disabled={previewPage * 25 >= preview.rows.length}
                          onClick={() => setPreviewPage((p) => p + 1)}
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <Dialog.Close asChild>
              <button type="button" className={secondary} disabled={!!busy}>
                Đóng
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={primary}
              disabled={
                !!busy || !preview?.rows.length || !!preview.errors.length
              }
              onClick={save}
            >
              <Upload className="h-4 w-4" />
              {busy === "save"
                ? "Đang nhập…"
                : `Nhập${preview && !preview.errors.length ? ` ${preview.rows.length}` : ""} thiết bị`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
