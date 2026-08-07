'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import { Activity, AlertTriangle, CircleDollarSign, Download, Monitor, PackageOpen, RefreshCw, WalletCards, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/charts/echart';
import { computerApi } from '@/services/computer-api';
import { equipmentApi } from '@/services/equipment-api';
import { bookingApi } from '@/services/booking-api';
import { COMPUTER_STATUS_THEME } from '@/features/computers/computer-status-theme';
import { downloadReportWorkbook } from '@/features/reports/report-excel';
import { expenseApi } from '@/services/expense-api';

const STATUS_ORDER = ['ACTIVE', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'LOCKED', 'INACTIVE'] as const;
const EQUIPMENT_SERIES = [
  { key: 'availableQuantity', name: 'Khả dụng', color: '#3b82f6' },
  { key: 'reservedQuantity', name: 'Đã giữ', color: '#8b5cf6' },
  { key: 'borrowedQuantity', name: 'Đang mượn', color: '#14b8a6' },
  { key: 'maintenanceQuantity', name: 'Bảo trì', color: '#f59e0b' },
  { key: 'brokenQuantity', name: 'Hỏng', color: '#ef4444' },
  { key: 'lostQuantity', name: 'Mất', color: '#64748b' },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [isExporting, setIsExporting] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['computer-summary', 'reports'],
    queryFn: computerApi.getSummary,
    staleTime: 30_000,
  });
  const computersQuery = useQuery({
    queryKey: ['computers', 'reports'],
    queryFn: () => computerApi.list({ page: 1, pageSize: 100 }),
    staleTime: 30_000,
  });
  const equipmentQuery = useQuery({
    queryKey: ['equipments', 'reports'],
    queryFn: () => equipmentApi.list({ page: 1, pageSize: 100 }),
    staleTime: 30_000,
  });
  const usageQuery = useQuery({
    queryKey: ['booking-usage-statistics', selectedMonth],
    queryFn: () => bookingApi.usageStatistics(selectedMonth),
    staleTime: 30_000,
    retry: false,
  });
  const expenseRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      fromDate: `${selectedMonth}-01`,
      toDate: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
    };
  }, [selectedMonth]);
  const expenseSummaryQuery = useQuery({
    queryKey: ['expense-summary', 'reports', selectedMonth],
    queryFn: () => expenseApi.summary(expenseRange),
    staleTime: 30_000,
    retry: false,
  });

  const summary = summaryQuery.data;
  const computers = computersQuery.data?.data ?? [];
  const equipment = equipmentQuery.data?.data ?? [];
  const usage = usageQuery.data;
  const expenseSummary = expenseSummaryQuery.data;
  const isLoading = summaryQuery.isLoading || computersQuery.isLoading || equipmentQuery.isLoading || usageQuery.isLoading || expenseSummaryQuery.isLoading;
  const hasError = summaryQuery.isError || computersQuery.isError || equipmentQuery.isError || usageQuery.isError || expenseSummaryQuery.isError;

  const totalEquipment = equipment.reduce((sum, item) => sum + item.totalQuantity, 0);
  const borrowedEquipment = equipment.reduce((sum, item) => sum + item.borrowedQuantity, 0);
  const attentionCount = (summary?.broken ?? 0) + (summary?.maintenance ?? 0) + equipment.reduce((sum, item) => sum + item.brokenQuantity + item.maintenanceQuantity, 0);

  const computerOption = useMemo<EChartsOption>(() => ({
    grid: { left: 20, right: 20, top: 28, bottom: 12, containLabel: true },
    xAxis: {
      type: 'category',
      data: STATUS_ORDER.map((status) => COMPUTER_STATUS_THEME[status].label),
      axisLabel: { color: '#64748b', fontSize: 10, interval: 0 },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#eef2f7' } },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    series: [{
      type: 'bar',
      barMaxWidth: 34,
      data: STATUS_ORDER.map((status) => ({
        value: summary?.[status === 'ACTIVE' ? 'active' : status === 'IN_USE' ? 'inUse' : status === 'MAINTENANCE' ? 'maintenance' : status === 'BROKEN' ? 'broken' : status === 'LOCKED' ? 'locked' : 'inactive'] ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME[status].chart, borderRadius: [7, 7, 0, 0] },
      })),
    }],
  }), [summary]);

  const topEquipment = useMemo(() => [...equipment].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 8), [equipment]);
  const equipmentOption = useMemo<EChartsOption>(() => ({
    grid: { left: 16, right: 20, top: 12, bottom: 34, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    yAxis: { type: 'category', data: topEquipment.map((item) => item.code).reverse(), axisLabel: { color: '#64748b', fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
    series: EQUIPMENT_SERIES.map((series) => ({
      name: series.name,
      type: 'bar' as const,
      stack: 'inventory',
      data: topEquipment.map((item) => item[series.key]).reverse(),
      itemStyle: { color: series.color },
      barMaxWidth: 22,
    })),
  }), [topEquipment]);

  const activityOption = useMemo<EChartsOption>(() => {
    const points = usage?.daily ?? [];
    return {
      grid: { left: 20, right: 20, top: 36, bottom: 12, containLabel: true },
      legend: { top: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      xAxis: { type: 'category', data: points.map((point) => point.date.slice(8, 10)), axisLabel: { color: '#94a3b8', fontSize: 10 } },
      yAxis: { type: 'value', min: 0, minInterval: 1, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      tooltip: { trigger: 'axis', valueFormatter: (value) => `${value} giờ` },
      series: [
        { name: 'Giờ phòng', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: points.map((point) => point.usageHours), lineStyle: { color: '#2563eb', width: 3 }, itemStyle: { color: '#2563eb', borderColor: '#fff', borderWidth: 2 }, areaStyle: { color: 'rgba(37,99,235,.12)' } },
        { name: 'Giờ-máy', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: points.map((point) => point.computerHours), lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 } },
      ],
    };
  }, [usage]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['computer-summary', 'reports'] });
    await queryClient.invalidateQueries({ queryKey: ['computers', 'reports'] });
    await queryClient.invalidateQueries({ queryKey: ['equipments', 'reports'] });
    await queryClient.invalidateQueries({ queryKey: ['booking-usage-statistics'] });
    await queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
  };

  const exportReport = async () => {
    setIsExporting(true);
    try {
      if (!usage) throw new Error('Chưa có dữ liệu sử dụng phòng Lab.');
      await downloadReportWorkbook({ summary, computers, equipment, usage, expenseSummary });
      toast.success('Đã xuất báo cáo Excel');
    } catch {
      toast.error('Không thể xuất báo cáo Excel. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Phân tích" title="Báo cáo thống kê" description="Tổng hợp trực quan từ dữ liệu máy tính, thiết bị và lịch sử sử dụng trong phòng Lab.">
        <Button variant="outline" onClick={() => void refresh()} disabled={isLoading}><RefreshCw className={isLoading ? 'animate-spin' : ''} /> Làm mới</Button>
        <Button onClick={() => void exportReport()} disabled={isLoading || isExporting || !usage}><Download /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}</Button>
      </PageHeader>

      {hasError && <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" /> Không thể tải một phần dữ liệu báo cáo. Hãy kiểm tra kết nối API và thử làm mới.</div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Kpi label="Tổng máy tính" value={summary?.total ?? 0} caption="Tất cả trạng thái" icon={Monitor} tone="blue" loading={isLoading} />
        <Kpi label="Tổng thiết bị" value={totalEquipment} caption={`${equipment.length} nhóm tài sản`} icon={PackageOpen} tone="teal" loading={isLoading} />
        <Kpi label="Giờ dùng phòng" value={usage?.totalUsageHours ?? 0} caption={`Tháng ${selectedMonth}`} icon={Activity} tone="indigo" loading={isLoading} unit="giờ" />
        <Kpi label="Giờ-máy" value={usage?.totalComputerHours ?? 0} caption="Tổng thời lượng từng máy" icon={Monitor} tone="teal" loading={isLoading} unit="giờ-máy" />
        <Kpi label="Cần chú ý" value={attentionCount} caption="Hỏng hoặc đang bảo trì" icon={Wrench} tone="amber" loading={isLoading} />
        <Kpi label="Chi phí tháng" value={expenseSummary?.totalSpending ?? 0} caption="CAPEX + OPEX đã duyệt" icon={WalletCards} tone="indigo" loading={isLoading} unit="₫" compact />
        <Kpi label="Chưa thanh toán" value={expenseSummary?.outstanding ?? 0} caption="Công nợ đã duyệt" icon={CircleDollarSign} tone="amber" loading={isLoading} unit="₫" compact />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Phân bố trạng thái máy tính</CardTitle><CardDescription>Màu trạng thái được đồng nhất với tab Máy tính.</CardDescription></CardHeader>
          <CardContent>{isLoading ? <ChartSkeleton /> : <EChart option={computerOption} className="h-80" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tồn kho thiết bị nổi bật</CardTitle><CardDescription>8 nhóm có tổng số lượng lớn nhất, phân tách theo tình trạng.</CardDescription></CardHeader>
          <CardContent>{isLoading ? <ChartSkeleton /> : topEquipment.length ? <EChart option={equipmentOption} className="h-80" /> : <EmptyChart label="Chưa có dữ liệu thiết bị." />}</CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Giờ sử dụng thực tế phòng Lab</CardTitle><CardDescription>Giờ phòng lấy từ check-in/check-out; giờ-máy cộng trực tiếp thời lượng của từng máy đã chọn.</CardDescription></div><input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400" /></CardHeader>
        <CardContent>{usageQuery.isLoading ? <ChartSkeleton /> : <EChart option={activityOption} className="h-72" />}</CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Thống kê theo nhóm mục đích</CardTitle><CardDescription>Các cách nhập gần giống nhau được gom về cùng nhóm để dễ theo dõi.</CardDescription></CardHeader>
        <CardContent>
          {usageQuery.isLoading ? <div className="h-32 animate-pulse rounded-xl bg-slate-100" /> : (usage?.purposeGroups?.length ?? 0) > 0 ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {usage!.purposeGroups.map((group) => (
                <div key={group.id || group.name} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{group.name}</p><p className="text-[11px] text-slate-400">{group.sessionCount} phiên sử dụng</p></div>
                  <span className="shrink-0 text-sm font-extrabold text-blue-700">{group.usageHours} giờ</span>
                </div>
              ))}
            </div>
          ) : <EmptyChart label="Chưa có phiên sử dụng để thống kê mục đích." />}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, caption, icon: Icon, tone, loading, unit, compact }: { label: string; value: number; caption: string; icon: typeof Monitor; tone: 'blue' | 'indigo' | 'teal' | 'amber'; loading: boolean; unit?: string; compact?: boolean }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', teal: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p>{loading ? <div className="mt-1 h-7 w-16 animate-pulse rounded bg-slate-100" /> : <p className="text-2xl font-extrabold tracking-tight text-slate-900">{compact ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : formatNumber(value)}{unit && <span className="ml-1 text-xs font-bold text-slate-400">{unit}</span>}</p>}<p className="truncate text-[11px] text-slate-400">{caption}</p></div></CardContent></Card>;
}

function ChartSkeleton() { return <div className="h-80 animate-pulse rounded-xl bg-slate-100/80" />; }
function EmptyChart({ label }: { label: string }) { return <div className="flex h-80 items-center justify-center text-sm text-slate-400">{label}</div>; }
