import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function Page(){return <div className="flex min-h-[65vh] flex-col items-center justify-center text-center"><div className="rounded-3xl bg-red-50 p-5 text-red-600"><ShieldAlert className="h-10 w-10"/></div><h1 className="mt-5 text-2xl font-extrabold text-slate-950">Bạn không có quyền truy cập</h1><p className="mt-2 max-w-md text-sm text-slate-500">Tài khoản hiện tại không có permission cần thiết cho trang này. Nếu đây là nhầm lẫn, hãy liên hệ quản trị viên.</p><Button asChild className="mt-6"><Link href="/">Quay lại tổng quan</Link></Button></div>}
