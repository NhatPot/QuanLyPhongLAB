'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleCheck, Eye, LogOut, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Brand } from '@/components/layout/brand';
import { navItems } from '@/components/layout/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { labApi } from '@/services/lab-api';
import { cn } from '@/lib/utils';

type AppSidebarProps = {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export function AppSidebar({ open, collapsed, onClose, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const { data: lab } = useQuery({
    queryKey: ['lab-profile'],
    queryFn: labApi.getProfile,
    retry: false,
  });

  const allowed = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  const renderGroup = (group: 'main' | 'system') =>
    allowed
      .filter((item) => item.group === group)
      .map((item) => {
        const Icon = item.icon;
        const active = item.href === '/' ? pathname === '/' : (pathname || '/').startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={cn(
              'group flex items-center rounded-xl py-2.5 text-[13px] font-medium transition-all',
              collapsed ? 'gap-3 px-3 lg:justify-center lg:gap-0 lg:px-2' : 'gap-3 px-3',
              active
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-950/20'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon
              className={cn(
                'h-[18px] w-[18px] shrink-0',
                active ? 'text-white' : 'text-blue-200/80 group-hover:text-white',
              )}
            />
            <span className={collapsed ? 'lg:hidden' : undefined}>{item.label}</span>
          </Link>
        );
      });

  return (
    <>
      <button
        aria-label="Đóng menu"
        onClick={onClose}
        className={cn('fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden', open ? 'block' : 'hidden')}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-hidden bg-gradient-to-b from-[#082f57] via-[#07325e] to-[#052647] text-white shadow-2xl transition-all duration-300 lg:translate-x-0',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-[68px] items-center border-b border-white/10 px-4', collapsed ? 'lg:justify-center lg:px-2' : 'justify-between')}>
          <span className={collapsed ? 'lg:hidden' : undefined}><Brand /></span><span className={collapsed ? 'hidden lg:block' : 'hidden'}><Brand compact /></span>
          <button onClick={onClose} aria-label="Đóng menu" className="rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          <p className={cn('mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300/70', collapsed && 'lg:sr-only')}>
            Menu chính
          </p>
          <nav className="space-y-1">{renderGroup('main')}</nav>

          <div className="my-4 h-px bg-white/10" />
          <p className={cn('mb-2 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300/70', collapsed && 'lg:sr-only')}>
            Quản trị hệ thống
          </p>
          <nav className="space-y-1">{renderGroup('system')}</nav>
        </div>

        <div className={cn('m-3 rounded-2xl border border-white/15 bg-[#061f3a]/65 p-3.5 shadow-inner', collapsed && 'lg:m-2 lg:p-2')}>
          <div className="mb-3 flex items-center justify-between">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider text-blue-200', collapsed && 'lg:hidden')}>
              Thông tin phòng Lab
            </span>
            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          </div>
          <div className={cn('space-y-2.5 text-xs', collapsed && 'lg:hidden')}>
            <div className="flex justify-between gap-3">
              <span className="text-blue-200/70">Trạng thái</span>
              <span className="font-semibold text-emerald-400">{lab?.status === 'ACTIVE' ? 'Đang hoạt động' : lab?.status || 'Đang tải'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-blue-200/70">Mã phòng</span>
              <span className="font-semibold">{lab?.labCode || 'IT-LAB'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-blue-200/70">Sức chứa</span>
              <span className="font-semibold">{lab?.capacity || 40} người</span>
            </div>
          </div>
          <Link
            href="/config"
            title={collapsed ? 'Xem chi tiết' : undefined}
            className={cn(
              'mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 text-xs font-semibold hover:bg-white/15',
              collapsed && 'lg:mt-0 lg:h-9 lg:w-9 lg:px-0',
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className={collapsed ? 'lg:hidden' : undefined}>Xem chi tiết</span>
          </Link>
        </div>

        <button
          onClick={onLogout}
          title={collapsed ? 'Đăng xuất' : undefined}
          className={cn(
            'mx-3 mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-blue-100 hover:bg-white/10 hover:text-white',
            collapsed && 'lg:mx-2 lg:justify-center lg:px-2',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={collapsed ? 'lg:hidden' : undefined}>Đăng xuất</span>
        </button>
      </aside>
    </>
  );
}
