import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type ExpenseClass = 'CAPEX' | 'OPEX';
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID';
export type FundingSource = 'CENTER' | 'FACULTY' | 'UNIVERSITY' | 'SPONSOR' | 'OTHER';
export type ExpenseSourceType = 'MANUAL' | 'MAINTENANCE';
export type ExpenseTargetType = 'LAB' | 'COMPUTER' | 'EQUIPMENT' | 'MAINTENANCE' | 'OTHER';

export interface ExpenseItemProps {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  targetType: ExpenseTargetType;
  targetId?: string;
  note?: string;
}

export interface ExpenseProps {
  code: string;
  expenseDate: Date;
  categoryId: string;
  title: string;
  description?: string;
  vendorName?: string;
  invoiceNumber?: string;
  fundingSource: FundingSource;
  status: ExpenseStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentDate?: Date;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  attachmentUrl?: string;
  sourceType: ExpenseSourceType;
  sourceId?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  inventoryPostedAt?: Date;
  items: ExpenseItemProps[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  rowVersion?: Buffer;
}

export type ExpenseContentInput = Pick<ExpenseProps,
  'expenseDate' | 'categoryId' | 'title' | 'description' | 'vendorName' | 'invoiceNumber' |
  'fundingSource' | 'paymentMethod' | 'currency' | 'attachmentUrl' | 'items'
>;

export class Expense extends Entity<ExpenseProps> {
  private constructor(props: ExpenseProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: ExpenseProps, id?: UniqueEntityId): Expense {
    const normalized = Expense.normalize(props);
    Expense.validate(normalized);
    return new Expense(normalized, id);
  }

  public get code() { return this.props.code; }
  public get expenseDate() { return this.props.expenseDate; }
  public get categoryId() { return this.props.categoryId; }
  public get title() { return this.props.title; }
  public get description() { return this.props.description; }
  public get vendorName() { return this.props.vendorName; }
  public get invoiceNumber() { return this.props.invoiceNumber; }
  public get fundingSource() { return this.props.fundingSource; }
  public get status() { return this.props.status; }
  public get paymentStatus() { return this.props.paymentStatus; }
  public get paymentMethod() { return this.props.paymentMethod; }
  public get paymentDate() { return this.props.paymentDate; }
  public get subtotal() { return this.props.subtotal; }
  public get discountAmount() { return this.props.discountAmount; }
  public get taxAmount() { return this.props.taxAmount; }
  public get totalAmount() { return this.props.totalAmount; }
  public get currency() { return this.props.currency; }
  public get attachmentUrl() { return this.props.attachmentUrl; }
  public get sourceType() { return this.props.sourceType; }
  public get sourceId() { return this.props.sourceId; }
  public get createdBy() { return this.props.createdBy; }
  public get approvedBy() { return this.props.approvedBy; }
  public get approvedAt() { return this.props.approvedAt; }
  public get rejectedAt() { return this.props.rejectedAt; }
  public get rejectionReason() { return this.props.rejectionReason; }
  public get cancelledAt() { return this.props.cancelledAt; }
  public get cancellationReason() { return this.props.cancellationReason; }
  public get inventoryPostedAt() { return this.props.inventoryPostedAt; }
  public get items() { return this.props.items; }
  public get createdAt() { return this.props.createdAt; }
  public get updatedAt() { return this.props.updatedAt; }
  public get deletedAt() { return this.props.deletedAt; }
  public get rowVersion() { return this.props.rowVersion; }

  public updateContent(input: ExpenseContentInput): void {
    if (!['DRAFT', 'REJECTED'].includes(this.props.status)) {
      throw new Error('Chỉ được chỉnh sửa phiếu nháp hoặc phiếu bị từ chối.');
    }
    const candidate = Expense.normalize({
      ...this.props,
      ...input,
      status: 'DRAFT',
      rejectedAt: undefined,
      rejectionReason: undefined,
      updatedAt: new Date(),
    });
    Expense.validate(candidate);
    Object.assign(this.props, candidate);
  }

  public submit(): void {
    if (this.props.status !== 'DRAFT') throw new Error('Chỉ phiếu nháp mới có thể gửi duyệt.');
    this.props.status = 'SUBMITTED';
    this.props.updatedAt = new Date();
  }

  public approve(actorUserId: string, at = new Date()): void {
    if (this.props.status !== 'SUBMITTED') throw new Error('Chỉ phiếu đã gửi mới có thể được duyệt.');
    this.props.status = 'APPROVED';
    this.props.approvedBy = actorUserId;
    this.props.approvedAt = at;
    this.props.updatedAt = at;
  }

