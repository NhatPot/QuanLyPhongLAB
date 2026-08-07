'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';
echarts.use([BarChart,LineChart,PieChart,GridComponent,LegendComponent,TooltipComponent,CanvasRenderer]);
export function EChart({option,className}:{option:EChartsOption;className?:string}){const elementRef=useRef<HTMLDivElement>(null);useEffect(()=>{if(!elementRef.current)return;const instance=echarts.init(elementRef.current);instance.setOption(option);const observer=new ResizeObserver(()=>instance.resize());observer.observe(elementRef.current);return()=>{observer.disconnect();instance.dispose()}},[option]);return <div ref={elementRef} className={cn('h-64 w-full',className)}/>}
