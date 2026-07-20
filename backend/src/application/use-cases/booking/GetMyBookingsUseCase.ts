import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { attachBookingRequesters } from './BookingRequester';

export class GetMyBookingsUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository,
    private userRepo: IUserRepository,
  ) {}

  public async execute(requesterId: string) {
    const bookings = await this.bookingRepo.findByRequester(requesterId);
    
    // Nạp thiết bị (nếu cần thiết, tuỳ thuộc vào UI yêu cầu)
    for (const b of bookings) {
      const items = await this.equipmentItemRepo.findByBookingId(b.id.toString());
      b.props.equipmentItems = items;
    }
    
    return attachBookingRequesters(bookings, this.userRepo);
  }
}
