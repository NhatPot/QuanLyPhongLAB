import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, KeyRound, LogOut, ChevronRight } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getBreadcrumbName = (path: string): string => {
    switch (path) {
      case '/': return 'Tổng quan';
      case '/calendar': return 'Lịch phòng Lab';
      case '/bookings': return 'Yêu cầu đăng ký';
      case '/computers': return 'Sơ đồ máy tính';
      case '/equipments': return 'Quản lý thiết bị';
      case '/incidents': return 'Báo cáo sự cố';
      case '/users': return 'Quản lý người dùng';
      case '/config': return 'Cấu hình phòng';
      case '/audit-log': return 'Nhật ký hệ thống';
      case '/reports': return 'Báo cáo thống kê';
      default: return 'Trang';
    }
  };

  return (
    <header className="flex h-16 items-center justify-between bg-white px-8 border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium text-slate-700">IT-LAB</span>
        <ChevronRight className="h-4 w-4 text-slate-400" />
        <span className="font-semibold text-blue-600">{getBreadcrumbName(location.pathname)}</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
            <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/change-password')}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition"
              title="Đổi mật khẩu"
            >
              <KeyRound className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
