import type { ComputerStatus } from '@/services/computer-api';

export type ComputerStatusTheme = {
  label: string;
  chart: string;
  iconBg: string;
  iconText: string;
  text: string;
  dot: string;
  border: string;
};

export const COMPUTER_STATUS_THEME: Record<ComputerStatus, ComputerStatusTheme> = {
  ACTIVE: {
    label: 'Sẵn sàng',
    chart: '#10B981',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  IN_USE: {
    label: 'Đang sử dụng',
    chart: '#3B82F6',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
  MAINTENANCE: {
    label: 'Bảo trì',
    chart: '#F59E0B',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    border: 'border-amber-200',
  },
  BROKEN: {
    label: 'Bị hỏng',
    chart: '#EF4444',
    iconBg: 'bg-red-50',
    iconText: 'text-red-600',
    text: 'text-red-700',
    dot: 'bg-red-500',
    border: 'border-red-200',
  },
  LOCKED: {
    label: 'Đã khóa',
    chart: '#8B5CF6',
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
    border: 'border-violet-200',
  },
  INACTIVE: {
    label: 'Không hoạt động',
    chart: '#94A3B8',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-500',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
};

export const COMPUTER_SUMMARY_THEME = {
  total: {
    box: 'bg-white/15 ring-1 ring-white/25',
    icon: 'text-white',
    text: 'text-white/85',
  },
  inUse: {
    box: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-700',
  },
  ready: {
    box: 'bg-emerald-50',
    icon: 'text-emerald-600',
    text: 'text-emerald-700',
  },
  maintenance: {
    box: 'bg-amber-50',
    icon: 'text-amber-600',
    text: 'text-amber-700',
  },
  broken: {
    box: 'bg-red-50',
    icon: 'text-red-600',
    text: 'text-red-700',
  },
  unused: {
    box: 'bg-slate-100',
    icon: 'text-slate-500',
    text: 'text-slate-600',
  },
} as const;
