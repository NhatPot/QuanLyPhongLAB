import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { CheckAvailabilityUseCase } from './CheckAvailabilityUseCase';

export class ApproveBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository,
    private checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(bookingId: string, adminId: string) {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new Error("Không tìm thấy BookingRequest");

    if (booking.status !== 'PENDING') {
      throw new Error("Chỉ có thể duyệt Booking đang ở trạng thái PENDING");
    }

    const items = await this.equipmentItemRepo.findByBookingId(bookingId);
    booking.props.equipmentItems = items;

    // 1. Kiểm tra lại khả năng đáp ứng (Re-check availability)
    const availResult = await this.checkAvailabilityUseCase.execute({
      bookingType: booking.bookingType,
      startTime: booking.startTime,
      endTime: booking.endTime,
      numberOfPeople: booking.numberOfPeople,
      numberOfComputers: booking.numberOfComputers,
      equipments: items.map(item => ({ equipmentId: item.equipmentId, quantity: item.requestedQuantity })),
      excludeBookingId: booking.id.toString()
    });

    if (!availResult.available) {
      throw new Error("Không thể duyệt: Tài nguyên không còn đủ đáp ứng (" + availResult.reasons.map(r => r.message).join(', ') + ")");
    }

    // 2. Chuyển trạng thái và Reserve thiết bị
    booking.approve(adminId);
    
    for (const item of items) {
      item.reserve(item.requestedQuantity);
    }

    // 3. Save trong transaction
    await this.uow.complete(async () => {
      await this.bookingRepo.save(booking);
      await this.equipmentItemRepo.saveMany(items);

      await this.auditLogRepo.save({
        action: 'BOOKING_APPROVED',
        entityId: booking.id.toString(),
        entityName: 'BookingRequest',
        userId: adminId
      });
    });

    return booking;
  }
}
