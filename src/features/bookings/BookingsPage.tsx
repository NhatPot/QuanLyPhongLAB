"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, Check, Clock3, Plus, Search, UserRound, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  bookingApi,
  type BookingData,
  type BookingPurposeOption,
  type BookingRequester,
  type CreateBookingPayload,
} from "@/services/booking-api";
import { nearbyPeriod } from './LendingCatalog';
import { BorrowingCatalog } from './BorrowingCatalog';
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
    purposeGroupId: z.string().optional(),
    startTime: z.string().min(1, "Chọn giờ bắt đầu."),
    endTime: z.string().min(1, "Chọn giờ kết thúc."),
    numberOfPeople: z.coerce.number().min(1),
    numberOfComputers: z.coerce.number().min(0),
    computerIds: z.array(z.string()).default([]),
    equipments: z.array(z.object({
      equipmentId: z.string().min(1, "Chọn thiết bị cho mượn."),
      quantity: z.coerce.number().int().min(1, "Số lượng phải từ 1."),
    })),
    note: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.bookingType === 'COMPUTERS_ONLY' && !value.computerIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['computerIds'], message: 'Chọn ít nhất một máy tính.' });
    if (value.bookingType === "EQUIPMENT_ONLY") {
      if (value.equipments.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["equipments"],
          message: "Cần chọn ít nhất một thiết bị cho mượn.",
        });
      }
      value.equipments.forEach((item, index) => {
        if (!item.equipmentId || item.equipmentId.length === 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["equipments", index, "equipmentId"],
            message: "Chọn thiết bị cho mượn.",
          });
        }
      });
    }
    const seen = new Set<string>();
    value.equipments.forEach((item, index) => {
      if (item.equipmentId && seen.has(item.equipmentId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["equipments", index, "equipmentId"],
          message: "Thiết bị đã được chọn ở dòng khác.",
        });
      }
      if (item.equipmentId) seen.add(item.equipmentId);
    });
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

function requestedEquipmentQuantity(booking: BookingData) {
  return booking.equipmentItems?.reduce((total, item) => total + item.requestedQuantity, 0) || 0;
}

