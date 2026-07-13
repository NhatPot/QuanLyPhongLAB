import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';

export class ListPendingBookingsUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository
  ) {}

  public async execute() {
    const bookings = await this.bookingRepo.findPending();
    
    // Nạp thêm thiết bị
    for (const b of bookings) {
      const items = await this.equipmentItemRepo.findByBookingId(b.id.toString());
      b.props.equipmentItems = items;
    }
    
    return bookings;
  }
}
