'use client';

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Monitor, PackageOpen, Save, School, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MaintenanceOptions, MaintenanceRecord, MaintenanceSource, MaintenanceTargetType } from '@/services/maintenance-api';

const schema = z.object({
  targetType: z.enum(['LAB', 'COMPUTER', 'EQUIPMENT']),
  targetId: z.string().min(1, 'Vui lòng chọn tài sản.'),
  title: z.string().trim().min(2, 'Tiêu đề phải có ít nhất 2 ký tự.'),
  reason: z.string().trim().min(2, 'Vui lòng nhập lý do bảo trì.'),
  description: z.string().optional(),
  scheduledStartAt: z.string().min(1, 'Vui lòng chọn thời gian bắt đầu.'),
  expectedEndAt: z.string().min(1, 'Vui lòng chọn thời gian kết thúc.'),
  technicianId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Số lượng tối thiểu là 1.'),
  maintenanceSource: z.enum(['AVAILABLE', 'BROKEN']).optional(),
  estimatedCost: z.coerce.number().min(0, 'Chi phí không được âm.'),
  partsNote: z.string().optional(),
}).refine((value) => new Date(value.scheduledStartAt) < new Date(value.expectedEndAt), {
  message: 'Thời gian kết thúc phải sau thời gian bắt đầu.', path: ['expectedEndAt'],
});

export type MaintenanceFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options?: MaintenanceOptions;
  selected: MaintenanceRecord | null;
  pending: boolean;
  onSubmit: (values: MaintenanceFormValues) => void;
}

