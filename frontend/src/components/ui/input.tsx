import * as React from 'react';
import { cn } from '@/lib/utils';
export const Input=React.forwardRef<HTMLInputElement,React.ComponentProps<'input'>>(({className,type,...props},ref)=><input type={type} ref={ref} className={cn('flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50',className)} {...props}/>);Input.displayName='Input';
