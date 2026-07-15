'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileBarChart,
  KeyRound,
  Monitor,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRoundCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/AuthContext';
import { roleApi, type PermissionApiRecord, type RoleApiRecord } from '@/services/role-api';
import { cn } from '@/lib/utils';
import { PERMISSION_GROUPS, type RoleTone } from './access-control-data';

const ROLE_TONES: Record<RoleTone, { icon: string; badge: string; active: string }> = {
  violet: { icon: 'bg-violet-100 text-violet-700', badge: 'border-violet-200 bg-violet-50 text-violet-700', active: 'border-violet-200 bg-violet-50/70' },
  blue: { icon: 'bg-blue-100 text-blue-700', badge: 'border-blue-200 bg-blue-50 text-blue-700', active: 'border-blue-200 bg-blue-50/70' },
  cyan: { icon: 'bg-cyan-100 text-cyan-700', badge: 'border-cyan-200 bg-cyan-50 text-cyan-700', active: 'border-cyan-200 bg-cyan-50/70' },
  emerald: { icon: 'bg-emerald-100 text-emerald-700', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', active: 'border-emerald-200 bg-emerald-50/70' },
  amber: { icon: 'bg-amber-100 text-amber-700', badge: 'border-amber-200 bg-amber-50 text-amber-700', active: 'border-amber-200 bg-amber-50/70' },
  slate: { icon: 'bg-slate-100 text-slate-600', badge: 'border-slate-200 bg-slate-100 text-slate-600', active: 'border-slate-300 bg-slate-100/80' },
};
const FALLBACK_TONES: RoleTone[] = ['violet', 'blue', 'emerald', 'cyan', 'amber', 'slate'];
const GROUP_ICONS: Record<string, LucideIcon> = { users: Users, lab: CalendarDays, computers: Monitor, equipment: PackageOpen, bookings: ClipboardCheck, incidents: TriangleAlert, reports: FileBarChart };
const normalizeCodes = (codes: string[]) => [...codes].sort().join('|');
const errorMessage = (error: unknown) => (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Không thể cập nhật ma trận quyền.';

export default function RolesPage() {
  const { refresh } = useAuth();
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({ queryKey: ['roles-catalog'], queryFn: roleApi.catalog });
  const [selectedRoleCode, setSelectedRoleCode] = useState('ADMIN');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [savedPermissions, setSavedPermissions] = useState<Record<string, string[]>>({});
  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});

  const roles = catalogQuery.data?.roles || [];
  const permissions = catalogQuery.data?.permissions || [];
  const selectedRole = roles.find((role) => role.code === selectedRoleCode) || roles[0];
  const activeRoleCode = selectedRole?.code || selectedRoleCode;
  const selectedPermissions = draftPermissions[activeRoleCode] ?? selectedRole?.permissionCodes ?? [];
  const isAdminRole = activeRoleCode === 'ADMIN';
  const isDirty = normalizeCodes(selectedPermissions) !== normalizeCodes(savedPermissions[activeRoleCode] ?? selectedRole?.permissionCodes ?? []);

  useEffect(() => {
    if (!roles.length) return;
    setSavedPermissions(Object.fromEntries(roles.map((role) => [role.code, [...role.permissionCodes]])));
    setDraftPermissions(Object.fromEntries(roles.map((role) => [role.code, [...role.permissionCodes]])));
    if (!roles.some((role) => role.code === selectedRoleCode)) setSelectedRoleCode(roles[0].code);
  }, [catalogQuery.dataUpdatedAt]);

  const visibleRoles = useMemo(() => {
    const search = roleSearch.trim().toLocaleLowerCase('vi');
    return roles.filter((role) => !search || `${role.name} ${role.code} ${role.description || ''}`.toLocaleLowerCase('vi').includes(search));
  }, [roleSearch, roles]);

  const visibleGroups = useMemo(() => {
    const search = permissionSearch.trim().toLocaleLowerCase('vi');
    const grouped = new Map<string, PermissionApiRecord[]>();
    permissions.forEach((permission) => {
      if (search && !`${permission.name} ${permission.code} ${permission.description || ''}`.toLocaleLowerCase('vi').includes(search)) return;
      grouped.set(permission.group, [...(grouped.get(permission.group) || []), permission]);
    });
    return Array.from(grouped.entries()).map(([id, groupPermissions]) => {
      const metadata = PERMISSION_GROUPS.find((group) => group.id === id);
      return { id, name: metadata?.name || id, description: metadata?.description || 'Nhóm quyền hệ thống.', permissions: groupPermissions };
    });
  }, [permissionSearch, permissions]);

  const updateMutation = useMutation({
    mutationFn: () => roleApi.updatePermissions(activeRoleCode, selectedPermissions),
    onSuccess: async (role) => {
      setSavedPermissions((current) => ({ ...current, [role.code]: [...role.permissionCodes] }));
      setDraftPermissions((current) => ({ ...current, [role.code]: [...role.permissionCodes] }));
      await queryClient.invalidateQueries({ queryKey: ['roles-catalog'] });
      await refresh();
      toast.success(`Đã cập nhật quyền cho vai trò ${role.name}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const togglePermission = (code: string) => {
    if (isAdminRole) return;
    setDraftPermissions((current) => {
      const currentPermissions = current[activeRoleCode] ?? [];
      return { ...current, [activeRoleCode]: currentPermissions.includes(code) ? currentPermissions.filter((item) => item !== code) : [...currentPermissions, code] };
    });
  };
  const toggleGroup = (codes: string[]) => {
    if (isAdminRole) return;
    setDraftPermissions((current) => {
      const currentPermissions = current[activeRoleCode] ?? [];
      const allSelected = codes.every((code) => currentPermissions.includes(code));
      return { ...current, [activeRoleCode]: allSelected ? currentPermissions.filter((code) => !codes.includes(code)) : Array.from(new Set([...currentPermissions, ...codes])) };
    });
  };
  const resetRole = () => setDraftPermissions((current) => ({ ...current, [activeRoleCode]: [...(savedPermissions[activeRoleCode] || [])] }));

  if (catalogQuery.isLoading) return <div className="flex min-h-[55vh] items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-blue-600" /></div>;
  if (catalogQuery.isError || !selectedRole) return <div className="dashboard-card flex min-h-64 flex-col items-center justify-center text-center"><p className="text-sm font-bold text-slate-700">Không thể tải ma trận vai trò</p><button type="button" onClick={() => void catalogQuery.refetch()} className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">Thử tải lại</button></div>;

  const roleTone = ROLE_TONES[FALLBACK_TONES[Math.max(0, roles.indexOf(selectedRole)) % FALLBACK_TONES.length]];
  const permissionCount = permissions.length;
  const assignmentCount = roles.reduce((sum, role) => sum + role.userCount, 0);

  return (
    <div className="animate-float-in space-y-4">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-1.5 flex items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">RBAC</span><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">API trực tiếp</span></div><h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Vai trò & phân quyền</h1><p className="mt-1 text-sm text-slate-500">Thiết lập phạm vi truy cập cho từng nhóm người dùng trong hệ thống.</p></div><div className="flex items-center gap-2 self-start sm:self-auto">{isDirty && <button type="button" onClick={resetRole} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Hoàn tác</button>}{!isAdminRole && <button type="button" onClick={() => updateMutation.mutate()} disabled={!isDirty || updateMutation.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>}</div></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Vai trò hệ thống" value={roles.length} helper="Đồng bộ từ database" icon={UserRoundCog} tone="violet" highlighted /><MetricCard label="Quyền truy cập" value={permissionCount} helper={`${visibleGroups.length} nhóm chức năng`} icon={KeyRound} tone="blue" /><MetricCard label="Tài khoản được gán" value={assignmentCount} helper="Tổng lượt gán vai trò" icon={Users} tone="emerald" /><MetricCard label="Quyền của vai trò này" value={selectedPermissions.length} helper={`${selectedRole.name}`} icon={ShieldCheck} tone="amber" /></section>

      <section className="grid items-start gap-4 xl:grid-cols-[330px_minmax(0,1fr)]"><aside className="dashboard-card overflow-hidden xl:sticky xl:top-[84px]"><div className="border-b border-slate-100 p-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold text-slate-900">Danh sách vai trò</h2><p className="mt-0.5 text-[11px] text-slate-400">Chọn vai trò để xem chi tiết.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-600">{roles.length}</span></div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Tìm vai trò..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></div></div><div className="space-y-1.5 p-2.5">{visibleRoles.map((role, index) => { const selected = role.code === activeRoleCode; const tone = ROLE_TONES[FALLBACK_TONES[index % FALLBACK_TONES.length]]; return <button key={role.code} type="button" onClick={() => { setSelectedRoleCode(role.code); setPermissionSearch(''); }} className={cn('group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', selected ? tone.active : 'border-transparent hover:border-slate-200 hover:bg-slate-50')}><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone.icon)}>{role.code === 'ADMIN' ? <ShieldCheck className="h-5 w-5" /> : <UserRoundCog className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-extrabold text-slate-800">{role.name}</strong><span className="mt-1 block text-[10px] text-slate-400">{role.userCount} người dùng · {role.permissionCodes.length} quyền</span></span><ChevronRight className={cn('h-4 w-4 text-slate-300', selected && 'text-blue-500')} /></button>; })}</div></aside>

        <div className="dashboard-card overflow-hidden"><div className="border-b border-slate-100 p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', roleTone.icon)}>{isAdminRole ? <ShieldCheck className="h-6 w-6" /> : <UserRoundCog className="h-6 w-6" />}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-slate-950">{selectedRole.name}</h2><span className={cn('rounded-full border px-2.5 py-1 text-[9px] font-extrabold', roleTone.badge)}>{selectedRole.code}</span><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold text-slate-500">Vai trò hệ thống</span></div><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{selectedRole.description || 'Không có mô tả.'}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-400"><span>{selectedRole.userCount} người dùng</span><span className="h-1 w-1 rounded-full bg-slate-300" /><span>{selectedPermissions.length}/{permissionCount} quyền được cấp</span>{isDirty && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Có thay đổi chưa lưu</span>}</div></div></div><div className="relative w-full lg:w-64"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="Tìm quyền truy cập..." className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></div></div>{isAdminRole && <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><p className="text-xs leading-5 text-violet-800">Quản trị viên luôn có toàn quyền hệ thống. Ma trận được khóa để tránh thu hồi quyền quản trị cốt lõi.</p></div>}</div>

          <div className="bg-slate-50/40 p-4 sm:p-5">{visibleGroups.length ? <div className="grid items-start gap-4 2xl:grid-cols-2">{visibleGroups.map((group) => { const Icon = GROUP_ICONS[group.id] || KeyRound; const codes = group.permissions.map((permission) => permission.code); const selectedCount = codes.filter((code) => selectedPermissions.includes(code)).length; const allSelected = codes.length > 0 && selectedCount === codes.length; return <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,.03)]"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-4 w-4" /></span><div className="min-w-0"><h3 className="truncate text-xs font-extrabold text-slate-800">{group.name}</h3><p className="mt-0.5 truncate text-[10px] text-slate-400">{selectedCount}/{codes.length} quyền được cấp</p></div></div><button type="button" onClick={() => toggleGroup(codes)} disabled={isAdminRole} className={cn('rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition', allSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200', isAdminRole && 'cursor-not-allowed opacity-60')}>{allSelected ? 'Bỏ chọn nhóm' : 'Chọn cả nhóm'}</button></div><div className="divide-y divide-slate-100">{group.permissions.map((permission) => { const checked = selectedPermissions.includes(permission.code); return <button key={permission.code} type="button" role="checkbox" aria-checked={checked} disabled={isAdminRole} onClick={() => togglePermission(permission.code)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition', checked ? 'bg-blue-50/25' : 'hover:bg-slate-50', isAdminRole && 'cursor-not-allowed')}><span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent')}><Check className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-xs font-extrabold text-slate-700">{permission.name}</strong><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">{permission.code}</code></span><small className="mt-1 block text-[10px] leading-4 text-slate-400">{permission.description || 'Không có mô tả.'}</small></span></button>; })}</div></div>; })}</div> : <div className="flex min-h-56 flex-col items-center justify-center text-center"><span className="rounded-2xl bg-slate-100 p-4 text-slate-400"><KeyRound className="h-7 w-7" /></span><p className="mt-3 text-sm font-extrabold text-slate-700">Không tìm thấy quyền truy cập</p><p className="mt-1 text-xs text-slate-400">Thử tìm theo tên hoặc mã quyền khác.</p></div>}</div>
          {!isAdminRole && <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-[11px] text-slate-400">Thay đổi sẽ được lưu trực tiếp vào ma trận quyền trong database.</p><div className="flex items-center gap-2">{isDirty && <button type="button" onClick={resetRole} className="h-9 rounded-lg px-3 text-xs font-bold text-slate-500 hover:bg-slate-100">Hoàn tác</button>}<button type="button" onClick={() => updateMutation.mutate()} disabled={!isDirty || updateMutation.isPending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Lưu ma trận quyền</button></div></div>}</div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone, highlighted = false }: { label: string; value: number; helper: string; icon: LucideIcon; tone: 'violet' | 'blue' | 'emerald' | 'amber'; highlighted?: boolean }) {
  const tones = { violet: 'bg-violet-50 text-violet-600', blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return <div className={cn('flex min-h-[96px] items-center gap-3 p-4 transition hover:-translate-y-0.5', highlighted ? 'rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#5B43F4] via-[#6D3FF2] to-[#8B2CF5] shadow-[0_10px_24px_rgba(109,63,242,.24)]' : 'dashboard-card')}><span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', highlighted ? 'bg-white/15 text-white ring-1 ring-white/25' : tones[tone])}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className={cn('truncate text-[11px] font-semibold', highlighted ? 'text-white/80' : 'text-slate-500')}>{label}</p><p className={cn('mt-0.5 text-xl font-extrabold leading-none', highlighted ? 'text-white' : 'text-slate-900')}>{value}</p><p className={cn('mt-1.5 truncate text-[10px] font-medium', highlighted ? 'text-white/75' : 'text-slate-400')}>{helper}</p></div></div>;
}

