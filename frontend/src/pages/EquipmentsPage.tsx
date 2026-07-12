import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '../components/ui/PageHeader';
import { equipmentApi, EquipmentData, EquipmentTxData } from '../services/equipment-api';
import { useAuth } from '../features/auth/AuthContext';
import { Plus, Search, Edit2, History, AlertTriangle, Settings, RefreshCw, X, Save, ArrowUpDown } from 'lucide-react';

const equipmentSchema = z.object({
  code: z.string().min(1, 'Mã thiết bị không được trống.'),
  name: z.string().min(1, 'Tên thiết bị không được trống.'),
  categoryId: z.string().min(1, 'Danh mục không được trống.'),
  location: z.string().optional(),
  managerId: z.string().optional(),
  status: z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']),
  note: z.string().optional()
});

const categorySchema = z.object({
  code: z.string().min(1, 'Mã danh mục không được trống.'),
  name: z.string().min(1, 'Tên danh mục không được trống.'),
  description: z.string().optional()
});

type FormFields = z.infer<typeof equipmentSchema>;
type CategoryFields = z.infer<typeof categorySchema>;

const EquipmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [selectedEq, setSelectedEq] = useState<EquipmentData | null>(null);
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  const [adjustState, setAdjustState] = useState<{ id: string; isOpen: boolean; delta: number; note: string } | null>(null);
  const [brokenState, setBrokenState] = useState<{ id: string; isOpen: boolean; quantity: number; from: 'AVAILABLE' | 'BORROWED'; note: string } | null>(null);
  const [txHistoryState, setTxHistoryState] = useState<{ id: string; code: string; isOpen: boolean } | null>(null);

  const canCreate = hasPermission('EQUIPMENT_CREATE');
  const canUpdate = hasPermission('EQUIPMENT_UPDATE');
  const canAdjust = hasPermission('EQUIPMENT_INVENTORY_ADJUST');
  const canDamageReport = hasPermission('EQUIPMENT_DAMAGE_REPORT');
  const canCategoryCreate = hasPermission('EQUIPMENT_CATEGORY_CREATE');

  const { data: categories } = useQuery({
    queryKey: ['equipment-categories'],
    queryFn: equipmentApi.listCategories
  });

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['equipments', keyword, categoryFilter, page],
    queryFn: () => equipmentApi.list({ keyword, categoryId: categoryFilter || undefined, page, pageSize })
  });

  const { data: transactions, isLoading: isTxLoading } = useQuery<EquipmentTxData[]>({
    queryKey: ['equipment-txs', txHistoryState?.id],
    queryFn: () => equipmentApi.listTransactions(txHistoryState!.id),
    enabled: !!txHistoryState?.isOpen
  });

  const eqForm = useForm<FormFields>({
    resolver: zodResolver(equipmentSchema)
  });

  const catForm = useForm<CategoryFields>({
    resolver: zodResolver(categorySchema)
  });

  const saveMutation = useMutation({
    mutationFn: (data: FormFields) => {
      if (selectedEq) {
        return equipmentApi.update(selectedEq.id, data);
      }
      return equipmentApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setIsEqModalOpen(false);
      setSelectedEq(null);
      eqForm.reset();
    }
  });

  const categoryMutation = useMutation({
    mutationFn: equipmentApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      setIsCatModalOpen(false);
      catForm.reset();
    }
  });

  const adjustMutation = useMutation({
    mutationFn: (data: { id: string; delta: number; note?: string }) => equipmentApi.adjust(data.id, data.delta, data.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setAdjustState(null);
    }
  });

  const brokenMutation = useMutation({
    mutationFn: (data: { id: string; quantity: number; from: 'AVAILABLE' | 'BORROWED'; note?: string }) => 
      equipmentApi.reportBroken(data.id, data.quantity, data.from, data.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      setBrokenState(null);
    }
  });

  const openAddEqModal = () => {
    setSelectedEq(null);
    eqForm.reset({
      code: '',
      name: '',
      categoryId: categories?.[0]?.id || '',
      location: '',
      managerId: '',
      status: 'ACTIVE',
      note: ''
    });
    setIsEqModalOpen(true);
  };

  const openEditEqModal = (e: EquipmentData) => {
    setSelectedEq(e);
    eqForm.reset({
      code: e.code,
      name: e.name,
      categoryId: e.categoryId,
      location: e.location || '',
      managerId: e.managerId || '',
      status: e.status,
      note: e.note || ''
    });
    setIsEqModalOpen(true);
  };

  const onSubmitEq = (data: FormFields) => {
    saveMutation.mutate(data);
  };

  const onSubmitCat = (data: CategoryFields) => {
    categoryMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Danh mục thiết bị" description="Quản lý thông tin và số lượng tồn kho các thiết bị mượn kèm.">
        <div className="flex gap-2">
          {canCategoryCreate && (
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              Thêm danh mục
            </button>
          )}
          {canCreate && (
            <button
              onClick={openAddEqModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> Thêm thiết bị
            </button>
          )}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm mã thiết bị, tên, vị trí..."
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none sm:text-sm"
          >
            <option value="">Tất cả danh mục</option>
            {categories?.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isListLoading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !listData?.data || listData.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
            <Settings className="h-10 w-10 text-slate-300" />
            <p>Không tìm thấy thiết bị nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mã</th>
                  <th className="px-6 py-4">Tên thiết bị</th>
                  <th className="px-6 py-4">Tổng số</th>
                  <th className="px-6 py-4 text-emerald-600">Khả dụng</th>
                  <th className="px-6 py-4 text-blue-600">Đang mượn</th>
                  <th className="px-6 py-4 text-red-600">Hỏng</th>
                  <th className="px-6 py-4">Vị trí</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listData.data.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{eq.code}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{eq.name}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{eq.totalQuantity}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{eq.availableQuantity}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{eq.borrowedQuantity}</td>
                    <td className="px-6 py-4 font-bold text-red-500">{eq.brokenQuantity}</td>
                    <td className="px-6 py-4">{eq.location || 'N/A'}</td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      {canAdjust && (
                        <button
                          onClick={() => setAdjustState({ id: eq.id, isOpen: true, delta: 1, note: '' })}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-bold"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" /> Kho
                        </button>
                      )}
                      {canDamageReport && (
                        <button
                          onClick={() => setBrokenState({ id: eq.id, isOpen: true, quantity: 1, from: 'AVAILABLE', note: '' })}
                          className="inline-flex items-center gap-1 rounded bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 text-xs font-bold"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" /> Hỏng
                        </button>
                      )}
                      <button
                        onClick={() => setTxHistoryState({ id: eq.id, code: eq.code, isOpen: true })}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-bold"
                      >
                        <History className="h-3.5 w-3.5" /> Lịch sử
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => openEditEqModal(eq)}
                          className="inline-flex items-center gap-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 text-xs font-bold"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Sửa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {listData.meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <span className="text-sm text-slate-500">Trang {page} / {listData.meta.totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(listData.meta.totalPages, p + 1))}
                    disabled={page === listData.meta.totalPages}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isEqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-950">
                {selectedEq ? `Cập nhật ${selectedEq.code}` : 'Thêm thiết bị mượn kèm mới'}
              </h3>
              <button onClick={() => setIsEqModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={eqForm.handleSubmit(onSubmitEq)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Danh mục thiết bị</label>
                <select
                  {...eqForm.register('categoryId')}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                >
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mã thiết bị (Unique)</label>
                  <input
                    {...eqForm.register('code')}
                    type="text"
                    disabled={!!selectedEq}
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-50 text-sm"
                  />
                  {eqForm.formState.errors.code && <p className="mt-1 text-xs text-red-500">{eqForm.formState.errors.code.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tên thiết bị</label>
                  <input
                    {...eqForm.register('name')}
                    type="text"
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  {eqForm.formState.errors.name && <p className="mt-1 text-xs text-red-500">{eqForm.formState.errors.name.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vị trí cất giữ</label>
                  <input {...eqForm.register('location')} type="text" className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái hoạt động</label>
                  <select
                    {...eqForm.register('status')}
                    className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="ACTIVE">Kích hoạt (Active)</option>
                    <option value="LOCKED">Khóa mượn (Locked)</option>
                    <option value="INACTIVE">Không sử dụng (Inactive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ghi chú thêm</label>
                <textarea {...eqForm.register('note')} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm" />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEqModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-55"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Save className="h-4 w-4" /> Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-950">Thêm danh mục thiết bị</h3>
              <button onClick={() => setIsCatModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={catForm.handleSubmit(onSubmitCat)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mã danh mục</label>
                <input
                  {...catForm.register('code')}
                  type="text"
                  placeholder="Ví dụ: CATEGORY-KEYBOARD"
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                />
                {catForm.formState.errors.code && <p className="mt-1 text-xs text-red-500">{catForm.formState.errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tên danh mục</label>
                <input
                  {...catForm.register('name')}
                  type="text"
                  placeholder="Ví dụ: Bàn phím máy tính"
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                />
                {catForm.formState.errors.name && <p className="mt-1 text-xs text-red-500">{catForm.formState.errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả ngắn</label>
                <textarea {...catForm.register('description')} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm" />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-55"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={categoryMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Save className="h-4 w-4" /> Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-955">Điều chỉnh số lượng kho</h3>
              <button onClick={() => setAdjustState(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng điều chỉnh (Delta)</label>
                <input
                  type="number"
                  value={adjustState.delta}
                  onChange={(e) => setAdjustState({ ...adjustState, delta: parseInt(e.target.value, 10) || 0 })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                  placeholder="Dùng số dương để nhập, số âm để xuất"
                />
                <span className="text-[10px] text-slate-450 mt-1 block">Sử dụng số dương để NHẬP KHO, số âm để GIẢM KHO.</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Lý do điều chỉnh</label>
                <textarea
                  value={adjustState.note}
                  onChange={(e) => setAdjustState({ ...adjustState, note: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm"
                  placeholder="Ví dụ: Nhập bổ sung 10 chuột Logitech..."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setAdjustState(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-55"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={adjustMutation.isPending}
                  onClick={() => adjustMutation.mutate({ id: adjustState.id, delta: adjustState.delta, note: adjustState.note })}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {brokenState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-950">Báo hỏng thiết bị</h3>
              <button onClick={() => setBrokenState(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng báo hỏng</label>
                <input
                  type="number"
                  value={brokenState.quantity}
                  onChange={(e) => setBrokenState({ ...brokenState, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Nguồn báo hỏng</label>
                <select
                  value={brokenState.from}
                  onChange={(e) => setBrokenState({ ...brokenState, from: e.target.value as 'AVAILABLE' | 'BORROWED' })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:outline-none"
                >
                  <option value="AVAILABLE">Kho khả dụng (Available)</option>
                  <option value="BORROWED">Từ người đang mượn (Borrowed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả sự cố / Lý do hỏng</label>
                <textarea
                  value={brokenState.note}
                  onChange={(e) => setBrokenState({ ...brokenState, note: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm"
                  placeholder="Mô tả chi tiết tình trạng hỏng..."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setBrokenState(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-55"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={brokenMutation.isPending}
                  onClick={() => brokenMutation.mutate({ id: brokenState.id, quantity: brokenState.quantity, from: brokenState.from, note: brokenState.note })}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-650 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  Báo hỏng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {txHistoryState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-955">Lịch sử biến động kho: {txHistoryState.code}</h3>
              <button onClick={() => setTxHistoryState(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isTxLoading ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Chưa có giao dịch biến động nào được ghi nhận.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Thời gian</th>
                      <th className="px-4 py-3 font-semibold">Loại biến động</th>
                      <th className="px-4 py-3 font-semibold">Thay đổi Tổng</th>
                      <th className="px-4 py-3 font-semibold text-emerald-600">Thay đổi Có sẵn</th>
                      <th className="px-4 py-3 font-semibold text-blue-600">Thay đổi Mượn</th>
                      <th className="px-4 py-3 font-semibold text-red-500">Thay đổi Hỏng</th>
                      <th className="px-4 py-3 font-semibold">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-slate-500">{new Date(tx.createdAt || '').toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{tx.transactionType}</td>
                        <td className="px-4 py-3 font-bold">{tx.deltaTotal > 0 ? `+${tx.deltaTotal}` : tx.deltaTotal}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600">{tx.deltaAvailable > 0 ? `+${tx.deltaAvailable}` : tx.deltaAvailable}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{tx.deltaBorrowed > 0 ? `+${tx.deltaBorrowed}` : tx.deltaBorrowed}</td>
                        <td className="px-4 py-3 font-bold text-red-500">{tx.deltaBroken > 0 ? `+${tx.deltaBroken}` : tx.deltaBroken}</td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">{tx.note || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentsPage;

