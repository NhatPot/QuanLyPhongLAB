import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IBookingEquipmentItemRepository } from '../../../domain/repositories/IBookingEquipmentItemRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { BookingRequest, BookingType } from '../../../domain/entities/BookingRequest';
import { BookingEquipmentItem } from '../../../domain/entities/BookingEquipmentItem';
import { CheckAvailabilityUseCase } from './CheckAvailabilityUseCase';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { BookingPurposeGroup } from '../../../domain/entities/BookingPurposeGroup';
import { IBookingPurposeGroupRepository } from '../../../domain/repositories/IBookingPurposeGroupRepository';
import { findMatchingPurposeGroup, normalizePurposeKey, purposeGroupCode } from './purpose-normalization';
import { BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { IComputerBookingRepository } from '../../../domain/repositories/IComputerBookingRepository';

export type CreateBookingInput = {
  actorUserId: string;
  actorRoles: string[];
  actorPermissions: string[];
  requesterId?: string;
  bookingType: BookingType;
  purpose: string;
  purposeGroupId?: string;
  startTime: Date;
  endTime: Date;
  expectedReturnTime?: Date | null;
  numberOfPeople: number;
  numberOfComputers: number;
  computerIds?: string[];
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
    private purposeGroupRepo?: IBookingPurposeGroupRepository,
    private computerBookings?: IComputerBookingRepository,
  ) {}

  public async execute(input: CreateBookingInput): Promise<BookingRequest> {
    const computerIds = input.computerIds ?? [];
    if (!Array.isArray(computerIds) || computerIds.length > 200 || computerIds.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) || new Set(computerIds.map(id => id.toLowerCase())).size !== computerIds.length) throw new ValidationError('Danh sách mã máy không hợp lệ hoặc bị trùng.');
    if (computerIds.length !== input.numberOfComputers || (input.bookingType === 'COMPUTERS_ONLY' && !computerIds.length) || (input.bookingType === 'EQUIPMENT_ONLY' && computerIds.length)) throw new ValidationError('Hãy chọn đúng từng máy cần đăng ký. Số máy phải khớp danh sách đã chọn.');
    if (computerIds.length && !this.computerBookings) throw new BusinessRuleError('Chức năng chọn máy chưa được cấu hình.', 'COMPUTER_BOOKING_UNAVAILABLE');
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

    if (input.bookingType === 'EQUIPMENT_ONLY' && input.equipments.length === 0) {
      throw new ValidationError('Yêu cầu mượn thiết bị phải có ít nhất một thiết bị.');
    }

    // 1. Check availability
    const availResult = await this.checkAvailabilityUseCase.execute({
      bookingType: input.bookingType,
      startTime: input.startTime,
      endTime: input.endTime,
      numberOfPeople: input.numberOfPeople,
      numberOfComputers: input.numberOfComputers,
      computerIds,
      equipments: input.equipments
    });

    if (!availResult.available) {
      throw new BusinessRuleError(
        'Không thể đặt lịch: ' + availResult.reasons.map(r => r.message).join(', '),
        availResult.reasons[0]?.code || 'BOOKING_UNAVAILABLE',
      );
    }

    const purposeGroup = await this.resolvePurposeGroup(input.purpose, input.purposeGroupId);

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
      purposeGroupId: purposeGroup?.id.toString() || null,
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
      if (computerIds.length) {
        await this.computerBookings!.saveSelection(booking.id.toString(), computerIds, requesterId, input.actorUserId, transaction);
        booking.props.computerItems = await this.computerBookings!.findByBooking(booking.id.toString(), transaction);
      }
      
      await this.auditLogRepo.save({
        action: 'BOOKING_CREATED',
        entityName: 'BookingRequest',
        entityId: booking.id.toString(),
        userId: input.actorUserId,
        newValueJson: JSON.stringify({
          requesterId,
          requesterName: requester.fullName,
          computerIds,
          startTime: input.startTime,
          endTime: input.endTime,
          createdForAnotherUser: isCreatingForAnotherUser,
        }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return booking;
  }

  private async resolvePurposeGroup(purpose: string, purposeGroupId?: string): Promise<BookingPurposeGroup | null> {
    if (!this.purposeGroupRepo) return null;

    try {
      if (purposeGroupId) {
        const selected = await this.purposeGroupRepo.findById(purposeGroupId);
        if (!selected) throw new ValidationError('Nhóm mục đích không tồn tại hoặc đã ngừng sử dụng.');
        return selected;
      }

      const groups = await this.purposeGroupRepo.list();
      const matching = findMatchingPurposeGroup(purpose, groups);
      if (matching) return matching;

      const normalizedKey = normalizePurposeKey(purpose);
      const group = BookingPurposeGroup.create({
        code: purposeGroupCode(normalizedKey),
        name: purpose.trim().replace(/\s+/g, ' ').slice(0, 255),
        normalizedKey,
      });
      await this.purposeGroupRepo.save(group);
      return group;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      console.warn('[CreateBookingUseCase] Không thể resolve purpose group, bỏ qua:', (error as Error).message);
      return null;
    }
  }
}
