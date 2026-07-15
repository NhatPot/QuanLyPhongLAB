'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { useAuth } from '@/features/auth/AuthContext';
import { Brand } from '@/components/layout/brand';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isLoading, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?from=' + encodeURIComponent(pathname || '/'));
    } else if (!isLoading && user?.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password');
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06294d]">
        <div className="flex flex-col items-center gap-4">
          <Brand />
          <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      <AppSidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />
      <div className={sidebarCollapsed ? 'min-h-screen lg:pl-[76px]' : 'min-h-screen lg:pl-[260px]'}>
        <AppHeader
          onMenu={() => setMenuOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          sidebarCollapsed={sidebarCollapsed}
          onLogout={handleLogout}
        />
        <main className="subtle-grid min-h-[calc(100vh-68px)] p-4 sm:p-6 xl:p-7">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
