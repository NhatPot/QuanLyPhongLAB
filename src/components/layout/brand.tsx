import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandProps = {
  compact?: boolean;
  className?: string;
};

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-blue-950/30 ring-1 ring-white/40">
        <Image
          src="/branding/lhu-symbol.png"
          alt="Biểu tượng Đại học Lạc Hồng"
          width={700}
          height={428}
          priority
          className="h-auto w-8 object-contain"
        />
      </div>
      {!compact && (
        <div>
          <p className="text-[15px] font-extrabold tracking-wide text-white">LHU IT LAB</p>
          <p className="text-[11px] text-blue-200">Quản lý phòng Lab CNTT</p>
        </div>
      )}
    </div>
  );
}
