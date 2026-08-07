'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3,
  Eye, LoaderCircle, Monitor, PackageOpen, Pencil, Play, Plus, Search, ShieldAlert, UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';
import {
  incidentApi, type IncidentAssetType, type IncidentPayload, type IncidentRecord,
  type IncidentSeverity, type IncidentStatus,
} from '@/services/incident-api';
import { IncidentEditorDialog } from './IncidentEditorDialog';

const PAGE_SIZE = 10;
const STATUS: Record<IncidentStatus, { label: string; variant: 'secondary' | 'warning' | 'default' | 'success' | 'outline'; dot: string }> = {
  OPEN: { label: 'Mới báo cáo', variant: 'secondary', dot: 'bg-violet-500' },
  ASSIGNED: { label: 'Đã phân công', variant: 'warning', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'Đang xử lý', variant: 'default', dot: 'bg-blue-500' },
  RESOLVED: { label: 'Đã xử lý', variant: 'success', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Đã đóng', variant: 'outline', dot: 'bg-slate-400' },
};
const SEVERITY: Record<IncidentSeverity, { label: string; badge: string; rail: string }> = {
  LOW: { label: 'Thấp', badge: 'border-slate-200 bg-slate-50 text-slate-600', rail: 'bg-slate-300' },
  MEDIUM: { label: 'Trung bình', badge: 'border-amber-200 bg-amber-50 text-amber-700', rail: 'bg-amber-400' },
  HIGH: { label: 'Cao', badge: 'border-orange-200 bg-orange-50 text-orange-700', rail: 'bg-orange-500' },
  CRITICAL: { label: 'Khẩn cấp', badge: 'border-red-200 bg-red-50 text-red-700', rail: 'bg-red-500' },
};

export default function IncidentsPage() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<IncidentStatus | ''>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [assetType, setAssetType] = useState<IncidentAssetType | ''>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<IncidentRecord | null>(null);
  const [detail, setDetail] = useState<IncidentRecord | null>(null);
  const [assignTarget, setAssignTarget] = useState<IncidentRecord | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolveTarget, setResolveTarget] = useState<IncidentRecord | null>(null);
  const [closeTarget, setCloseTarget] = useState<IncidentRecord | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setKeyword(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [search]);
  useEffect(() => { setAssigneeId(assignTarget?.assignedTo || ''); }, [assignTarget]);

  const listQuery = useQuery({
    queryKey: ['incidents', { page, keyword, status, severity, assetType }],
    queryFn: () => incidentApi.list({ page, pageSize: PAGE_SIZE, keyword: keyword || undefined, status: status || undefined, severity: severity || undefined, assetType: assetType || undefined }),
  });
  const summaryQuery = useQuery({ queryKey: ['incident-summary'], queryFn: incidentApi.summary });
  const optionsQuery = useQuery({ queryKey: ['incident-options'], queryFn: incidentApi.options });

  const rows = Array.isArray(listQuery.data) ? listQuery.data : (listQuery.data?.data || []);
  const meta = listQuery.data?.meta;
  const summary = summaryQuery.data || { total: 0, open: 0, assigned: 0, inProgress: 0, resolved: 0, closed: 0, criticalOpen: 0, brokenComputers: 0, equipmentTypesWithIssues: 0, totalAssetAlerts: 0 };
  const canCreate = hasPermission('INCIDENT_CREATE');
  const canUpdate = hasPermission('INCIDENT_UPDATE');
  const canAssign = hasPermission('INCIDENT_ASSIGN');
  const canResolve = hasPermission('INCIDENT_RESOLVE');
  const canClose = hasPermission('INCIDENT_CLOSE');
  const canManageAll = hasPermission('INCIDENT_VIEW');

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['incident-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: ({ item, payload }: { item: IncidentRecord | null; payload: IncidentPayload }) => item ? incidentApi.update(item.id, payload) : incidentApi.create(payload),
    onSuccess: async (_data, variables) => { toast.success(variables.item ? 'Đã cập nhật sự cố' : 'Đã tạo phiếu sự cố'); setEditorOpen(false); setEditing(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể lưu sự cố.')),
  });
  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) => incidentApi.assign(id, assignedTo),
    onSuccess: async () => { toast.success('Đã phân công người xử lý'); setAssignTarget(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể phân công sự cố.')),
  });
  const startMutation = useMutation({
    mutationFn: incidentApi.start,
    onSuccess: async () => { toast.success('Đã bắt đầu xử lý sự cố'); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể bắt đầu xử lý.')),
  });
  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => incidentApi.resolve(id, note),
    onSuccess: async () => { toast.success('Đã ghi nhận kết quả xử lý'); setResolveTarget(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể hoàn tất sự cố.')),
  });
  const closeMutation = useMutation({
    mutationFn: (id: string) => incidentApi.close(id),
    onSuccess: async () => { toast.success('Đã đóng hồ sơ sự cố'); setCloseTarget(null); await refresh(); },
    onError: (error) => toast.error(errorMessage(error, 'Không thể đóng hồ sơ.')),
  });

  const filtersActive = Boolean(keyword || status || severity || assetType);
  const resetFilters = () => { setSearch(''); setKeyword(''); setStatus(''); setSeverity(''); setAssetType(''); setPage(1); };

  return <div className="space-y-5 animate-float-in">
    <PageHeader eyebrow="Vận hành" title="Quản lý sự cố" description="Ghi nhận, phân công và theo dõi toàn bộ quá trình xử lý sự cố phòng Lab.">
      {canCreate && <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus/>Báo cáo sự cố</Button>}
    </PageHeader>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Chưa hoàn tất" value={summary.open + summary.assigned + summary.inProgress} helper={`${summary.inProgress} đang xử lý`} icon={Clock3} tone="blue"/>
      <Metric label="Sự cố khẩn cấp" value={summary.criticalOpen} helper="Cần ưu tiên ngay" icon={ShieldAlert} tone="red"/>
      <Metric label="Cảnh báo tài sản" value={summary.totalAssetAlerts} helper={`${summary.brokenComputers} máy · ${summary.equipmentTypesWithIssues} loại thiết bị`} icon={CircleAlert} tone="amber"/>
      <Metric label="Đã xử lý" value={summary.resolved + summary.closed} helper={`${summary.closed} hồ sơ đã đóng`} icon={CheckCircle2} tone="green"/>
    </section>

    <Card>
      <CardContent className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_160px_170px_auto]">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Tìm mã, tiêu đề hoặc tài sản..."/></div>
          <Filter value={status} onChange={(value) => { setStatus(value as IncidentStatus | ''); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</Filter>
          <Filter value={severity} onChange={(value) => { setSeverity(value as IncidentSeverity | ''); setPage(1); }}><option value="">Tất cả mức độ</option>{Object.entries(SEVERITY).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</Filter>
          <Filter value={assetType} onChange={(value) => { setAssetType(value as IncidentAssetType | ''); setPage(1); }}><option value="">Tất cả đối tượng</option><option value="COMPUTER">Máy tính</option><option value="EQUIPMENT">Thiết bị</option><option value="BOOKING">Lịch sử dụng</option><option value="GENERAL">Phòng Lab / khác</option></Filter>
          <Button variant="outline" disabled={!filtersActive} onClick={resetFilters}>Đặt lại</Button>
        </div>
      </CardContent>
    </Card>

    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-extrabold text-slate-900">Danh sách phiếu sự cố <span className="text-blue-600">({meta?.totalItems || 0})</span></h2><p className="mt-1 text-[11px] text-slate-400">Ưu tiên sự cố chưa hoàn tất và có mức độ cao.</p></div></div>
      <div className="divide-y divide-slate-100">
        {listQuery.isLoading && Array.from({ length: 5 }, (_, index) => <div key={index} className="p-4"><Skeleton className="h-20 w-full"/></div>)}
        {!listQuery.isLoading && rows.length === 0 && <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center"><span className="rounded-2xl bg-emerald-50 p-4 text-emerald-500"><CheckCircle2 className="h-7 w-7"/></span><p className="mt-3 text-sm font-extrabold text-slate-700">Không có sự cố phù hợp</p><p className="mt-1 text-xs text-slate-400">Các phiếu sự cố mới hoặc được phân công sẽ xuất hiện tại đây.</p></div>}
        {rows.map((item) => <IncidentRow key={item.id} item={item} onView={() => setDetail(item)} actions={{
          canEdit: canUpdate && canManage(item, user?.id, canManageAll) && !['RESOLVED', 'CLOSED'].includes(item.status),
          canAssign: canAssign && !['RESOLVED', 'CLOSED'].includes(item.status),
          canStart: canUpdate && canManage(item, user?.id, canManageAll) && ['OPEN', 'ASSIGNED'].includes(item.status),
          canResolve: canResolve && canManage(item, user?.id, canManageAll) && item.status === 'IN_PROGRESS',
          canClose: canClose && item.status === 'RESOLVED',
          onEdit: () => { setEditing(item); setEditorOpen(true); }, onAssign: () => setAssignTarget(item),
          onStart: () => startMutation.mutate(item.id), onResolve: () => setResolveTarget(item), onClose: () => setCloseTarget(item),
          pending: startMutation.isPending,
        }}/>) }
      </div>
      {!!meta?.totalPages && meta.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-400">Trang {meta.page}/{meta.totalPages}</p><div className="flex gap-2"><Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft/></Button><Button size="icon" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight/></Button></div></div>}
    </Card>

    <IncidentEditorDialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditing(null); }} incident={editing} options={optionsQuery.data} saving={saveMutation.isPending} onSubmit={(payload) => saveMutation.mutate({ item: editing, payload })}/>
    <AssignDialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)} item={assignTarget} assigneeId={assigneeId} onAssigneeChange={setAssigneeId} assignees={optionsQuery.data?.assignees || []} pending={assignMutation.isPending} onConfirm={() => assignTarget && assigneeId && assignMutation.mutate({ id: assignTarget.id, assignedTo: assigneeId })}/>
    <ReasonDialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)} title="Xác nhận đã xử lý sự cố" description="Ghi rõ nguyên nhân, công việc đã thực hiện và kết quả kiểm tra." reference={resolveTarget ? `${resolveTarget.code} · ${resolveTarget.title}` : undefined} label="Kết quả xử lý" placeholder="Ví dụ: Đã thay bộ nguồn, kiểm tra khởi động và bàn giao..." confirmLabel="Hoàn tất xử lý" destructive={false} pending={resolveMutation.isPending} onConfirm={(note) => resolveTarget && resolveMutation.mutate({ id: resolveTarget.id, note })}/>
    <ConfirmDialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)} title="Đóng hồ sơ sự cố?" description="Phiếu đã đóng được giữ lại trong lịch sử và không thể tiếp tục cập nhật." confirmLabel="Đóng hồ sơ" pending={closeMutation.isPending} onConfirm={() => closeTarget && closeMutation.mutate(closeTarget.id)}/>
    <IncidentDetailDialog item={detail} open={!!detail} onOpenChange={(open) => !open && setDetail(null)}/>
  </div>;
}

