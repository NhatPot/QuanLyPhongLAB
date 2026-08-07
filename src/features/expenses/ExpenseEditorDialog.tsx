'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CircleDollarSign, Link2, Plus, ReceiptText, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type {
  ExpenseOptions,
  ExpensePayload,
  ExpenseRecord,
  ExpenseTargetType,
  FundingSource,
} from '@/services/expense-api';

interface EditableItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  targetType: Exclude<ExpenseTargetType, 'MAINTENANCE'>;
  targetId: string;
  note: string;
}

interface FormState {
  expenseDate: string;
  categoryId: string;
  title: string;
  description: string;
  vendorName: string;
  invoiceNumber: string;
  fundingSource: FundingSource;
  currency: string;
  attachmentUrl: string;
  items: EditableItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: ExpenseRecord | null;
  options?: ExpenseOptions;
  optionsLoading: boolean;
  optionsError: boolean;
  onRetryOptions: () => void;
  pending: boolean;
  onSubmit: (payload: ExpensePayload) => void;
}

export function ExpenseEditorDialog({
  open,
  onOpenChange,
  selected,
  options,
  optionsLoading,
  optionsError,
  onRetryOptions,
  pending,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(() => emptyForm(options));
  const [error, setError] = useState('');
  const categories = options?.categories || [];

  useEffect(() => {
    if (!open) return;
    setError('');
    if (selected) {
      setForm({
        expenseDate: selected.expenseDate.slice(0, 10),
        categoryId: selected.categoryId,
        title: selected.title,
        description: selected.description || '',
        vendorName: selected.vendorName || '',
        invoiceNumber: selected.invoiceNumber || '',
        fundingSource: selected.fundingSource,
        currency: selected.currency,
        attachmentUrl: selected.attachmentUrl || '',
        items: selected.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          targetType: item.targetType === 'MAINTENANCE' ? 'OTHER' : item.targetType,
          targetId: item.targetId || '',
          note: item.note || '',
        })),
      });
    } else {
      setForm(emptyForm(options));
    }
  }, [open, selected, options]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + number(item.quantity) * number(item.unitPrice), 0);
    const discount = form.items.reduce((sum, item) => sum + number(item.discountAmount), 0);
    const tax = form.items.reduce((sum, item) => sum + number(item.taxAmount), 0);
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [form.items]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = <K extends keyof EditableItem>(index: number, key: K, value: EditableItem[K]) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  };
  const changeTargetType = (index: number, targetType: EditableItem['targetType']) => {
    const availableTargets = targets(targetType, options);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? {
        ...item,
        targetType,
        targetId: targetType === 'LAB' && availableTargets.length === 1 ? availableTargets[0].id : '',
      } : item),
    }));
  };
  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, blankItem()] }));
  const removeItem = (index: number) => setForm((current) => ({
    ...current,
    items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
  }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.expenseDate || !form.categoryId || form.title.trim().length < 2) {
      setError('Vui lòng nhập ngày chi, danh mục và nội dung phiếu.');
      return;
    }
    if (form.items.some((item) => !item.description.trim() || !item.unit.trim() || number(item.quantity) <= 0 || number(item.unitPrice) < 0)) {
      setError('Mỗi dòng phải có nội dung, đơn vị, số lượng lớn hơn 0 và đơn giá hợp lệ.');
      return;
    }
    if (form.items.some((item) => item.targetType !== 'OTHER' && !item.targetId)) {
      setError('Dòng có liên kết tài sản phải chọn tài sản cụ thể.');
      return;
    }
    if (totals.total < 0) {
      setError('Giảm giá không được lớn hơn giá trị hàng hóa cộng thuế.');
      return;
    }
    setError('');
    onSubmit({
      expenseDate: form.expenseDate,
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: clean(form.description),
      vendorName: clean(form.vendorName),
      invoiceNumber: clean(form.invoiceNumber),
      fundingSource: form.fundingSource,
      currency: form.currency,
      attachmentUrl: clean(form.attachmentUrl),
      items: form.items.map((item) => ({
        id: item.id,
        description: item.description.trim(),
        quantity: number(item.quantity),
        unit: item.unit.trim(),
        unitPrice: number(item.unitPrice),
        discountAmount: number(item.discountAmount),
        taxAmount: number(item.taxAmount),
        targetType: item.targetType,
        targetId: item.targetId || undefined,
        note: clean(item.note),
      })),
    });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{selected ? `Cập nhật ${selected.code}` : 'Tạo phiếu chi mới'}</DialogTitle>
        <DialogDescription>Ghi nhận hàng hóa hoặc dịch vụ, nguồn kinh phí và tài sản liên quan. Phiếu mới được lưu ở trạng thái nháp.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        {(optionsError || (!optionsLoading && categories.length === 0)) && <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><strong>Chưa tải được dữ liệu danh mục và tài sản.</strong><p className="mt-0.5 text-xs text-amber-700">Kiểm tra migration chi phí trên SQL Server hoặc thử tải lại dữ liệu.</p></div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRetryOptions}>Tải lại</Button>
        </div>}

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3"><Field label="Ngày phát sinh" icon={ReceiptText}><Input type="date" value={form.expenseDate} onChange={(event) => update('expenseDate', event.target.value)} /></Field></div>
          <div className="lg:col-span-4"><Field label="Danh mục" icon={CircleDollarSign}>
            <select className={selectClass} value={form.categoryId} disabled={optionsLoading || categories.length === 0} onChange={(event) => update('categoryId', event.target.value)}>
              <option value="">{optionsLoading ? 'Đang tải danh mục...' : categories.length === 0 ? 'Chưa có danh mục' : 'Chọn danh mục'}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.expenseClass} · {category.name}</option>)}
            </select>
          </Field></div>
          <div className="lg:col-span-3"><Field label="Nguồn kinh phí">
            <select className={selectClass} value={form.fundingSource} onChange={(event) => update('fundingSource', event.target.value as FundingSource)}>
              <option value="CENTER">Trung tâm</option><option value="FACULTY">Khoa</option>
              <option value="UNIVERSITY">Trường</option><option value="SPONSOR">Tài trợ</option><option value="OTHER">Khác</option>
            </select>
          </Field></div>
          <div className="lg:col-span-2"><Field label="Tiền tệ"><Input value={form.currency} readOnly className="bg-slate-100 font-semibold text-slate-500" /></Field></div>
          <div className="sm:col-span-2 lg:col-span-6"><Field label="Nội dung phiếu"><Input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Ví dụ: Mua bổ sung bàn phím cho phòng Lab" /></Field></div>
          <div className="lg:col-span-4"><Field label="Nhà cung cấp"><Input value={form.vendorName} onChange={(event) => update('vendorName', event.target.value)} placeholder="Không bắt buộc" /></Field></div>
          <div className="lg:col-span-2"><Field label="Số hóa đơn"><Input value={form.invoiceNumber} onChange={(event) => update('invoiceNumber', event.target.value)} /></Field></div>
          <details className="group sm:col-span-2 lg:col-span-12" open={Boolean(selected && (form.description || form.attachmentUrl)) || undefined}>
            <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs font-semibold text-blue-700">
              <SlidersHorizontal className="h-4 w-4" /> Thêm mô tả và chứng từ
            </summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Mô tả"><textarea className={textAreaClass} rows={2} value={form.description} onChange={(event) => update('description', event.target.value)} /></Field>
              <Field label="Đường dẫn chứng từ" icon={Link2}><Input type="url" value={form.attachmentUrl} onChange={(event) => update('attachmentUrl', event.target.value)} placeholder="https://..." /></Field>
            </div>
          </details>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div><h3 className="font-bold text-slate-900">Chi tiết chi phí</h3><p className="text-xs text-slate-500">Có thể liên kết từng dòng với máy tính, thiết bị hoặc phòng Lab.</p></div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus />Thêm dòng</Button>
          </div>
          {form.items.map((item, index) => {
            const availableTargets = targets(item.targetType, options);
            const hasAdvancedValues = item.discountAmount > 0 || item.taxAmount > 0 || item.targetType !== 'OTHER' || Boolean(item.note);
            return <div key={item.id || index} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Dòng {index + 1}</p>
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeItem(index)} disabled={form.items.length === 1}><Trash2 />Xóa</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_90px_100px_150px_150px]">
                <Field label="Hàng hóa/dịch vụ"><Input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="Nhập tên mặt hàng hoặc dịch vụ" /></Field>
                <Field label="Số lượng"><Input type="number" min={0.01} step={0.01} value={item.quantity} onChange={(event) => updateItem(index, 'quantity', number(event.target.value))} /></Field>
                <Field label="Đơn vị"><Input value={item.unit} onChange={(event) => updateItem(index, 'unit', event.target.value)} /></Field>
                <Field label="Đơn giá"><Input type="number" min={0} step={1000} value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', number(event.target.value))} /></Field>
                <Field label="Thành tiền"><div className="flex h-10 items-center justify-end rounded-xl bg-blue-50 px-3 text-sm font-extrabold text-blue-700">{money(lineTotal(item))}</div></Field>
              </div>
              <details className="mt-3 border-t border-slate-100 pt-2" open={hasAdvancedValues || undefined}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Giảm giá, thuế, liên kết và ghi chú
                  {hasAdvancedValues && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">Đã nhập</span>}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                  <div className="lg:col-span-2"><Field label="Giảm giá (số tiền)"><Input type="number" min={0} step={1000} value={item.discountAmount} onChange={(event) => updateItem(index, 'discountAmount', number(event.target.value))} /></Field></div>
                  <div className="lg:col-span-2"><Field label="Thuế VAT (số tiền)"><Input type="number" min={0} step={1000} value={item.taxAmount} onChange={(event) => updateItem(index, 'taxAmount', number(event.target.value))} /></Field></div>
                  <div className="lg:col-span-3"><Field label="Liên kết tài sản">
                    <select className={selectClass} value={item.targetType} onChange={(event) => changeTargetType(index, event.target.value as EditableItem['targetType'])}>
                      <option value="OTHER">Không liên kết</option><option value="LAB">Phòng Lab</option>
                      <option value="COMPUTER">Máy tính</option><option value="EQUIPMENT">Thiết bị</option>
                    </select>
                  </Field></div>
                  <div className="lg:col-span-5"><Field label="Đối tượng">
                    <select className={selectClass} value={item.targetId} disabled={optionsLoading || item.targetType === 'OTHER' || availableTargets.length === 0} onChange={(event) => updateItem(index, 'targetId', event.target.value)}>
                      <option value="">{targetPlaceholder(item.targetType, availableTargets.length, optionsLoading)}</option>
                      {availableTargets.map((target) => <option key={target.id} value={target.id}>{target.code} · {target.name}</option>)}
                    </select>
                  </Field></div>
                  <div className="sm:col-span-2 lg:col-span-12"><Field label="Ghi chú dòng"><Input value={item.note} onChange={(event) => updateItem(index, 'note', event.target.value)} placeholder="Không bắt buộc" /></Field></div>
                </div>
              </details>
            </div>;
          })}
        </section>

        <section className="ml-auto grid max-w-xl grid-cols-2 gap-x-8 gap-y-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm text-slate-700 shadow-sm">
          <span className="text-slate-500">Tạm tính</span><strong className="text-right text-slate-800">{money(totals.subtotal)}</strong>
          <span className="text-slate-500">Giảm giá</span><strong className="text-right text-amber-600">-{money(totals.discount)}</strong>
          <span className="text-slate-500">Thuế</span><strong className="text-right text-slate-800">{money(totals.tax)}</strong>
          <span className="border-t border-blue-200 pt-3 font-bold text-slate-900">Tổng cộng</span><strong className="border-t border-blue-200 pt-3 text-right text-lg text-blue-700">{money(totals.total)}</strong>
        </section>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Đóng</Button>
          <Button type="submit" disabled={pending || optionsLoading || optionsError || categories.length === 0}><Save />{pending ? 'Đang lưu...' : selected ? 'Lưu thay đổi' : 'Tạo phiếu nháp'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function emptyForm(options?: ExpenseOptions): FormState {
  return {
    expenseDate: new Date().toISOString().slice(0, 10),
    categoryId: options?.categories[0]?.id || '',
    title: '',
    description: '',
    vendorName: '',
    invoiceNumber: '',
    fundingSource: 'CENTER',
    currency: 'VND',
    attachmentUrl: '',
    items: [blankItem()],
  };
}
function blankItem(): EditableItem {
  return { description: '', quantity: 1, unit: 'cái', unitPrice: 0, discountAmount: 0, taxAmount: 0, targetType: 'OTHER', targetId: '', note: '' };
}
function targets(type: EditableItem['targetType'], options?: ExpenseOptions) {
  if (!options) return [];
  if (type === 'LAB') return options.lab ? [options.lab] : [];
  if (type === 'COMPUTER') return options.computers;
  if (type === 'EQUIPMENT') return options.equipments;
  return [];
}
function targetPlaceholder(type: EditableItem['targetType'], count: number, loading: boolean) {
  if (type === 'OTHER') return 'Không cần chọn';
  if (loading) return 'Đang tải dữ liệu...';
  if (count > 0) return 'Chọn đối tượng';
  return {
    LAB: 'Chưa cấu hình phòng Lab',
    COMPUTER: 'Chưa có máy tính',
    EQUIPMENT: 'Chưa có thiết bị',
    OTHER: 'Không cần chọn',
  }[type];
}
function lineTotal(item: EditableItem) {
  return number(item.quantity) * number(item.unitPrice) - number(item.discountAmount) + number(item.taxAmount);
}
function number(value: string | number) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function clean(value: string) { return value.trim() || undefined; }
function money(value: number) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value); }
function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">{Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}{label}</span>{children}</label>;
}
const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';
const textAreaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
