import { BookingRequest } from '../entities/BookingRequest';

export interface IBookingRequestRepository {
  lockAvailability(transaction: any): Promise<void>;
  findById(id: string, transaction?: any): Promise<BookingRequest | null>;
  findByRequestCode(code: string): Promise<BookingRequest | null>;
  
  // Lưu mới hoặc cập nhật
  save(booking: BookingRequest, transaction?: any): Promise<void>;
  
  // List queries
  findPending(): Promise<BookingRequest[]>;
  findByRequester(requesterId: string): Promise<BookingRequest[]>;
  
  // Dành cho dashboard / calendar
  findApprovedByDateRange(startDate: Date, endDate: Date): Promise<BookingRequest[]>;
  
  // General filter (tùy theo nhu cầu của MVP)
  list(filter?: any): Promise<BookingRequest[]>;
}
