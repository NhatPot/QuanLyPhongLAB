import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../components/ui/PageHeader';
import { computerApi, ComputerData, ComputerStatus } from '../services/computer-api';
import { useAuth } from '../features/auth/AuthContext';
import { Plus, Search, Trash2, Monitor, RefreshCw, X, Save, AlertCircle } from 'lucide-react';

const computerSchema = z.object({
  code: z.string().min(1, 'Mã máy không được trống.'),
  name: z.string().min(1, 'Tên máy không được trống.'),
  cpu: z.string().optional(),
  ram: z.string().optional(),
  storage: z.string().optional(),
  gpu: z.string().optional(),
  operatingSystem: z.string().optional(),
  installedSoftware: z.string().optional(),
  ipAddress: z.string().refine(val => !val || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val), {
    message: 'IP Address không đúng định dạng.'
  }).optional(),
  macAddress: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['ACTIVE', 'IN_USE', 'BROKEN', 'MAINTENANCE', 'LOCKED', 'INACTIVE']),
  note: z.string().optional()
});

type FormFields = z.infer<typeof computerSchema>;

const ComputersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);

  const [selectedComputer, setSelectedComputer] = useState<ComputerData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);

  const canCreate = hasPermission('COMPUTER_CREATE');
  const canUpdate = hasPermission('COMPUTER_UPDATE');
  const canDelete = hasPermission('COMPUTER_DELETE');

  const { data: summary } = useQuery({
    queryKey: ['computers-summary'],
    queryFn: computerApi.getSummary
  });

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['computers', keyword, statusFilter, page],
    queryFn: () => computerApi.list({ keyword, status: statusFilter || undefined, page, pageSize })
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormFields>({
    resolver: zodResolver(computerSchema)
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormFields) => {
      if (selectedComputer) {
        return computerApi.update(selectedComputer.id, data);
      }
      return computerApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] });
      queryClient.invalidateQueries({ queryKey: ['computers-summary'] });
      setIsModalOpen(false);
      setSelectedComputer(null);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: computerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['computers'] });
      queryClient.invalidateQueries({ queryKey: ['computers-summary'] });
      setIsDeleteConfirmOpen(null);
    }
  });

  const onSubmit = (data: FormFields) => {
    saveMutation.mutate(data);
  };

  const openAddModal = () => {
    setSelectedComputer(null);
    reset({
      code: '',
      name: '',
      cpu: '',
      ram: '',
      storage: '',
      gpu: '',
      operatingSystem: 'Windows 11',
      installedSoftware: '',
      ipAddress: '',
      macAddress: '',
      position: '',
      status: 'ACTIVE',
      note: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: ComputerData) => {
    setSelectedComputer(c);
    reset({
      code: c.code,
      name: c.name,
      cpu: c.cpu || '',
      ram: c.ram || '',
      storage: c.storage || '',
      gpu: c.gpu || '',
      operatingSystem: c.operatingSystem || '',
      installedSoftware: c.installedSoftware || '',
      ipAddress: c.ipAddress || '',
      macAddress: c.macAddress || '',
      position: c.position || '',
      status: c.status,
      note: c.note || ''
    });
    setIsModalOpen(true);
  };

  const getStatusColor = (status: ComputerStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500 text-white';
      case 'IN_USE': return 'bg-blue-600 text-white';
      case 'BROKEN': return 'bg-red-500 text-white';
      case 'MAINTENANCE': return 'bg-amber-500 text-white';
      case 'LOCKED': return 'bg-indigo-600 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sơ đồ máy tính" description="Quản lý cấu hình và trạng thái hoạt động của từng máy tính.">
        {canCreate && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> Thêm máy tính
          </button>
        )}
      </PageHeader>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Tổng số</span>
          <span className="text-2xl font-bold text-slate-900">{summary?.total || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-emerald-550">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Sẵn sàng</span>
          <span className="text-2xl font-bold text-emerald-600">{summary?.active || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-blue-550">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Đang dùng</span>
          <span className="text-2xl font-bold text-blue-600">{summary?.inUse || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-red-550">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Bị hỏng</span>
          <span className="text-2xl font-bold text-red-650">{summary?.broken || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-amber-550">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Bảo trì</span>
          <span className="text-2xl font-bold text-amber-600">{summary?.maintenance || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-indigo-550">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Khóa</span>
          <span className="text-2xl font-bold text-indigo-600">{summary?.locked || 0}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 border-l-slate-400">
          <span className="block text-xs font-semibold text-slate-500 uppercase">Không dùng</span>
          <span className="text-2xl font-bold text-slate-500">{summary?.inactive || 0}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo mã máy, cấu hình, IP..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Sẵn sàng</option>
            <option value="IN_USE">Đang sử dụng</option>
            <option value="BROKEN">Hỏng</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="LOCKED">Khóa</option>
            <option value="INACTIVE">Không dùng</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Sơ đồ máy tính</h3>
        
        {isListLoading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !listData?.data || listData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
            <Monitor className="h-10 w-10 text-slate-300" />
            <p>Không tìm thấy máy tính nào.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12">
              {listData.data.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => openEditModal(comp)}
                  className="group relative cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-blue-500 hover:bg-blue-50/10 shadow-sm transition flex flex-col items-center text-center space-y-1.5"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-sm ${getStatusColor(comp.status)}`}>
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 w-full text-center">
                    <p className="font-mono text-xs font-bold text-slate-800 truncate">{comp.code}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{comp.position || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>

            {listData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">Trang {page} / {listData.meta.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(listData.meta.totalPages, p + 1))}
                    disabled={page === listData.meta.totalPages}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-950">
                {selectedComputer ? `Cấu hình máy ${selectedComputer.code}` : 'Thêm máy tính mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-650">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mã máy tính (Unique)</label>
                  <input
                    {...register('code')}
                    type="text"
                    disabled={!!selectedComputer}
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                  />
                  {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tên máy tính</label>
                  <input
                    {...register('name')}
                    type="text"
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vị trí (Dãy/Hàng)</label>
                  <input
                    {...register('position')}
                    type="text"
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái máy</label>
                  <select
                    {...register('status')}
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="ACTIVE">Sẵn sàng (Active)</option>
                    <option value="IN_USE">Đang sử dụng (In use)</option>
                    <option value="BROKEN">Hỏng (Broken)</option>
                    <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
                    <option value="LOCKED">Khóa (Locked)</option>
                    <option value="INACTIVE">Không sử dụng (Inactive)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Thông số cấu hình</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">CPU</label>
                  <input {...register('cpu')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">RAM</label>
                  <input {...register('ram')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ổ cứng (Storage)</label>
                  <input {...register('storage')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">GPU</label>
                  <input {...register('gpu')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Hệ điều hành</label>
                  <input {...register('operatingSystem')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Địa chỉ IP</label>
                  <input {...register('ipAddress')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                  {errors.ipAddress && <p className="mt-1 text-xs text-red-500">{errors.ipAddress.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Địa chỉ MAC</label>
                  <input {...register('macAddress')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Phần mềm đã cài đặt</label>
                  <textarea {...register('installedSoftware')} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" placeholder="VS Code, SQL Server Management Studio..." />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú</label>
                  <textarea {...register('note')} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 text-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                <div>
                  {selectedComputer && canDelete && (
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setIsDeleteConfirmOpen(selectedComputer.id); }}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-650 hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-4 w-4" /> Xóa máy
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  {(canUpdate || !selectedComputer) && (
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      <Save className="h-4 w-4" /> {selectedComputer ? 'Lưu cấu hình' : 'Thêm máy'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-slate-950">Xác nhận xóa máy tính?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa máy tính này ra khỏi hệ thống? Dữ liệu lịch sử sẽ được bảo toàn thông qua cơ chế soft delete.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => deleteMutation.mutate(isDeleteConfirmOpen)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-650 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputersPage;

