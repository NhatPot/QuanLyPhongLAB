import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { attachBookingRequesters } from './BookingRequester';

export class ListPendingBookingsUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository,
    private userRepo: IUserRepository,
  ) {}

  public async execute() {
    const bookings = await this.bookingRepo.findPending();
    
    // Nạp thêm thiết bị
    for (const b of bookings) {
      const items = await this.equipmentItemRepo.findByBookingId(b.id.toString());
      b.props.equipmentItems = items;
    }
    
    return attachBookingRequesters(bookings, this.userRepo);
  }
}
