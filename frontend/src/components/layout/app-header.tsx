'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Search } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/features/auth/AuthContext';
import { navItems, pageNames } from '@/components/layout/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type AppHeaderProps = {
  onMenu: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onLogout: () => void;
};

export function AppHeader({ onMenu, onToggleSidebar, sidebarCollapsed, onLogout }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

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
      .filter((item) => !item.permission || hasPermission(item.permission))
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
        <button aria-label="Thông báo" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">3</span>
        </button>
        <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100">
              <Avatar className="h-9 w-9"><AvatarFallback>{initials}</AvatarFallback></Avatar>
              <div className="hidden text-left lg:block">
                <p className="max-w-32 truncate text-xs font-bold text-slate-900">{user?.fullName || 'Người dùng'}</p>
                <p className="text-[10px] text-slate-500">{user?.roles[0] || 'Thành viên'}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-xl border bg-white p-1.5 shadow-xl">
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
