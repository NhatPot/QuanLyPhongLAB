import { BookingEquipmentItem } from '../entities/BookingEquipmentItem';
import type mssql from 'mssql';

export interface IBookingEquipmentItemRepository {
  findByBookingId(bookingId: string): Promise<BookingEquipmentItem[]>;
  saveMany(items: BookingEquipmentItem[], transaction?: mssql.Transaction): Promise<void>;
  
  // Tuỳ chọn để query nâng cao nếu cần
  deleteByBookingId(bookingId: string): Promise<void>;
}
