'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
export function PermissionGate({permission,children}:{permission:string;children:React.ReactNode}){const {isLoading,hasPermission}=useAuth();const router=useRouter();const allowed=hasPermission(permission);useEffect(()=>{if(!isLoading&&!allowed)router.replace('/unauthorized')},[isLoading,allowed,router]);if(isLoading||!allowed)return <div className="flex min-h-[55vh] flex-col items-center justify-center text-slate-500"><div className="rounded-full bg-blue-50 p-4"><ShieldAlert className="h-7 w-7 animate-pulse text-blue-500"/></div><p className="mt-3 text-sm font-semibold">Đang kiểm tra quyền truy cập...</p></div>;return <>{children}</>}
