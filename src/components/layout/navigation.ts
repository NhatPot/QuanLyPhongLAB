import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, CalendarDays, ClipboardCheck, Monitor, PackageOpen, AlertTriangle, Users, Settings2, ScrollText, ChartNoAxesCombined, Wrench, UserRoundCog, WalletCards, FileCode } from 'lucide-react';
export type NavItem={label:string;href:string;icon:LucideIcon;permission?:string;anyPermissions?:string[];group:'main'|'system'};
export const navItems:NavItem[]=[
 {label:'Tổng quan',href:'/',icon:LayoutDashboard,group:'main'},
 {label:'Lịch phòng Lab',href:'/calendar',icon:CalendarDays,permission:'LAB_CALENDAR_VIEW',group:'main'},
 {label:'Đăng ký sử dụng',href:'/bookings',icon:ClipboardCheck,permission:'BOOKING_VIEW_OWN',group:'main'},
 {label:'Máy tính',href:'/computers',icon:Monitor,permission:'COMPUTER_VIEW',group:'main'},
 {label:'Thiết bị',href:'/equipments',icon:PackageOpen,permission:'EQUIPMENT_VIEW',group:'main'},
 {label:'Sự cố',href:'/incidents',icon:AlertTriangle,anyPermissions:['INCIDENT_VIEW','INCIDENT_VIEW_OWN','INCIDENT_VIEW_ASSIGNED'],group:'main'},
 {label:'Bảo trì',href:'/maintenance',icon:Wrench,permission:'MAINTENANCE_VIEW',group:'main'},
 {label:'Chi phí phòng Lab',href:'/expenses',icon:WalletCards,permission:'EXPENSE_VIEW',group:'main'},
 {label:'Báo cáo thống kê',href:'/reports',icon:ChartNoAxesCombined,permission:'REPORT_VIEW',group:'main'},
 {label:'Người dùng',href:'/users',icon:Users,permission:'USER_VIEW',group:'system'},
 {label:'Phân quyền',href:'/roles',icon:UserRoundCog,permission:'PERMISSION_MANAGE',group:'system'},
 {label:'Cấu hình phòng Lab',href:'/config',icon:Settings2,permission:'LAB_PROFILE_VIEW',group:'system'},
 {label:'Nhật ký hệ thống',href:'/audit-log',icon:ScrollText,permission:'AUDIT_LOG_VIEW',group:'system'},
 {label:'Tài liệu API Swagger',href:'/docs',icon:FileCode,permission:'PERMISSION_MANAGE',group:'system'},
];
export const pageNames:Record<string,string>={
 ...Object.fromEntries(navItems.map(item=>[item.href,item.label])),
 '/profile':'Hồ sơ cá nhân',
 '/change-password':'Đổi mật khẩu',
 '/docs':'Tài liệu API Swagger',
};
