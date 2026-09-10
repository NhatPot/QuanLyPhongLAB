import { IAuditLogRepository } from "../../../domain/repositories/IAuditLogRepository";
import { IBookingRequestRepository } from "../../../domain/repositories/IBookingRequestRepository";
import { ICheckInOutLogRepository } from "../../../domain/repositories/ICheckInOutLogRepository";
import { IComputerRepository } from "../../../domain/repositories/IComputerRepository";
import { IComputerActivityRepository } from "../../../domain/repositories/IComputerActivityRepository";
import { IUnitOfWork } from "../../../domain/repositories/IUnitOfWork";
import { IEquipmentRepository } from "../../../domain/repositories/IEquipmentRepository";
import { IBookingEquipmentItemRepository } from "../../../domain/repositories/IBookingEquipmentItemRepository";
import { IComputerBookingRepository } from "../../../domain/repositories/IComputerBookingRepository";

export type CheckInBookingInput = {
  bookingId: string;
  userId: string;
  actualPeopleCount?: number;
  actualComputerCount?: number;
  computerIds?: string[];
  initialCondition?: string;
  note?: string;
};

export class CheckInBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private checkInOutLogRepo: ICheckInOutLogRepository,
    private computerRepo: IComputerRepository,
    private computerActivityRepo: IComputerActivityRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private equipmentRepo: IEquipmentRepository,
    private equipmentItems: IBookingEquipmentItemRepository,
    private computerBookings?: IComputerBookingRepository,
  ) {}

  async execute(input: CheckInBookingInput) {
    return this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.bookingRepo.lockAvailability(transaction);
      const booking = await this.bookingRepo.findById(
        input.bookingId,
        transaction,
      );
      if (!booking) throw new Error("Không tìm thấy yêu cầu sử dụng phòng.");
      if (booking.status !== "APPROVED")
        throw new Error("Chỉ bàn giao yêu cầu đã được duyệt.");
      const now = new Date();
      if (
        now.getTime() < booking.startTime.getTime() - 15 * 60000 ||
        now >= booking.endTime
      )
        throw new Error(
          "Chỉ nhận máy từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc đã đăng ký.",
        );
      const assignedIds = booking.computerItems.map((c) => c.computerId);
      const computerIds = input.computerIds ?? assignedIds;
      if (
        new Set(computerIds.map((id) => id.toLowerCase())).size !==
          computerIds.length ||
        computerIds.length !== booking.numberOfComputers
      )
        throw new Error("Phải bàn giao đủ và đúng số máy đã đăng ký.");
      if (
        assignedIds.length &&
        (computerIds.length !== assignedIds.length ||
          computerIds.some(
            (id) =>
              !assignedIds.some((a) => a.toLowerCase() === id.toLowerCase()),
          ))
      )
        throw new Error(
          "Phải bàn giao đúng mã máy đã đăng ký; không được tự đổi sang máy khác.",
        );
      if (
        input.actualComputerCount !== undefined &&
        input.actualComputerCount !== computerIds.length
      )
        throw new Error("Số máy thực tế không khớp danh sách máy.");
      const actualPeopleCount =
        input.actualPeopleCount ?? booking.numberOfPeople;
      if (
        !Number.isInteger(actualPeopleCount) ||
        actualPeopleCount < 1 ||
        actualPeopleCount > booking.numberOfPeople
      )
        throw new Error(
          "Số người nhận phòng không hợp lệ hoặc vượt số đã đăng ký.",
        );
      if (computerIds.length) {
        if (!input.initialCondition?.trim())
          throw new Error("Cần ghi tình trạng máy và phụ kiện khi bàn giao.");
        if (!this.computerBookings)
          throw new Error("Chức năng bàn giao máy chưa được cấu hình.");
        const availability = await this.computerBookings.listAvailability(
          now,
          booking.endTime,
          booking.id.toString(),
          transaction,
        );
        if (
          computerIds.some(
            (id) =>
              !availability.some(
                (c) => c.id.toLowerCase() === id.toLowerCase() && c.available,
              ),
          )
        )
          throw new Error(
            "Một máy chưa được trả hoặc không sẵn sàng trong giờ bàn giao.",
          );
      }
      const items = await this.equipmentItems.findByBookingId(
        booking.id.toString(),
      );
      for (const item of items) {
        const equipment = await this.equipmentRepo.findById(
          item.equipmentId,
          transaction,
        );
        if (!equipment?.isLendable || equipment.status !== "ACTIVE")
          throw new Error(
            "Một thiết bị không còn được phép cho mượn. Không thể bàn giao.",
          );
      }
      // Legacy requests receive their first explicit assignment at handover.
      if (computerIds.length && !assignedIds.length)
        await this.computerBookings!.saveSelection(
          booking.id.toString(),
          computerIds,
          booking.requesterId,
          input.userId,
          transaction,
        );
      booking.checkIn();
      const log = await this.checkInOutLogRepo.checkIn(
        {
          bookingRequestId: booking.id.toString(),
          checkedInBy: input.userId,
          actualPeopleCount,
          actualComputerCount: computerIds.length,
          initialCondition: input.initialCondition?.trim() || null,
          note: input.note?.trim() || null,
        },
        transaction,
      );
      const occurredAt = log.checkInTime || now;
      for (const id of [...computerIds].sort()) {
        const computer = await this.computerRepo.findById(id, transaction);
        if (!computer || computer.status !== "ACTIVE")
          throw new Error("Máy không còn sẵn sàng. Vui lòng kiểm tra lại.");
        computer.changeStatus("IN_USE");
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition(
          {
            computerId: id,
            activityType: "IN_USE",
            occurredAt,
            bookingRequestId: booking.id.toString(),
            performedBy: input.userId,
            note: booking.purpose,
          },
          transaction,
        );
      }
      if (computerIds.length)
        await this.computerBookings!.recordReceipt(
          booking.id.toString(),
          occurredAt,
          transaction,
        );
      await this.bookingRepo.save(booking, transaction);
      await this.auditLogRepo.save(
        {
          action: "BOOKING_CHECKED_IN",
          entityName: "BookingRequest",
          entityId: booking.id.toString(),
          userId: input.userId,
          newValueJson: JSON.stringify({
            requesterId: booking.requesterId,
            computerIds,
            checkInTime: occurredAt,
            actualPeopleCount,
            initialCondition: input.initialCondition,
          }),
        },
        transaction,
      );
      return { booking, log, computerIds };
    });
  }
}