function IncidentRow({ item, onView, actions }: { item: IncidentRecord; onView: () => void; actions: { canEdit: boolean; canAssign: boolean; canStart: boolean; canResolve: boolean; canClose: boolean; onEdit: () => void; onAssign: () => void; onStart: () => void; onResolve: () => void; onClose: () => void; pending: boolean } }) {
  const severity = SEVERITY[item.severity]; const status = STATUS[item.status]; const Icon = item.assetType === 'COMPUTER' ? Monitor : item.assetType === 'EQUIPMENT' ? PackageOpen : AlertTriangle;
  const buttons = actions.canEdit || actions.canAssign || actions.canStart || actions.canResolve || actions.canClose;
  return <div className="group relative grid cursor-pointer gap-3 px-5 py-4 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(320px,1.45fr)_minmax(170px,.7fr)_minmax(150px,.65fr)_auto] lg:items-center" onClick={onView}>
    <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', severity.rail)}/>
    <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 rounded-xl bg-slate-100 p-2.5 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600"><Icon className="h-4 w-4"/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">{item.code}</span><span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-extrabold', severity.badge)}>{severity.label}</span></div><p className="mt-1 truncate text-sm font-extrabold text-slate-800">{item.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{item.assetCode ? `${item.assetCode} · ${item.assetName}` : 'Phòng Lab / sự cố chung'}</p></div></div>
    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Người xử lý</p><p className="mt-1 truncate text-xs font-semibold text-slate-700">{item.assignedToName || 'Chưa phân công'}</p></div>
    <div><Badge variant={status.variant} className="gap-1.5"><span className={cn('h-1.5 w-1.5 rounded-full', status.dot)}/>{status.label}</Badge><p className="mt-1.5 text-[10px] text-slate-400">{formatDate(item.createdAt)}</p></div>
    <div className="flex flex-wrap items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {!buttons && <Button size="sm" variant="ghost" onClick={onView}><Eye/>Chi tiết</Button>}
      {actions.canEdit && <Button size="icon" variant="ghost" title="Chỉnh sửa" onClick={actions.onEdit}><Pencil/></Button>}
      {actions.canAssign && <Button size="icon" variant="ghost" title="Phân công" onClick={actions.onAssign}><UserRoundCheck/></Button>}
      {actions.canStart && <Button size="sm" variant="outline" disabled={actions.pending} onClick={actions.onStart}><Play/>Bắt đầu</Button>}
      {actions.canResolve && <Button size="sm" onClick={actions.onResolve}><CheckCircle2/>Hoàn tất</Button>}
      {actions.canClose && <Button size="sm" variant="outline" onClick={actions.onClose}>Đóng hồ sơ</Button>}
    </div>
  </div>;
}

