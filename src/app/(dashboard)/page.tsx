'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarDays, CheckSquare, Clock3, Monitor, PackageOpen, Sparkles, UsersRound, Wrench } from 'lucide-react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/charts/echart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { computerApi } from '@/services/computer-api';
import { equipmentApi } from '@/services/equipment-api';
import { bookingApi, type CalendarEvent, type BookingData } from '@/services/booking-api';
import { formatDateTime } from '@/lib/utils';
import { COMPUTER_STATUS_THEME } from '@/features/computers/computer-status-theme';

const startOfDay=(date:Date)=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
const endOfDay=(date:Date)=>new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,59);
const formatDuration = (hours: number) => {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${wholeHours} giờ${minutes ? ` ${minutes} phút` : ''}`;
};
const chartFontFamily = 'Inter, "Segoe UI", system-ui, sans-serif';
const statusStyle={APPROVED:'success',CHECKED_IN:'default',PENDING:'warning',COMPLETED:'secondary'} as const;

function MetricCard({label,value,detail,icon:Icon,tone='blue',loading=false}:{label:string;value:string|number;detail:string;icon:typeof CalendarDays;tone?:'blue'|'green'|'violet'|'orange'|'cyan'|'red';loading?:boolean}){const styles={blue:'border-blue-200 bg-blue-50/30 text-blue-600',green:'border-emerald-200 bg-emerald-50/30 text-emerald-600',violet:'border-violet-200 bg-violet-50/30 text-violet-600',orange:'border-orange-200 bg-orange-50/30 text-orange-600',cyan:'border-cyan-200 bg-cyan-50/30 text-cyan-600',red:'border-red-200 bg-red-50/30 text-red-600'}[tone];return <Card className={`group overflow-hidden border ${styles.split(' ')[0]} transition hover:-translate-y-0.5 hover:shadow-soft`}><CardContent className="p-4"><div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.split(' ').slice(1).join(' ')}`}><Icon className="h-5 w-5"/></div><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"/></div><p className="mt-3 text-xs font-medium text-slate-500">{label}</p>{loading?<Skeleton className="mt-2 h-8 w-20"/>:<p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>}<p className={`mt-2 text-[11px] font-medium ${styles.split(' ').at(-1)}`}>{detail}</p></CardContent></Card>}

