'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  temporaryPassword: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
    .regex(/[a-z]/, 'Cần có chữ thường.')
    .regex(/[A-Z]/, 'Cần có chữ hoa.')
    .regex(/[0-9]/, 'Cần có chữ số.'),
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordDialog({
  open,
  userName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  userName: string;
  onClose: () => void;
  onSubmit: (temporaryPassword: string) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { temporaryPassword: '' },
  });

  useEffect(() => {
    if (open) reset({ temporaryPassword: '' });
  }, [open, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><KeyRound className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-extrabold text-slate-950">Đặt lại mật khẩu</h2>
              <p className="mt-0.5 text-xs text-slate-400">Tài khoản: {userName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit((values) => onSubmit(values.temporaryPassword))} className="p-5">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mật khẩu tạm thời</span>
            <input
              {...register('temporaryPassword')}
              type="password"
              autoFocus
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự, có hoa/thường/số"
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            {errors.temporaryPassword?.message && <span className="mt-1 block text-xs font-medium text-red-500">{errors.temporaryPassword.message}</span>}
          </label>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Các phiên đăng nhập hiện tại của tài khoản sẽ bị thu hồi và người dùng phải đổi mật khẩu sau khi đăng nhập.</p>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"><Save className="h-4 w-4" />Xác nhận</button>
          </div>
        </form>
      </div>
    </div>
  );
}