export default function BookingsPage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<"catalog" | "mine" | "pending" | "categories">("catalog");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [rejectTarget, setRejectTarget] = useState<BookingData | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingData | null>(null);
  const [actionError, setActionError] = useState("");
  const [requesterKeyword, setRequesterKeyword] = useState("");
  const [selectedRequester, setSelectedRequester] = useState<BookingRequester | null>(null);
  const canCreate = hasPermission("BOOKING_CREATE");
  const canApprove = hasPermission("BOOKING_APPROVE");
  const canCreateForUser = hasPermission("BOOKING_CREATE_FOR_USER");

  const currentRequester = useMemo<BookingRequester | null>(() => user ? ({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    department: null,
  }) : null, [user]);

  const { data: purposeGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["booking-purpose-options"],
    queryFn: bookingApi.purposeOptions,
    enabled: tab === "categories" && canApprove,
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => bookingApi.createPurposeGroup(name),
    onSuccess: () => {
      toast.success("Đã thêm danh mục mục đích");
      setNewCategoryName("");
      void queryClient.invalidateQueries({ queryKey: ["booking-purpose-options"] });
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "Không thể thêm danh mục.")),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => bookingApi.deletePurposeGroup(id),
    onSuccess: () => {
      toast.success("Đã xóa danh mục mục đích");
      void queryClient.invalidateQueries({ queryKey: ["booking-purpose-options"] });
    },
    onError: (error: unknown) =>
      toast.error(errorMessage(error, "Không thể xóa danh mục.")),
  });

  const { data: purposeOptions = [], isLoading: loadingPurposeOptions } = useQuery({
    queryKey: ["booking-purpose-options"],
    queryFn: bookingApi.purposeOptions,
    enabled: createOpen && canCreate,
    staleTime: 30_000,
  });

  const { data: requesterOptions = [], isLoading: loadingRequesters } = useQuery({
    queryKey: ["booking-requester-options", requesterKeyword],
    queryFn: () => bookingApi.requesterOptions(requesterKeyword),
    enabled: createOpen && canCreateForUser,
    staleTime: 30_000,
  });
  const visibleRequesterOptions = useMemo(() => {
    const options = selectedRequester ? [selectedRequester, ...requesterOptions] : requesterOptions;
    return options.filter((option, index) => options.findIndex((candidate) => candidate.id === option.id) === index);
  }, [requesterOptions, selectedRequester]);

  const { data: mineRaw = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: bookingApi.myBookings,
    enabled: canCreate,
    retry: false,
  });
  const mine: BookingData[] = useMemo(() => Array.isArray(mineRaw) ? mineRaw : ((mineRaw as any)?.data ?? []), [mineRaw]);

  const {
    data: pendingRaw = [],
    isLoading: loadingPending,
    error: pendingError,
  } = useQuery({
    queryKey: ["pending-bookings"],
    queryFn: bookingApi.pending,
    enabled: canApprove,
    retry: false,
  });
  const pending: BookingData[] = useMemo(() => Array.isArray(pendingRaw) ? pendingRaw : ((pendingRaw as any)?.data ?? []), [pendingRaw]);
  const {
    control,
    register,
    setValue,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bookingType: "FULL_LAB",
      purpose: "",
      purposeGroupId: "",
      numberOfPeople: 1,
      numberOfComputers: 0,
      computerIds: [],
      equipments: [],
      note: "",
    },
  });
  const equipmentFields = useFieldArray({ control, name: "equipments" });
  const bookingType = watch("bookingType");
  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const validPeriod = Boolean(startTime && endTime && new Date(startTime) > new Date() && new Date(endTime) > new Date(startTime));
  const { data: equipmentList, isLoading: loadingEquipments, error: equipmentError } = useQuery({
    queryKey: ['booking-equipment-options', startTime, endTime],
    queryFn: async () => {
      const params = { startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() };
      const first = await bookingApi.catalog(params);
      // The dropdown must not silently omit devices after the first catalog page.
      const rest = await Promise.all(Array.from({ length: first.meta.totalPages - 1 > 0 ? first.meta.totalPages - 1 : 0 }, (_, i) => bookingApi.catalog({ ...params, page: i + 2 })));
      return { ...first, data: [...first.data, ...rest.flatMap(result => result.data)] };
    },
    enabled: createOpen && canCreate && validPeriod,
  });
  const availableEquipments = equipmentList?.data.filter(item => item.availableQuantity > 0) || [];
  const equipmentCategoryName = new Map(equipmentList?.data.map(item => [item.categoryId, item.categoryName]) || []);
  const equipmentValues = watch("equipments");
  const selectedComputerIds = watch('computerIds') || [];
  const requestedEquipmentCount = equipmentValues.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["pending-bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["booking-calendar"] });
    void queryClient.invalidateQueries({ queryKey: ["lending-catalog"] });
    void queryClient.invalidateQueries({ queryKey: ["computer-booking-history"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingApi.create(payload),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu đăng ký");
      setCreateOpen(false);
      reset();
      setRequesterKeyword("");
      setSelectedRequester(currentRequester);
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
      requesterId: canCreateForUser ? (selectedRequester?.id || user?.id) : undefined,
      purposeGroupId: value.purposeGroupId?.startsWith("legacy:") ? undefined : value.purposeGroupId || undefined,
      startTime: new Date(value.startTime).toISOString(),
      endTime: new Date(value.endTime).toISOString(),
      numberOfComputers:
        value.bookingType === "EQUIPMENT_ONLY" ? 0 : value.computerIds.length,
      computerIds: value.bookingType === 'EQUIPMENT_ONLY' ? [] : value.computerIds,
      equipments: value.equipments,
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
        id: "requester",
        accessorFn: (booking) => `${booking.requester?.fullName || ""} ${booking.requester?.username || ""}`,
        header: "Người đăng ký",
        cell: ({ row }) => (
          <div className="min-w-36">
            <p className="truncate text-xs font-bold text-slate-800">
              {row.original.requester?.fullName || "Chưa có thông tin"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {row.original.requester?.username ? `@${row.original.requester.username}` : row.original.requesterId}
            </p>
          </div>
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
        header: "Quy mô / thiết bị",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.bookingType === "EQUIPMENT_ONLY" ? (
              <>{requestedEquipmentQuantity(row.original)} thiết bị</>
            ) : (
              <>{row.original.numberOfPeople} người · {row.original.numberOfComputers} máy<span className="mt-1 block text-blue-700">{row.original.computerItems?.map(c => c.computerCode).join(', ') || 'Phân máy khi nhận phòng (lịch cũ)'}</span></>
            )}
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
        title="Yêu cầu đăng ký"
        description="Chọn máy, mượn thiết bị và theo dõi yêu cầu sử dụng phòng Lab."
      >
        {canCreate && (
          <Button onClick={() => {
            reset({ bookingType: 'FULL_LAB', ...nearbyPeriod(), purpose: '', numberOfPeople: 1, numberOfComputers: 0, computerIds: [], equipments: [], note: '' });
            setSelectedRequester(currentRequester);
            setRequesterKeyword("");
            setCreateOpen(true);
          }}>
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
          <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
            {canCreate && <button type="button" aria-pressed={tab === 'catalog'} onClick={() => setTab('catalog')} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${tab === 'catalog' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>Chọn máy & thiết bị</button>}
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
            {canApprove && (
              <button
                type="button"
                onClick={() => setTab("categories")}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${tab === "categories" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
              >
                Danh mục mục đích
              </button>
            )}
          </div>
          {tab === "categories" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Tên danh mục mới</label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ví dụ: Thực hành môn IoT"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim().length >= 3) {
                        createGroupMutation.mutate(newCategoryName.trim());
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => createGroupMutation.mutate(newCategoryName.trim())}
                  disabled={newCategoryName.trim().length < 3 || createGroupMutation.isPending}
                >
                  <Plus />
                  {createGroupMutation.isPending ? "Đang thêm..." : "Thêm danh mục"}
                </Button>
              </div>

              {loadingGroups ? (
                <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              ) : purposeGroups.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                  Chưa có danh mục mục đích nào.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {purposeGroups.map((group) => (
                    <div key={group.id || group.name} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{group.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {group.source === "GROUP" ? "Danh mục" : "Mục đích cũ"}
                          {" · "}{group.usageCount} lần sử dụng
                        </p>
                      </div>
                      {group.id && group.source === "GROUP" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => deleteGroupMutation.mutate(group.id!)}
                          disabled={deleteGroupMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'catalog' && canCreate && <BorrowingCatalog onSelect={selection => {
            reset({ bookingType: selection.computerIds.length ? 'COMPUTERS_ONLY' : 'EQUIPMENT_ONLY', startTime: selection.startTime, endTime: selection.endTime, purpose: '', numberOfPeople: Math.max(1, selection.computerIds.length), numberOfComputers: selection.computerIds.length, computerIds: selection.computerIds, equipments: selection.equipments, note: '' });
            setSelectedRequester(currentRequester); setRequesterKeyword(''); setCreateOpen(true);
          }} />}
          {tab !== "categories" && (tab !== 'catalog' || !canCreate) && (
            <>
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
                  searchPlaceholder="Tìm theo mã, người đăng ký hoặc mục đích..."
                  emptyMessage="Chưa có yêu cầu đăng ký."
                />
              )}
            </>
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
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Người đăng ký
              </span>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {(selectedRequester || currentRequester)?.fullName || "Đang tải tài khoản..."}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      @{(selectedRequester || currentRequester)?.username || "--"}
                      {(selectedRequester || currentRequester)?.email ? ` · ${(selectedRequester || currentRequester)?.email}` : ""}
                    </p>
                  </div>
                  {!canCreateForUser && (
                    <Badge variant="outline" className="bg-white">Tài khoản hiện tại</Badge>
                  )}
                </div>
                {canCreateForUser && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={requesterKeyword}
                        onChange={(event) => setRequesterKeyword(event.target.value)}
                        placeholder="Tìm họ tên, username..."
                        className="bg-white pl-9"
                      />
                    </div>
                    <select
                      value={(selectedRequester || currentRequester)?.id || ""}
                      onChange={(event) => {
                        const next = visibleRequesterOptions.find((option) => option.id === event.target.value) || currentRequester;
                        setSelectedRequester(next);
                      }}
                      disabled={loadingRequesters}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      {visibleRequesterOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.fullName} · {option.username}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-blue-700 sm:col-span-2">
                      Bạn đang có quyền tạo yêu cầu thay cho một tài khoản đang hoạt động.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Field label="Loại đăng ký" error={errors.bookingType?.message}>
              <select
                {...register("bookingType")}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="FULL_LAB">Sử dụng toàn bộ phòng</option>
                <option value="COMPUTERS_ONLY">Sử dụng máy tính (có thể mượn kèm thiết bị)</option>
                <option value="EQUIPMENT_ONLY">Chỉ mượn thiết bị</option>
              </select>
            </Field>
            <Field label="Mục đích" error={errors.purpose?.message}>
              <div className="space-y-2">
                <select
                  {...register("purposeGroupId")}
                  disabled={loadingPurposeOptions}
                  onChange={(event) => {
                    const selectedValue = event.target.value;
                    const selectedOption: BookingPurposeOption | undefined = purposeOptions.find((option) => (
                      option.id ? option.id === selectedValue : `legacy:${option.name}` === selectedValue
                    ));
                    setValue("purposeGroupId", selectedValue, { shouldValidate: true });
                    if (selectedOption) setValue("purpose", selectedOption.name, { shouldValidate: true });
                  }}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn mục đích gợi ý (không bắt buộc)</option>
                  {purposeOptions.map((option) => {
                    const optionValue = option.id || `legacy:${option.name}`;
                    return (
                      <option key={optionValue} value={optionValue}>
                        {option.name} · {option.usageCount} lần
                      </option>
                    );
                  })}
                </select>
                <Input
                  {...register("purpose", {
                    onChange: () => setValue("purposeGroupId", "", { shouldValidate: false }),
                  })}
                  placeholder="Hoặc nhập mục đích riêng, ví dụ: Nghiên cứu môn IoT"
                />
                <p className="text-[10px] text-slate-500">
                  Mục đích gần giống nhau sẽ được hệ thống tự gom vào cùng nhóm để thống kê.
                </p>
              </div>
            </Field>
            <Field label="Bắt đầu" error={errors.startTime?.message}>
              <Input type="datetime-local" {...register("startTime")} />
            </Field>
            <Field label="Kết thúc" error={errors.endTime?.message}>
              <Input type="datetime-local" {...register("endTime")} />
            </Field>
            {bookingType !== "EQUIPMENT_ONLY" && (
              <Field label="Số người" error={errors.numberOfPeople?.message}>
                <Input type="number" min={1} {...register("numberOfPeople")} />
              </Field>
            )}
            {bookingType !== "EQUIPMENT_ONLY" && (
              <Field
                label={`Chọn máy tính (${selectedComputerIds.length} máy)`}
                error={errors.computerIds?.message}
              >
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {!validPeriod ? <p className="text-sm text-slate-600">Chọn giờ bắt đầu và kết thúc trước.</p> : loadingEquipments ? <p role="status">Đang kiểm tra máy trống…</p> : equipmentError ? <p role="alert">Không tải được danh sách máy. Vui lòng thử lại.</p> : <>
                    {(equipmentList?.computers.items || []).map(c => <label key={c.id} className="flex items-start gap-2 text-sm"><input type="checkbox" value={c.id} {...register('computerIds')} disabled={!c.available && !selectedComputerIds.includes(c.id)} className="mt-1 h-4 w-4 accent-blue-600" /><span>{c.code} · {c.position || c.name}<span className="block text-xs text-slate-600">{c.available ? 'Trống theo giờ đã chọn' : 'Không còn khả dụng – cần bỏ chọn'}</span></span></label>)}
                    {!equipmentList?.computers.items?.length && <p className="text-sm text-slate-600">Chưa có máy tính.</p>}
                  </>}
                </div>
              </Field>
            )}
            {(
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{bookingType === "EQUIPMENT_ONLY" ? "Thiết bị đăng ký mượn" : "Thiết bị mượn kèm (tùy chọn)"}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Kiểm tra tên và số lượng thiết bị trước khi gửi yêu cầu.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 bg-white text-blue-700">
                    Tổng: {requestedEquipmentCount} thiết bị
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => equipmentFields.append({ equipmentId: "", quantity: 1 })}
                  >
                    <Plus />
                    Thêm dòng
                  </Button>
                </div>
                <div className="space-y-2">
                  {equipmentError && (
                    <p className="text-[11px] text-red-600">
                      Không tải được danh sách thiết bị. Kiểm tra quyền xem thiết bị hoặc kết nối máy chủ.
                    </p>
                  )}
                  {equipmentFields.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]">
                      <label className="block">
                        <span className="sr-only">Thiết bị dòng {index + 1}</span>
                        <select
                          {...register(`equipments.${index}.equipmentId`)}
                          disabled={loadingEquipments}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            {loadingEquipments ? "Đang tải thiết bị..." : availableEquipments.length ? "Chọn thiết bị" : "Chưa có thiết bị khả dụng"}
                          </option>
                          {availableEquipments.map((equipment) => (
                            <option key={equipment.id} value={equipment.id}>
                              {equipmentCategoryName.get(equipment.categoryId) || "Khác"} · {equipment.code} · {equipment.name} (còn {equipment.availableQuantity})
                            </option>
                          ))}
                        </select>
                        {errors.equipments?.[index]?.equipmentId?.message && (
                          <span className="mt-1 block text-[11px] text-red-600">{errors.equipments[index]?.equipmentId?.message}</span>
                        )}
                      </label>
                      <label className="block">
                        <span className="sr-only">Số lượng dòng {index + 1}</span>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          {...register(`equipments.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {errors.equipments?.[index]?.quantity?.message && (
                          <span className="mt-1 block text-[11px] text-red-600">{errors.equipments[index]?.quantity?.message}</span>
                        )}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => equipmentFields.remove(index)}
                        aria-label={`Xóa dòng thiết bị ${index + 1}`}
                      >
                        <XCircle />
                      </Button>
                    </div>
                  ))}
                </div>
                {errors.equipments?.message && (
                  <p className="mt-2 text-[11px] text-red-600">{errors.equipments.message as string}</p>
                )}
              </div>
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