export default function DashboardPage(){const {user}=useAuth();const now=useMemo(()=>new Date(),[]);const monthStart=useMemo(()=>new Date(now.getFullYear(),now.getMonth(),1),[now]);const monthEnd=useMemo(()=>new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59),[now]);const {data:summary,isLoading:loadingComputers}=useQuery({queryKey:['computer-summary'],queryFn:computerApi.getSummary});const {data:equipmentData,isLoading:loadingEquipment}=useQuery({queryKey:['equipments','dashboard'],queryFn:()=>equipmentApi.list({page:1,pageSize:100})});const {data: bookingsRaw=[], isLoading: loadingBookings}=useQuery<BookingData[]>({queryKey:['my-bookings'],queryFn:bookingApi.myBookings,retry:false});
const bookings: BookingData[] = useMemo(() => Array.isArray(bookingsRaw) ? bookingsRaw : ((bookingsRaw as any)?.data ?? []), [bookingsRaw]);
const {data: calendarRaw=[], isLoading: loadingCalendar}=useQuery<CalendarEvent[]>({queryKey:['booking-calendar',monthStart.toISOString()],queryFn:()=>bookingApi.calendar(monthStart,monthEnd),retry:false});
const calendar: CalendarEvent[] = useMemo(() => Array.isArray(calendarRaw) ? calendarRaw : ((calendarRaw as any)?.data ?? []), [calendarRaw]);
const equipment=equipmentData?.data??[];const todayEvents=calendar.filter((e: CalendarEvent)=>new Date(e.start)>=startOfDay(now)&&new Date(e.start)<=endOfDay(now)).sort((a: CalendarEvent,b: CalendarEvent)=>+new Date(a.start)-+new Date(b.start));const pending=bookings.filter((b: BookingData)=>b.status==='PENDING').length;const approvedToday=bookings.filter((b: BookingData)=>b.status==='APPROVED'&&new Date(b.startTime).toDateString()===now.toDateString()).length;const totalEquipment=equipment.reduce((sum,item)=>sum+item.totalQuantity,0);const availableEquipment=equipment.reduce((sum,item)=>sum+item.availableQuantity,0);const equipmentPercent=totalEquipment?Math.round(availableEquipment/totalEquipment*100):0;const computerTotal=summary?.total??0;const computerReady=(summary?.active??0)+(summary?.inUse??0);
 const computerOption = useMemo<EChartsOption>(() => ({
  textStyle: { fontFamily: chartFontFamily },
  tooltip: {
    trigger: 'item',
    renderMode: 'richText',
    formatter: '{b}: {c}',
    textStyle: { fontFamily: chartFontFamily, fontSize: 12, fontWeight: 'normal' },
  },
  legend: {
    orient: 'vertical',
    right: 0,
    top: 'center',
    textStyle: { fontFamily: chartFontFamily, color: '#64748b', fontSize: 11, fontWeight: 'normal' },
  },
  series: [{
    type: 'pie',
    radius: ['54%', '76%'],
    center: ['32%', '50%'],
    label: { show: false },
    itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
    data: [
      {
        value: summary?.active ?? 0,
        name: COMPUTER_STATUS_THEME.ACTIVE.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.ACTIVE.chart },
      },
      {
        value: summary?.inUse ?? 0,
        name: COMPUTER_STATUS_THEME.IN_USE.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.IN_USE.chart },
      },
      {
        value: summary?.maintenance ?? 0,
        name: COMPUTER_STATUS_THEME.MAINTENANCE.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.MAINTENANCE.chart },
      },
      {
        value: summary?.broken ?? 0,
        name: COMPUTER_STATUS_THEME.BROKEN.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.BROKEN.chart },
      },
      {
        value: summary?.locked ?? 0,
        name: COMPUTER_STATUS_THEME.LOCKED.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.LOCKED.chart },
      },
      {
        value: summary?.inactive ?? 0,
        name: COMPUTER_STATUS_THEME.INACTIVE.label,
        itemStyle: { color: COMPUTER_STATUS_THEME.INACTIVE.chart },
      },
    ],
  }],
}), [summary]);
 const usageHours=calendar.reduce((sum,event)=>sum+Math.max(0,(+new Date(event.end)-+new Date(event.start))/3600000),0);const utilization=Math.min(100,Math.round(usageHours/(22*10)*100));const usageOption=useMemo<EChartsOption>(()=>({textStyle:{fontFamily:chartFontFamily},tooltip:{trigger:'item'},series:[{type:'pie',radius:['58%','78%'],center:['50%','48%'],startAngle:90,label:{show:true,position:'center',formatter:`{value|${utilization}%}\n{label|Tỷ lệ sử dụng}`,rich:{value:{fontFamily:chartFontFamily,fontSize:24,fontWeight:700,color:'#0f172a'},label:{fontFamily:chartFontFamily,fontSize:11,color:'#64748b',lineHeight:22}}},data:[{value:utilization,name:'Đã sử dụng',itemStyle:{color:'#2f80ed'}},{value:Math.max(0,100-utilization),name:'Còn trống',itemStyle:{color:'#e6eef9'}}]}]}),[utilization]);
 const monthLabel=`Tháng ${String(monthStart.getMonth()+1).padStart(2,'0')}/${monthStart.getFullYear()}`;
 const popular=equipment.slice().sort((a,b)=>(b.borrowedQuantity+b.reservedQuantity)-(a.borrowedQuantity+a.reservedQuantity)).slice(0,5);return <div className="space-y-5 animate-float-in"><section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Xin chào, {user?.fullName?.split(' ').slice(-2).join(' ')||'bạn'} <span className="inline-block origin-bottom-right animate-[wiggle_1s_ease-in-out]">👋</span></h1><Sparkles className="h-5 w-5 text-amber-400"/></div><p className="mt-1 text-sm text-slate-500">Đây là tình hình hoạt động phòng Lab hôm nay.</p></div><div className="rounded-xl border bg-white px-4 py-2 text-right shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hôm nay</p><p className="text-sm font-bold text-slate-800">{new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'}).format(now)}</p></div></section><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"><MetricCard label="Yêu cầu của tôi" value={pending} detail="Đang chờ phê duyệt" icon={CalendarDays} tone="blue" loading={loadingBookings}/><MetricCard label="Đã duyệt hôm nay" value={approvedToday} detail="Lịch sẵn sàng sử dụng" icon={CheckSquare} tone="green" loading={loadingBookings}/><MetricCard label="Đang sử dụng" value={todayEvents.filter(e=>e.status==='CHECKED_IN').length} detail={`${todayEvents.length} lịch trong ngày`} icon={Clock3} tone="blue" loading={loadingCalendar}/><MetricCard label="Máy khả dụng" value={`${computerReady} / ${computerTotal}`} detail={`${summary?.broken??0} máy cần kiểm tra`} icon={Monitor} tone="green" loading={loadingComputers}/><MetricCard label="Thiết bị khả dụng" value={`${availableEquipment} / ${totalEquipment}`} detail={`${equipmentPercent}% tổng số lượng`} icon={PackageOpen} tone="cyan" loading={loadingEquipment}/><MetricCard label="Sự cố chưa xử lý" value={summary?.broken??0} detail="Theo trạng thái máy" icon={AlertTriangle} tone="red" loading={loadingComputers}/></section><section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr_.85fr]"><Card className="xl:row-span-2"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Lịch sử dụng hôm nay</CardTitle><p className="mt-1 text-xs text-slate-500">Các khung giờ đã được phê duyệt</p></div><Link href="/calendar" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Xem lịch đầy đủ →</Link></CardHeader><CardContent><div className="relative min-h-72 space-y-3 border-l border-slate-200 pl-5">{loadingCalendar&&[1,2,3].map(i=><Skeleton key={i} className="h-20 w-full"/>)}{!loadingCalendar&&todayEvents.length===0&&<div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="rounded-full bg-blue-50 p-4"><CalendarDays className="h-7 w-7 text-blue-500"/></div><p className="mt-3 text-sm font-bold text-slate-700">Hôm nay chưa có lịch sử dụng</p><p className="mt-1 text-xs text-slate-400">Lịch đã duyệt sẽ xuất hiện tại đây</p></div>}{todayEvents.map((event,index)=><ScheduleItem key={event.id} event={event} index={index}/>)}</div><div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-500"/>Đã duyệt</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-500"/>Đang sử dụng</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-violet-500"/>Hoàn thành</span></div></CardContent></Card><Card><CardHeader><CardTitle>Tỷ lệ sử dụng phòng Lab</CardTitle></CardHeader><CardContent><EChart option={usageOption} className="h-56"/><div className="flex justify-center gap-5 text-[11px] text-slate-500"><span>{formatDuration(usageHours)} đã đặt</span><span>{monthLabel}</span></div></CardContent></Card><Card><CardHeader><CardTitle>Tình trạng máy tính</CardTitle></CardHeader><CardContent><EChart option={computerOption} className="h-56"/></CardContent></Card><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Thiết bị được mượn nhiều</CardTitle><Wrench className="h-4 w-4 text-blue-500"/></CardHeader><CardContent className="space-y-3">{popular.length===0?<p className="py-14 text-center text-sm text-slate-400">Chưa có dữ liệu thiết bị</p>:popular.map((item,index)=>{const activity=item.borrowedQuantity+item.reservedQuantity;const max=Math.max(...popular.map(p=>p.borrowedQuantity+p.reservedQuantity),1);return <div key={item.id}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="max-w-[75%] truncate font-medium text-slate-700">{index+1}. {item.name}</span><span className="font-bold text-slate-500">{activity}</span></div><Progress value={activity/max*100}/></div>})}<Link href="/equipments" className="mt-4 block text-center text-xs font-semibold text-blue-600">Xem tất cả thiết bị →</Link></CardContent></Card><Card><CardHeader className="flex-row items-center justify-between"><CardTitle>Yêu cầu gần đây</CardTitle><UsersRound className="h-4 w-4 text-blue-500"/></CardHeader><CardContent className="space-y-1">{bookings.slice(0,5).map((booking,index)=><div key={booking.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{booking.purpose}</p><p className="text-[10px] text-slate-400">{formatDateTime(booking.startTime)}</p></div><Badge variant={statusStyle[booking.status as keyof typeof statusStyle]||'outline'}>{booking.status}</Badge></div>)}{!loadingBookings&&bookings.length===0&&<p className="py-14 text-center text-sm text-slate-400">Chưa có yêu cầu đăng ký</p>}</CardContent></Card></section></div>}

