'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import {
  Banknote, Check, ChevronLeft, ChevronRight, CircleDollarSign, Download, Eye, FileClock,
  FolderCog, Landmark, Pencil, Plus, ReceiptText, Search, Send, Trash2, WalletCards, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { EChart } from '@/components/charts/echart';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
  expenseApi,
  type ExpenseCategory,
  type ExpenseClass,
  type ExpensePayload,
  type ExpenseRecord,
  type ExpenseStatus,
  type FundingSource,
} from '@/services/expense-api';
import { ExpenseEditorDialog } from './ExpenseEditorDialog';
import { exportExpenses } from './expense-excel';

const PAGE_SIZE = 10;
const STATUS: Record<ExpenseStatus, { label: string; variant: 'secondary' | 'warning' | 'default' | 'success' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Nháp', variant: 'secondary' },
  SUBMITTED: { label: 'Chờ duyệt', variant: 'warning' },
  APPROVED: { label: 'Đã duyệt', variant: 'default' },
  REJECTED: { label: 'Từ chối', variant: 'destructive' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  CANCELLED: { label: 'Đã hủy', variant: 'outline' },
};
const FUNDING: Record<FundingSource, string> = {
  CENTER: 'Trung tâm', FACULTY: 'Khoa', UNIVERSITY: 'Trường', SPONSOR: 'Tài trợ', OTHER: 'Khác',
};

export default function ExpensesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ExpenseStatus | ''>('');
  const [expenseClass, setExpenseClass] = useState<ExpenseClass | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [fundingSource, setFundingSource] = useState<FundingSource | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [detail, setDetail] = useState<ExpenseRecord | null>(null);
  const [submitTarget, setSubmitTarget] = useState<ExpenseRecord | null>(null);
  const [approveTarget, setApproveTarget] = useState<ExpenseRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExpenseRecord | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ExpenseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [paidTarget, setPaidTarget] = useState<ExpenseRecord | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setKeyword(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const filter = { page, pageSize: PAGE_SIZE, keyword: keyword || undefined, status: status || undefined, expenseClass: expenseClass || undefined, categoryId: categoryId || undefined, fundingSource: fundingSource || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined };
  const listQuery = useQuery({ queryKey: ['expenses', filter], queryFn: () => expenseApi.list(filter) });
  const summaryQuery = useQuery({ queryKey: ['expense-summary', fromDate, toDate], queryFn: () => expenseApi.summary({ fromDate: fromDate || undefined, toDate: toDate || undefined }) });
  const optionsQuery = useQuery({ queryKey: ['expense-options'], queryFn: expenseApi.options });

  const rows = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;
  const summary = summaryQuery.data || { totalSpending: 0, capex: 0, opex: 0, paid: 0, outstanding: 0, thisMonth: 0, count: 0, monthly: [], byCategory: [] };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['expense-options'] }),
      queryClient.invalidateQueries({ queryKey: ['equipments'] }),
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
    ]);
  };
  const saveMutation = useMutation({
    mutationFn: ({ item, payload }: { item: ExpenseRecord | null; payload: ExpensePayload }) => item ? expenseApi.update(item.id, payload) : expenseApi.create(payload),
    onSuccess: async (_data, variables) => { toast.success(variables.item ? 'Đã cập nhật phiếu chi' : 'Đã tạo phiếu chi nháp'); setEditorOpen(false); setEditing(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể lưu phiếu chi.')),
  });
  const actionMutation = useMutation({
    mutationFn: async ({ action, item, reason }: { action: 'submit' | 'approve' | 'reject' | 'cancel' | 'delete'; item: ExpenseRecord; reason?: string }) => {
      if (action === 'submit') return expenseApi.submit(item.id);
      if (action === 'approve') return expenseApi.approve(item.id);
      if (action === 'reject') return expenseApi.reject(item.id, reason || '');
      if (action === 'cancel') return expenseApi.cancel(item.id, reason || '');
      await expenseApi.delete(item.id); return null;
    },
    onSuccess: async (_data, variables) => {
      toast.success({ submit: 'Đã gửi duyệt', approve: 'Đã duyệt phiếu chi', reject: 'Đã từ chối phiếu chi', cancel: 'Đã hủy phiếu chi', delete: 'Đã xóa phiếu chi' }[variables.action]);
      setSubmitTarget(null); setApproveTarget(null); setRejectTarget(null); setCancelTarget(null); setDeleteTarget(null); setDetail(null);
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể thực hiện thao tác.')),
  });
  const paidMutation = useMutation({
    mutationFn: ({ item, method, date, postInventory }: { item: ExpenseRecord; method: string; date: string; postInventory: boolean }) => expenseApi.markPaid(item.id, method, date, postInventory),
    onSuccess: async () => { toast.success('Đã xác nhận thanh toán'); setPaidTarget(null); setDetail(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể xác nhận thanh toán.')),
  });

  const monthlyOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis', valueFormatter: (value) => money(Number(value)) },
    legend: { data: ['Đầu tư', 'Vận hành'], bottom: 0 },
    grid: { left: 10, right: 10, top: 20, bottom: 45, containLabel: true },
    xAxis: { type: 'category', data: summary.monthly.map((item) => monthLabel(item.month)), axisLabel: { color: '#64748b' } },
    yAxis: { type: 'value', axisLabel: { formatter: compactMoney, color: '#64748b' }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
    series: [
      { name: 'Đầu tư', type: 'bar', stack: 'total', data: summary.monthly.map((item) => item.capex), itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] } },
      { name: 'Vận hành', type: 'bar', stack: 'total', data: summary.monthly.map((item) => item.opex), itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
    ],
  }), [summary.monthly]);
  const categoryOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item', valueFormatter: (value) => money(Number(value)) },
    series: [{ type: 'pie', radius: ['48%', '74%'], label: { show: false }, data: summary.byCategory.slice(0, 7).map((item, index) => ({
      name: item.categoryName, value: item.amount, itemStyle: { color: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b'][index] },
    })) }],
  }), [summary.byCategory]);

  const exportData = async () => {
    try {
      const result = await expenseApi.list({ ...filter, page: 1, pageSize: 100 });
      await exportExpenses(result.data);
      toast.success(`Đã xuất ${result.data.length} phiếu chi`);
    } catch (error) { toast.error(errorMessage(error, 'Không thể xuất báo cáo.')); }
  };

  return <div className="space-y-5">
    <PageHeader eyebrow="Tài chính vận hành" title="Chi phí phòng Lab" description="Theo dõi chi phí đầu tư, vận hành, thanh toán và tài sản liên quan.">
      {hasPermission('EXPENSE_CATEGORY_MANAGE') && <Button variant="outline" onClick={() => setCategoryOpen(true)}><FolderCog />Danh mục</Button>}
      {hasPermission('EXPENSE_EXPORT') && <Button variant="outline" onClick={() => void exportData()}><Download />Xuất Excel</Button>}
      {hasPermission('EXPENSE_CREATE') && <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus />Tạo phiếu chi</Button>}
    </PageHeader>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label="Tổng chi đã duyệt" value={money(summary.totalSpending)} detail={`${summary.count} phiếu`} icon={WalletCards} tone="blue" loading={summaryQuery.isLoading} />
      <Metric label="Chi phí đầu tư" value={money(summary.capex)} detail="CAPEX · tài sản lâu dài" icon={Landmark} tone="violet" loading={summaryQuery.isLoading} />
      <Metric label="Chi phí vận hành" value={money(summary.opex)} detail="OPEX · hoạt động thường xuyên" icon={CircleDollarSign} tone="green" loading={summaryQuery.isLoading} />
      <Metric label="Đã thanh toán" value={money(summary.paid)} detail="Các khoản đã chi tiền" icon={Banknote} tone="cyan" loading={summaryQuery.isLoading} />
      <Metric label="Chưa thanh toán" value={money(summary.outstanding)} detail="Phiếu đã duyệt còn công nợ" icon={FileClock} tone="orange" loading={summaryQuery.isLoading} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
      <Card><CardHeader><CardTitle>Chi phí theo tháng</CardTitle></CardHeader><CardContent>{summary.monthly.length ? <EChart option={monthlyOption} className="h-72" /> : <EmptyChart />}</CardContent></Card>
      <Card><CardHeader><CardTitle>Cơ cấu theo danh mục</CardTitle></CardHeader><CardContent>{summary.byCategory.length ? <div className="grid grid-cols-[1fr_1.1fr] items-center"><EChart option={categoryOption} className="h-64" /><div className="space-y-2">{summary.byCategory.slice(0, 6).map((item) => <div key={item.categoryId} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-slate-600">{item.categoryName}</span><strong>{compactMoney(item.amount)}</strong></div>)}</div></div> : <EmptyChart />}</CardContent></Card>
    </section>

    <Card>
      <CardContent className="pt-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(6,auto)]">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, nội dung, hóa đơn..." /></div>
          <select className={filterClass} value={status} onChange={(event) => { setStatus(event.target.value as ExpenseStatus | ''); setPage(1); }}><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>
          <select className={filterClass} value={expenseClass} onChange={(event) => { setExpenseClass(event.target.value as ExpenseClass | ''); setPage(1); }}><option value="">CAPEX & OPEX</option><option value="CAPEX">Chi phí đầu tư</option><option value="OPEX">Chi phí vận hành</option></select>
          <select className={filterClass} value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Mọi danh mục</option>{optionsQuery.data?.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className={filterClass} value={fundingSource} onChange={(event) => { setFundingSource(event.target.value as FundingSource | ''); setPage(1); }}><option value="">Mọi nguồn</option>{Object.entries(FUNDING).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <Input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} />
          <Input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Phiếu chi</th><th className="px-4 py-3">Danh mục</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Tổng tiền</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {listQuery.isLoading && Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>)}
              {!listQuery.isLoading && rows.map((item) => <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3"><button className="text-left" onClick={() => setDetail(item)}><p className="font-bold text-blue-700">{item.code}</p><p className="max-w-xs truncate font-medium text-slate-800">{item.title}</p><p className="text-[11px] text-slate-400">{date(item.expenseDate)}</p></button></td>
                <td className="px-4 py-3"><Badge variant={item.expenseClass === 'CAPEX' ? 'default' : 'success'}>{item.expenseClass}</Badge><p className="mt-1 text-xs text-slate-600">{item.categoryName}</p></td>
                <td className="px-4 py-3 text-xs text-slate-600">{item.vendorName || '—'}{item.invoiceNumber && <p className="text-slate-400">HĐ: {item.invoiceNumber}</p>}</td>
                <td className="px-4 py-3 text-xs font-medium text-slate-600">{FUNDING[item.fundingSource]}</td>
                <td className="px-4 py-3"><Badge variant={STATUS[item.status].variant}>{STATUS[item.status].label}</Badge>{item.sourceType === 'MAINTENANCE' && <p className="mt-1 text-[10px] font-semibold text-violet-600">Từ bảo trì</p>}</td>
                <td className="px-4 py-3 text-right font-extrabold text-slate-900">{money(item.totalAmount)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="Xem chi tiết" onClick={() => setDetail(item)}><Eye /></Button>{hasPermission('EXPENSE_UPDATE') && ['DRAFT', 'REJECTED'].includes(item.status) && item.sourceType === 'MANUAL' && <Button size="icon" variant="ghost" title="Chỉnh sửa" onClick={() => { setEditing(item); setEditorOpen(true); }}><Pencil /></Button>}<RowActions item={item} hasPermission={hasPermission} onSubmit={setSubmitTarget} onApprove={setApproveTarget} onReject={setRejectTarget} onPaid={setPaidTarget} /></div></td>
              </tr>)}
              {!listQuery.isLoading && rows.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-400">Chưa có phiếu chi phù hợp bộ lọc.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{meta ? `${meta.totalItems} phiếu chi` : '0 phiếu chi'}</span><div className="flex items-center gap-2"><Button size="icon" variant="outline" disabled={!meta || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span>Trang {page}/{meta?.totalPages || 1}</span><Button size="icon" variant="outline" disabled={!meta || page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></div></div>
      </CardContent>
    </Card>

    <ExpenseEditorDialog
      open={editorOpen}
      onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditing(null); }}
      selected={editing}
      options={optionsQuery.data}
      optionsLoading={optionsQuery.isLoading}
      optionsError={optionsQuery.isError}
      onRetryOptions={() => { void optionsQuery.refetch(); }}
      pending={saveMutation.isPending}
      onSubmit={(payload) => saveMutation.mutate({ item: editing, payload })}
    />
    <ExpenseDetailDialog item={detail} onOpenChange={(open) => !open && setDetail(null)} hasPermission={hasPermission} onEdit={(item) => { setDetail(null); setEditing(item); setEditorOpen(true); }} onSubmit={setSubmitTarget} onApprove={setApproveTarget} onReject={setRejectTarget} onPaid={setPaidTarget} onCancel={setCancelTarget} onDelete={setDeleteTarget} />
    <ConfirmDialog open={!!submitTarget} onOpenChange={(open) => !open && setSubmitTarget(null)} title="Gửi duyệt phiếu chi?" description={`Phiếu ${submitTarget?.code || ''} sẽ được khóa chỉnh sửa trong thời gian chờ duyệt.`} confirmLabel="Gửi duyệt" pending={actionMutation.isPending} onConfirm={() => submitTarget && actionMutation.mutate({ action: 'submit', item: submitTarget })} />
    <ConfirmDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)} title="Duyệt phiếu chi?" description={`Xác nhận khoản chi ${money(approveTarget?.totalAmount || 0)} là hợp lệ.`} confirmLabel="Duyệt phiếu" pending={actionMutation.isPending} onConfirm={() => approveTarget && actionMutation.mutate({ action: 'approve', item: approveTarget })} />
    <ReasonDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)} title="Từ chối phiếu chi" description="Phiếu sẽ được trả lại để nhân viên chỉnh sửa." reference={rejectTarget?.code} confirmLabel="Từ chối" pending={actionMutation.isPending} onConfirm={(reason) => rejectTarget && actionMutation.mutate({ action: 'reject', item: rejectTarget, reason })} />
    <ReasonDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)} title="Hủy phiếu chi" description="Khoản chi bị hủy sẽ không được tính vào báo cáo." reference={cancelTarget?.code} confirmLabel="Hủy phiếu" pending={actionMutation.isPending} onConfirm={(reason) => cancelTarget && actionMutation.mutate({ action: 'cancel', item: cancelTarget, reason })} />
    <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Xóa phiếu chi?" description={`Phiếu ${deleteTarget?.code || ''} sẽ được xóa khỏi danh sách.`} destructive confirmLabel="Xóa phiếu" pending={actionMutation.isPending} onConfirm={() => deleteTarget && actionMutation.mutate({ action: 'delete', item: deleteTarget })} />
    <PaidDialog item={paidTarget} open={!!paidTarget} onOpenChange={(open) => !open && setPaidTarget(null)} pending={paidMutation.isPending} onConfirm={(method, paymentDate, postInventory) => paidTarget && paidMutation.mutate({ item: paidTarget, method, date: paymentDate, postInventory })} />
    <CategoryManagerDialog open={categoryOpen} onOpenChange={setCategoryOpen} onChanged={refresh} />
  </div>;
}

