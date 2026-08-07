'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw, Search, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PermissionGate } from '@/components/auth/permission-gate';
import { auditLogApi, type AuditLogRecord } from '@/services/audit-log-api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: 'Tạo người dùng',
  USER_UPDATED: 'Cập nhật người dùng',
  USER_STATUS_UPDATED: 'Đổi trạng thái người dùng',
  USER_DELETED: 'Xóa người dùng',
  EQUIPMENT_DELETED: 'Xóa thiết bị',
  USER_ROLES_UPDATED: 'Đổi vai trò người dùng',
  USER_PASSWORD_RESET: 'Đặt lại mật khẩu',
  ROLE_PERMISSIONS_UPDATED: 'Cập nhật ma trận quyền',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function actionTone(action: string) {
  if (action.includes('DELETED')) return 'border-red-200 bg-red-50 text-red-700';
  if (action.includes('PASSWORD') || action.includes('STATUS')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (action.includes('ROLE')) return 'border-violet-200 bg-violet-50 text-violet-700';
  return 'border-blue-200 bg-blue-50 text-blue-700';
}

export default function Page() {
  return <PermissionGate permission="AUDIT_LOG_VIEW"><AuditLogPage /></PermissionGate>;
}

function AuditLogPage() {
  const [keyword, setKeyword] = useState('');
  const [action, setAction] = useState('');
  const [entityName, setEntityName] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['audit-logs', { page, keyword, action, entityName }],
    queryFn: () => auditLogApi.list({ page, pageSize: PAGE_SIZE, keyword: keyword || undefined, action: action || undefined, entityName: entityName || undefined }),
  });
  const totalPages = Math.max(1, query.data?.meta.totalPages || 1);
  const records = query.data?.data || [];

  return (
    <div className="animate-float-in space-y-4">
      <PageHeader eyebrow="Kiểm soát" title="Nhật ký hệ thống" description="Theo dõi các thao tác quan trọng trong toàn bộ hệ thống." />
      <section className="dashboard-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-sm font-extrabold text-slate-900">Hoạt động quản trị</h2><p className="mt-0.5 text-[11px] text-slate-400">Lịch sử được ghi từ backend, có thể tra cứu bằng mã correlation.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><div className="relative min-w-60 sm:w-72"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="Tìm người thao tác, mã correlation..." className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></div><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none"><option value="">Tất cả hành động</option>{Object.entries(ACTION_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><select value={entityName} onChange={(event) => { setEntityName(event.target.value); setPage(1); }} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none"><option value="">Tất cả đối tượng</option><option value="Users">Người dùng</option><option value="Roles">Vai trò</option><option value="Computers">Máy tính</option><option value="Equipments">Thiết bị</option><option value="Bookings">Đăng ký sử dụng</option></select></div>
        </div>
        {query.isLoading ? <div className="flex min-h-64 items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-blue-600" /></div> : query.isError ? <div className="flex min-h-64 flex-col items-center justify-center text-center"><ScrollText className="h-9 w-9 text-red-300" /><p className="mt-3 text-sm font-bold text-slate-700">Không thể tải nhật ký hệ thống</p><button type="button" onClick={() => void query.refetch()} className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">Thử tải lại</button></div> : <>
          <div className="overflow-x-auto scrollbar-thin"><table className="w-full min-w-[980px] text-left"><thead className="bg-slate-50/80"><tr className="text-[10px] font-extrabold uppercase tracking-[.1em] text-slate-400"><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Người thao tác</th><th className="px-4 py-3">Hành động</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Correlation ID</th><th className="px-4 py-3">Chi tiết</th></tr></thead><tbody className="divide-y divide-slate-100">{records.map((record) => <AuditRow key={record.id} record={record} />)}{records.length === 0 && <tr><td colSpan={6} className="h-56 text-center"><ScrollText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">Chưa có nhật ký phù hợp</p><p className="mt-1 text-xs text-slate-400">Thử thay đổi bộ lọc tra cứu.</p></td></tr>}</tbody></table></div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-slate-400">{query.data?.meta.totalItems || 0} bản ghi</p><div className="flex items-center gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Trang trước"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-xs font-bold text-slate-600">Trang {page}/{totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40" aria-label="Trang sau"><ChevronRight className="h-4 w-4" /></button></div></div>
        </>}
      </section>
    </div>
  );
}

function AuditRow({ record }: { record: AuditLogRecord }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <tr className="transition hover:bg-blue-50/25"><td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold text-slate-600">{formatDate(record.createdAt)}</td><td className="px-4 py-3.5"><p className="text-xs font-extrabold text-slate-700">{record.actorName || 'Tài khoản đã xóa'}</p><p className="mt-0.5 text-[10px] text-slate-400">{record.actorUsername ? `@${record.actorUsername}` : 'Không xác định'}</p></td><td className="px-4 py-3.5"><span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold', actionTone(record.action))}>{ACTION_LABELS[record.action] || record.action}</span></td><td className="px-4 py-3.5"><p className="text-xs font-semibold text-slate-600">{record.entityName}</p><p className="mt-0.5 max-w-40 truncate text-[10px] text-slate-400">{record.entityId || '—'}</p></td><td className="px-4 py-3.5"><code className="text-[10px] text-slate-500">{record.correlationId || '—'}</code></td><td className="px-4 py-3.5"><button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200">{expanded ? 'Thu gọn' : 'Xem thay đổi'}</button></td></tr>
    {expanded && <tr className="bg-slate-50/70"><td colSpan={6} className="px-4 py-3"><div className="grid gap-3 md:grid-cols-2"><JsonBlock label="Trước thay đổi" value={record.oldValue} /><JsonBlock label="Sau thay đổi" value={record.newValue} /></div></td></tr>}
  </>;
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-slate-600">{value === null ? 'Không có dữ liệu' : JSON.stringify(value, null, 2)}</pre></div>;
}
