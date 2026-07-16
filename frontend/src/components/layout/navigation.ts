import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, CalendarDays, ClipboardCheck, Monitor, PackageOpen, AlertTriangle, Users, Settings2, ScrollText, ChartNoAxesCombined, Wrench, UserRoundCog } from 'lucide-react';
export type NavItem={label:string;href:string;icon:LucideIcon;permission?:string;group:'main'|'system'};
export const navItems:NavItem[]=[
 {label:'Tổng quan',href:'/',icon:LayoutDashboard,group:'main'},
 {label:'Lịch phòng Lab',href:'/calendar',icon:CalendarDays,permission:'LAB_CALENDAR_VIEW',group:'main'},
 {label:'Đăng ký sử dụng',href:'/bookings',icon:ClipboardCheck,permission:'BOOKING_VIEW_OWN',group:'main'},
 {label:'Máy tính',href:'/computers',icon:Monitor,permission:'COMPUTER_VIEW',group:'main'},
 {label:'Thiết bị',href:'/equipments',icon:PackageOpen,permission:'EQUIPMENT_VIEW',group:'main'},
 {label:'Sự cố',href:'/incidents',icon:AlertTriangle,permission:'INCIDENT_CREATE',group:'main'},
 {label:'Bảo trì',href:'/maintenance',icon:Wrench,permission:'MAINTENANCE_VIEW',group:'main'},
 {label:'Báo cáo thống kê',href:'/reports',icon:ChartNoAxesCombined,permission:'REPORT_VIEW',group:'main'},
 {label:'Người dùng',href:'/users',icon:Users,permission:'USER_VIEW',group:'system'},
 {label:'Phân quyền',href:'/roles',icon:UserRoundCog,permission:'PERMISSION_MANAGE',group:'system'},
 {label:'Cấu hình phòng Lab',href:'/config',icon:Settings2,permission:'LAB_PROFILE_VIEW',group:'system'},
 {label:'Nhật ký hệ thống',href:'/audit-log',icon:ScrollText,permission:'AUDIT_LOG_VIEW',group:'system'},
];
export const pageNames=Object.fromEntries(navItems.map(item=>[item.href,item.label]));