function RowActions({ item, hasPermission, onSubmit, onApprove, onReject, onPaid }: { item: ExpenseRecord; hasPermission: (permission: string) => boolean; onSubmit: (item: ExpenseRecord) => void; onApprove: (item: ExpenseRecord) => void; onReject: (item: ExpenseRecord) => void; onPaid: (item: ExpenseRecord) => void }) {
  return <>{item.status === 'DRAFT' && hasPermission('EXPENSE_SUBMIT') && <Button size="icon" variant="ghost" title="Gửi duyệt" onClick={() => onSubmit(item)}><Send /></Button>}{item.status === 'SUBMITTED' && hasPermission('EXPENSE_APPROVE') && <><Button size="icon" variant="ghost" className="text-emerald-600" title="Duyệt" onClick={() => onApprove(item)}><Check /></Button><Button size="icon" variant="ghost" className="text-red-600" title="Từ chối" onClick={() => onReject(item)}><X /></Button></>}{item.status === 'APPROVED' && hasPermission('EXPENSE_MARK_PAID') && <Button size="icon" variant="ghost" className="text-emerald-600" title="Xác nhận thanh toán" onClick={() => onPaid(item)}><Banknote /></Button>}</>;
}

function ExpenseDetailDialog({ item, onOpenChange, hasPermission, onEdit, onSubmit, onApprove, onReject, onPaid, onCancel, onDelete }: { item: ExpenseRecord | null; onOpenChange: (open: boolean) => void; hasPermission: (permission: string) => boolean; onEdit: (item: ExpenseRecord) => void; onSubmit: (item: ExpenseRecord) => void; onApprove: (item: ExpenseRecord) => void; onReject: (item: ExpenseRecord) => void; onPaid: (item: ExpenseRecord) => void; onCancel: (item: ExpenseRecord) => void; onDelete: (item: ExpenseRecord) => void }) {
  if (!item) return null;
  return <Dialog open onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><div className="flex flex-wrap items-center gap-2"><DialogTitle>{item.code}</DialogTitle><Badge variant={STATUS[item.status].variant}>{STATUS[item.status].label}</Badge><Badge variant={item.expenseClass === 'CAPEX' ? 'default' : 'success'}>{item.expenseClass}</Badge></div><DialogDescription>{item.title}</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Info label="Ngày phát sinh" value={date(item.expenseDate)} /><Info label="Danh mục" value={item.categoryName} /><Info label="Nguồn kinh phí" value={FUNDING[item.fundingSource]} /><Info label="Nhà cung cấp" value={item.vendorName || '—'} /><Info label="Số hóa đơn" value={item.invoiceNumber || '—'} /><Info label="Người tạo" value={item.createdByName || 'Hệ thống'} /><Info label="Người duyệt" value={item.approvedByName || '—'} /><Info label="Nguồn dữ liệu" value={item.sourceType === 'MAINTENANCE' ? 'Tự động từ bảo trì' : 'Nhập thủ công'} /></div>
    {(item.description || item.rejectionReason || item.cancellationReason) && <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{item.description && <p>{item.description}</p>}{item.rejectionReason && <p className="font-medium text-red-700">Lý do từ chối: {item.rejectionReason}</p>}{item.cancellationReason && <p className="font-medium text-slate-700">Lý do hủy: {item.cancellationReason}</p>}</div>}
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">Nội dung</th><th className="px-3 py-2 text-right">SL</th><th className="px-3 py-2 text-right">Đơn giá</th><th className="px-3 py-2 text-right">Giảm/thuế</th><th className="px-3 py-2 text-right">Thành tiền</th></tr></thead><tbody className="divide-y">{item.items.map((line) => <tr key={line.id}><td className="px-3 py-3"><p className="font-medium">{line.description}</p><p className="text-[11px] text-slate-400">{line.targetType !== 'OTHER' ? `Liên kết: ${line.targetType}` : line.note || ''}</p></td><td className="px-3 py-3 text-right">{line.quantity} {line.unit}</td><td className="px-3 py-3 text-right">{money(line.unitPrice)}</td><td className="px-3 py-3 text-right text-xs">-{money(line.discountAmount)} / +{money(line.taxAmount)}</td><td className="px-3 py-3 text-right font-bold">{money(line.lineTotal)}</td></tr>)}</tbody></table></div>
    <div className="ml-auto grid w-full max-w-sm grid-cols-2 gap-2 rounded-xl bg-slate-950 p-4 text-sm text-white"><span className="text-slate-400">Tạm tính</span><strong className="text-right">{money(item.subtotal)}</strong><span className="text-slate-400">Giảm giá + thuế</span><strong className="text-right">-{money(item.discountAmount)} + {money(item.taxAmount)}</strong><span className="border-t border-slate-700 pt-2 font-bold">Tổng cộng</span><strong className="border-t border-slate-700 pt-2 text-right text-lg text-emerald-300">{money(item.totalAmount)}</strong></div>
    <DialogFooter className="flex-wrap border-t pt-4">
      {hasPermission('EXPENSE_DELETE') && ['DRAFT', 'REJECTED', 'CANCELLED'].includes(item.status) && item.sourceType === 'MANUAL' && <Button variant="destructive" onClick={() => onDelete(item)}><Trash2 />Xóa</Button>}
      {hasPermission('EXPENSE_CANCEL') && ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(item.status) && <Button variant="outline" className="text-red-600" onClick={() => onCancel(item)}>Hủy phiếu</Button>}
      {hasPermission('EXPENSE_UPDATE') && ['DRAFT', 'REJECTED'].includes(item.status) && item.sourceType === 'MANUAL' && <Button variant="outline" onClick={() => onEdit(item)}><Pencil />Chỉnh sửa</Button>}
      <RowActions item={item} hasPermission={hasPermission} onSubmit={onSubmit} onApprove={onApprove} onReject={onReject} onPaid={onPaid} />
    </DialogFooter>
  </DialogContent></Dialog>;
}

