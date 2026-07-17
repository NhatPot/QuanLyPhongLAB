"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, Check, Clock3, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  bookingApi,
  type BookingData,
  type CreateBookingPayload,
} from "@/services/booking-api";
import { useAuth } from "@/features/auth/AuthContext";
import { DataTable, SortHeader } from "@/components/data-table/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

const schema = z
  .object({
    bookingType: z.enum(["FULL_LAB", "COMPUTERS_ONLY", "EQUIPMENT_ONLY"]),
    purpose: z.string().min(5, "Mục đích cần ít nhất 5 ký tự."),
    startTime: z.string().min(1, "Chọn giờ bắt đầu."),
    endTime: z.string().min(1, "Chọn giờ kết thúc."),
    numberOfPeople: z.coerce.number().min(1),
    numberOfComputers: z.coerce.number().min(0),
    note: z.string().optional(),
  })
  .refine((value) => new Date(value.startTime) < new Date(value.endTime), {
    path: ["endTime"],
    message: "Giờ kết thúc phải sau giờ bắt đầu.",
  });

type FormValues = z.infer<typeof schema>;
type BookingAction = {
  type: "approve" | "reject" | "cancel";
  id: string;
  reason?: string;
};

const badgeVariant = (status: string) =>
  status === "APPROVED" || status === "CHECKED_IN"
    ? "success"
    : status === "PENDING"
      ? "warning"
      : status === "REJECTED" || status === "CANCELLED"
        ? "destructive"
        : "secondary";

function errorMessage(error: unknown, fallback: string) {
  const response = (
    error as { response?: { data?: { error?: string | { message?: string } } } }
  )?.response;
  const apiError = response?.data?.error;
  return typeof apiError === "string"
    ? apiError
    : apiError?.message || fallback;
}