export function MaintenanceEditorDialog({ open, onOpenChange, options, selected, pending, onSubmit }: Props) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(schema),
  });
  const targetType = watch('targetType');
  const targetId = watch('targetId');
  const source = watch('maintenanceSource');

  const assets = useMemo(() => {
    if (!options) return [];
    if (targetType === 'LAB') return options.lab ? [options.lab] : [];
    return targetType === 'COMPUTER' ? options.computers : options.equipments;
  }, [options, targetType]);
  const selectedAsset = assets.find((asset) => asset.id === targetId);

  useEffect(() => {
    if (!open) return;
    if (selected) {
      reset({
        targetType: selected.targetType, targetId: selected.targetId, title: selected.title,
        reason: selected.reason, description: selected.description || '',
        scheduledStartAt: toLocalInput(selected.scheduledStartAt), expectedEndAt: toLocalInput(selected.expectedEndAt),
        technicianId: selected.technicianId || '', quantity: selected.quantity,
        maintenanceSource: selected.maintenanceSource || undefined, estimatedCost: selected.estimatedCost,
        partsNote: selected.partsNote || '',
      });
      return;
    }
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    reset({
      targetType: 'COMPUTER', targetId: options?.computers[0]?.id || '', title: '', reason: '', description: '',
      scheduledStartAt: toLocalInput(start.toISOString()), expectedEndAt: toLocalInput(end.toISOString()),
      technicianId: options?.technicians[0]?.id || '', quantity: 1, maintenanceSource: undefined,
      estimatedCost: 0, partsNote: '',
    });
  }, [open, selected, options, reset]);

  useEffect(() => {
    if (!open || selected) return;
    if (targetType === 'LAB' && options?.lab) setValue('targetId', options.lab.id);
    if (targetType === 'COMPUTER') setValue('targetId', options?.computers[0]?.id || '');
    if (targetType === 'EQUIPMENT') {
      setValue('targetId', options?.equipments[0]?.id || '');
      setValue('maintenanceSource', 'AVAILABLE');
    } else {
      setValue('quantity', 1);
      setValue('maintenanceSource', undefined);
    }
  }, [targetType, open, selected, options, setValue]);

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{selected?.status === 'PENDING' ? 'Xếp lịch đề xuất bảo trì' : selected ? 'Cập nhật lịch bảo trì' : 'Lập lịch bảo trì mới'}</DialogTitle>
        <DialogDescription>Chọn tài sản, thời gian và người phụ trách. Trạng thái tài sản chỉ thay đổi khi bắt đầu bảo trì.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Loại tài sản" error={errors.targetType?.message} icon={targetType === 'LAB' ? School : targetType === 'EQUIPMENT' ? PackageOpen : Monitor}>
          <select {...register('targetType')} className={inputClass} disabled={!!selected && selected.status !== 'SCHEDULED'}>
            <option value="LAB">Phòng Lab</option><option value="COMPUTER">Máy tính</option><option value="EQUIPMENT">Thiết bị</option>
          </select>
        </Field>
        <Field label="Tài sản" error={errors.targetId?.message} icon={Monitor}>
          <select {...register('targetId')} className={inputClass}>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} · {asset.name}</option>)}
          </select>
          {targetType === 'EQUIPMENT' && selectedAsset && <p className="mt-1 text-[10px] text-slate-400">Khả dụng {selectedAsset.availableQuantity || 0} · Hỏng {selectedAsset.brokenQuantity || 0} · Đang bảo trì {selectedAsset.maintenanceQuantity || 0}</p>}
        </Field>
        <div className="sm:col-span-2"><Field label="Tiêu đề" error={errors.title?.message} icon={CalendarClock}><Input {...register('title')} placeholder="Ví dụ: Bảo trì định kỳ máy trạm tháng 7" /></Field></div>
        <div className="sm:col-span-2"><Field label="Lý do bảo trì" error={errors.reason?.message}><textarea {...register('reason')} rows={2} className={textAreaClass} placeholder="Mô tả nguyên nhân hoặc mục tiêu bảo trì..." /></Field></div>
        <Field label="Bắt đầu dự kiến" error={errors.scheduledStartAt?.message} icon={CalendarClock}><Input type="datetime-local" {...register('scheduledStartAt')} /></Field>
        <Field label="Kết thúc dự kiến" error={errors.expectedEndAt?.message} icon={CalendarClock}><Input type="datetime-local" {...register('expectedEndAt')} /></Field>
        <Field label="Người phụ trách" error={errors.technicianId?.message} icon={UserRound}>
          <select {...register('technicianId')} className={inputClass}><option value="">Chưa phân công</option>{options?.technicians.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.roles.join(', ')}</option>)}</select>
        </Field>
        <Field label="Chi phí dự kiến" error={errors.estimatedCost?.message}><Input type="number" min={0} step={1000} {...register('estimatedCost')} /></Field>
        {targetType === 'EQUIPMENT' && <>
          <Field label="Nguồn số lượng" error={errors.maintenanceSource?.message}>
            <select {...register('maintenanceSource')} className={inputClass}><option value="AVAILABLE">Từ thiết bị khả dụng</option><option value="BROKEN">Từ thiết bị hỏng</option></select>
          </Field>
          <Field label="Số lượng" error={errors.quantity?.message}><Input type="number" min={1} max={source === 'BROKEN' ? selectedAsset?.brokenQuantity : selectedAsset?.availableQuantity} {...register('quantity')} /></Field>
        </>}
        <div className="sm:col-span-2"><Field label="Linh kiện/vật tư dự kiến"><textarea {...register('partsNote')} rows={2} className={textAreaClass} placeholder="Ví dụ: RAM 16GB, keo tản nhiệt..." /></Field></div>
        <div className="sm:col-span-2"><Field label="Ghi chú bổ sung"><textarea {...register('description')} rows={2} className={textAreaClass} /></Field></div>
        <DialogFooter className="border-t pt-4 sm:col-span-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button type="submit" disabled={pending}><Save />{pending ? 'Đang lưu...' : selected?.status === 'PENDING' ? 'Xác nhận xếp lịch' : selected ? 'Lưu thay đổi' : 'Tạo lịch bảo trì'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function Field({ label, error, icon: Icon, children }: { label: string; error?: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">{Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}{label}</span>{children}{error && <span className="mt-1 block text-[11px] font-medium text-red-600">{error}</span>}</label>;
}

const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const textAreaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const toLocalInput = (value: string) => {
  const date = new Date(value); const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
