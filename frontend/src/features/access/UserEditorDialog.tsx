'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Check, Save, UserPlus, X } from 'lucide-react';
import { z } from 'zod';
import { ROLE_DEFINITIONS, type RoleCode, type UserRecord } from './access-control-data';
import { cn } from '@/lib/utils';

const userSchema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ và tên.'),
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập cần ít nhất 3 ký tự.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập không được chứa khoảng trắng.'),
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

export function UserEditorDialog({ open, user, canAssignRole, onClose, onSave }: UserEditorDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;
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

  const selectedRoles = watch('roles');
  const toggleRole = (role: RoleCode) => {
    if (!canAssignRole) return;
    const nextRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((item) => item !== role)
      : [...selectedRoles, role];
    setValue('roles', nextRoles, { shouldDirty: true, shouldValidate: true });
  };

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
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 id="user-editor-title" className="text-lg font-extrabold text-slate-950">
                {user ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {user ? 'Chỉnh sửa hồ sơ, trạng thái và vai trò của tài khoản.' : 'Tạo hồ sơ truy cập mới cho hệ thống phòng Lab.'}
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

        <form onSubmit={handleSubmit(onSave)} className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" error={errors.fullName?.message}>
              <input {...register('fullName')} className={inputClass} placeholder="Nguyễn Văn A" autoFocus />
            </Field>
            <Field label="Tên đăng nhập" error={errors.username?.message}>
              <input {...register('username')} className={inputClass} placeholder="nguyenvana" disabled={Boolean(user)} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputClass} placeholder="user@lhu.edu.vn" />
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
                  placeholder="Ít nhất 8 ký tự, có hoa/thường/số"
                  autoComplete="new-password"
                />
              </Field>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Vai trò được gán</h3>
                <p className="mt-0.5 text-xs text-slate-400">Một người dùng có thể đảm nhiệm nhiều vai trò.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
                {selectedRoles.length} đã chọn
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ROLE_DEFINITIONS.map((role) => {
                const checked = selectedRoles.includes(role.code);
                return (
                  <button
                    key={role.code}
                    type="button"
                    disabled={!canAssignRole}
                    onClick={() => toggleRole(role.code)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                      checked
                        ? 'border-blue-200 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                      !canAssignRole && 'cursor-not-allowed opacity-70',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                        checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-xs font-extrabold text-slate-800">{role.name}</strong>
                      <small className="mt-0.5 block text-[10px] leading-4 text-slate-400">{role.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.roles?.message && <p className="mt-2 text-xs font-semibold text-red-500">{errors.roles.message}</p>}
          </div>

          {!user && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              Tài khoản mới sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên khi kết nối API thật.
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
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
