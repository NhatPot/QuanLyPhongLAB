import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { BookingRequest, BookingType } from '../../../domain/entities/BookingRequest';
import { BookingEquipmentItem } from '../../../domain/entities/BookingEquipmentItem';
import { CheckAvailabilityUseCase } from './CheckAvailabilityUseCase';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError';

export type CreateBookingInput = {
  actorUserId: string;
  actorRoles: string[];
  actorPermissions: string[];
  requesterId?: string;
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
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
};

export class CreateBookingUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private bookingEqItemRepo: IBookingEquipmentItemRepository,
    private checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private userRepo: IUserRepository,
  ) {}

  public async execute(input: CreateBookingInput): Promise<BookingRequest> {
    const requesterId = input.requesterId || input.actorUserId;
    const isCreatingForAnotherUser = requesterId !== input.actorUserId;
    const canCreateForUser = input.actorRoles.includes('ADMIN')
      || input.actorPermissions.includes('BOOKING_CREATE_FOR_USER');

    if (isCreatingForAnotherUser && !canCreateForUser) {
      throw new ForbiddenError('Bạn không có quyền đăng ký sử dụng thay cho người khác.');
    }

    const requester = await this.userRepo.findById(requesterId);
    if (!requester) {
      throw new NotFoundError('Không tìm thấy người đăng ký được chọn.');
    }
    if (requester.status !== 'ACTIVE') {
      throw new BusinessRuleError(
        'Chỉ có thể tạo yêu cầu cho tài khoản đang hoạt động.',
        'BOOKING_REQUESTER_INACTIVE',
      );
    }

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
      throw new BusinessRuleError(
        'Không thể đặt lịch: ' + availResult.reasons.map(r => r.message).join(', '),
        availResult.reasons[0]?.code || 'BOOKING_UNAVAILABLE',
      );
    }

    // 2. Generate RequestCode (e.g., BR-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `BR-${dateStr}-${randomCode}`;

    // 3. Create Entities
    const booking = BookingRequest.create({
      requestCode,
      requesterId,
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
        userId: input.actorUserId,
        newValueJson: JSON.stringify({
          requesterId,
          requesterName: requester.fullName,
          createdForAnotherUser: isCreatingForAnotherUser,
        }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return booking;
  }
}
