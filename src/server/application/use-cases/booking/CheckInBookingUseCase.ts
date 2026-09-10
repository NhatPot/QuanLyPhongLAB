import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { ICheckInOutLogRepository } from '../../../domain/repositories/ICheckInOutLogRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';

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
  ) {}

  public async execute(input: CheckInBookingInput) {
    const booking = await this.bookingRepo.findById(input.bookingId);
    if (!booking) throw new Error('Không tìm thấy yêu cầu sử dụng phòng.');

    const actualPeopleCount = input.actualPeopleCount ?? booking.numberOfPeople;
    const computerIds = Array.from(new Set(input.computerIds || []));
    const actualComputerCount = computerIds.length;
    if (!Number.isInteger(actualPeopleCount) || actualPeopleCount < 0) throw new Error('Số người check-in không hợp lệ.');
    if (input.computerIds && computerIds.length !== input.computerIds.length) throw new Error('Danh sách máy check-in bị trùng lặp.');
    if (input.actualComputerCount !== undefined && input.actualComputerCount !== actualComputerCount) throw new Error('Số máy thực tế không khớp với danh sách máy đã chọn.');
    if (booking.numberOfComputers > 0 && computerIds.length === 0) throw new Error('Cần chọn cụ thể các máy tính được sử dụng.');

    const computers = await Promise.all(computerIds.map(async (computerId) => {
      const computer = await this.computerRepo.findById(computerId);
      if (!computer) throw new Error('Không tìm thấy một máy tính trong danh sách check-in.');
      if (computer.status !== 'ACTIVE') throw new Error(`Máy ${computer.code} không ở trạng thái sẵn sàng.`);
      return computer;
    }));

    booking.checkIn();
    return this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      const items = await this.equipmentItems.findByBookingId(booking.id.toString());
      for (const item of items) {
        const equipment = await this.equipmentRepo.findById(item.equipmentId, transaction);
        if (!equipment?.isLendable || equipment.status !== 'ACTIVE') throw new Error('Một thiết bị không còn được phép cho mượn. Không thể bàn giao.');
      }
      const log = await this.checkInOutLogRepo.checkIn({
        bookingRequestId: booking.id.toString(),
        checkedInBy: input.userId,
        actualPeopleCount,
        actualComputerCount,
        initialCondition: input.initialCondition?.trim() || null,
        note: input.note?.trim() || null,
      }, transaction);
      const occurredAt = log.checkInTime || new Date();

      for (const selectedComputer of computers) {
        const computer = await this.computerRepo.findById(selectedComputer.id.toString(), transaction);
        if (!computer || computer.status !== 'ACTIVE') throw new Error(`Máy ${selectedComputer.code} không còn ở trạng thái sẵn sàng.`);
        computer.changeStatus('IN_USE');
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition({
          computerId: computer.id.toString(),
          activityType: 'IN_USE',
          occurredAt,
          bookingRequestId: booking.id.toString(),
          performedBy: input.userId,
          note: booking.purpose,
        }, transaction);
      }

      await this.bookingRepo.save(booking, transaction);
      await this.auditLogRepo.save({
        action: 'BOOKING_CHECKED_IN',
        entityName: 'BookingRequest',
        entityId: booking.id.toString(),
        userId: input.userId,
        newValueJson: JSON.stringify({ checkInTime: log.checkInTime, actualPeopleCount, actualComputerCount, computerIds }),
      }, transaction);
      return { booking, log, computerIds };
    });
  }
}
