import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface BookingEquipmentItemProps {
  id?: string;
  bookingRequestId: string;
  equipmentId: string;
  requestedQuantity: number;
  reservedQuantity?: number;
  borrowedQuantity?: number;
  returnedGoodQuantity?: number;
  returnedBrokenQuantity?: number;
  lostQuantity?: number;
  handoverCondition?: string | null;
  returnCondition?: string | null;
  note?: string | null;
}

export class BookingEquipmentItem extends Entity<BookingEquipmentItemProps> {
  private constructor(props: BookingEquipmentItemProps, id?: string) {
    super(props, id ? new UniqueEntityId(id) : undefined);
  }

  public static create(props: BookingEquipmentItemProps): BookingEquipmentItem {
    return new BookingEquipmentItem({
      ...props,
      reservedQuantity: props.reservedQuantity || 0,
      borrowedQuantity: props.borrowedQuantity || 0,
      returnedGoodQuantity: props.returnedGoodQuantity || 0,
      returnedBrokenQuantity: props.returnedBrokenQuantity || 0,
      lostQuantity: props.lostQuantity || 0,
    }, props.id);
  }

  // Getters
  get bookingRequestId(): string {
    return this.props.bookingRequestId;
  }

  get equipmentId(): string {
    return this.props.equipmentId;
  }

  get requestedQuantity(): number {
    return this.props.requestedQuantity;
  }

  get reservedQuantity(): number {
    return this.props.reservedQuantity!;
  }

  get borrowedQuantity(): number {
    return this.props.borrowedQuantity!;
  }

  get returnedGoodQuantity(): number {
    return this.props.returnedGoodQuantity!;
  }

  get returnedBrokenQuantity(): number {
    return this.props.returnedBrokenQuantity!;
  }

  get lostQuantity(): number {
    return this.props.lostQuantity!;
  }

  get handoverCondition(): string | null {
    return this.props.handoverCondition || null;
  }

  get returnCondition(): string | null {
    return this.props.returnCondition || null;
  }

  get note(): string | null {
    return this.props.note || null;
  }

  // Domain logic
  public reserve(quantity: number): void {
    if (quantity !== this.requestedQuantity) {
      throw new Error("Số lượng giữ chỗ phải bằng số lượng yêu cầu");
    }
    this.props.reservedQuantity = quantity;
  }

  public releaseReservation(): void {
    this.props.reservedQuantity = 0;
  }

  public handover(quantity: number, condition?: string): void {
    if (quantity > this.reservedQuantity!) {
      throw new Error("Không thể mượn nhiều hơn số lượng đã đặt");
    }
    this.props.borrowedQuantity = quantity;
    this.props.reservedQuantity! -= quantity;
    
    if (condition) {
      this.props.handoverCondition = condition;
    }
  }

  public returnItem(good: number, broken: number, lost: number, condition?: string): void {
    const totalReturned = good + broken + lost;
    if (totalReturned !== this.borrowedQuantity!) {
      throw new Error("Tổng số lượng trả (bình thường, hỏng, mất) phải bằng số lượng đang mượn");
    }

    this.props.returnedGoodQuantity = good;
    this.props.returnedBrokenQuantity = broken;
    this.props.lostQuantity = lost;
    this.props.borrowedQuantity = 0;

    if (condition) {
      this.props.returnCondition = condition;
    }
  }
}
