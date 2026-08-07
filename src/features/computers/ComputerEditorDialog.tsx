"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Cpu,
  HardDrive,
  Laptop,
  Monitor,
  Network,
  Radio,
  Save,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { computerApi, type ComputerData } from "@/services/computer-api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const computerSchema = z.object({
  code: z.string().min(1, "Mã máy không được để trống."),
  name: z.string().min(1, "Tên máy không được để trống."),
  position: z.string().optional(),
  status: z.enum([
    "ACTIVE",
    "IN_USE",
    "BROKEN",
    "MAINTENANCE",
    "LOCKED",
    "INACTIVE",
  ]),
  note: z.string().optional(),
});

type FormFields = z.infer<typeof computerSchema>;

type ComputerEditorDialogProps = {
  open: boolean;
  computer: ComputerData | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onClose: () => void;
};

const EMPTY_FORM: FormFields = {
  code: "",
  name: "",
  position: "",
  status: "ACTIVE",
  note: "",
};

const inputClass =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function ComputerEditorDialog({
  open,
  computer,
  canCreate,
  canUpdate,
  canDelete,
  onClose,
}: ComputerEditorDialogProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormFields>({
    resolver: zodResolver(computerSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      computer
        ? {
            code: computer.code,
            name: computer.name,
            position: computer.position || "",
            status: computer.status,
            note: computer.note || "",
          }
        : EMPTY_FORM,
    );
  }, [computer, open, reset]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  const refreshComputerData = () => {
    void queryClient.invalidateQueries({ queryKey: ["computers"] });
    void queryClient.invalidateQueries({ queryKey: ["computers-summary"] });
  };

  const saveMutation = useMutation({
    mutationFn: (data: FormFields) =>
      computer
        ? computerApi.update(computer.id, {
            ...computer,
            ...data,
          })
        : computerApi.create(data),
    onSuccess: () => {
      refreshComputerData();
      toast.success(
        computer ? "Đã cập nhật thông tin máy tính" : "Đã thêm máy tính mới",
      );
      onClose();
    },
    onError: () =>
      toast.error("Không thể lưu máy tính. Vui lòng kiểm tra lại dữ liệu."),
  });

  const deleteMutation = useMutation({
    mutationFn: computerApi.delete,
    onSuccess: () => {
      refreshComputerData();
      setDeleteTarget(null);
      setDeleteError(null);
      toast.success("Đã xóa máy tính khỏi danh sách");
    },
    onError: () => {
      const message = "Không thể xóa máy tính này.";
      setDeleteError(message);
      toast.error(message);
    },
  });

  const canSubmit = computer ? canUpdate : canCreate;
  const readOnly = !canSubmit;

  const requestDelete = () => {
    if (!computer) return;
    setDeleteError(null);
    setDeleteTarget(computer.id);
    onClose();
  };

  const specsList = [
    { label: "CPU", value: computer?.cpu, icon: Cpu },
    { label: "Dung lượng RAM", value: computer?.ram, icon: Zap },
    { label: "Ổ cứng", value: computer?.storage, icon: HardDrive },
    { label: "Card đồ họa (GPU)", value: computer?.gpu, icon: Monitor },
    { label: "Hệ điều hành", value: computer?.operatingSystem, icon: Laptop },
    { label: "Địa chỉ IP", value: computer?.ipAddress, icon: Network },
    { label: "Địa chỉ MAC", value: computer?.macAddress, icon: Radio },
  ];

  return (
    <>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="computer-editor-title"
              className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,.28)]"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                <div>
                  <h2
                    id="computer-editor-title"
                    className="text-lg font-extrabold text-slate-950"
                  >
                    {computer
                      ? `Thông tin máy ${computer.code}`
                      : "Thêm máy tính mới"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {readOnly
                      ? "Xem chi tiết thông số cấu hình được đăng ký qua API."
                      : "Cập nhật vị trí, trạng thái và ghi chú vận hành."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
                className="p-5"
              >
                <fieldset
                  disabled={readOnly}
                  className="grid gap-4 sm:grid-cols-2 disabled:opacity-90"
                >
                  <Field label="Mã máy tính" error={errors.code?.message}>
                    <input
                      {...register("code")}
                      disabled={Boolean(computer) || readOnly}
                      placeholder="Ví dụ: PC-01"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Tên máy tính" error={errors.name?.message}>
                    <input
                      {...register("name")}
                      placeholder="Máy trạm 01"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Vị trí phòng Lab">
                    <input
                      {...register("position")}
                      placeholder="Dãy A · Bàn 01"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Trạng thái vận hành">
                    <select {...register("status")} className={inputClass}>
                      {computer?.status === "MAINTENANCE" ? (
                        <option value="MAINTENANCE">Bảo trì</option>
                      ) : (
                        <>
                          <option value="ACTIVE">Sẵn sàng</option>
                          <option value="IN_USE">Đang sử dụng</option>
                          <option value="BROKEN">Bị hỏng</option>
                          <option value="LOCKED">Đã khóa</option>
                          <option value="INACTIVE">Không hoạt động</option>
                        </>
                      )}
                    </select>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Ghi chú quản lý">
                      <textarea
                        {...register("note")}
                        rows={2}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        placeholder="Thông tin bổ sung về máy tính..."
                      />
                    </Field>
                  </div>

                  {computer &&
                    (computer.status === "BROKEN" ||
                      computer.status === "MAINTENANCE" ||
                      isMaintenanceDue(computer)) && (
                      <div className="sm:col-span-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                        {computer.status === "BROKEN"
                          ? "Máy đang bị hỏng và cần được xếp lịch sửa chữa."
                          : computer.status === "MAINTENANCE"
                            ? "Máy đang được xử lý trong một lịch bảo trì."
                            : "Máy đã đến hạn bảo trì định kỳ 270 ngày."}{" "}
                        <a
                          href="/maintenance"
                          className="font-extrabold text-blue-700 hover:underline"
                        >
                          Mở danh sách bảo trì
                        </a>
                      </div>
                    )}

                  {/* THÔNG SỐ CẤU HÌNH - DANH SÁCH KHÔNG CHO PHÉP CHỈNH SỬA (ĐĂNG KÝ QUA API) */}
                  <div className="sm:col-span-2 mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-900">
                            Thông số cấu hình máy tính
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Đăng ký &amp; cập nhật tự động từ Device Agent API (Không cho phép sửa thủ công)
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                        Chỉ đọc (Read-only)
                      </span>
                    </div>

                    <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                      {specsList.map(({ label, value, icon: Icon }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-3.5 py-2.5 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 truncate">
                              {label}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]" title={value || "Chưa nhận diện"}>
                            {value || "Chưa nhận diện"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200/60 bg-white p-3">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400 block mb-1">
                        Phần mềm đã cài đặt
                      </span>
                      <p className="text-xs font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {computer?.installedSoftware || "Chưa có danh sách phần mềm từ Device Agent."}
                      </p>
                    </div>
                  </div>
                </fieldset>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {computer && canDelete && (
                      <button
                        type="button"
                        onClick={requestDelete}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa máy
                      </button>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                      {readOnly ? "Đóng" : "Hủy"}
                    </button>
                    {canSubmit && (
                      <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {saveMutation.isPending
                          ? "Đang lưu..."
                          : computer
                            ? "Lưu thông tin"
                            : "Thêm máy"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Xác nhận xóa máy tính?"
        description="Hành động này sẽ chuyển máy sang trạng thái đã xóa. Dữ liệu lịch sử vẫn được bảo toàn theo cơ chế xóa mềm của hệ thống."
        confirmLabel="Đồng ý xóa"
        destructive
        pending={deleteMutation.isPending}
        error={deleteError || undefined}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-500">
          {error}
        </span>
      )}
    </label>
  );
}

function isMaintenanceDue(computer: ComputerData): boolean {
  const base = computer.lastMaintenanceDate || computer.createdAt;
  return Boolean(
    base && Date.now() - new Date(base).getTime() >= 270 * 24 * 60 * 60 * 1000,
  );
}
