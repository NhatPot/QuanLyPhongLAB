import { Entity } from './Entity';
import { BookingEquipmentItem } from './BookingEquipmentItem';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type BookingType = 'FULL_LAB' | 'COMPUTERS_ONLY' | 'EQUIPMENT_ONLY';
export type BookingStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CHECKED_IN' | 'COMPLETED';

export interface BookingRequestProps {
  id?: string;
  requestCode: string;
  requesterId: string;
  bookingType: BookingType;
  purpose: string;
  purposeGroupId?: string | null;
  startTime: Date;
  endTime: Date;
  expectedReturnTime?: Date | null;
  numberOfPeople: number;
  numberOfComputers: number;
  status: BookingStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  isOverdue?: boolean;
  hasIncident?: boolean;
  note?: string | null;
  rowVersion?: Buffer;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Quan hệ 1-N (có thể load lên khi cần)
  equipmentItems?: BookingEquipmentItem[];
}

export class BookingRequest extends Entity<BookingRequestProps> {
  private constructor(props: BookingRequestProps, id?: string) {
    super(props, id ? new UniqueEntityId(id) : undefined);
  }

  public static create(props: BookingRequestProps): BookingRequest {
    if (props.startTime >= props.endTime) {
      throw new Error("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
    }

    if (props.numberOfPeople <= 0) {
      throw new Error("Số lượng người tham gia phải lớn hơn 0");
    }

    if (props.numberOfComputers < 0) {
      throw new Error("Số lượng máy tính không hợp lệ");
    }

    return new BookingRequest({
      ...props,
      isOverdue: props.isOverdue || false,
      hasIncident: props.hasIncident || false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      equipmentItems: props.equipmentItems || []
    }, props.id);
  }

  // Getters
  get requestCode(): string { return this.props.requestCode; }
  get requesterId(): string { return this.props.requesterId; }
  get bookingType(): BookingType { return this.props.bookingType; }
  get purpose(): string { return this.props.purpose; }
  get purposeGroupId(): string | null { return this.props.purposeGroupId || null; }
  get startTime(): Date { return this.props.startTime; }
  get endTime(): Date { return this.props.endTime; }
  get expectedReturnTime(): Date | null { return this.props.expectedReturnTime || null; }
  get numberOfPeople(): number { return this.props.numberOfPeople; }
  get numberOfComputers(): number { return this.props.numberOfComputers; }
  get status(): BookingStatus { return this.props.status; }
  get approvedBy(): string | null { return this.props.approvedBy || null; }
  get approvedAt(): Date | null { return this.props.approvedAt || null; }
  get rejectedReason(): string | null { return this.props.rejectedReason || null; }
  get cancelledBy(): string | null { return this.props.cancelledBy || null; }
  get cancelledAt(): Date | null { return this.props.cancelledAt || null; }
  get cancellationReason(): string | null { return this.props.cancellationReason || null; }
  get isOverdue(): boolean { return this.props.isOverdue!; }
  get hasIncident(): boolean { return this.props.hasIncident!; }
  get note(): string | null { return this.props.note || null; }
  get rowVersion(): Buffer | undefined { return this.props.rowVersion; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get equipmentItems(): BookingEquipmentItem[] { return this.props.equipmentItems!; }

  // State transitions
  public submit(): void {
    if (this.status !== 'DRAFT') throw new Error("Chỉ có thể submit từ trạng thái DRAFT");
    this.props.status = 'PENDING';
    this.touch();
  }

  public approve(adminId: string): void {
    if (this.status !== 'PENDING') throw new Error("Chỉ có thể duyệt khi ở trạng thái PENDING");
    this.props.status = 'APPROVED';
    this.props.approvedBy = adminId;
    this.props.approvedAt = new Date();
    this.touch();
  }

  public reject(adminId: string, reason: string): void {
    if (this.status !== 'PENDING') throw new Error("Chỉ có thể từ chối khi ở trạng thái PENDING");
    if (!reason || reason.trim().length === 0) throw new Error("Phải có lý do từ chối");
    this.props.status = 'REJECTED';
    this.props.rejectedReason = reason;
    this.props.approvedBy = adminId; // Vẫn lưu adminId để biết ai từ chối
    this.props.approvedAt = new Date();
    this.touch();
  }

  public cancelByRequester(reason?: string): void {
    if (this.status !== 'PENDING' && this.status !== 'APPROVED') {
      throw new Error("Chỉ có thể hủy khi chưa Check-in");
    }
    this.props.status = 'CANCELLED';
    this.props.cancelledBy = this.requesterId;
    this.props.cancelledAt = new Date();
    if (reason) this.props.cancellationReason = reason;
    
    // Nếu huỷ khi đã duyệt, phải giải phóng thiết bị
    if (this.equipmentItems) {
      this.equipmentItems.forEach(item => item.releaseReservation());
    }
    this.touch();
  }

  public cancelByAdmin(adminId: string, reason: string): void {
    if (this.status !== 'PENDING' && this.status !== 'APPROVED') {
      throw new Error("Không thể hủy booking đã Check-in bằng chức năng này");
    }
    if (!reason) throw new Error("Bắt buộc phải nhập lý do hủy");
    this.props.status = 'CANCELLED';
    this.props.cancelledBy = adminId;
    this.props.cancelledAt = new Date();
    this.props.cancellationReason = reason;
    
    if (this.equipmentItems) {
      this.equipmentItems.forEach(item => item.releaseReservation());
    }
    this.touch();
  }

  public checkIn(): void {
    if (this.status !== 'APPROVED') {
      throw new Error("Chỉ có thể Check-in các booking đã duyệt");
    }
    this.props.status = 'CHECKED_IN';
    this.touch();
  }

  public complete(): void {
    if (this.status !== 'CHECKED_IN') {
      throw new Error("Booking chưa Check-in không thể Complete");
    }
    this.props.status = 'COMPLETED';
    this.touch();
  }

  public markOverdue(): void {
    this.props.isOverdue = true;
    this.touch();
  }

  public markIncident(): void {
    this.props.hasIncident = true;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
