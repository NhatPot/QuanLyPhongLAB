import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';

export class GetBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository
  ) {}

  public async execute(id: string, userId: string, role: string) {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) throw new Error("Không tìm thấy BookingRequest");

    // Scope check
    // Teacher chỉ được xem của mình, trừ khi là Admin/LabStaff
    if (role !== 'ADMIN' && role !== 'LAB_STAFF' && booking.requesterId !== userId) {
      throw new Error("Bạn không có quyền xem Booking này");
    }

    const items = await this.equipmentItemRepo.findByBookingId(id);
    booking.props.equipmentItems = items; // Gắn vào entity để trả về
    return booking;
  }
}
