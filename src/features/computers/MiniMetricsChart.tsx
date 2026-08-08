'use client';

import React, { useMemo } from 'react';
import { EChart } from '@/components/charts/echart';
import type { EChartsOption } from 'echarts';

interface MiniMetricsChartProps {
  label: string;
  valueText: string;
  subText?: string;
  data: number[];
  color: string;
}

export function MiniMetricsChart({ label, valueText, subText, data, color }: MiniMetricsChartProps) {
  const option: EChartsOption = useMemo(() => {
    return {
      grid: { top: 0, right: 0, bottom: 0, left: 0 },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: 100, // Assuming usage is 0-100%
      },
      series: [
        {
          data: data.length > 0 ? data : [0],
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: {
            color: color,
            width: 1.5,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: color + '80' }, // 50% opacity
                { offset: 1, color: color + '10' }, // 6% opacity
              ],
            },
          },
          animationDuration: 300,
        },
      ],
      tooltip: {
        show: false,
      },
    };
  }, [data, color]);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="w-20 h-12 shrink-0 border border-slate-200 bg-slate-50/50 rounded-sm overflow-hidden">
        <EChart option={option} className="w-full h-full" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-xs text-slate-500 truncate">{valueText}</span>
        {subText && <span className="text-[10px] text-slate-400 truncate">{subText}</span>}
      </div>
    </div>
  );
}
