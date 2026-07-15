import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function NotFound(){return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center"><div className="rounded-3xl bg-blue-50 p-5 text-blue-600"><SearchX className="h-10 w-10"/></div><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-blue-600">404</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Không tìm thấy trang</h1><p className="mt-2 text-sm text-slate-500">Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.</p><Button asChild className="mt-6"><Link href="/">Về trang tổng quan</Link></Button></main>}
