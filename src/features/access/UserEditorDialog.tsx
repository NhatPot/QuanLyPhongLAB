'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Check,
  CircleDollarSign,
  ClipboardCheck,
  FileBarChart,
  Layers,
  Monitor,
  PackageOpen,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { z } from 'zod';
import {
  PERMISSION_GROUPS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_PRESETS,
  type RoleCode,
  type UserRecord,
} from './access-control-data';
import { cn } from '@/lib/utils';
import { isSchoolEmail } from '@/lib/school-email';

const userSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ và tên.'),
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập cần ít nhất 3 ký tự.')
    .max(100)
    .regex(/^[a-zA-Z0-9._@+\-]+$/, 'Tài khoản đăng nhập không được chứa khoảng trắng.'),
  email: z.string().trim().email('Địa chỉ email chưa đúng định dạng.'),
  phone: z.string().trim().optional(),
  department: z.string().trim().min(2, 'Vui lòng nhập đơn vị công tác.'),
  status: z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']),
  roles: z.array(z.enum(['ADMIN', 'TEACHER', 'COLLABORATOR', 'LAB_STAFF', 'STUDENT', 'MANAGER'])).min(1, 'Chọn ít nhất một vai trò.'),
  temporaryPassword: z.string().optional(),
});

export type UserFormValues = z.infer<typeof userSchema>;

type UserEditorDialogProps = {
  open: boolean;
  user: UserRecord | null;
  canAssignRole: boolean;
  onClose: () => void;
  onSave: (values: UserFormValues) => void;
};

const EMPTY_FORM: UserFormValues = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  department: 'Khoa Công nghệ thông tin',
  status: 'ACTIVE',
  roles: ['STUDENT'],
  temporaryPassword: '',
};

const inputClass =
  'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100';

const GROUP_ICONS: Record<string, LucideIcon> = {
  users: Users,
  lab: ShieldCheck,
  computers: Monitor,
  equipment: PackageOpen,
  maintenance: Wrench,
  bookings: ClipboardCheck,
  expenses: CircleDollarSign,
  incidents: TriangleAlert,
  reports: FileBarChart,
};

