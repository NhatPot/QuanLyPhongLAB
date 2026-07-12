import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Monitor,
  Laptop,
  AlertTriangle,
  Users,
  Settings,
  FileSpreadsheet,
  History,
  LogOut,
  User as UserIcon
} from 'lucide-react';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  permission?: string;
}

export const AppSidebar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Lịch phòng Lab', path: '/calendar', icon: Calendar, permission: 'LAB_CALENDAR_VIEW' },
    { name: 'Yêu cầu đăng ký', path: '/bookings', icon: ClipboardList, permission: 'BOOKING_VIEW_OWN' },
    { name: 'Sơ đồ máy tính', path: '/computers', icon: Monitor, permission: 'COMPUTER_VIEW' },
    { name: 'Quản lý thiết bị', path: '/equipments', icon: Laptop, permission: 'EQUIPMENT_VIEW' },
    { name: 'Báo cáo sự cố', path: '/incidents', icon: AlertTriangle, permission: 'INCIDENT_CREATE' },
    { name: 'Người dùng', path: '/users', icon: Users, permission: 'USER_VIEW' },
    { name: 'Cấu hình phòng', path: '/config', icon: Settings, permission: 'LAB_PROFILE_VIEW' },
    { name: 'Nhật ký hệ thống', path: '/audit-log', icon: History, permission: 'AUDIT_LOG_VIEW' },
    { name: 'Báo cáo thống kê', path: '/reports', icon: FileSpreadsheet, permission: 'REPORT_VIEW' },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 text-slate-300">
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-md">
            IT
          </div>
          <span className="text-lg font-bold tracking-wider text-white">IT-LAB</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.roles.join(', ')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 transition duration-150"
            title="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