function IncidentDetailDialog({ item, open, onOpenChange }: { item: IncidentRecord | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!item) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><div className="flex flex-wrap items-center gap-2"><Badge variant={STATUS[item.status].variant}>{STATUS[item.status].label}</Badge><span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', SEVERITY[item.severity].badge)}>{SEVERITY[item.severity].label}</span></div><DialogTitle className="pt-2">{item.title}</DialogTitle><DialogDescription>{item.code} · Tạo lúc {formatDateTime(item.createdAt)}</DialogDescription></DialogHeader><div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Info label="Người báo cáo" value={item.reporterName || item.reporterUsername || 'Không xác định'}/><Info label="Người xử lý" value={item.assignedToName || 'Chưa phân công'}/><Info label="Đối tượng" value={item.assetCode ? `${item.assetCode} · ${item.assetName}` : 'Phòng Lab / khác'}/><Info label="Cập nhật gần nhất" value={formatDateTime(item.updatedAt)}/></div><section><h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Mô tả sự cố</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.description}</p></section>{item.resultNote && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">Kết quả xử lý</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{item.resultNote}</p></section>}{item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">Xem hình ảnh đính kèm <ArrowRight className="h-4 w-4"/></a>}<DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button></DialogFooter></DialogContent></Dialog>;
}

