'use client';

import { useMemo, useState, useEffect } from 'react';
import type { EChartsOption } from 'echarts';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Grid2X2,
  List,
  LockKeyhole,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { EChart } from '@/components/charts/echart';
import { useAuth } from '@/features/auth/AuthContext';
import { bookingApi } from '@/services/booking-api';
import { computerApi, type ComputerData, type ComputerStatus, type DeviceMetrics } from '@/services/computer-api';
import { userApi } from '@/services/user-api';
import { maintenanceApi } from '@/services/maintenance-api';
import { ComputerEditorDialog } from '@/features/computers/ComputerEditorDialog';
import { cn } from '@/lib/utils';
import { COMPUTER_STATUS_THEME, COMPUTER_SUMMARY_THEME } from '@/features/computers/computer-status-theme';

type ViewMode = 'grid' | 'list';
type SortOption = 'code-asc' | 'code-desc' | 'status';
type Filters = {
  keyword: string;
  status: string;
  configuration: string;
  position: string;
};

const EMPTY_FILTERS: Filters = {
  keyword: '',
  status: '',
  configuration: '',
  position: '',
};

const STATUS_ICONS: Record<ComputerStatus, LucideIcon> = {
  ACTIVE: Monitor,
  IN_USE: Monitor,
  MAINTENANCE: Wrench,
  BROKEN: CircleAlert,
  LOCKED: LockKeyhole,
  INACTIVE: LockKeyhole,
};
const configurationOf = (computer: ComputerData) =>
  [computer.cpu, computer.ram].filter(Boolean).join(' · ') || 'Chưa cập nhật';

const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%';

const normalize = (value?: string) => (value || '').trim().toLocaleLowerCase('vi');

const parseJwtUser = (token: string, userMap?: Map<string, string>): string => {
  if (!token) return '';
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    
    // First, try to map the userId from our loaded userMap
    if (payload.userId && userMap?.has(payload.userId)) {
      return userMap.get(payload.userId)!;
    }

    return payload.username || payload.fullName || payload.name || payload.userId || payload.sub || 'Có người dùng';
  } catch (e) {
    return 'Có người dùng';
  }
};
const maintenanceReminderOf = (computer: ComputerData) => {
  if (computer.status === 'BROKEN') return 'Cần xếp lịch sửa chữa';
  if (computer.status === 'MAINTENANCE') return 'Đang có lịch bảo trì';
  const base = computer.lastMaintenanceDate || computer.createdAt;
  return base && Date.now() - new Date(base).getTime() >= 270 * 24 * 60 * 60 * 1000 ? 'Đến hạn bảo trì 270 ngày' : null;
};

