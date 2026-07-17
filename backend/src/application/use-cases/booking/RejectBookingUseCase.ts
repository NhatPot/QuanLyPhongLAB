import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';

export class RejectBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(bookingId: string, adminId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error("Lý do từ chối là bắt buộc");
    }

    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new Error("Không tìm thấy BookingRequest");

    booking.reject(adminId, reason);

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.bookingRepo.save(booking, transaction);

      await this.auditLogRepo.save({
        action: 'BOOKING_REJECTED',
        entityId: booking.id.toString(),
        entityName: 'BookingRequest',
        userId: adminId
      }, transaction);
    });

    return booking;
  }
}
