import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const badgeVariants=cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',{variants:{variant:{default:'border-transparent bg-blue-50 text-blue-700',secondary:'border-transparent bg-slate-100 text-slate-700',success:'border-emerald-200 bg-emerald-50 text-emerald-700',warning:'border-amber-200 bg-amber-50 text-amber-700',destructive:'border-red-200 bg-red-50 text-red-700',outline:'border-slate-200 bg-white text-slate-600'}},defaultVariants:{variant:'default'}});
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>,VariantProps<typeof badgeVariants>{}
export function Badge({className,variant,...props}:BadgeProps){return <div className={cn(badgeVariants({variant}),className)} {...props}/>}
