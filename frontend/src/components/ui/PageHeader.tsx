import React from 'react';
import { cn } from '@/lib/utils';
interface PageHeaderProps { title:string; description?:string; eyebrow?:string; children?:React.ReactNode; className?:string }
export function PageHeader({title,description,eyebrow,children,className}:PageHeaderProps){return <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',className)}><div>{eyebrow&&<p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-blue-600">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{description&&<p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p>}</div>{children&&<div className="flex flex-wrap items-center gap-2">{children}</div>}</div>}
