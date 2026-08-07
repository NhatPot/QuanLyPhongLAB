"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CircleOff,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  userApi,
  type UserApiRecord,
  type UserStatus,
} from "@/services/user-api";
import { dataModeLabel, isMockDataMode } from "@/services/data-mode";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  ROLE_DEFINITIONS,
  roleByCode,
  type RoleCode,
  type RoleTone,
  type UserRecord,
} from "./access-control-data";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { UserEditorDialog, type UserFormValues } from "./UserEditorDialog";

const PAGE_SIZE = 8;

const ROLE_TONES: Record<RoleTone, string> = {
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

const STATUS_META: Record<
  UserStatus,
  { label: string; className: string; dot: string }
> = {
  ACTIVE: {
    label: "Đang hoạt động",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  LOCKED: {
    label: "Đã khóa",
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
  INACTIVE: {
    label: "Không hoạt động",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("vi");
const isRoleCode = (value: string): value is RoleCode =>
  ROLE_DEFINITIONS.some((role) => role.code === value);

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");
const formatDateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Chưa đăng nhập";
const apiUserToRecord = (item: UserApiRecord): UserRecord => ({
  id: item.id,
  fullName: item.fullName,
  username: item.username,
  email: item.email,
  phone: item.phone || "",
  department: item.department || "",
  avatarUrl: item.avatarUrl,
  status: item.status,
  roles: item.roles.filter(isRoleCode),
  lastLoginAt: item.lastLoginAt,
  createdAt: item.createdAt || new Date().toISOString(),
});

function errorMessage(error: unknown, fallback: string) {
  const response = (
    error as { response?: { data?: { error?: { message?: string } } } }
  )?.response;
  return response?.data?.error?.message || fallback;
}

export default function UsersPage() {
  const { user: currentUser, hasPermission, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<RoleCode | "">("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    user: UserRecord;
    status: UserStatus;
  } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = hasPermission("USER_CREATE");
  const canUpdate = hasPermission("USER_UPDATE");
  const canUpdateStatus = hasPermission("USER_STATUS_UPDATE");
  const canAssignRole = hasPermission("ROLE_ASSIGN");
  const canDelete = hasPermission("USER_DELETE");

  const listQuery = useQuery({
    queryKey: ["users", { page, keyword, statusFilter, roleFilter }],
    queryFn: () =>
      userApi.list({
        page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        roleCode: roleFilter || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["users-summary"],
    queryFn: userApi.summary,
  });

  const users = useMemo(() => {
    const data = Array.isArray(listQuery.data) ? listQuery.data : (listQuery.data?.data || []);
    return data.map(apiUserToRecord);
  }, [listQuery.data]);
  const totalItems = listQuery.data?.meta?.totalItems ?? (Array.isArray(listQuery.data) ? listQuery.data.length : 0);
  const totalPages = Math.max(1, listQuery.data?.meta?.totalPages ?? Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const summary = summaryQuery.data || {
    total: totalItems,
    active: 0,
    locked: 0,
    inactive: 0,
  };

  const refreshUsers = async (targetId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["users-summary"] }),
    ]);
    if (targetId === currentUser?.id) await refresh();
  };

  const saveMutation = useMutation({
    mutationFn: async ({
      selected,
      values,
    }: {
      selected: UserRecord | null;
      values: UserFormValues;
    }) => {
      if (!selected) {
        if (!values.temporaryPassword)
          throw new Error("Vui lòng nhập mật khẩu tạm thời.");
        return userApi.create({
          fullName: values.fullName,
          email: values.email,
          username: values.username,
          phone: values.phone,
          department: values.department,
          status: values.status,
          roleCodes: values.roles,
          temporaryPassword: values.temporaryPassword,
        });
      }

      let result = await userApi.update(selected.id, {
        fullName: values.fullName,
        email: values.email,
        username: values.username,
        phone: values.phone,
        department: values.department,
      });
      if (
        canAssignRole &&
        JSON.stringify([...selected.roles].sort()) !==
          JSON.stringify([...values.roles].sort())
      ) {
        result = await userApi.assignRoles(selected.id, values.roles);
      }
      if (canUpdateStatus && selected.status !== values.status) {
        result = await userApi.updateStatus(selected.id, values.status);
      }
      return result;
    },
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.selected ? "Đã cập nhật người dùng" : "Đã tạo người dùng mới",
      );
      setEditorOpen(false);
      setSelectedUser(null);
      await refreshUsers(variables.selected?.id);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Không thể lưu người dùng.")),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      userApi.updateStatus(id, status),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.status === "ACTIVE"
          ? "Đã mở khóa tài khoản"
          : "Đã khóa tài khoản",
      );
      setStatusTarget(null);
      setStatusError(null);
      await refreshUsers(variables.id);
    },
    onError: (error) => {
      const message = errorMessage(
        error,
        "Không thể cập nhật trạng thái tài khoản.",
      );
      setStatusError(message);
      toast.error(message);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      userApi.resetPassword(id, password),
    onSuccess: async (_data, variables) => {
      toast.success("Đã đặt lại mật khẩu và thu hồi các phiên đăng nhập");
      setResetTarget(null);
      await refreshUsers(variables.id);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Không thể đặt lại mật khẩu.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: async (_data, id) => {
      toast.success("Đã xóa tài khoản");
      setDeleteTarget(null);
      setDeleteError(null);
      await refreshUsers(id);
    },
    onError: (error) => {
      const message = errorMessage(error, "Không thể xóa tài khoản.");
      setDeleteError(message);
      toast.error(message);
    },
  });

  const saveUser = (values: UserFormValues) => {
    if (
      !selectedUser &&
      !values.temporaryPassword
    ) {
      toast.error("Vui lòng nhập mật khẩu tạm thời.");
      return;
    }
    saveMutation.mutate({ selected: selectedUser, values });
  };

  const openEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setEditorOpen(true);
  };

  const openStatusConfirmation = (user: UserRecord) => {
    setStatusError(null);
    setStatusTarget({
      user,
      status: user.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
    });
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("");
    setRoleFilter("");
    setPage(1);
  };

  return (
    <div className="animate-float-in space-y-4">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">
              Quản trị hệ thống
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-bold",
                isMockDataMode
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              {dataModeLabel}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý hồ sơ, trạng thái tài khoản và vai trò truy cập hệ thống.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setEditorOpen(true);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Thêm người dùng
          </button>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Tổng người dùng"
          value={summary.total}
          helper="Tất cả tài khoản"
          icon={Users}
          tone="blue"
          highlighted
        />
        <SummaryCard
          label="Đang hoạt động"
          value={summary.active}
          helper={`${Math.round((summary.active / Math.max(1, summary.total)) * 100)}% tổng tài khoản`}
          icon={UserCheck}
          tone="emerald"
        />
        <SummaryCard
          label="Đã khóa"
          value={summary.locked}
          helper="Cần quản trị viên mở khóa"
          icon={LockKeyhole}
          tone="red"
        />
        <SummaryCard
          label="Không hoạt động"
          value={summary.inactive}
          helper="Tài khoản tạm ngừng"
          icon={CircleOff}
          tone="slate"
        />
      </section>

      <section className="dashboard-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Danh sách người dùng
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Dữ liệu được tải trực tiếp từ hệ thống.
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
                placeholder="Tìm tên, email, tài khoản..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleCode | "");
                setPage(1);
              }}
              aria-label="Lọc theo vai trò"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả vai trò</option>
              {ROLE_DEFINITIONS.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as UserStatus | "");
                setPage(1);
              }}
              aria-label="Lọc theo trạng thái"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="INACTIVE">Không hoạt động</option>
            </select>
            {(keyword || roleFilter || statusFilter) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          {listQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : listQuery.isError ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-slate-700">
                Không thể tải danh sách người dùng
              </p>
              <button
                type="button"
                onClick={() => void listQuery.refetch()}
                className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"
              >
                Thử tải lại
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[1080px] text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-400">
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Liên hệ</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Đăng nhập gần nhất</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item, index) => (
                  <tr
                    key={item.id}
                    className="group transition hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-xl ring-1 ring-slate-200/80">
                          <AvatarImage
                            src={item.avatarUrl || undefined}
                            alt={`Ảnh đại diện của ${item.fullName}`}
                            className="rounded-xl"
                          />
                          <AvatarFallback
                            className={cn(
                              "rounded-xl text-xs font-extrabold",
                              avatarTone(index),
                            )}
                          >
                            {initialsOf(item.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="max-w-48 truncate text-sm font-extrabold text-slate-800">
                            {item.fullName}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                            @{item.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-slate-600">
                        {item.email}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {item.phone || "Chưa cập nhật SĐT"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex max-w-48 flex-wrap gap-1">
                        {item.roles.map((code) => (
                          <RoleBadge key={code} code={code} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className="max-w-44 truncate text-xs text-slate-600"
                        title={item.department}
                      >
                        {item.department || "Chưa cập nhật"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-slate-600">
                        {formatDateTime(item.lastLoginAt)}
                      </p>
                      {item.id === currentUser?.id && (
                        <p className="mt-1 text-[10px] font-bold text-blue-600">
                          Phiên hiện tại
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Chỉnh sửa"
                            aria-label={`Sửa ${item.fullName}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => setResetTarget(item)}
                            title="Đặt lại mật khẩu"
                            aria-label={`Đặt lại mật khẩu ${item.fullName}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => openStatusConfirmation(item)}
                            disabled={
                              statusMutation.isPending ||
                              item.id === currentUser?.id
                            }
                            title={
                              item.status === "ACTIVE"
                                ? "Khóa tài khoản"
                                : "Mở khóa tài khoản"
                            }
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40",
                              item.status === "ACTIVE"
                                ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                                : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600",
                            )}
                          >
                            {item.status === "ACTIVE" ? (
                              <LockKeyhole className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(item);
                            }}
                            disabled={
                              deleteMutation.isPending ||
                              item.id === currentUser?.id
                            }
                            title="Xóa tài khoản"
                            aria-label={`Xóa tài khoản ${item.fullName}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="h-56 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <span className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                          <Users className="h-7 w-7" />
                        </span>
                        <p className="mt-3 text-sm font-extrabold text-slate-700">
                          Không tìm thấy người dùng
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Hãy thử thay đổi từ khóa hoặc điều kiện lọc.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {!listQuery.isLoading && !listQuery.isError && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-400">
              Hiển thị {users.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(currentPage * PAGE_SIZE, totalItems)} trong {totalItems}{" "}
              người dùng
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-600">
                Trang {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <UserEditorDialog
        open={editorOpen}
        user={selectedUser}
        canAssignRole={canAssignRole}
        onClose={() => {
          setEditorOpen(false);
          setSelectedUser(null);
        }}
        onSave={saveUser}
      />
      <ResetPasswordDialog
        open={Boolean(resetTarget)}
        userName={resetTarget?.fullName || ""}
        onClose={() => setResetTarget(null)}
        onSubmit={(password) =>
          resetTarget &&
          resetPasswordMutation.mutate({ id: resetTarget.id, password })
        }
      />
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
            setStatusError(null);
          }
        }}
        title={
          statusTarget?.status === "LOCKED"
            ? "Khóa tài khoản?"
            : "Mở khóa tài khoản?"
        }
        description={
          statusTarget
            ? `${statusTarget.status === "LOCKED" ? "Tài khoản sẽ không thể đăng nhập" : "Tài khoản sẽ được phép đăng nhập trở lại"}: ${statusTarget.user.fullName} (@${statusTarget.user.username}).`
            : ""
        }
        confirmLabel={
          statusTarget?.status === "LOCKED" ? "Khóa tài khoản" : "Mở khóa"
        }
        destructive={statusTarget?.status === "LOCKED"}
        pending={statusMutation.isPending}
        error={statusError || undefined}
        onConfirm={() => {
          if (statusTarget)
            statusMutation.mutate({
              id: statusTarget.user.id,
              status: statusTarget.status,
            });
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Xóa tài khoản?"
        description={
          deleteTarget
            ? `Tài khoản ${deleteTarget.fullName} (@${deleteTarget.username}) sẽ bị ẩn khỏi danh sách và thu hồi các phiên đăng nhập. Lịch sử hoạt động vẫn được giữ lại.`
            : ""
        }
        confirmLabel="Xóa tài khoản"
        destructive
        pending={deleteMutation.isPending}
        error={deleteError || undefined}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  highlighted = false,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof Users;
  tone: "blue" | "emerald" | "red" | "slate";
  highlighted?: boolean;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <div
      className={cn(
        "flex min-h-[96px] items-center gap-3 overflow-hidden p-4 transition hover:-translate-y-0.5",
        highlighted
          ? "rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#5B43F4] via-[#6D3FF2] to-[#8B2CF5] shadow-[0_10px_24px_rgba(109,63,242,.24)]"
          : "dashboard-card",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          highlighted
            ? "bg-white/15 text-white ring-1 ring-white/25"
            : tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-[11px] font-semibold",
            highlighted ? "text-white/80" : "text-slate-500",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xl font-extrabold leading-none",
            highlighted ? "text-white" : "text-slate-900",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-1.5 truncate text-[10px] font-medium",
            highlighted ? "text-white/75" : "text-slate-400",
          )}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function RoleBadge({ code }: { code: RoleCode }) {
  const role = roleByCode(code);
  return role ? (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-1 text-[9px] font-extrabold",
        ROLE_TONES[role.tone],
      )}
    >
      {role.shortName}
    </span>
  ) : null;
}

function StatusBadge({ status }: { status: UserStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
        meta.className,
      )}
    >
      <i className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

function avatarTone(index: number) {
  return [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-cyan-100 text-cyan-700",
  ][index % 5];
}