function PaidDialog({ item, open, onOpenChange, pending, onConfirm }: { item: ExpenseRecord | null; open: boolean; onOpenChange: (open: boolean) => void; pending: boolean; onConfirm: (method: string, date: string, postInventory: boolean) => void }) {
  const [method, setMethod] = useState('Chuyển khoản');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [postInventory, setPostInventory] = useState(false);
  useEffect(() => { if (open) { setMethod('Chuyển khoản'); setPaymentDate(new Date().toISOString().slice(0, 10)); setPostInventory(false); } }, [open]);
  const canPost = item?.categoryCode === 'EQUIPMENT_PURCHASE' && item.items.some((line) => line.targetType === 'EQUIPMENT');
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Xác nhận thanh toán</DialogTitle><DialogDescription>{item?.code} · {money(item?.totalAmount || 0)}</DialogDescription></DialogHeader><div className="space-y-4"><label className="block text-xs font-bold text-slate-700">Phương thức thanh toán<Input className="mt-1.5" value={method} onChange={(event) => setMethod(event.target.value)} /></label><label className="block text-xs font-bold text-slate-700">Ngày thanh toán<Input className="mt-1.5" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>{canPost && <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><input className="mt-1" type="checkbox" checked={postInventory} onChange={(event) => setPostInventory(event.target.checked)} /><span><strong>Đồng thời ghi tăng tồn kho</strong><br /><span className="text-xs">Số lượng nguyên của các dòng liên kết thiết bị sẽ được nhập kho.</span></span></label>}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button><Button disabled={pending || !method.trim() || !paymentDate} onClick={() => onConfirm(method.trim(), paymentDate, postInventory)}><Banknote />{pending ? 'Đang xử lý...' : 'Xác nhận đã thanh toán'}</Button></DialogFooter></DialogContent></Dialog>;
}