export default function BookingsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"mine" | "pending">("mine");
  const [rejectTarget, setRejectTarget] = useState<BookingData | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingData | null>(null);
  const [actionError, setActionError] = useState("");
  const canCreate = hasPermission("BOOKING_CREATE");
  const canApprove = hasPermission("BOOKING_APPROVE");

  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: bookingApi.myBookings,
    enabled: canCreate,
    retry: false,
  });
  const {
    data: pending = [],
    isLoading: loadingPending,
    error: pendingError,
  } = useQuery({
    queryKey: ["pending-bookings"],
    queryFn: bookingApi.pending,
    enabled: canApprove,
    retry: false,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookingType: "FULL_LAB",
      purpose: "",
      numberOfPeople: 1,
      numberOfComputers: 0,
      note: "",
    },
  });
  const bookingType = watch("bookingType");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["booking-calendar"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingApi.create(payload),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu đăng ký");
      setCreateOpen(false);
      reset();
      refresh();
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "Không thể tạo yêu cầu.")),
  });
  const actionMutation = useMutation({
    mutationFn: ({ type, id, reason }: BookingAction) =>
      type === "approve"
        ? bookingApi.approve(id)
        : type === "reject"
          ? bookingApi.reject(id, reason || "")
          : bookingApi.cancel(id, reason),
    onSuccess: (_data, variables) => {
      setActionError("");
      if (variables.type === "reject") setRejectTarget(null);
      if (variables.type === "cancel") setCancelTarget(null);
      toast.success(
        variables.type === "reject"
          ? "Đã từ chối yêu cầu"
          : variables.type === "cancel"
            ? "Đã hủy yêu cầu"
            : "Đã duyệt yêu cầu",
      );
      refresh();
    },
    onError: (error: unknown) => {
      const message = errorMessage(error, "Không thể cập nhật yêu cầu.");
      setActionError(message);
      toast.error(message);
    },
  });

  const submit = (value: FormValues) =>
    createMutation.mutate({
      ...value,
      startTime: new Date(value.startTime).toISOString(),
      endTime: new Date(value.endTime).toISOString(),
      equipments: [],
      numberOfComputers:
        value.bookingType === "EQUIPMENT_ONLY" ? 0 : value.numberOfComputers,
    });

  const columns = useMemo<ColumnDef<BookingData>[]>(
    () => [
      {
        accessorKey: "requestCode",
        header: ({ column }) => (
          <SortHeader label="Mã yêu cầu" column={column} />
        ),
        cell: ({ row }) => (
          <span className="font-bold text-blue-700">
            {row.original.requestCode}
          </span>
        ),
      },
      {
        accessorKey: "purpose",
        header: "Mục đích",
        cell: ({ row }) => (
          <div>
            <p className="max-w-56 truncate font-semibold text-slate-800">
              {row.original.purpose}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {row.original.bookingType.replaceAll("_", " ")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "startTime",
        header: ({ column }) => (
          <SortHeader label="Thời gian" column={column} />
        ),
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-semibold">
              {formatDateTime(row.original.startTime)}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              đến {formatDateTime(row.original.endTime)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "numberOfPeople",
        header: "Quy mô",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.numberOfPeople} người ·{" "}
            {row.original.numberOfComputers} máy
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <Badge variant={badgeVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          tab === "pending" ? (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700"
                onClick={() =>
                  actionMutation.mutate({
                    type: "approve",
                    id: row.original.id,
                  })
                }
                disabled={actionMutation.isPending}
              >
                <Check />
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => {
                  setActionError("");
                  setRejectTarget(row.original);
                }}
                disabled={actionMutation.isPending}
              >
                <XCircle />
                Từ chối
              </Button>
            </div>
          ) : ["PENDING", "APPROVED"].includes(row.original.status) ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => {
                setActionError("");
                setCancelTarget(row.original);
              }}
              disabled={actionMutation.isPending}
            >
              Hủy
            </Button>
          ) : null,
      },
    ],
    [actionMutation, tab],
  );
  const data = tab === "pending" ? pending : mine;

  return (
    <div>
      <PageHeader
        eyebrow="Booking"
        title="Yêu cầu đăng ký"
        description="Tạo, theo dõi và phê duyệt yêu cầu sử dụng phòng Lab."
      >
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Tạo yêu cầu
          </Button>
        )}
      </PageHeader>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Summary
          label="Tổng yêu cầu"
          value={mine.length}
          icon={CalendarPlus}
          tone="blue"
        />
        <Summary
          label="Đang chờ"
          value={mine.filter((booking) => booking.status === "PENDING").length}
          icon={Clock3}
          tone="amber"
        />
        <Summary
          label="Đã duyệt"
          value={mine.filter((booking) => booking.status === "APPROVED").length}
          icon={Check}
          tone="emerald"
        />
      </div>
      <Card>
        <CardContent className="p-5">
          <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${tab === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
            >
              Yêu cầu của tôi
            </button>
            {canApprove && (
              <button
                type="button"
                onClick={() => setTab("pending")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${tab === "pending" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
              >
                Chờ phê duyệt
              </button>
            )}
          </div>
          {tab === "pending" && pendingError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Backend hiện chưa trả được danh sách chờ duyệt qua endpoint hiện
              tại. Các chức năng khác vẫn hoạt động bình thường.
            </div>
          )}
          {(isLoading || loadingPending) && data.length === 0 ? (
            <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <DataTable
              columns={columns}
              data={data}
              searchPlaceholder="Tìm theo mã hoặc mục đích..."
              emptyMessage="Chưa có yêu cầu đăng ký."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo yêu cầu sử dụng</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ kiểm tra sức chứa, máy và lịch trùng trước khi gửi.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(submit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="Loại đăng ký" error={errors.bookingType?.message}>
              <select
                {...register("bookingType")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="FULL_LAB">Sử dụng toàn bộ phòng</option>
                <option value="COMPUTERS_ONLY">Chỉ sử dụng máy tính</option>
                <option value="EQUIPMENT_ONLY">Chỉ mượn thiết bị</option>
              </select>
            </Field>
            <Field label="Mục đích" error={errors.purpose?.message}>
              <Input
                {...register("purpose")}
                placeholder="Ví dụ: Thực hành mạng máy tính"
              />
            </Field>
            <Field label="Bắt đầu" error={errors.startTime?.message}>
              <Input type="datetime-local" {...register("startTime")} />
            </Field>
            <Field label="Kết thúc" error={errors.endTime?.message}>
              <Input type="datetime-local" {...register("endTime")} />
            </Field>
            <Field label="Số người" error={errors.numberOfPeople?.message}>
              <Input type="number" min={1} {...register("numberOfPeople")} />
            </Field>
            {bookingType !== "EQUIPMENT_ONLY" && (
              <Field
                label="Số máy tính"
                error={errors.numberOfComputers?.message}
              >
                <Input
                  type="number"
                  min={0}
                  {...register("numberOfComputers")}
                />
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Ghi chú">
                <textarea
                  {...register("note")}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Thông tin bổ sung..."
                />
              </Field>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ReasonDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        title="Từ chối yêu cầu"
        description="Vui lòng nhập lý do từ chối. Lý do này sẽ được gửi đến người đăng ký."
        reference={
          rejectTarget ? `Mã yêu cầu: ${rejectTarget.requestCode}` : undefined
        }
        label="Lý do từ chối"
        placeholder="Nhập lý do từ chối yêu cầu..."
        confirmLabel="Xác nhận từ chối"
        pending={actionMutation.isPending}
        error={actionError}
        onConfirm={(reason) => {
          if (rejectTarget) {
            setActionError("");
            actionMutation.mutate({
              type: "reject",
              id: rejectTarget.id,
              reason,
            });
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Hủy yêu cầu đăng ký"
        description={
          cancelTarget
            ? `Yêu cầu ${cancelTarget.requestCode} sẽ được hủy và không còn hiệu lực sử dụng phòng.`
            : ""
        }
        confirmLabel="Xác nhận hủy"
        destructive
        pending={actionMutation.isPending}
        error={actionError}
        onConfirm={() => {
          if (cancelTarget) {
            setActionError("");
            actionMutation.mutate({ type: "cancel", id: cancelTarget.id });
          }
        }}
      />
    </div>
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
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-[11px] text-red-600">{error}</span>
      )}
    </label>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CalendarPlus;
  tone: "blue" | "amber" | "emerald";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-xl p-2.5 ${styles}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-extrabold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