export default function ComputersPage() {
  const { hasPermission } = useAuth();
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortOption, setSortOption] = useState<SortOption>('code-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);
  const [selectedComputer, setSelectedComputer] = useState<ComputerData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const canCreate = hasPermission('COMPUTER_CREATE');
  const canUpdate = hasPermission('COMPUTER_UPDATE');
  const canDelete = hasPermission('COMPUTER_DELETE');
  const canCreateMaintenance = hasPermission('MAINTENANCE_CREATE');

  const { data: reminderSync } = useQuery({
    queryKey: ['maintenance-reminder-sync'],
    queryFn: maintenanceApi.syncReminders,
    enabled: canCreateMaintenance,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const activityRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, []);

  const { data: summary } = useQuery({
    queryKey: ['computers-summary'],
    queryFn: computerApi.getSummary,
    refetchInterval: 3000,
  });

  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    refetch,
  } = useQuery({
    queryKey: ['computers', 'management-dashboard'],
    queryFn: () => computerApi.list({ page: 1, pageSize: 200 }),
    refetchInterval: 3000,
  });

  const [metricsData, setMetricsData] = useState<Record<string, DeviceMetrics>>({});

  useEffect(() => {
    let client: any;
    import('mqtt').then((mqttModule) => {
      const mqtt = mqttModule.default || mqttModule;
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || 'wss://xfbbbaa0.ala.asia-southeast1.emqxsl.com:8084/mqtt';
      
      const clientId = 'dashboard_' + Math.random().toString(16).substr(2, 8);
      client = mqtt.connect(brokerUrl, {
        clientId,
        username: process.env.NEXT_PUBLIC_MQTT_USER || undefined,
        password: process.env.NEXT_PUBLIC_MQTT_PASS || undefined,
        keepalive: 60,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      });

      client.on('connect', () => {
        console.log('[MQTT] Đã kết nối thành công tới Broker:', brokerUrl);
        client.subscribe('devices/+/metrics', (err: any) => {
          if (!err) {
            console.log('[MQTT] Successfully subscribed to devices/+/metrics');
          } else {
            console.error('[MQTT] Subscribe error:', err);
          }
        });
      });

      client.on('error', (err: any) => {
        console.error('[MQTT] Lỗi kết nối:', err);
      });
      
      client.on('offline', () => {
        console.warn('[MQTT] Client bị mất kết nối (Offline)');
      });

      client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString());
          console.log(`[MQTT] Nhận dữ liệu từ topic: ${topic}`, payload);
          // Topic format: devices/{deviceId}/metrics
          const parts = topic.split('/');
          const deviceId = parts[1];
          if (deviceId && payload) {
            setMetricsData(prev => ({
              ...prev,
              [deviceId.toUpperCase()]: {
                timestamp: payload.timestamp,
                localTimestamp: Date.now(),
                isOffline: false,
                status: payload.status,
              }
            }));
          }
        } catch (e) {
          // parse error
        }
      });
    });

    // Cleanup stale metrics after 30 seconds
    const timer = setInterval(() => {
      const now = Date.now();
      setMetricsData(prev => {
        let hasChanges = false;
        const next = { ...prev };
        for (const [mac, data] of Object.entries(next)) {
          if (!data.isOffline && data.localTimestamp && now - data.localTimestamp > 30000) {
            next[mac] = { ...data, isOffline: true, offlineSince: now };
            hasChanges = true;
          }
        }
        return hasChanges ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (client) {
        client.end();
      }
    };
  }, []);

  const { data: activityEvents = [] } = useQuery({
    queryKey: ['booking-calendar', 'computer-activity', activityRange.start.toISOString()],
    queryFn: () => bookingApi.calendar(activityRange.start, activityRange.end),
    retry: false,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({ page: 1, pageSize: 1000 }),
    staleTime: 60000,
  });

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    if (usersData?.data) {
      usersData.data.forEach(u => map.set(u.id, u.fullName || u.username));
    }
    return map;
  }, [usersData]);

  const allComputers = useMemo(() => {
    let source: ComputerData[] = [];
    if (Array.isArray(listData)) source = listData;
    else if (Array.isArray(listData?.data)) source = listData.data;
    
    return source.map(computer => {
      const macForMetrics = (computer.macAddress?.length === 12 && !computer.macAddress.includes(':'))
        ? (computer.macAddress.match(/.{1,2}/g)?.join(':').toUpperCase() || '')
        : (computer.macAddress?.toUpperCase() || '');
      
      // Nếu có tín hiệu MQTT real-time -> Ghi đè trạng thái thành Đang sử dụng (IN_USE)
      if (metricsData[macForMetrics] && !metricsData[macForMetrics].isOffline) {
        return { ...computer, status: 'IN_USE' as ComputerStatus };
      }
      
      // Nếu mất tín hiệu MQTT nhưng DB vẫn đang lưu là IN_USE -> Ép về trạng thái Sẵn sàng (ACTIVE)
      if (computer.status === 'IN_USE') {
        return { ...computer, status: 'ACTIVE' as ComputerStatus };
      }
      
      return computer;
    });
  }, [listData, metricsData]);

  const computedSummary = useMemo(() => {
    const count = (status: ComputerStatus) => allComputers.filter((item) => item.status === status).length;
    return {
      total: allComputers.length,
      active: count('ACTIVE'),
      inUse: count('IN_USE'),
      broken: count('BROKEN'),
      maintenance: count('MAINTENANCE'),
      locked: count('LOCKED'),
      inactive: count('INACTIVE'),
    };
  }, [allComputers]);

  const summaryData = computedSummary;
  const totalComputers = summaryData.total || allComputers.length;
  const unusedComputers = (summaryData.locked || 0) + (summaryData.inactive || 0);

  const configurationOptions = useMemo(
    () => Array.from(new Set(allComputers.map(configurationOf))).sort((a, b) => a.localeCompare(b, 'vi')),
    [allComputers],
  );

  const positionOptions = useMemo(
    () =>
      Array.from(new Set(allComputers.map((item) => item.position).filter((value): value is string => Boolean(value))))
        .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true })),
    [allComputers],
  );

  const filteredComputers = useMemo(() => {
    const keyword = normalize(filters.keyword);
    const result = allComputers.filter((computer) => {
      const searchable = [
        computer.code,
        computer.name,
        computer.cpu,
        computer.ram,
        computer.storage,
        computer.gpu,
        computer.operatingSystem,
        computer.ipAddress,
        computer.position,
        computer.installedSoftware,
      ]
        .map(normalize)
        .join(' ');

      return (
        (!keyword || searchable.includes(keyword)) &&
        (!filters.status || computer.status === filters.status) &&
        (!filters.configuration || configurationOf(computer) === filters.configuration) &&
        (!filters.position || computer.position === filters.position)
      );
    });

    return result.sort((a, b) => {
      if (sortOption === 'code-desc') return b.code.localeCompare(a.code, 'vi', { numeric: true });
      if (sortOption === 'status') {
        const themeA = COMPUTER_STATUS_THEME[a.status as ComputerStatus];
        const themeB = COMPUTER_STATUS_THEME[b.status as ComputerStatus];
        return (themeA?.label || '').localeCompare(themeB?.label || '', 'vi');
      }
      return a.code.localeCompare(b.code, 'vi', { numeric: true });
    });
  }, [allComputers, filters, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredComputers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleComputers = filteredComputers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const donutItems = useMemo(
    () => [
      {
        name: COMPUTER_STATUS_THEME.IN_USE.label,
        value: summaryData.inUse || 0,
        color: COMPUTER_STATUS_THEME.IN_USE.chart,
      },
      {
        name: COMPUTER_STATUS_THEME.ACTIVE.label,
        value: summaryData.active || 0,
        color: COMPUTER_STATUS_THEME.ACTIVE.chart,
      },
      {
        name: COMPUTER_STATUS_THEME.MAINTENANCE.label,
        value: summaryData.maintenance || 0,
        color: COMPUTER_STATUS_THEME.MAINTENANCE.chart,
      },
      {
        name: COMPUTER_STATUS_THEME.BROKEN.label,
        value: summaryData.broken || 0,
        color: COMPUTER_STATUS_THEME.BROKEN.chart,
      },
      {
        name: COMPUTER_STATUS_THEME.LOCKED.label,
        value: summaryData.locked || 0,
        color: COMPUTER_STATUS_THEME.LOCKED.chart,
      },
      {
        name: COMPUTER_STATUS_THEME.INACTIVE.label,
        value: summaryData.inactive || 0,
        color: COMPUTER_STATUS_THEME.INACTIVE.chart,
      },
    ],
    [summaryData],
  );

  const donutOption = useMemo<EChartsOption>(
    () => ({
      animationDuration: 500,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['62%', '82%'],
          center: ['50%', '50%'],
          label: { show: false },
          itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
          emphasis: { scaleSize: 5 },
          data: donutItems.map((item) => ({
            value: item.value,
            name: item.name,
            itemStyle: { color: item.color },
          })),
        },
      ],
    }),
    [donutItems],
  );

  const activityDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(activityRange.start);
        day.setDate(day.getDate() + index);
        return day;
      }),
    [activityRange.start],
  );

  const activityHours = useMemo(
    () =>
      activityDays.map((day) => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const hours = activityEvents.reduce((sum, event) => {
          const eventStart = new Date(event.start).getTime();
          const eventEnd = new Date(event.end).getTime();
          const overlap = Math.max(
            0,
            Math.min(eventEnd, dayEnd.getTime()) - Math.max(eventStart, dayStart.getTime()),
          );
          return sum + overlap / 3_600_000;
        }, 0);

        return Number(hours.toFixed(1));
      }),
    [activityDays, activityEvents],
  );

  const activityOption = useMemo<EChartsOption>(
    () => ({
      animationDuration: 600,
      color: ['#2563eb'],
      grid: { left: 12, right: 16, top: 38, bottom: 8, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: activityDays.map((day) => day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        name: 'Giờ',
        nameTextStyle: { color: '#94a3b8', fontSize: 10, padding: [0, 0, 0, -12] },
        splitLine: { lineStyle: { color: '#eef2f7' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [
        {
          name: 'Số giờ sử dụng',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          showSymbol: true,
          lineStyle: { width: 2.5, color: '#2563eb' },
          itemStyle: { color: '#ffffff', borderColor: '#2563eb', borderWidth: 2 },
          areaStyle: { color: 'rgba(37, 99, 235, 0.10)' },
          data: activityHours,
        },
      ],
    }),
    [activityDays, activityHours],
  );

  const summaryCards = [
    {
      label: 'Tổng số máy',
      value: totalComputers,
      percent: totalComputers ? '100%' : '0%',
      Icon: Monitor,
      tone: 'total' as const,
    },
    {
      label: 'Đang sử dụng',
      value: summaryData.inUse || 0,
      percent: formatPercent(summaryData.inUse || 0, totalComputers),
      Icon: Monitor,
      tone: 'inUse' as const,
    },
    {
      label: 'Sẵn sàng',
      value: summaryData.active || 0,
      percent: formatPercent(summaryData.active || 0, totalComputers),
      Icon: Monitor,
      tone: 'ready' as const,
    },
    {
      label: 'Bảo trì',
      value: summaryData.maintenance || 0,
      percent: formatPercent(summaryData.maintenance || 0, totalComputers),
      Icon: Wrench,
      tone: 'maintenance' as const,
    },
    {
      label: 'Bị hỏng',
      value: summaryData.broken || 0,
      percent: formatPercent(summaryData.broken || 0, totalComputers),
      Icon: CircleAlert,
      tone: 'broken' as const,
    },
    {
      label: 'Không dùng',
      value: unusedComputers,
      percent: formatPercent(unusedComputers, totalComputers),
      Icon: LockKeyhole,
      tone: 'unused' as const,
    },
  ];

  const updateDraftFilter = (key: keyof Filters, value: string) =>
    setDraftFilters((current) => ({ ...current, [key]: value }));

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const openAddModal = () => {
    setSelectedComputer(null);
    setEditorOpen(true);
  };

  const openComputer = (computer: ComputerData) => {
    setSelectedComputer(computer);
    setEditorOpen(true);
  };

  return (
    <div className="animate-float-in space-y-4">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Quản lý máy tính</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tình trạng, cấu hình và hoạt động của tất cả máy tính trong phòng Lab.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Thêm máy tính
          </button>
        )}
      </section>

      {!!reminderSync?.created && <a href="/maintenance" className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800 transition hover:border-amber-200 hover:bg-amber-100/70"><span><strong>Đã tạo {reminderSync.created} đề xuất bảo trì.</strong> Máy bị hỏng hoặc đã đến hạn chu kỳ 270 ngày đang chờ xếp lịch.</span><span className="shrink-0 font-extrabold text-blue-700">Xem bảo trì →</span></a>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.35fr_.82fr]">
        <div className="dashboard-card p-4">
          <h2 className="text-sm font-extrabold text-slate-900">Tình trạng máy tính</h2>
          <div className="mt-3 grid items-center gap-3 sm:grid-cols-[170px_1fr] xl:grid-cols-[150px_1fr]">
            <div className="relative mx-auto h-44 w-44 xl:h-40 xl:w-40">
              <EChart option={donutOption} className="h-full" />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-2xl font-extrabold text-slate-900">{totalComputers}</strong>
                <span className="text-[10px] font-medium text-slate-400">Tổng số máy</span>
              </div>
            </div>
            <div className="space-y-2.5">
              {donutItems.map((item) => (
                <div key={item.name} className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-slate-500">{item.name}</span>
                  <span className="font-bold text-slate-700">
                    {item.value} <small className="font-medium text-slate-400">({formatPercent(item.value, totalComputers)})</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-card p-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Biểu đồ hoạt động (7 ngày qua)</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Tổng số giờ phòng Lab có lịch sử dụng được phê duyệt.</p>
          </div>
          <EChart option={activityOption} className="mt-2 h-[218px]" />
        </div>

        <div className="dashboard-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">Bộ lọc</h2>
            {(filters.keyword || filters.status || filters.configuration || filters.position) && (
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-600">
                Đang lọc
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            <FilterSelect
              value={draftFilters.status}
              onChange={(value) => updateDraftFilter('status', value)}
              ariaLabel="Lọc theo trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="IN_USE">Đang sử dụng</option>
              <option value="ACTIVE">Sẵn sàng</option>
              <option value="MAINTENANCE">Bảo trì</option>
              <option value="BROKEN">Bị hỏng</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="INACTIVE">Không hoạt động</option>
            </FilterSelect>

            <FilterSelect
              value={draftFilters.configuration}
              onChange={(value) => updateDraftFilter('configuration', value)}
              ariaLabel="Lọc theo cấu hình"
            >
              <option value="">Tất cả cấu hình</option>
              {configurationOptions.map((configuration) => (
                <option key={configuration} value={configuration}>{configuration}</option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={draftFilters.position}
              onChange={(value) => updateDraftFilter('position', value)}
              ariaLabel="Lọc theo vị trí"
            >
              <option value="">Tất cả vị trí</option>
              {positionOptions.map((position) => (
                <option key={position} value={position}>{position}</option>
              ))}
            </FilterSelect>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={draftFilters.keyword}
                onChange={(event) => updateDraftFilter('keyword', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyFilters();
                }}
                placeholder="Tìm kiếm máy tính..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="h-9 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Lọc kết quả
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Danh sách máy tính <span className="text-slate-400">({filteredComputers.length})</span>
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Nhấn vào một máy để xem hoặc cập nhật cấu hình.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Hiển thị dạng lưới"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition',
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Hiển thị dạng danh sách"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition',
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600',
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <select
              value={sortOption}
              onChange={(event) => {
                setSortOption(event.target.value as SortOption);
                setPage(1);
              }}
              aria-label="Sắp xếp danh sách máy tính"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            >
              <option value="code-asc">Sắp xếp: Mã máy A-Z</option>
              <option value="code-desc">Sắp xếp: Mã máy Z-A</option>
              <option value="status">Sắp xếp: Trạng thái</option>
            </select>
          </div>
        </div>

        <div className="p-4">
          {isListLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : isListError ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <CircleAlert className="h-9 w-9 text-red-400" />
              <p className="mt-3 text-sm font-bold text-slate-700">Không thể tải danh sách máy tính</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100"
              >
                Thử tải lại
              </button>
            </div>
          ) : visibleComputers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-slate-100 p-4">
                <Monitor className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700">Không tìm thấy máy tính phù hợp</p>
              <p className="mt-1 text-xs text-slate-400">Hãy thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'
                  : 'divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200',
              )}
            >
              {visibleComputers.map((computer) => {
                const macForMetrics = (computer.macAddress?.length === 12 && !computer.macAddress.includes(':'))
                  ? (computer.macAddress.match(/.{1,2}/g)?.join(':').toUpperCase() || '')
                  : (computer.macAddress?.toUpperCase() || '');
                return (
                  <ComputerCard
                    key={computer.id}
                    computer={computer}
                    metrics={metricsData?.[macForMetrics]}
                    viewMode={viewMode}
                    userMap={userMap}
                    onClick={() => openComputer(computer)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!isListLoading && !isListError && filteredComputers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-400">
              Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredComputers.length)} trong {filteredComputers.length} máy
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                aria-label="Trang trước"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={cn(
                    'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition',
                    pageNumber === currentPage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Số máy trên mỗi trang"
                className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-500 outline-none"
              >
                <option value={12}>12 / trang</option>
                <option value={18}>18 / trang</option>
                <option value={24}>24 / trang</option>
              </select>
            </div>
          </div>
        )}
      </section>

      <ComputerEditorDialog
        open={editorOpen}
        computer={selectedComputer}
        metrics={selectedComputer ? metricsData[
          (selectedComputer.macAddress?.length === 12 && !selectedComputer.macAddress.includes(':'))
            ? (selectedComputer.macAddress.match(/.{1,2}/g)?.join(':').toUpperCase() || '')
            : (selectedComputer.macAddress?.toUpperCase() || '')
        ] : undefined}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        userMap={userMap}
        onClose={() => {
          setEditorOpen(false);
          setSelectedComputer(null);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  percent,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  percent: string;
  Icon: LucideIcon;
  tone: keyof typeof COMPUTER_SUMMARY_THEME;
}) {
  const colors = COMPUTER_SUMMARY_THEME[tone];
  const highlighted = tone === 'total';

  return (
    <div
      className={cn(
        'flex min-h-[92px] items-center gap-3 overflow-hidden p-4 transition hover:-translate-y-0.5',
        highlighted
          ? 'rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#5B43F4] via-[#6D3FF2] to-[#8B2CF5] shadow-[0_10px_24px_rgba(109,63,242,.28)]'
          : 'dashboard-card',
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', colors.box)}>
        <Icon className={cn('h-5 w-5', colors.icon)} />
      </div>
      <div className="min-w-0">
        <p className={cn('truncate text-[11px] font-medium', highlighted ? 'text-white/80' : 'text-slate-500')}>
          {label}
        </p>
        <p className={cn('mt-0.5 text-xl font-extrabold leading-none', highlighted ? 'text-white' : 'text-slate-900')}>
          {value}
        </p>
        <p className={cn('mt-1.5 text-[10px] font-semibold', colors.text)}>{percent}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
    >
      {children}
    </select>
  );
}

function ComputerCard({
  computer,
  metrics,
  viewMode,
  userMap,
  onClick,
}: {
  computer: ComputerData;
  metrics?: DeviceMetrics;
  viewMode: ViewMode;
  userMap?: Map<string, string>;
  onClick: () => void;
}) {
  const meta = COMPUTER_STATUS_THEME[computer.status];
  const Icon = STATUS_ICONS[computer.status];
  const specification = [computer.cpu, computer.ram, computer.storage].filter(Boolean).join(' · ') || 'Chưa cập nhật cấu hình';
  const maintenanceReminder = maintenanceReminderOf(computer);

  if (viewMode === 'list') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="grid w-full gap-3 bg-white px-4 py-3 text-left transition hover:bg-blue-50/40 sm:grid-cols-[48px_1fr_1.2fr_.8fr_auto] sm:items-center"
      >
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', meta.iconBg, meta.iconText)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800">{computer.name || computer.code}</p>
          <p className="truncate text-[10px] text-slate-400">{computer.code ? `Mã máy: ${computer.code}` : ''}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{specification}</p>
          {metrics?.status?.current_user && (
            <p className="text-[10px] text-blue-600 font-medium">Người dùng: {parseJwtUser(metrics.status.current_user, userMap)}</p>
          )}
        </div>
        <p className="text-xs text-slate-500">{computer.ipAddress || 'Chưa có IP'}</p>
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold', meta.text)}>
          <i className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          {meta.label}
          {maintenanceReminder && <small className="ml-1 text-[9px] font-bold text-amber-600">· {maintenanceReminder}</small>}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[106px] w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_2px_10px_rgba(15,23,42,.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', meta.iconBg, meta.iconText)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-slate-800">{computer.name || computer.code}</p>
        <p className={cn('mt-0.5 flex items-center gap-1.5 truncate text-[9px] font-bold', meta.text)}>
          <i className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)} />
          {meta.label}
        </p>
        <p className="mt-2 truncate text-[9px] font-medium text-slate-400">{specification}</p>
        {metrics?.status?.current_user && (
          <p className="mt-0.5 truncate text-[9px] text-blue-600 font-medium">Người dùng: {parseJwtUser(metrics.status.current_user, userMap)}</p>
        )}
        <p className="mt-0.5 truncate text-[9px] text-slate-400">{computer.ipAddress || computer.position || 'Chưa cập nhật IP'}</p>
        {maintenanceReminder && <p className="mt-1 truncate text-[9px] font-bold text-amber-600">{maintenanceReminder}</p>}
      </div>
    </button>
  );
}
