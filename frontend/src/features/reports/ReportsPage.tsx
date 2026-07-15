'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import { BarChart3, Download, Monitor, PackageOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EChart } from '@/components/charts/echart';
import { computerApi } from '@/services/computer-api';
import { equipmentApi } from '@/services/equipment-api';
import { COMPUTER_STATUS_THEME } from '@/features/computers/computer-status-theme';
export default function ReportsPage(){const {data:summary}=useQuery({queryKey:['computer-summary'],queryFn:computerApi.getSummary});const {data:eqData}=useQuery({queryKey:['equipments','reports'],queryFn:()=>equipmentApi.list({page:1,pageSize:100})});const equipment=eqData?.data??[];const computerOption = useMemo<EChartsOption>(() => ({
  grid: { left: 20, right: 20, top: 20, bottom: 10, containLabel: true },
  xAxis: {
    type: 'category',
    data: [
      COMPUTER_STATUS_THEME.ACTIVE.label,
      COMPUTER_STATUS_THEME.IN_USE.label,
      COMPUTER_STATUS_THEME.MAINTENANCE.label,
      COMPUTER_STATUS_THEME.BROKEN.label,
      COMPUTER_STATUS_THEME.LOCKED.label,
      COMPUTER_STATUS_THEME.INACTIVE.label,
    ],
    axisLabel: { color: '#64748b', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#94a3b8' },
    splitLine: { lineStyle: { color: '#eef2f7' } },
  },
  tooltip: { trigger: 'axis' },
  series: [{
    type: 'bar',
    barWidth: 28,
    data: [
      {
        value: summary?.active ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.ACTIVE.chart, borderRadius: [6, 6, 0, 0] },
      },
      {
        value: summary?.inUse ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.IN_USE.chart, borderRadius: [6, 6, 0, 0] },
      },
      {
        value: summary?.maintenance ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.MAINTENANCE.chart, borderRadius: [6, 6, 0, 0] },
      },
      {
        value: summary?.broken ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.BROKEN.chart, borderRadius: [6, 6, 0, 0] },
      },
      {
        value: summary?.locked ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.LOCKED.chart, borderRadius: [6, 6, 0, 0] },
      },
      {
        value: summary?.inactive ?? 0,
        itemStyle: { color: COMPUTER_STATUS_THEME.INACTIVE.chart, borderRadius: [6, 6, 0, 0] },
      },
    ],
  }],
}), [summary]);const top=equipment.slice(0,8);const equipmentOption=useMemo<EChartsOption>(()=>({grid:{left:10,right:20,top:15,bottom:10,containLabel:true},xAxis:{type:'value',splitLine:{lineStyle:{color:'#eef2f7'}}},yAxis:{type:'category',data:top.map(v=>v.code),axisLabel:{color:'#64748b',fontSize:10}},tooltip:{trigger:'axis'},legend:{bottom:0,textStyle:{fontSize:10}},series:[{name:'Khả dụng',type:'bar',stack:'total',data:top.map(v=>v.availableQuantity),itemStyle:{color:'#2f80ed'}},{name:'Đang mượn',type:'bar',stack:'total',data:top.map(v=>v.borrowedQuantity),itemStyle:{color:'#8b5cf6'}},{name:'Hỏng',type:'bar',stack:'total',data:top.map(v=>v.brokenQuantity),itemStyle:{color:'#ef4444'}}]}),[equipment]);const totalEq=equipment.reduce((s,v)=>s+v.totalQuantity,0);return <div><PageHeader eyebrow="Phân tích" title="Báo cáo thống kê" description="Tổng hợp trực quan từ dữ liệu máy tính và thiết bị hiện tại."><Button variant="outline" disabled><Download/>Xuất báo cáo</Button></PageHeader><div className="mb-5 grid gap-3 sm:grid-cols-3"><Kpi label="Tổng máy tính" value={summary?.total??0} icon={Monitor}/><Kpi label="Tổng thiết bị" value={totalEq} icon={PackageOpen}/><Kpi label="Nhóm tài sản" value={equipment.length} icon={BarChart3}/></div><div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle>Phân bố trạng thái máy tính</CardTitle></CardHeader><CardContent><EChart option={computerOption} className="h-80"/></CardContent></Card><Card><CardHeader><CardTitle>Tồn kho thiết bị nổi bật</CardTitle></CardHeader><CardContent><EChart option={equipmentOption} className="h-80"/></CardContent></Card></div><div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Các biểu đồ được tính trực tiếp từ API hiện có. Chức năng xuất báo cáo sẽ được bật khi backend cung cấp endpoint REPORT_EXPORT.</div></div>}
function Kpi({label,value,icon:Icon}:{label:string;value:number;icon:typeof Monitor}){return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Icon className="h-5 w-5"/></div><div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-extrabold">{value}</p></div></CardContent></Card>}
