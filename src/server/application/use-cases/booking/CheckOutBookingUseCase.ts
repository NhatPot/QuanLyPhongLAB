import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { ICheckInOutLogRepository } from '../../../domain/repositories/ICheckInOutLogRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';

export type CheckOutBookingInput = {
  bookingId: string;
  userId: string;
  returnCondition?: string;
  note?: string;
};

export class CheckOutBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private checkInOutLogRepo: ICheckInOutLogRepository,
    private computerRepo: IComputerRepository,
    private computerActivityRepo: IComputerActivityRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: CheckOutBookingInput) {
    const booking = await this.bookingRepo.findById(input.bookingId);
    if (!booking) throw new Error('Không tìm thấy yêu cầu sử dụng phòng.');

    const activeUsage = await this.computerActivityRepo.findActiveUsageByBooking(booking.id.toString());
    booking.complete();
    return this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      const log = await this.checkInOutLogRepo.checkOut({
        bookingRequestId: booking.id.toString(),
        checkedOutBy: input.userId,
        returnCondition: input.returnCondition?.trim() || null,
        note: input.note?.trim() || null,
      }, transaction);
      const occurredAt = log.checkOutTime || new Date();

      for (const activity of activeUsage) {
        const computer = await this.computerRepo.findById(activity.computerId, transaction);
        if (!computer || computer.status !== 'IN_USE') continue;
        computer.changeStatus('ACTIVE');
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition({
          computerId: computer.id.toString(),
          activityType: 'ACTIVE',
          occurredAt,
          performedBy: input.userId,
          note: `Hoàn tất phiên ${booking.requestCode}`,
        }, transaction);
      }

      await this.bookingRepo.save(booking, transaction);
      await this.auditLogRepo.save({
        action: 'BOOKING_CHECKED_OUT',
        entityName: 'BookingRequest',
        entityId: booking.id.toString(),
        userId: input.userId,
        newValueJson: JSON.stringify({ checkInTime: log.checkInTime, checkOutTime: log.checkOutTime, computerIds: activeUsage.map((item) => item.computerId) }),
      }, transaction);
      return { booking, log, computerIds: activeUsage.map((item) => item.computerId) };
    });
  }
}
