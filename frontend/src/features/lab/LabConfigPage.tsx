'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { labApi, LabProfileData } from '@/services/lab-api';
import { useAuth } from '@/features/auth/AuthContext';
import { Save, RefreshCw, ShieldAlert } from 'lucide-react';

const schema = z.object({
  labName: z.string().min(1, 'Tên phòng Lab không được trống.'),
  location: z.string().min(1, 'Vị trí không được trống.'),
  capacity: z.number().min(1, 'Sức chứa tối thiểu phải là 1.'),
  description: z.string().optional(),
  rules: z.string().optional()
});

type Fields = z.infer<typeof schema>;

const LabConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canUpdate = hasPermission('LAB_PROFILE_UPDATE');
  const canUpdateStatus = hasPermission('LAB_STATUS_UPDATE');

  const { data: profile, isLoading, error } = useQuery<LabProfileData>({
    queryKey: ['lab-profile'],
    queryFn: labApi.getProfile
  });

  const { register, handleSubmit, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    values: profile ? {
      labName: profile.labName,
      location: profile.location,
      capacity: profile.capacity,
      description: profile.description || '',
      rules: profile.rules || ''
    } : undefined
  });

  const updateMutation = useMutation({
    mutationFn: labApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['lab-profile'], data);
      setSuccessMsg('Cập nhật cấu hình thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Có lỗi xảy ra khi cập nhật.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const statusMutation = useMutation({
    mutationFn: labApi.updateStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-profile'] });
      setSuccessMsg('Đổi trạng thái phòng Lab thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error?.message || 'Có lỗi xảy ra khi đổi trạng thái.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  });

  const onSubmit = (data: Fields) => {
    updateMutation.mutate(data);
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'MAINTENANCE': return 'bg-amber-50 text-amber-700 border-amber-250';
      case 'LOCKED': return 'bg-red-50 text-red-700 border-red-250';
      default: return 'bg-slate-50 text-slate-700 border-slate-250';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-semibold">Lỗi kết nối dữ liệu</p>
        <p className="text-sm">Không thể lấy cấu hình phòng Lab từ máy chủ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cấu hình phòng Lab" description="Quản lý và cập nhật thông số phòng Lab CNTT duy nhất." />

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-750">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Thông tin chung</h3>
            
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Mã phòng Lab</span>
                <span className="mt-1 font-mono text-sm font-bold text-slate-800">{profile?.labCode}</span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái hiện tại</span>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(profile?.status)}`}>
                    {profile?.status}
                  </span>
                </div>
              </div>

              {canUpdateStatus && (
                <div className="pt-4 border-t border-slate-100">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Đổi trạng thái nhanh</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => statusMutation.mutate('ACTIVE')}
                      disabled={profile?.status === 'ACTIVE' || statusMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-30"
                    >
                      Kích hoạt
                    </button>
                    <button
                      onClick={() => statusMutation.mutate('MAINTENANCE')}
                      disabled={profile?.status === 'MAINTENANCE' || statusMutation.isPending}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-30"
                    >
                      Bảo trì
                    </button>
                    <button
                      onClick={() => statusMutation.mutate('LOCKED')}
                      disabled={profile?.status === 'LOCKED' || statusMutation.isPending}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-30"
                    >
                      Khóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Chi tiết thông số cấu hình</h3>
              {!canUpdate && (
                <span className="flex items-center gap-1 text-xs text-slate-505 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" /> Chỉ xem
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tên phòng Lab</label>
                <input
                  {...register('labName')}
                  type="text"
                  disabled={!canUpdate || updateMutation.isPending}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm"
                />
                {errors.labName && <p className="mt-1 text-xs text-red-500">{errors.labName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Sức chứa tối đa (chỗ ngồi / máy)</label>
                <input
                  {...register('capacity', { valueAsNumber: true })}
                  type="number"
                  disabled={!canUpdate || updateMutation.isPending}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm"
                />
                {errors.capacity && <p className="mt-1 text-xs text-red-500">{errors.capacity.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Vị trí phòng Lab</label>
                <input
                  {...register('location')}
                  type="text"
                  disabled={!canUpdate || updateMutation.isPending}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm"
                />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Mô tả giới thiệu</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  disabled={!canUpdate || updateMutation.isPending}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Nội quy & Quy định phòng Lab</label>
                <textarea
                  {...register('rules')}
                  rows={4}
                  disabled={!canUpdate || updateMutation.isPending}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm"
                />
              </div>
            </div>

            {canUpdate && (
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition"
                >
                  <Save className="h-4 w-4" /> Lưu cấu hình
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LabConfigPage;