function AssignDialog({ open, onOpenChange, item, assigneeId, onAssigneeChange, assignees, pending, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; item: IncidentRecord | null; assigneeId: string; onAssigneeChange: (id: string) => void; assignees: Array<{ id: string; fullName: string; username: string }>; pending: boolean; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Phân công xử lý</DialogTitle><DialogDescription>{item ? `${item.code} · ${item.title}` : 'Chọn người phụ trách sự cố.'}</DialogDescription></DialogHeader><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Người xử lý</span><select value={assigneeId} onChange={(event) => onAssigneeChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="">Chọn người xử lý...</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.username}</option>)}</select></label><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button disabled={!assigneeId || pending} onClick={onConfirm}>{pending && <LoaderCircle className="animate-spin"/>}Phân công</Button></DialogFooter></DialogContent></Dialog>;
}

function Metric({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: typeof Clock3; tone: 'blue' | 'red' | 'amber' | 'green' }) {
  const styles = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600' }[tone];
  return <Card><CardContent className="flex items-center gap-3 p-4"><span className={cn('rounded-xl p-2.5', styles)}><Icon className="h-5 w-5"/></span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><div className="flex items-baseline gap-2"><strong className="text-xl font-extrabold text-slate-900">{value}</strong><span className="truncate text-[10px] text-slate-400">{helper}</span></div></div></CardContent></Card>;
}

function Filter({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">{children}</select>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-semibold text-slate-700">{value}</p></div>; }
function canManage(item: IncidentRecord, userId: string | undefined, canManageAll: boolean) { return canManageAll || (!!userId && item.assignedTo === userId); }
function formatDate(value: string) { return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)); }
function errorMessage(error: unknown, fallback: string): string { return axios.isAxiosError(error) ? error.response?.data?.error?.message || fallback : fallback; }
