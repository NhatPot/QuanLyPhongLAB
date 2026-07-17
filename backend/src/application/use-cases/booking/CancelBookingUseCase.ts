import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';

export class CancelBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private equipmentItemRepo: IBookingEquipmentItemRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(bookingId: string, userId: string, role: string, reason?: string) {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) throw new Error("Không tìm thấy BookingRequest");

    const isOwner = booking.requesterId === userId;
    const isAdmin = role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new Error("Bạn không có quyền huỷ Booking này");
    }

    // Nạp thiết bị để có thể giải phóng
    const items = await this.equipmentItemRepo.findByBookingId(bookingId);
    booking.props.equipmentItems = items;

    if (isAdmin && !isOwner) {
      if (!reason) throw new Error("Admin huỷ booking bắt buộc phải nhập lý do");
      booking.cancelByAdmin(userId, reason);
    } else {
      booking.cancelByRequester(reason);
    }

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.bookingRepo.save(booking, transaction);
      await this.equipmentItemRepo.saveMany(items, transaction);

      await this.auditLogRepo.save({
        action: isAdmin && !isOwner ? 'BOOKING_ADMIN_CANCELLED' : 'BOOKING_CANCELLED',
        entityId: booking.id.toString(),
        entityName: 'BookingRequest',
        userId: userId
      }, transaction);
    });

    return booking;
  }
}