function ScheduleItem({event,index}:{event:CalendarEvent;index:number}){const tones=[{box:'border-blue-200 bg-blue-50/45',dot:'bg-blue-500 ring-blue-100',title:'text-blue-700'},{box:'border-emerald-200 bg-emerald-50/45',dot:'bg-emerald-500 ring-emerald-100',title:'text-emerald-700'},{box:'border-amber-200 bg-amber-50/45',dot:'bg-amber-500 ring-amber-100',title:'text-amber-700'},{box:'border-violet-200 bg-violet-50/45',dot:'bg-violet-500 ring-violet-100',title:'text-violet-700'}];const tone=tones[index%tones.length];const start=new Date(event.start),end=new Date(event.end);return <div className={`relative rounded-xl border p-3.5 ${tone.box}`}><span className={`absolute -left-[26px] top-5 h-3 w-3 rounded-full border-2 border-white ring-2 ${tone.dot}`}/><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="min-w-[82px] text-xs font-bold text-slate-700">{start.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} - {end.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</div><div className="min-w-0 flex-1"><p className={`truncate text-sm font-bold ${tone.title}`}>{event.title}</p><p className="mt-0.5 text-[11px] text-slate-500">{event.type==='FULL_LAB'?'Sử dụng toàn bộ phòng Lab':event.type==='COMPUTERS_ONLY'?'Sử dụng máy tính':'Mượn thiết bị'}</p></div><Badge variant={event.status==='CHECKED_IN'?'success':'outline'}>{event.status}</Badge></div></div>}
