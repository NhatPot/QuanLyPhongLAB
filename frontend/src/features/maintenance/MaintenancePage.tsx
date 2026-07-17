"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  LoaderCircle,
  Monitor,
  PackageOpen,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  School,
  Trash2,
  UserRound,
  WalletCards,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  maintenanceApi,
  type MaintenancePayload,
  type MaintenanceRecord,
  type MaintenanceStatus,
  type MaintenanceTargetType,
} from "@/services/maintenance-api";
import {
  MaintenanceEditorDialog,
  type MaintenanceFormValues,
} from "./MaintenanceEditorDialog";
import {
  MaintenanceCompleteDialog,
  type MaintenanceCompleteValues,
} from "./MaintenanceCompleteDialog";

const PAGE_SIZE = 10;
const STATUS: Record<
  MaintenanceStatus,
  {
    label: string;
    variant: "warning" | "default" | "success" | "secondary";
    dot: string;
  }
> = {
  PENDING: {
    label: "Chờ xếp lịch",
    variant: "secondary",
    dot: "bg-violet-500",
  },
  SCHEDULED: { label: "Đã lên lịch", variant: "warning", dot: "bg-amber-500" },
  IN_PROGRESS: {
    label: "Đang thực hiện",
    variant: "default",
    dot: "bg-blue-500",
  },
  COMPLETED: { label: "Hoàn tất", variant: "success", dot: "bg-emerald-500" },
  CANCELLED: { label: "Đã hủy", variant: "secondary", dot: "bg-slate-400" },
};
export default function MaintenancePage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<MaintenanceStatus | "">("");
  const [targetType, setTargetType] = useState<MaintenanceTargetType | "">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRecord | null>(null);
  const [detail, setDetail] = useState<MaintenanceRecord | null>(null);
  const [completeTarget, setCompleteTarget] =
    useState<MaintenanceRecord | null>(null);
  const [completeError, setCompleteError] = useState("");
  const [startTarget, setStartTarget] = useState<MaintenanceRecord | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<MaintenanceRecord | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(
    null,
  );
  const [actionError, setActionError] = useState("");

  const listQuery = useQuery({
    queryKey: ["maintenances", { page, keyword, status, targetType }],
    queryFn: () =>
      maintenanceApi.list({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        status: status || undefined,
        targetType: targetType || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["maintenance-summary"],
    queryFn: maintenanceApi.summary,
  });
  const optionsQuery = useQuery({
    queryKey: ["maintenance-options"],
    queryFn: maintenanceApi.options,
  });

  const canCreate = hasPermission("MAINTENANCE_CREATE");
  const canUpdate = hasPermission("MAINTENANCE_UPDATE");
  const canStart = hasPermission("MAINTENANCE_START");
  const canComplete = hasPermission("MAINTENANCE_COMPLETE");
  const canCancel = hasPermission("MAINTENANCE_CANCEL");
  const canDelete = hasPermission("MAINTENANCE_DELETE");
  const rows = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;
  const summary = summaryQuery.data || {
    total: 0,
    pending: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    totalActualCost: 0,
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
      queryClient.invalidateQueries({ queryKey: ["maintenance-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["maintenance-options"] }),
      queryClient.invalidateQueries({ queryKey: ["computer-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["computers"] }),
      queryClient.invalidateQueries({ queryKey: ["equipments"] }),
      queryClient.invalidateQueries({ queryKey: ["lab-profile"] }),
    ]);
  };

  const reminderSyncQuery = useQuery({
    queryKey: ["maintenance-reminder-sync"],
    queryFn: maintenanceApi.syncReminders,
    enabled: canCreate,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  useEffect(() => {
    if (reminderSyncQuery.data?.created) void refresh();
  }, [reminderSyncQuery.data?.created]);

  const saveMutation = useMutation({
    mutationFn: ({
      item,
      values,
    }: {
      item: MaintenanceRecord | null;
      values: MaintenanceFormValues;
    }) => {
      const payload: MaintenancePayload = {
        ...values,
        scheduledStartAt: new Date(values.scheduledStartAt).toISOString(),
        expectedEndAt: new Date(values.expectedEndAt).toISOString(),
        technicianId: values.technicianId || undefined,
        maintenanceSource:
          values.targetType === "EQUIPMENT"
            ? values.maintenanceSource
            : undefined,
        quantity: values.targetType === "EQUIPMENT" ? values.quantity : 1,
        description: values.description || undefined,
        partsNote: values.partsNote || undefined,
      };
      return item
        ? maintenanceApi.update(item.id, payload)
        : maintenanceApi.create(payload);
    },
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.item ? "Đã cập nhật lịch bảo trì" : "Đã tạo lịch bảo trì",
      );
      setEditorOpen(false);
      setSelected(null);
      await refresh();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Không thể lưu lịch bảo trì.")),
  });
  const startMutation = useMutation({
    mutationFn: maintenanceApi.start,
    onSuccess: async () => {
      setStartTarget(null);
      setActionError("");
      toast.success("Đã bắt đầu bảo trì và cập nhật trạng thái tài sản");
      await refresh();
    },
    onError: (error) => {
      const message = errorMessage(error, "Không thể bắt đầu bảo trì.");
      setActionError(message);
      toast.error(message);
    },
  });
  const completeMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceCompleteValues;
    }) => maintenanceApi.complete(id, values),
    onSuccess: async () => {
      toast.success("Đã hoàn tất và ghi nhận kết quả bảo trì");
      setCompleteTarget(null);
      setCompleteError("");
      await refresh();
    },
    onError: (error) => {
      const message = errorMessage(error, "Không thể hoàn tất bảo trì.");
      setCompleteError(message);
      toast.error(message);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      maintenanceApi.cancel(id, reason),
    onSuccess: async () => {
      setCancelTarget(null);
      setActionError("");
      toast.success("Đã hủy lịch bảo trì");
      await refresh();
    },
    onError: (error) => {
      const message = errorMessage(error, "Không thể hủy lịch bảo trì.");
      setActionError(message);
      toast.error(message);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: maintenanceApi.delete,
    onSuccess: async () => {
      setDeleteTarget(null);
      setActionError("");
      toast.success("Đã xóa lịch bảo trì");
      await refresh();
    },
    onError: (error) => {
      const message = errorMessage(error, "Không thể xóa lịch bảo trì.");
      setActionError(message);
      toast.error(message);
    },
  });

  const openCreate = () => {
    setSelected(null);
    setEditorOpen(true);
  };
  const openEdit = (item: MaintenanceRecord) => {
    setSelected(item);
    setEditorOpen(true);
  };
  const resetFilters = () => {
    setKeyword("");
    setStatus("");
    setTargetType("");
    setPage(1);
  };

  return (
    <div className="animate-float-in space-y-5">
      <PageHeader
        eyebrow="Vận hành"
        title="Bảo trì tài sản"
        description="Lập kế hoạch, phân công và theo dõi toàn bộ vòng đời bảo trì phòng Lab, máy tính và thiết bị."
      >
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus />
            Lập lịch bảo trì
          </Button>
        )}
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Tổng lịch"
          value={summary.total}
          helper="Toàn bộ hồ sơ"
          icon={Wrench}
          tone="violet"
        />
        <SummaryCard
          label="Chờ xếp lịch"
          value={summary.pending}
          helper="Sự cố và nhắc định kỳ"
          icon={CircleAlert}
          tone="violet"
        />
        <SummaryCard
          label="Đã lên lịch"
          value={summary.scheduled}
          helper={`${summary.overdue} lịch quá hạn`}
          icon={CalendarClock}
          tone="amber"
        />
        <SummaryCard
          label="Đang thực hiện"
          value={summary.inProgress}
          helper="Đang khóa tài sản"
          icon={LoaderCircle}
          tone="blue"
        />
        <SummaryCard
          label="Đã hoàn tất"
          value={summary.completed}
          helper="Có kết quả xử lý"
          icon={CheckCircle2}
          tone="emerald"
        />
        <SummaryCard
          label="Chi phí thực tế"
          value={formatMoney(summary.totalActualCost)}
          helper="Các lịch đã hoàn tất"
          icon={WalletCards}
          tone="slate"
          compact
        />
      </section>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Kế hoạch và lịch sử bảo trì
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Tài sản được đồng bộ trạng thái khi bắt đầu và hoàn tất.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="relative min-w-60 flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm mã, tiêu đề, tài sản..."
                  className={filterInputClass}
                />
              </div>
              <select
                value={targetType}
                onChange={(event) => {
                  setTargetType(
                    event.target.value as MaintenanceTargetType | "",
                  );
                  setPage(1);
                }}
                className={filterSelectClass}
              >
                <option value="">Tất cả tài sản</option>
                <option value="LAB">Phòng Lab</option>
                <option value="COMPUTER">Máy tính</option>
                <option value="EQUIPMENT">Thiết bị</option>
              </select>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as MaintenanceStatus | "");
                  setPage(1);
                }}
                className={filterSelectClass}
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS).map(([code, item]) => (
                  <option key={code} value={code}>
                    {item.label}
                  </option>
                ))}
              </select>
              {(keyword || status || targetType) && (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  <RefreshCw />
                  Đặt lại
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {listQuery.isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : listQuery.isError ? (
          <ErrorState onRetry={() => void listQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState canCreate={canCreate} onCreate={openCreate} />
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1160px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/80">
                  <tr className="text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-400">
                    <th className="px-4 py-3">Lịch bảo trì</th>
                    <th className="px-4 py-3">Tài sản</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Phụ trách</th>
                    <th className="px-4 py-3">Chi phí</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((item) => (
                    <MaintenanceRow
                      key={item.id}
                      item={item}
                      permissions={{
                        canUpdate,
                        canStart,
                        canComplete,
                        canCancel,
                        canDelete,
                      }}
                      actions={{
                        setDetail,
                        openEdit,
                        start: () => {
                          setActionError("");
                          setStartTarget(item);
                        },
                        complete: () => {
                          setCompleteError("");
                          setCompleteTarget(item);
                        },
                        cancel: () => {
                          setActionError("");
                          setCancelTarget(item);
                        },
                        delete: () => {
                          setActionError("");
                          setDeleteTarget(item);
                        },
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 xl:hidden">
              {rows.map((item) => (
                <MaintenanceMobileCard
                  key={item.id}
                  item={item}
                  permissions={{
                    canUpdate,
                    canStart,
                    canComplete,
                    canCancel,
                    canDelete,
                  }}
                  actions={{
                    view: () => setDetail(item),
                    edit: () => openEdit(item),
                    start: () => {
                      setActionError("");
                      setStartTarget(item);
                    },
                    complete: () => {
                      setCompleteError("");
                      setCompleteTarget(item);
                    },
                    cancel: () => {
                      setActionError("");
                      setCancelTarget(item);
                    },
                    delete: () => {
                      setActionError("");
                      setDeleteTarget(item);
                    },
                  }}
                />
              ))}
            </div>
            <Pagination
              page={meta?.page || page}
              totalPages={Math.max(1, meta?.totalPages || 1)}
              totalItems={meta?.totalItems || 0}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <MaintenanceEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setSelected(null);
        }}
        options={optionsQuery.data}
        selected={selected}
        pending={saveMutation.isPending}
        onSubmit={(values) => saveMutation.mutate({ item: selected, values })}
      />
      <MaintenanceCompleteDialog
        target={completeTarget}
        open={!!completeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteTarget(null);
            setCompleteError("");
          }
        }}
        pending={completeMutation.isPending}
        error={completeError || undefined}
        onSubmit={(values) =>
          completeTarget &&
          completeMutation.mutate({ id: completeTarget.id, values })
        }
      />
      <MaintenanceDetailDialog
        item={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(startTarget)}
        onOpenChange={(open) => {
          if (!open) setStartTarget(null);
        }}
        title="Bắt đầu bảo trì"
        description={
          startTarget
            ? `Tài sản ${startTarget.targetCode} sẽ chuyển sang trạng thái bảo trì và bắt đầu ghi nhận lịch sử.`
            : ""
        }
        confirmLabel="Bắt đầu bảo trì"
        pending={startMutation.isPending}
        error={actionError}
        onConfirm={() => {
          if (startTarget) startMutation.mutate(startTarget.id);
        }}
      />
      <ReasonDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Hủy lịch bảo trì"
        description="Vui lòng nhập lý do hủy lịch. Lý do sẽ được lưu cùng lịch sử bảo trì."
        reference={cancelTarget ? `Mã lịch: ${cancelTarget.code}` : undefined}
        label="Lý do hủy lịch"
        placeholder="Nhập lý do hủy lịch bảo trì..."
        confirmLabel="Xác nhận hủy"
        pending={cancelMutation.isPending}
        error={actionError}
        onConfirm={(reason) => {
          if (cancelTarget)
            cancelMutation.mutate({ id: cancelTarget.id, reason });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa lịch bảo trì"
        description={
          deleteTarget
            ? `Lịch ${deleteTarget.code} sẽ bị xóa khỏi danh sách. Hành động này không thể hoàn tác.`
            : ""
        }
        confirmLabel="Xác nhận xóa"
        destructive
        pending={deleteMutation.isPending}
        error={actionError}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function MaintenanceRow({
  item,
  permissions,
  actions,
}: {
  item: MaintenanceRecord;
  permissions: Record<string, boolean>;
  actions: {
    setDetail: (item: MaintenanceRecord) => void;
    openEdit: (item: MaintenanceRecord) => void;
    start: () => void;
    complete: () => void;
    cancel: () => void;
    delete: () => void;
  };
}) {
  const Icon = targetIcon(item.targetType);
  return (
    <tr
      className={cn(
        "transition hover:bg-blue-50/25",
        item.isOverdue && "bg-red-50/20",
      )}
    >
      <td className="px-4 py-4">
        <button onClick={() => actions.setDetail(item)} className="text-left">
          <p className="text-xs font-extrabold text-blue-700">{item.code}</p>
          <p className="mt-1 max-w-60 truncate text-sm font-bold text-slate-800">
            {item.title}
          </p>
          <p className="mt-1 max-w-60 truncate text-[10px] text-slate-400">
            {item.reason}
          </p>
        </button>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-700">
              {item.targetCode}
            </p>
            <p className="mt-0.5 max-w-44 truncate text-[10px] text-slate-400">
              {item.targetName}
              {item.quantity > 1 ? ` · SL ${item.quantity}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-xs font-semibold text-slate-700">
          {item.status === "PENDING" ? "Hạn đề xuất: " : ""}
          {formatDateTime(item.scheduledStartAt)}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            item.isOverdue ? "font-bold text-red-600" : "text-slate-400",
          )}
        >
          {item.status === "PENDING"
            ? sourceLabel(item.triggerSource)
            : `đến ${formatDateTime(item.expectedEndAt)}`}
          {item.isOverdue ? " · Quá hạn" : ""}
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs font-semibold text-slate-700">
              {item.technicianName || "Chưa phân công"}
            </p>
            {item.technicianUsername && (
              <p className="text-[10px] text-slate-400">
                @{item.technicianUsername}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-xs font-bold text-slate-700">
          {formatMoney(item.actualCost ?? item.estimatedCost)}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          {item.actualCost === null ? "Dự kiến" : "Thực tế"}
        </p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge item={item} />
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-1">
          <IconButton
            title="Xem chi tiết"
            onClick={() => actions.setDetail(item)}
          >
            <Eye />
          </IconButton>
          {["PENDING", "SCHEDULED"].includes(item.status) &&
            permissions.canUpdate && (
              <IconButton
                title={item.status === "PENDING" ? "Xếp lịch" : "Chỉnh sửa"}
                onClick={() => actions.openEdit(item)}
              >
                <Pencil />
              </IconButton>
            )}
          {item.status === "SCHEDULED" && permissions.canStart && (
            <IconButton
              title="Bắt đầu"
              className="hover:bg-blue-50 hover:text-blue-600"
              onClick={actions.start}
            >
              <Play />
            </IconButton>
          )}
          {item.status === "IN_PROGRESS" && permissions.canComplete && (
            <IconButton
              title="Hoàn tất"
              className="hover:bg-emerald-50 hover:text-emerald-600"
              onClick={actions.complete}
            >
              <CheckCircle2 />
            </IconButton>
          )}
          {["PENDING", "SCHEDULED"].includes(item.status) &&
            permissions.canCancel && (
              <IconButton
                title="Hủy lịch"
                className="hover:bg-amber-50 hover:text-amber-600"
                onClick={actions.cancel}
              >
                <XCircle />
              </IconButton>
            )}
          {["PENDING", "SCHEDULED", "CANCELLED"].includes(item.status) &&
            permissions.canDelete && (
              <IconButton
                title="Xóa"
                className="hover:bg-red-50 hover:text-red-600"
                onClick={actions.delete}
              >
                <Trash2 />
              </IconButton>
            )}
        </div>
      </td>
    </tr>
  );
}

function MaintenanceMobileCard({
  item,
  permissions,
  actions,
}: {
  item: MaintenanceRecord;
  permissions: Record<string, boolean>;
  actions: {
    view: () => void;
    edit: () => void;
    start: () => void;
    complete: () => void;
    cancel: () => void;
    delete: () => void;
  };
}) {
  const Icon = targetIcon(item.targetType);
  return (
    <div className="p-4 hover:bg-slate-50">
      <button onClick={actions.view} className="w-full text-left">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-blue-600">
                  {item.code}
                </p>
                <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
                  {item.title}
                </p>
              </div>
              <StatusBadge item={item} />
            </div>
            <p className="mt-2 truncate text-xs font-semibold text-slate-600">
              {item.targetCode} · {item.targetName}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {item.status === "PENDING"
                ? `Hạn đề xuất: ${formatDateTime(item.scheduledStartAt)}`
                : `${formatDateTime(item.scheduledStartAt)} → ${formatDateTime(item.expectedEndAt)}`}
            </p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
        <IconButton title="Xem chi tiết" onClick={actions.view}>
          <Eye />
        </IconButton>
        {["PENDING", "SCHEDULED"].includes(item.status) &&
          permissions.canUpdate && (
            <IconButton
              title={item.status === "PENDING" ? "Xếp lịch" : "Chỉnh sửa"}
              onClick={actions.edit}
            >
              <Pencil />
            </IconButton>
          )}
        {item.status === "SCHEDULED" && permissions.canStart && (
          <IconButton
            title="Bắt đầu"
            className="hover:bg-blue-50 hover:text-blue-600"
            onClick={actions.start}
          >
            <Play />
          </IconButton>
        )}
        {item.status === "IN_PROGRESS" && permissions.canComplete && (
          <IconButton
            title="Hoàn tất"
            className="hover:bg-emerald-50 hover:text-emerald-600"
            onClick={actions.complete}
          >
            <CheckCircle2 />
          </IconButton>
        )}
        {["PENDING", "SCHEDULED"].includes(item.status) &&
          permissions.canCancel && (
            <IconButton
              title="Hủy lịch"
              className="hover:bg-amber-50 hover:text-amber-600"
              onClick={actions.cancel}
            >
              <XCircle />
            </IconButton>
          )}
        {["PENDING", "SCHEDULED", "CANCELLED"].includes(item.status) &&
          permissions.canDelete && (
            <IconButton
              title="Xóa"
              className="hover:bg-red-50 hover:text-red-600"
              onClick={actions.delete}
            >
              <Trash2 />
            </IconButton>
          )}
      </div>
    </div>
  );
}

function MaintenanceDetailDialog({
  item,
  onOpenChange,
}: {
  item: MaintenanceRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;
  const Icon = targetIcon(item.targetType);
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết bảo trì {item.code}</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Tài sản">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-600" />
              {item.targetCode} · {item.targetName}
            </div>
          </Detail>
          <Detail label="Trạng thái">
            <StatusBadge item={item} />
          </Detail>
          <Detail
            label={
              item.status === "PENDING" ? "Hạn đề xuất" : "Bắt đầu dự kiến"
            }
          >
            {formatDateTime(item.scheduledStartAt)}
          </Detail>
          <Detail label="Kết thúc dự kiến">
            {formatDateTime(item.expectedEndAt)}
          </Detail>
          <Detail label="Nguồn phát sinh">
            {sourceLabel(item.triggerSource)}
          </Detail>
          <Detail label="Người phụ trách">
            {item.technicianName || "Chưa phân công"}
          </Detail>
          <Detail label="Số lượng">{item.quantity}</Detail>
          <Detail label="Chi phí dự kiến">
            {formatMoney(item.estimatedCost)}
          </Detail>
          <Detail label="Chi phí thực tế">
            {item.actualCost === null
              ? "Chưa có"
              : formatMoney(item.actualCost)}
          </Detail>
          <div className="sm:col-span-2">
            <Detail label="Lý do">{item.reason}</Detail>
          </div>
          {item.description && (
            <div className="sm:col-span-2">
              <Detail label="Ghi chú">{item.description}</Detail>
            </div>
          )}
          {item.partsNote && (
            <div className="sm:col-span-2">
              <Detail label="Linh kiện/vật tư">{item.partsNote}</Detail>
            </div>
          )}
          {item.resultNote && (
            <div className="sm:col-span-2">
              <Detail label="Kết quả bảo trì">{item.resultNote}</Detail>
            </div>
          )}
          {item.cancellationReason && (
            <div className="sm:col-span-2">
              <Detail label="Lý do hủy">{item.cancellationReason}</Detail>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="mt-1.5 text-xs font-semibold leading-5 text-slate-700">
        {children}
      </div>
    </div>
  );
}
function StatusBadge({ item }: { item: MaintenanceRecord }) {
  const status = STATUS[item.status];
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={status.variant}>
        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", status.dot)} />
        {status.label}
      </Badge>
      {item.isOverdue && (
        <span className="text-[9px] font-extrabold text-red-600">QUÁ HẠN</span>
      )}
    </div>
  );
}
function IconButton({
  title,
  className,
  onClick,
  children,
}: {
  title: string;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 [&_svg]:h-3.5 [&_svg]:w-3.5",
        className,
      )}
    >
      {children}
    </button>
  );
}
function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  compact,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: typeof Wrench;
  tone: "violet" | "amber" | "blue" | "emerald" | "slate";
  compact?: boolean;
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            tones[tone],
          )}
        >
          <Icon className={cn("h-5 w-5", tone === "blue" && "animate-pulse")} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate font-extrabold text-slate-900",
              compact ? "text-base" : "text-2xl",
            )}
          >
            {value}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-slate-400">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function Pagination({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <p className="text-[10px] font-medium text-slate-400">
        {totalItems} lịch bảo trì
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs font-bold text-slate-600">
          {page}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
function EmptyState({
  canCreate,
  onCreate,
}: {
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
      <span className="rounded-3xl bg-blue-50 p-5 text-blue-600">
        <Wrench className="h-8 w-8" />
      </span>
      <h3 className="mt-4 text-base font-extrabold text-slate-800">
        Chưa có lịch bảo trì
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Lập lịch đầu tiên để theo dõi người phụ trách, chi phí và lịch sử bảo
        trì tài sản.
      </p>
      {canCreate && (
        <Button className="mt-5" onClick={onCreate}>
          <Plus />
          Lập lịch đầu tiên
        </Button>
      )}
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <CircleAlert className="h-9 w-9 text-red-300" />
      <p className="mt-3 text-sm font-bold text-slate-700">
        Không thể tải dữ liệu bảo trì
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw />
        Thử lại
      </Button>
    </div>
  );
}

function targetIcon(type: MaintenanceTargetType) {
  return type === "LAB" ? School : type === "EQUIPMENT" ? PackageOpen : Monitor;
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
function errorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message || fallback
  );
}
function sourceLabel(source: MaintenanceRecord["triggerSource"]) {
  return source === "BROKEN_STATUS"
    ? "Tự động từ trạng thái bị hỏng"
    : source === "MAINTENANCE_STATUS"
      ? "Đồng bộ máy đang bảo trì"
      : source === "PERIODIC_270"
        ? "Nhắc định kỳ 270 ngày"
        : "Lập lịch thủ công";
}
const filterInputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";
const filterSelectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";
