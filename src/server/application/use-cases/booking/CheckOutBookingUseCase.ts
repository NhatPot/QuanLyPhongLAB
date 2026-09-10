import { IAuditLogRepository } from "../../../domain/repositories/IAuditLogRepository";
import { IBookingRequestRepository } from "../../../domain/repositories/IBookingRequestRepository";
import { ICheckInOutLogRepository } from "../../../domain/repositories/ICheckInOutLogRepository";
import { IComputerRepository } from "../../../domain/repositories/IComputerRepository";
import { IComputerActivityRepository } from "../../../domain/repositories/IComputerActivityRepository";
import { IUnitOfWork } from "../../../domain/repositories/IUnitOfWork";
import { IComputerBookingRepository } from "../../../domain/repositories/IComputerBookingRepository";

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
    private computerBookings?: IComputerBookingRepository,
  ) {}

  public async execute(input: CheckOutBookingInput) {
    return this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.bookingRepo.lockAvailability(transaction);
      const booking = await this.bookingRepo.findById(
        input.bookingId,
        transaction,
      );
      if (!booking) throw new Error("Không tìm thấy yêu cầu sử dụng phòng.");
      if (booking.numberOfComputers > 0 && !input.returnCondition?.trim())
        throw new Error("Cần ghi tình trạng máy và phụ kiện khi trả.");

      const activeUsage =
        await this.computerActivityRepo.findActiveUsageByBooking(
          booking.id.toString(),
        );
      booking.complete();
      const log = await this.checkInOutLogRepo.checkOut(
        {
          bookingRequestId: booking.id.toString(),
          checkedOutBy: input.userId,
          returnCondition: input.returnCondition?.trim() || null,
          note: input.note?.trim() || null,
        },
        transaction,
      );
      const occurredAt = log.checkOutTime || new Date();
      await this.computerActivityRepo.closeUsageByBooking(
        booking.id.toString(),
        occurredAt,
        transaction,
      );
      if (this.computerBookings)
        await this.computerBookings.recordReturn(
          booking.id.toString(),
          occurredAt,
          transaction,
        );
      const computerIds = Array.from(
        new Set([
          ...activeUsage.map((a) => a.computerId),
          ...booking.computerItems
            .filter((i) => i.receivedAt && !i.returnedAt)
            .map((i) => i.computerId),
        ]),
      );

      for (const computerId of computerIds.sort()) {
        const computer = await this.computerRepo.findById(
          computerId,
          transaction,
        );
        if (!computer || computer.status !== "IN_USE") continue;
        computer.changeStatus("ACTIVE");
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition(
          {
            computerId: computer.id.toString(),
            activityType: "ACTIVE",
            occurredAt,
            performedBy: input.userId,
            note: `Hoàn tất phiên ${booking.requestCode}`,
          },
          transaction,
        );
      }

      await this.bookingRepo.save(booking, transaction);
      await this.auditLogRepo.save(
        {
          action: "BOOKING_CHECKED_OUT",
          entityName: "BookingRequest",
          entityId: booking.id.toString(),
          userId: input.userId,
          newValueJson: JSON.stringify({
            requesterId: booking.requesterId,
            checkInTime: log.checkInTime,
            checkOutTime: log.checkOutTime,
            computerIds,
            returnCondition: input.returnCondition,
          }),
        },
        transaction,
      );
      return { booking, log, computerIds };
    });
  }
}
