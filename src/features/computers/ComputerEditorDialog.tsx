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
  PackageCheck,
  CheckCircle2,
  Radio,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { computerApi, type ComputerData } from "@/services/computer-api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { MiniMetricsChart } from "./MiniMetricsChart";

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
  metrics?: any;
  userMap?: Map<string, string>;
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

const parseMultiSpecs = (val?: string): string[] => {
  if (!val) return [];
  const parts = val.split(/(?:\s*\+\s*|\r?\n+|;|\s*\|\s*)/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return [val.trim()];
};

const parseJwtUser = (userVal?: string, userToken?: string, userMap?: Map<string, string>): string => {
  const val = (userVal || '').trim();
  const token = (userToken || '').trim();

  // 1. If userVal is a plain username (no dot, e.g. "long")
  if (val && !val.includes('.')) {
    if (token && token.includes('.')) {
      try {
        const base64Url = token.split('.')[1];
        if (base64Url) {
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            window.atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.userId && userMap?.has(payload.userId)) {
            return userMap.get(payload.userId)!;
          }
          if (payload.fullName || payload.username || payload.name) {
            return payload.fullName || payload.username || payload.name;
          }
        }
      } catch {
        // ignore
      }
    }
    return val;
  }

  // 2. If userVal itself is a JWT token (contains dots)
  const jwtToDecode = val.includes('.') ? val : token;
  if (jwtToDecode && jwtToDecode.includes('.')) {
    try {
      const base64Url = jwtToDecode.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window.atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        const payload = JSON.parse(jsonPayload);

        if (payload.userId && userMap?.has(payload.userId)) {
          return userMap.get(payload.userId)!;
        }

        return payload.fullName || payload.username || payload.name || payload.userId || payload.sub || val || 'Có người dùng';
      }
    } catch {
      // ignore
    }
  }

  return val || 'Có người dùng';
};

export function ComputerEditorDialog({
  open,
  computer,
  canCreate,
  canUpdate,
  canDelete,
  metrics,
  userMap,
  onClose,
}: ComputerEditorDialogProps) {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [softwareSearch, setSoftwareSearch] = useState("");
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!open) {
      setMetricsHistory([]);
    }
  }, [open]);

  useEffect(() => {
    if (metrics) {
      setMetricsHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].timestamp === metrics.timestamp) {
          return prev;
        }
        const next = [...prev, metrics];
        if (next.length > 20) return next.slice(next.length - 20);
        return next;
      });
    }
  }, [metrics]);

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
    setSoftwareSearch("");
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
    { label: "Mã định danh (UUID / MAC)", value: computer?.macAddress, icon: Radio },
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

                  {/* THÔNG SỐ VẬN HÀNH (METRICS) */}
                  {computer && (
                    <div className="sm:col-span-2 mt-1 mb-2 rounded-2xl border border-emerald-100 bg-emerald-50/30 px-4 py-3 shadow-sm">
                      {metrics && !metrics.isOffline ? (
                        <div className="flex items-center gap-4 py-2">
                          <div className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Đang trực tuyến (Online)</p>
                            {metrics.status?.current_user ? (
                              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Người dùng: {parseJwtUser(metrics.status.current_user, metrics.user_token, userMap)}</p>
                            ) : (
                              <p className="text-[11px] text-slate-500 mt-0.5">Không có người dùng đăng nhập</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 py-2">
                          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-slate-300"></div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Ngoại tuyến (Offline)</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {metrics?.offlineSince 
                                ? `Mất kết nối lúc: ${new Date(metrics.offlineSince).toLocaleTimeString('vi-VN')} - ${new Date(metrics.offlineSince).toLocaleDateString('vi-VN')}`
                                : 'Máy tính đang tắt hoặc mất kết nối mạng'}
                            </p>
                          </div>
                        </div>
                      )}
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
                      {specsList.map(({ label, value, icon: Icon }) => {
                        const isMulti = label === "Ổ cứng" || label === "Card đồ họa (GPU)";
                        const items = isMulti ? parseMultiSpecs(value) : [];

                        return (
                          <div
                            key={label}
                            className={cn(
                              "flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-3.5 py-2.5 shadow-2xs",
                              isMulti && items.length > 1 && "sm:col-span-2 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="text-xs font-semibold text-slate-500 truncate">
                                {label}
                                {isMulti && items.length > 1 && (
                                  <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700">
                                    {items.length} {label === "Ổ cứng" ? "ổ cứng" : "GPU"}
                                  </span>
                                )}
                              </span>
                            </div>

                            {isMulti && items.length > 1 ? (
                              <div className="flex flex-wrap gap-1.5 justify-end w-full sm:w-auto">
                                {items.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-bold text-blue-900"
                                    title={item}
                                  >
                                    <span className="rounded bg-blue-200/80 px-1 py-0.2 text-[9px] font-extrabold text-blue-800 shrink-0">
                                      #{idx + 1}
                                    </span>
                                    <span>{item}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span
                                className="text-xs font-bold text-slate-900 truncate max-w-[220px]"
                                title={value || "Chưa nhận diện"}
                              >
                                {value || "Chưa nhận diện"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      const installedAppsList = (computer?.installedSoftware || "")
                        .split(/[,;\n]+/)
                        .map((app) => app.trim())
                        .filter(Boolean);

                      const filteredApps = installedAppsList.filter((app) =>
                        app.toLowerCase().includes(softwareSearch.toLowerCase().trim())
                      );

                      return (
                        <div className="mt-3 rounded-xl border border-slate-200/60 bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2.5">
                            <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                              <PackageCheck className="h-3.5 w-3.5 text-blue-600" />
                              Phần mềm đã cài đặt
                            </span>
                            {installedAppsList.length > 0 && (
                              <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 self-start sm:self-auto">
                                {softwareSearch
                                  ? `${filteredApps.length}/${installedAppsList.length} phần mềm`
                                  : `${installedAppsList.length} phần mềm`}
                              </span>
                            )}
                          </div>

                          {installedAppsList.length > 0 && (
                            <div className="relative mb-2.5">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={softwareSearch}
                                onChange={(e) => setSoftwareSearch(e.target.value)}
                                placeholder="Tìm nhanh phần mềm (ví dụ: Chrome, VS Code, Node)..."
                                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-7 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                              />
                              {softwareSearch && (
                                <button
                                  type="button"
                                  onClick={() => setSoftwareSearch("")}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          {filteredApps.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto pr-1">
                              <ul className="grid gap-1.5 sm:grid-cols-2">
                                {filteredApps.map((app, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-slate-50/70 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300"
                                  >
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-emerald-600 shadow-2xs">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    </div>
                                    <span className="truncate" title={app}>{app}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : installedAppsList.length > 0 ? (
                            <div className="text-center py-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                              <p className="text-xs font-medium text-slate-500">
                                Không tìm thấy phần mềm khớp với từ khóa "{softwareSearch}"
                              </p>
                              <button
                                type="button"
                                onClick={() => setSoftwareSearch("")}
                                className="mt-1 text-[11px] font-bold text-blue-600 hover:underline"
                              >
                                Xóa từ khóa tìm kiếm
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-slate-400 italic py-1">
                              Chưa có danh sách phần mềm từ Device Agent.
                            </p>
                          )}
                        </div>
                      );
                    })()}
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