function CategoryManagerDialog({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['expense-categories-all'], queryFn: () => expenseApi.listCategories(true), enabled: open });
  const [code, setCode] = useState(''); const [name, setName] = useState(''); const [expenseClass, setExpenseClass] = useState<ExpenseClass>('OPEX'); const [description, setDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const resetForm = () => { setCode(''); setName(''); setExpenseClass('OPEX'); setDescription(''); setEditingCategory(null); };
  const saveMutation = useMutation({
    mutationFn: () => editingCategory
      ? expenseApi.updateCategory(editingCategory.id, { name, expenseClass, description: description || undefined, isActive: editingCategory.isActive })
      : expenseApi.createCategory({ code, name, expenseClass, description: description || undefined }),
    onSuccess: async () => {
      toast.success(editingCategory ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục');
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] });
      await onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể lưu danh mục.')),
  });
  const toggleMutation = useMutation({ mutationFn: (category: ExpenseCategory) => expenseApi.updateCategory(category.id, { name: category.name, expenseClass: category.expenseClass, description: category.description || undefined, isActive: !category.isActive }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['expense-categories-all'] }); await onChanged(); }, onError: (error) => toast.error(errorMessage(error, 'Không thể cập nhật danh mục.')) });
  const startEditing = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCode(category.code);
    setName(category.name);
    setExpenseClass(category.expenseClass);
    setDescription(category.description || '');
  };
  return <Dialog open={open} onOpenChange={(nextOpen: boolean) => { if (!nextOpen) resetForm(); onOpenChange(nextOpen); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Danh mục chi phí</DialogTitle><DialogDescription>Danh mục hệ thống có thể sửa hoặc khóa nhưng không xóa để bảo toàn báo cáo cũ.</DialogDescription></DialogHeader><div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-4"><Input value={code} disabled={Boolean(editingCategory)} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="MÃ_DANH_MỤC" /><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên danh mục" /><select className={filterClass} value={expenseClass} onChange={(event) => setExpenseClass(event.target.value as ExpenseClass)}><option value="OPEX">OPEX</option><option value="CAPEX">CAPEX</option></select><Button disabled={!code.trim() || !name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>{editingCategory ? <Pencil /> : <Plus />}{editingCategory ? 'Lưu' : 'Thêm'}</Button><Input className="sm:col-span-4" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả (không bắt buộc)" />{editingCategory && <Button className="sm:col-start-4" variant="ghost" onClick={resetForm}>Hủy sửa</Button>}</div><div className="divide-y rounded-xl border">{categoriesQuery.data?.map((category) => <div key={category.id} className="flex items-center gap-3 p-3"><Badge variant={category.expenseClass === 'CAPEX' ? 'default' : 'success'}>{category.expenseClass}</Badge><div className="min-w-0 flex-1"><p className={cn('font-semibold', !category.isActive && 'text-slate-400 line-through')}>{category.name}</p><p className="truncate text-xs text-slate-400">{category.code} · {category.description || 'Không có mô tả'}</p></div><Button size="sm" variant="outline" disabled={saveMutation.isPending} onClick={() => startEditing(category)}><Pencil />Sửa</Button><Button size="sm" variant="outline" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(category)}>{category.isActive ? 'Khóa' : 'Mở lại'}</Button></div>)}</div></DialogContent></Dialog>;
}

function Metric({ label, value, detail, icon: Icon, tone, loading }: { label: string; value: string; detail: string; icon: typeof WalletCards; tone: 'blue' | 'green' | 'violet' | 'cyan' | 'orange'; loading: boolean }) {
  const color = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', cyan: 'bg-cyan-50 text-cyan-600', orange: 'bg-amber-50 text-amber-600' }[tone];
  return <Card><CardContent className="p-4"><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}><Icon className="h-5 w-5" /></div><p className="mt-3 text-xs font-medium text-slate-500">{label}</p>{loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p>}<p className="mt-1 text-[11px] text-slate-400">{detail}</p></CardContent></Card>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-700">{value}</p></div>; }
function EmptyChart() { return <div className="flex h-64 items-center justify-center text-sm text-slate-400"><ReceiptText className="mr-2 h-5 w-5" />Chưa có dữ liệu chi phí đã duyệt</div>; }
function money(value: number) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value); }
function compactMoney(value: number) { return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) + '₫'; }
function date(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(value)); }
function monthLabel(value: string) { const [year, month] = value.split('-'); return `${month}/${year.slice(-2)}`; }
function errorMessage(error: unknown, fallback: string) { return (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || fallback; }
const filterClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