  public reject(reason: string, at = new Date()): void {
    if (this.props.status !== 'SUBMITTED') throw new Error('Chỉ phiếu đã gửi mới có thể bị từ chối.');
    if (!reason.trim()) throw new Error('Lý do từ chối không được để trống.');
    this.props.status = 'REJECTED';
    this.props.rejectedAt = at;
    this.props.rejectionReason = reason.trim();
    this.props.updatedAt = at;
  }

  public markPaid(paymentMethod: string, paymentDate: Date, at = new Date()): void {
    if (this.props.status !== 'APPROVED') throw new Error('Chỉ phiếu đã duyệt mới có thể xác nhận thanh toán.');
    if (!paymentMethod.trim()) throw new Error('Phương thức thanh toán không được để trống.');
    this.props.status = 'PAID';
    this.props.paymentStatus = 'PAID';
    this.props.paymentMethod = paymentMethod.trim();
    this.props.paymentDate = paymentDate;
    this.props.updatedAt = at;
  }

  public cancel(reason: string, at = new Date()): void {
    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(this.props.status)) {
      throw new Error('Phiếu đã thanh toán hoặc đã hủy không thể hủy lại.');
    }
    if (!reason.trim()) throw new Error('Lý do hủy không được để trống.');
    this.props.status = 'CANCELLED';
    this.props.cancelledAt = at;
    this.props.cancellationReason = reason.trim();
    this.props.updatedAt = at;
  }

  public markInventoryPosted(at = new Date()): void {
    if (this.props.status !== 'PAID') throw new Error('Chỉ phiếu đã thanh toán mới được ghi tăng tồn kho.');
    this.props.inventoryPostedAt = at;
    this.props.updatedAt = at;
  }

  public markDeleted(at = new Date()): void {
    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(this.props.status)) {
      throw new Error('Chỉ được xóa phiếu nháp, bị từ chối hoặc đã hủy.');
    }
    this.props.deletedAt = at;
    this.props.updatedAt = at;
  }

  private static normalize(props: ExpenseProps): ExpenseProps {
    const items = props.items.map((item) => {
      const quantity = money(item.quantity);
      const unitPrice = money(item.unitPrice);
      const discountAmount = money(item.discountAmount || 0);
      const taxAmount = money(item.taxAmount || 0);
      return {
        ...item,
        description: item.description.trim(),
        unit: item.unit.trim(),
        quantity,
        unitPrice,
        discountAmount,
        taxAmount,
        lineTotal: money(quantity * unitPrice - discountAmount + taxAmount),
        targetType: item.targetType || 'OTHER',
        targetId: item.targetId || undefined,
        note: item.note?.trim() || undefined,
      };
    });
    const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const discountAmount = money(items.reduce((sum, item) => sum + item.discountAmount, 0));
    const taxAmount = money(items.reduce((sum, item) => sum + item.taxAmount, 0));
    return {
      ...props,
      title: props.title.trim(),
      description: props.description?.trim() || undefined,
      vendorName: props.vendorName?.trim() || undefined,
      invoiceNumber: props.invoiceNumber?.trim() || undefined,
      attachmentUrl: props.attachmentUrl?.trim() || undefined,
      currency: (props.currency || 'VND').trim().toUpperCase(),
      items,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount: money(subtotal - discountAmount + taxAmount),
    };
  }

  private static validate(props: ExpenseProps): void {
    if (!props.code.trim()) throw new Error('Mã phiếu chi không được để trống.');
    if (!props.categoryId) throw new Error('Danh mục chi phí không được để trống.');
    if (!props.title) throw new Error('Nội dung chi phí không được để trống.');
    if (props.items.length === 0) throw new Error('Phiếu chi phải có ít nhất một dòng chi tiết.');
    if (!props.currency) throw new Error('Đơn vị tiền tệ không hợp lệ.');
    for (const item of props.items) {
      if (!item.id) throw new Error('Dòng chi tiết thiếu mã định danh.');
      if (!item.description) throw new Error('Nội dung dòng chi phí không được để trống.');
      if (!item.unit) throw new Error('Đơn vị tính không được để trống.');
      if (item.quantity <= 0) throw new Error('Số lượng phải lớn hơn 0.');
      if (item.unitPrice < 0 || item.discountAmount < 0 || item.taxAmount < 0 || item.lineTotal < 0) {
        throw new Error('Giá trị tiền không được âm hoặc giảm giá vượt quá giá trị dòng.');
      }
      if (item.targetType !== 'OTHER' && !item.targetId) {
        throw new Error('Dòng chi phí liên kết tài sản phải có đối tượng cụ thể.');
      }
    }
  }
}

function money(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Giá trị tiền không hợp lệ.');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
