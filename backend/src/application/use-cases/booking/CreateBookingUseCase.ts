import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { BookingRequest, BookingType } from '../../../domain/entities/BookingRequest';
import { BookingEquipmentItem } from '../../../domain/entities/BookingEquipmentItem';
import { CheckAvailabilityUseCase } from './CheckAvailabilityUseCase';

export type CreateBookingInput = {
  requesterId: string;
  bookingType: BookingType;
  purpose: string;
  startTime: Date;
  endTime: Date;
  expectedReturnTime?: Date | null;
  numberOfPeople: number;
  numberOfComputers: number;
  equipments: Array<{
    equipmentId: string;
    quantity: number;
  }>;
  note?: string;
};

export class CreateBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private bookingEqItemRepo: IBookingEquipmentItemRepository,
    private checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: CreateBookingInput): Promise<BookingRequest> {
    // 1. Check availability
    const availResult = await this.checkAvailabilityUseCase.execute({
      bookingType: input.bookingType,
      startTime: input.startTime,
      endTime: input.endTime,
      numberOfPeople: input.numberOfPeople,
      numberOfComputers: input.numberOfComputers,
      equipments: input.equipments
    });

    if (!availResult.available) {
      throw new Error("Không thể đặt lịch: " + availResult.reasons.map(r => r.message).join(', '));
    }

    // 2. Generate RequestCode (e.g., BR-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `BR-${dateStr}-${randomCode}`;

    // 3. Create Entities
    const booking = BookingRequest.create({
      requestCode,
      requesterId: input.requesterId,
      bookingType: input.bookingType,
      purpose: input.purpose,
      startTime: input.startTime,
      endTime: input.endTime,
      expectedReturnTime: input.expectedReturnTime,
      numberOfPeople: input.numberOfPeople,
      numberOfComputers: input.numberOfComputers,
      status: 'DRAFT',
      note: input.note
    });
    booking.submit(); // Chuyển sang PENDING

    const equipmentItems = input.equipments.map(eq => {
      return BookingEquipmentItem.create({
        bookingRequestId: booking.id.toString(),
        equipmentId: eq.equipmentId,
        requestedQuantity: eq.quantity
      });
    });

    // 4. Save in transaction
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.bookingRepo.save(booking, transaction);
      await this.bookingEqItemRepo.saveMany(equipmentItems, transaction);
      
      await this.auditLogRepo.save({
        action: 'BOOKING_CREATED',
        entityName: 'BookingRequest',
        entityId: booking.id.toString(),
        userId: input.requesterId
      }, transaction);
    });

    return booking;
  }
}
