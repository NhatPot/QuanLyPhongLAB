'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { IncidentOptions, IncidentPayload, IncidentRecord } from '@/services/incident-api';

const schema = z.object({
  title: z.string().trim().min(3, 'Tiêu đề phải có ít nhất 3 ký tự.').max(255),
  description: z.string().trim().min(3, 'Hãy mô tả tình trạng sự cố.').max(10000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  targetType: z.enum(['GENERAL', 'COMPUTER', 'EQUIPMENT']),
  targetId: z.string().optional(),
  bookingRequestId: z.string().optional(),
  imageUrl: z.union([z.literal(''), z.string().url('Đường dẫn hình ảnh không hợp lệ.')]),
}).superRefine((value, context) => {
  if (value.targetType !== 'GENERAL' && !value.targetId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['targetId'], message: 'Hãy chọn tài sản liên quan.' });
  }
});

export type IncidentFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: IncidentRecord | null;
  options?: IncidentOptions;
  saving: boolean;
  onSubmit: (payload: IncidentPayload) => void;
}

const fieldClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export function IncidentEditorDialog({ open, onOpenChange, incident, options, saving, onSubmit }: Props) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<IncidentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', severity: 'MEDIUM', targetType: 'GENERAL', targetId: '', bookingRequestId: '', imageUrl: '' },
  });
  const targetType = watch('targetType');

  useEffect(() => {
    const type = incident?.computerId ? 'COMPUTER' : incident?.equipmentId ? 'EQUIPMENT' : 'GENERAL';
    reset({
      title: incident?.title || '', description: incident?.description || '', severity: incident?.severity || 'MEDIUM',
      targetType: type, targetId: incident?.computerId || incident?.equipmentId || '',
      bookingRequestId: incident?.bookingRequestId || '', imageUrl: incident?.imageUrl || '',
    });
  }, [incident, open, reset]);

  const submit = (values: IncidentFormValues) => onSubmit({
    title: values.title.trim(), description: values.description.trim(), severity: values.severity,
    computerId: values.targetType === 'COMPUTER' ? values.targetId : undefined,
    equipmentId: values.targetType === 'EQUIPMENT' ? values.targetId : undefined,
    bookingRequestId: values.bookingRequestId || undefined, imageUrl: values.imageUrl || undefined,
  });

  const assets = targetType === 'COMPUTER' ? options?.computers : targetType === 'EQUIPMENT' ? options?.equipments : [];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center gap-3"><span className="rounded-xl bg-red-50 p-2.5 text-red-600"><AlertTriangle className="h-5 w-5"/></span><div><DialogTitle>{incident ? 'Cập nhật sự cố' : 'Báo cáo sự cố mới'}</DialogTitle><DialogDescription>Ghi nhận rõ tài sản, mức độ và tình trạng để bộ phận phụ trách xử lý.</DialogDescription></div></div>
      </DialogHeader>
      <form id="incident-form" onSubmit={handleSubmit(submit)} className="grid gap-4 pt-2 sm:grid-cols-2">
        <Field label="Tiêu đề" error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} placeholder="Ví dụ: PC-20 không khởi động"/></Field>
        <Field label="Mức độ" error={errors.severity?.message}><select {...register('severity')} className={fieldClass}><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="CRITICAL">Khẩn cấp</option></select></Field>
        <Field label="Loại đối tượng" error={errors.targetType?.message}><select {...register('targetType', { onChange: () => setValue('targetId', '') })} className={fieldClass}><option value="GENERAL">Phòng Lab / khác</option><option value="COMPUTER">Máy tính</option><option value="EQUIPMENT">Thiết bị</option></select></Field>
        {targetType !== 'GENERAL' && <Field label={targetType === 'COMPUTER' ? 'Máy tính liên quan' : 'Thiết bị liên quan'} error={errors.targetId?.message} className="sm:col-span-2"><select {...register('targetId')} className={fieldClass}><option value="">Chọn tài sản...</option>{assets?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}{'status' in item ? ` · ${item.status}` : ''}</option>)}</select></Field>}
        <Field label="Lịch sử dụng liên quan" error={errors.bookingRequestId?.message} className="sm:col-span-2"><select {...register('bookingRequestId')} className={fieldClass}><option value="">Không liên kết lịch sử dụng</option>{options?.bookings.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.purpose}</option>)}</select></Field>
        <Field label="Mô tả chi tiết" error={errors.description?.message} className="sm:col-span-2"><textarea {...register('description')} rows={5} className={`${fieldClass} h-auto resize-y py-3`} placeholder="Hiện tượng, thời điểm phát hiện và thông tin cần lưu ý..."/></Field>
        <Field label="Đường dẫn hình ảnh (không bắt buộc)" error={errors.imageUrl?.message} className="sm:col-span-2"><Input {...register('imageUrl')} placeholder="https://..."/></Field>
      </form>
      <DialogFooter className="border-t pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button form="incident-form" type="submit" disabled={saving}>{saving && <LoaderCircle className="animate-spin"/>}{incident ? 'Lưu thay đổi' : 'Tạo phiếu sự cố'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={className}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
