'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ClipboardCheck,
  KeyRound,
  LogOut,
  Menu,
  Search,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/features/auth/AuthContext';
import { navItems, pageNames } from '@/components/layout/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { bookingApi } from '@/services/booking-api';
import { incidentApi } from '@/services/incident-api';
import { maintenanceApi } from '@/services/maintenance-api';

type AppHeaderProps = {
  onMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onLogout: () => void;
};

type HeaderNotificationItem = {
  id: string;
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export function AppHeader({ onMenu, onToggleSidebar, sidebarCollapsed, onLogout }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const canApproveBookings = hasPermission('BOOKING_APPROVE');
  const canViewIncidents = ['INCIDENT_VIEW', 'INCIDENT_VIEW_OWN', 'INCIDENT_VIEW_ASSIGNED'].some(hasPermission);
  const canViewMaintenance = hasPermission('MAINTENANCE_VIEW');

  const pendingBookingsQuery = useQuery({
    queryKey: ['header-notifications', 'pending-bookings'],
    queryFn: bookingApi.pending,
    enabled: canApproveBookings,
    refetchInterval: 60_000,
  });
  const incidentSummaryQuery = useQuery({
    queryKey: ['header-notifications', 'incident-summary'],
    queryFn: incidentApi.summary,
    enabled: canViewIncidents,
    refetchInterval: 60_000,
  });
  const maintenanceSummaryQuery = useQuery({
    queryKey: ['header-notifications', 'maintenance-summary'],
    queryFn: maintenanceApi.summary,
    enabled: canViewMaintenance,
    refetchInterval: 60_000,
  });

  const notificationItems = useMemo<HeaderNotificationItem[]>(() => {
    const items: HeaderNotificationItem[] = [];
    const pendingBookings = pendingBookingsQuery.data?.length || 0;
    const incidentSummary = incidentSummaryQuery.data;
    const unresolvedIncidents = incidentSummary
      ? incidentSummary.open + incidentSummary.assigned + incidentSummary.inProgress
      : 0;
    const maintenanceSummary = maintenanceSummaryQuery.data;
    const maintenanceAttention = maintenanceSummary?.overdue || maintenanceSummary?.inProgress || 0;

    if (pendingBookings > 0) {
      items.push({
        id: 'pending-bookings',
        title: `${pendingBookings} yêu cầu đang chờ duyệt`,
        description: 'Mở danh sách đăng ký để xem xét và phản hồi.',
        count: pendingBookings,
        href: '/bookings',
        icon: ClipboardCheck,
        tone: 'bg-amber-50 text-amber-600',
      });
    }
    if (unresolvedIncidents > 0) {
      items.push({
        id: 'incidents',
        title: `${unresolvedIncidents} sự cố chưa hoàn tất`,
        description: incidentSummary?.criticalOpen
          ? `Có ${incidentSummary.criticalOpen} sự cố khẩn cấp cần ưu tiên.`
          : 'Theo dõi các sự cố đang mở hoặc đang được xử lý.',
        count: unresolvedIncidents,
        href: '/incidents',
        icon: AlertTriangle,
        tone: 'bg-red-50 text-red-600',
      });
    }
    if (maintenanceAttention > 0) {
      items.push({
        id: 'maintenances',
        title: maintenanceSummary?.overdue
          ? `${maintenanceSummary.overdue} lịch bảo trì quá hạn`
          : `${maintenanceSummary?.inProgress || 0} lịch bảo trì đang thực hiện`,
        description: maintenanceSummary?.overdue
          ? 'Cần cập nhật tiến độ hoặc hoàn tất lịch bảo trì.'
          : 'Theo dõi tiến độ xử lý tài sản.',
        count: maintenanceAttention,
        href: '/maintenance',
        icon: Wrench,
        tone: 'bg-orange-50 text-orange-600',
      });
    }
    return items;
  }, [incidentSummaryQuery.data, maintenanceSummaryQuery.data, pendingBookingsQuery.data]);
  const notificationCount = notificationItems.reduce((total, item) => total + item.count, 0);
  const notificationLoading = pendingBookingsQuery.isLoading
    || incidentSummaryQuery.isLoading
    || maintenanceSummaryQuery.isLoading;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    const clickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', clickOutside);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', clickOutside);
    };
  }, []);

  const quickSearchItems = useMemo(
    () => navItems
      .filter((item) =>
        (!item.permission || hasPermission(item.permission))
        && (!item.anyPermissions || item.anyPermissions.some(hasPermission)),
      )
      .map((item) => ({
        ...item,
        keywords: `${item.label} ${item.href} ${pageNames[item.href] || ''}`.toLocaleLowerCase('vi'),
        description: item.group === 'system' ? 'Quản trị hệ thống' : 'Chức năng phòng Lab',
      })),
    [hasPermission],
  );
  const filteredSearchItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return (term ? quickSearchItems.filter((item) => item.keywords.includes(term)) : quickSearchItems).slice(0, 7);
  }, [quickSearchItems, search]);
  const goToSearchItem = (href: string) => {
    router.push(href);
    setSearch('');
    setSearchOpen(false);
  };

  const initials = (user?.fullName || 'AD')
    .split(' ')
    .slice(-2)
    .map((value) => value[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-[68px] items-center gap-2 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:gap-3 sm:px-6">
      <button onClick={onMenu} aria-label="Mở menu" title="Mở menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Hiện thanh chức năng' : 'Ẩn thanh chức năng'}
        title={sidebarCollapsed ? 'Hiện thanh chức năng' : 'Ẩn thanh chức năng'}
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700 hover:shadow-md lg:inline-flex"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 sm:block">
        <p className="text-xs font-medium text-slate-400">IT-LAB /</p>
        <p className="truncate text-sm font-bold text-slate-800">{pageNames[pathname || '/'] || 'Quản lý phòng Lab'}</p>
      </div>

      <div className="mx-auto hidden w-full max-w-md md:block">
        <div ref={searchContainerRef} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filteredSearchItems[0]) {
                event.preventDefault();
                goToSearchItem(filteredSearchItems[0].href);
              }
            }}
            aria-label="Tìm kiếm nhanh trong hệ thống"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-16 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            placeholder="Tìm kiếm nhanh..."
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">Ctrl K</kbd>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">
                {search.trim() ? 'Kết quả điều hướng' : 'Truy cập nhanh'}
              </p>
              {filteredSearchItems.length ? filteredSearchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.href}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSearchItem(item.href)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-blue-50"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">{item.label}</span>
                      <span className="block text-[11px] text-slate-400">{item.description}</span>
                    </span>
                    <span className="text-xs text-slate-300">Enter</span>
                  </button>
                );
              }) : <p className="px-3 py-4 text-center text-sm text-slate-500">Không tìm thấy chức năng phù hợp.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={notificationCount ? `Thông báo, ${notificationCount} mục cần chú ý` : 'Thông báo'}
              title="Thông báo"
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              <Bell className="h-[18px] w-[18px]" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={10}
              className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Thông báo</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Dữ liệu vận hành cần bạn chú ý</p>
                </div>
                {notificationCount > 0 && (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-600">
                    {notificationCount} mục
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {notificationItems.length ? (
                  notificationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenu.Item
                        key={item.id}
                        onSelect={() => router.push(item.href)}
                        className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 outline-none transition hover:bg-slate-50 focus:bg-slate-50"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-xs font-extrabold text-slate-800">{item.title}</strong>
                          <span className="mt-1 block text-[11px] leading-4 text-slate-500">{item.description}</span>
                        </span>
                        <ChevronDown className="mt-2 h-3.5 w-3.5 -rotate-90 text-slate-300" />
                      </DropdownMenu.Item>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Bell className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      {notificationLoading ? 'Đang cập nhật thông báo...' : 'Không có mục nào cần xử lý'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">Hệ thống sẽ tự động cập nhật mỗi phút.</p>
                  </div>
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100">
              <Avatar className="h-9 w-9 ring-2 ring-blue-100">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.fullName || 'Ảnh đại diện'} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="max-w-32 truncate text-xs font-bold text-slate-900">{user?.fullName || 'Người dùng'}</p>
                <p className="text-[10px] text-slate-500">{user?.roles[0] || 'Thành viên'}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-xl border bg-white p-1.5 shadow-xl">
              <DropdownMenu.Item onSelect={() => router.push('/profile')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-slate-100">
                <UserRound className="h-4 w-4" /> Hồ sơ cá nhân
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => router.push('/change-password')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-slate-100">
                <KeyRound className="h-4 w-4" /> Đổi mật khẩu
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onLogout} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Đăng xuất
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
