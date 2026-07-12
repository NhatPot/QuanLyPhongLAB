import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Mật khẩu cũ phải dài ít nhất 6 ký tự.'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải dài ít nhất 6 ký tự.'),
  confirmNewPassword: z.string()
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Xác nhận mật khẩu mới không khớp.',
  path: ['confirmNewPassword']
});

type ChangePasswordFields = z.infer<typeof changePasswordSchema>;

const ChangePasswordPage: React.FC = () => {
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangePasswordFields>({
    resolver: zodResolver(changePasswordSchema)
  });

  const onSubmit = async (data: ChangePasswordFields) => {
    setServerError(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      navigate('/', { replace: true });
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.';
      setServerError(errMsg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Thay đổi mật khẩu
          </h2>
          {user?.mustChangePassword && (
            <p className="mt-2 text-center text-sm text-amber-600 font-medium bg-amber-50 rounded-lg p-2 border border-amber-200">
              Đây là lần đầu đăng nhập. Bạn bắt buộc phải đổi mật khẩu để tiếp tục sử dụng hệ thống.
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
              <div className="relative mt-1">
                <input
                  {...register('currentPassword')}
                  type={showCurrent ? 'text' : 'password'}
                  className="block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Mật khẩu mới</label>
              <div className="relative mt-1">
                <input
                  {...register('newPassword')}
                  type={showNew ? 'text' : 'password'}
                  className="block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 pr-10 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label>
              <input
                {...register('confirmNewPassword')}
                type="password"
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
                placeholder="••••••••"
              />
              {errors.confirmNewPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmNewPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-lg bg-blue-600 py-2.5 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                'Đổi mật khẩu và tiếp tục'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