export function UserEditorDialog({ open, user, canAssignRole, onClose, onSave }: UserEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [permissionKeyword, setPermissionKeyword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY_FORM,
  });

  const selectedRoles = watch('roles') || [];
  const email = watch('email');
  const isAdministrator = selectedRoles.includes('ADMIN');
  useEffect(() => {
    if (!user && !isAdministrator) setValue('username', email.trim().toLowerCase());
  }, [email, isAdministrator, user, setValue]);

  useEffect(() => {
    if (!open) return;
    const initialRoles = user ? user.roles : EMPTY_FORM.roles;
    const initialPerms = Array.from(
      new Set(initialRoles.flatMap((roleCode) => ROLE_PERMISSION_PRESETS[roleCode] || [])),
    );
    setSelectedPermissions(initialPerms);
    setPermissionKeyword('');
    setActiveTab('roles');

    reset(
      user
        ? {
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            phone: user.phone,
            department: user.department,
            status: user.status,
            roles: user.roles,
            temporaryPassword: '',
          }
        : EMPTY_FORM,
    );
  }, [open, reset, user]);

  if (!open) return null;

  // Sync roles from permissions array
  const syncRolesFromPermissions = (perms: string[]) => {
    const permSet = new Set(perms);
    const matchedRoles: RoleCode[] = ROLE_DEFINITIONS.filter((role) => {
      const preset = ROLE_PERMISSION_PRESETS[role.code];
      if (!preset || preset.length === 0) return false;
      return preset.every((p) => permSet.has(p));
    }).map((r) => r.code);

    const nextRoles: RoleCode[] = matchedRoles.length > 0 ? matchedRoles : (selectedRoles.length > 0 ? selectedRoles : ['STUDENT']);
    setValue('roles', nextRoles, { shouldDirty: true, shouldValidate: true });
  };

  // Toggle role (Quyền lớn cấp vai trò)
  const toggleRole = (role: RoleCode) => {
    if (!canAssignRole) return;
    const isChecked = selectedRoles.includes(role);
    const nextRoles = isChecked
      ? selectedRoles.filter((item) => item !== role)
      : [...selectedRoles, role];

    const rolePreset = ROLE_PERMISSION_PRESETS[role] || [];
    let nextPerms: string[];

    if (!isChecked) {
      nextPerms = Array.from(new Set([...selectedPermissions, ...rolePreset]));
    } else {
      const remainingRolesPerms = new Set(
        nextRoles.flatMap((r) => ROLE_PERMISSION_PRESETS[r] || []),
      );
      nextPerms = selectedPermissions.filter((p) => remainingRolesPerms.has(p));
    }

    setSelectedPermissions(nextPerms);
    setValue('roles', nextRoles.length > 0 ? nextRoles : ['STUDENT'], { shouldDirty: true, shouldValidate: true });
  };

  // Toggle whole permission group (Chọn cả quyền lớn theo nhóm)
  const togglePermissionGroup = (groupId: string) => {
    if (!canAssignRole) return;
    const group = PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;

    const groupPermCodes = group.permissions.map((p) => p.code);
    const allGroupSelected = groupPermCodes.every((code) => selectedPermissions.includes(code));

    let nextPerms: string[];
    if (allGroupSelected) {
      nextPerms = selectedPermissions.filter((code) => !groupPermCodes.includes(code));
    } else {
      nextPerms = Array.from(new Set([...selectedPermissions, ...groupPermCodes]));
    }

    setSelectedPermissions(nextPerms);
    syncRolesFromPermissions(nextPerms);
  };

  // Toggle single permission (Quyền nhỏ)
  const toggleSinglePermission = (code: string) => {
    if (!canAssignRole) return;
    const isSelected = selectedPermissions.includes(code);
    const nextPerms = isSelected
      ? selectedPermissions.filter((c) => c !== code)
      : [...selectedPermissions, code];

    setSelectedPermissions(nextPerms);
    syncRolesFromPermissions(nextPerms);
  };

  // Filter permission groups based on search keyword
  const filteredGroups = PERMISSION_GROUPS.map((group) => {
    const kw = permissionKeyword.trim().toLocaleLowerCase('vi');
    if (!kw) return group;

    const filteredPerms = group.permissions.filter(
      (p) =>
        p.name.toLocaleLowerCase('vi').includes(kw) ||
        p.code.toLocaleLowerCase('vi').includes(kw) ||
        p.description.toLocaleLowerCase('vi').includes(kw),
    );

    return { ...group, permissions: filteredPerms };
  }).filter((group) => group.permissions.length > 0);

  const totalAllPermsCount = PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-editor-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 id="user-editor-title" className="text-lg font-extrabold text-slate-950">
                {user ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {user ? 'Chỉnh sửa hồ sơ, trạng thái và ma trận phân quyền của tài khoản.' : 'Tạo hồ sơ truy cập mới cho hệ thống phòng Lab.'}
              </p>
            </div>
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit(values => {
          if (!user && !values.roles.includes('ADMIN') && !isSchoolEmail(values.email)) {
            setError('email', {message:'Tài khoản mới cần email @lachong.edu.vn hoặc @lhu.edu.vn.'});
            return;
          }
          onSave(values);
        })} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin space-y-5">
            {/* User Profile Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" error={errors.fullName?.message}>
                <input {...register('fullName')} className={inputClass} placeholder="Nguyễn Văn A" autoFocus />
              </Field>
              {(user || isAdministrator) && <Field label={user ? 'Tài khoản đăng nhập hiện tại' : 'Tên đăng nhập admin'} error={errors.username?.message}>
                <input {...register('username')} className={inputClass} placeholder="admin" readOnly={Boolean(user)} />
              </Field>}
              <Field label={!user && !isAdministrator ? 'Email trường / Tài khoản đăng nhập' : 'Email'} error={errors.email?.message}>
                <input {...register('email')} type="email" maxLength={!user && !isAdministrator ? 100 : 255} className={inputClass} placeholder="user@lhu.edu.vn" />
              </Field>
              <Field label="Số điện thoại" error={errors.phone?.message}>
                <input {...register('phone')} className={inputClass} placeholder="0901 234 567" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Đơn vị công tác" error={errors.department?.message}>
                  <input {...register('department')} className={inputClass} placeholder="Khoa / Phòng ban" />
                </Field>
              </div>
              <Field label="Trạng thái tài khoản" error={errors.status?.message}>
                <select {...register('status')} className={inputClass}>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="LOCKED">Đã khóa</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </Field>
              {!user && (
                <Field label="Mật khẩu tạm thời" error={errors.temporaryPassword?.message}>
                  <input
                    {...register('temporaryPassword')}
                    type="password"
                    className={inputClass}
                    placeholder="Nhập mật khẩu bất kỳ"
                    autoComplete="new-password"
                  />
                </Field>
              )}
            </div>

            {/* Permission Assignment Section */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Phân quyền tài khoản</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Cho phép chọn nhanh theo nhóm vai trò hoặc gán chi tiết từng quyền hạn.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700">
                    {selectedPermissions.length}/{totalAllPermsCount} quyền
                  </span>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="mt-3 flex rounded-xl bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-xs font-bold transition',
                    activeTab === 'roles' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Gán theo Vai trò
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-xs font-bold transition',
                    activeTab === 'permissions' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Tùy chỉnh Chi tiết
                </button>
              </div>

              {/* TAB 1: Roles */}
              {activeTab === 'roles' && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ROLE_DEFINITIONS.map((role) => {
                      const checked = selectedRoles.includes(role.code);
                      const presetCount = ROLE_PERMISSION_PRESETS[role.code]?.length || 0;
                      return (
                        <button
                          key={role.code}
                          type="button"
                          disabled={!canAssignRole}
                          onClick={() => toggleRole(role.code)}
                          className={cn(
                            'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                            checked
                              ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            !canAssignRole && 'cursor-not-allowed opacity-70',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                              checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent',
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <strong className="text-xs font-extrabold text-slate-800">{role.name}</strong>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                                {presetCount} quyền
                              </span>
                            </div>
                            <small className="mt-1 block text-[10px] leading-4 text-slate-400">{role.description}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.roles?.message && <p className="text-xs font-semibold text-red-500">{errors.roles.message}</p>}
                </div>
              )}

              {/* TAB 2: Detailed Permissions */}
              {activeTab === 'permissions' && (
                <div className="mt-3 space-y-3">
                  {/* Search box for permissions */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={permissionKeyword}
                      onChange={(e) => setPermissionKeyword(e.target.value)}
                      placeholder="Tìm kiếm quyền hạn theo tên hoặc mã..."
                      className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Groups List */}
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredGroups.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Không tìm thấy quyền hạn phù hợp với từ khóa.
                      </div>
                    ) : (
                      filteredGroups.map((group) => {
                        const Icon = GROUP_ICONS[group.id] || Layers;
                        const groupPermCodes = group.permissions.map((p) => p.code);
                        const selectedCountInGroup = groupPermCodes.filter((code) => selectedPermissions.includes(code)).length;
                        const isAllSelected = groupPermCodes.length > 0 && selectedCountInGroup === groupPermCodes.length;
                        const isSomeSelected = selectedCountInGroup > 0 && !isAllSelected;

                        return (
                          <div key={group.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                            {/* Group Header (Chọn cả quyền lớn cấp nhóm) */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <div>
                                  <h4 className="text-xs font-extrabold text-slate-900">{group.name}</h4>
                                  <p className="text-[10px] text-slate-400">{group.description}</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={!canAssignRole}
                                onClick={() => togglePermissionGroup(group.id)}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition',
                                  isAllSelected
                                    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    : isSomeSelected
                                      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
                                  !canAssignRole && 'cursor-not-allowed opacity-70',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex h-3.5 w-3.5 items-center justify-center rounded border',
                                    isAllSelected
                                      ? 'border-blue-600 bg-blue-600 text-white'
                                      : isSomeSelected
                                        ? 'border-amber-600 bg-amber-600 text-white'
                                        : 'border-slate-300 bg-white text-transparent',
                                  )}
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                                {isAllSelected ? 'Đã chọn cả nhóm' : `Chọn cả nhóm (${selectedCountInGroup}/${groupPermCodes.length})`}
                              </button>
                            </div>

                            {/* Group Permissions List (Quyền nhỏ) */}
                            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                              {group.permissions.map((perm) => {
                                const checked = selectedPermissions.includes(perm.code);
                                return (
                                  <button
                                    key={perm.code}
                                    type="button"
                                    disabled={!canAssignRole}
                                    onClick={() => toggleSinglePermission(perm.code)}
                                    className={cn(
                                      'flex items-start gap-2.5 rounded-lg border p-2 text-left transition',
                                      checked
                                        ? 'border-blue-200 bg-blue-50/50 text-blue-950'
                                        : 'border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white',
                                      !canAssignRole && 'cursor-not-allowed opacity-70',
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                                        checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent',
                                      )}
                                    >
                                      <Check className="h-3 w-3" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-xs font-bold text-slate-800">{perm.name}</span>
                                      <span className="block text-[9px] font-mono text-slate-400">{perm.code}</span>
                                      <span className="mt-0.5 block text-[10px] text-slate-500 leading-3">{perm.description}</span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {!user && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                Tài khoản mới sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên khi kết nối API thật.
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {user ? 'Lưu thay đổi' : 'Thêm người dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-500">{error}</span>}
    </label>
  );
}

