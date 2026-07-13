import { BookingEquipmentItem } from '../entities/BookingEquipmentItem';

export interface IBookingEquipmentItemRepository {
  findByBookingId(bookingId: string): Promise<BookingEquipmentItem[]>;
  saveMany(items: BookingEquipmentItem[]): Promise<void>;
  
  // Tuỳ chọn để query nâng cao nếu cần
  deleteByBookingId(bookingId: string): Promise<void>;
}
