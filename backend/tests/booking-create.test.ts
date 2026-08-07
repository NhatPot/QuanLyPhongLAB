import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validate as validateUuid } from 'uuid';
import { CreateBookingUseCase } from '../src/application/use-cases/booking/CreateBookingUseCase';
import { BookingRequest } from '../src/domain/entities/BookingRequest';
import { BookingEquipmentItem } from '../src/domain/entities/BookingEquipmentItem';
import { BookingPurposeGroup } from '../src/domain/entities/BookingPurposeGroup';
import { SqlBookingRequestRepository } from '../src/infrastructure/database/sqlserver/repositories/SqlBookingRequestRepository';
import { SqlBookingEquipmentItemRepository } from '../src/infrastructure/database/sqlserver/repositories/SqlBookingEquipmentItemRepository';

describe('CreateBookingUseCase', () => {
  const requesterId = 'f8e749cf-3b73-48c7-9713-49696e308a93';
  const transaction = { name: 'booking-transaction' };
  let bookingRepo: any;
  let equipmentItemRepo: any;
  let availability: any;
  let unitOfWork: any;
  let auditLogRepo: any;
  let userRepo: any;
  let purposeGroupRepo: any;
  let useCase: CreateBookingUseCase;

  beforeEach(() => {
    bookingRepo = { save: vi.fn() };
    equipmentItemRepo = { saveMany: vi.fn() };
    availability = { execute: vi.fn().mockResolvedValue({ available: true, reasons: [] }) };
    unitOfWork = {
      complete: vi.fn(async (work: () => Promise<unknown>) => work()),
      getTransaction: vi.fn(() => transaction),
    };
    auditLogRepo = { save: vi.fn() };
    userRepo = {
      findById: vi.fn().mockResolvedValue({
        id: { toString: () => requesterId },
        fullName: 'Giảng viên Test',
        status: 'ACTIVE',
      }),
    };
    purposeGroupRepo = {
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      listSuggestions: vi.fn(),
    };
    useCase = new CreateBookingUseCase(bookingRepo, equipmentItemRepo, availability, unitOfWork, auditLogRepo, userRepo, purposeGroupRepo);
  });

  it('tạo yêu cầu của giáo viên với UUID hợp lệ và chỉ lưu booking một lần', async () => {
    const booking = await useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'COMPUTERS_ONLY',
      purpose: 'Thực hành mạng máy tính',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 2,
      equipments: [],
    });

    expect(validateUuid(booking.id.toString())).toBe(true);
    expect(booking.status).toBe('PENDING');
    expect(bookingRepo.save).toHaveBeenCalledTimes(1);
    expect(bookingRepo.save).toHaveBeenCalledWith(booking, transaction);
    expect(equipmentItemRepo.saveMany).toHaveBeenCalledWith([], transaction);
    expect(auditLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BOOKING_CREATED',
        entityId: booking.id.toString(),
        userId: requesterId,
      }),
      transaction,
    );
  });

  it('không cho người dùng thường giả mạo người đăng ký khác', async () => {
    await expect(useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      requesterId: '99f91d27-91a3-45e2-9580-421dad7a7892',
      bookingType: 'FULL_LAB',
      purpose: 'Đăng ký trái phép',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 2,
      equipments: [],
    })).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });

    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
  });

  it('lưu danh sách thiết bị và số lượng khi chỉ mượn thiết bị', async () => {
    const equipmentId = '8e49a188-ac9b-452c-ad39-63082256d70e';

    const booking = await useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'EQUIPMENT_ONLY',
      purpose: 'Mượn bộ ESP IoT thực hành',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 1,
      numberOfComputers: 0,
      equipments: [{ equipmentId, quantity: 3 }],
    });

    const savedItems = equipmentItemRepo.saveMany.mock.calls[0][0] as BookingEquipmentItem[];
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].bookingRequestId).toBe(booking.id.toString());
    expect(savedItems[0].equipmentId).toBe(equipmentId);
    expect(savedItems[0].requestedQuantity).toBe(3);
  });

  it('từ chối yêu cầu chỉ mượn thiết bị nhưng không có thiết bị', async () => {
    await expect(useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'EQUIPMENT_ONLY',
      purpose: 'Mượn thiết bị thực hành',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 1,
      numberOfComputers: 0,
      equipments: [],
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });

    expect(availability.execute).not.toHaveBeenCalled();
    expect(bookingRepo.save).not.toHaveBeenCalled();
  });

  it('gom các mục đích gần giống nhau vào cùng nhóm', async () => {
    const first = await useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'FULL_LAB',
      purpose: 'Nghiên cứu môn IoT',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 2,
      equipments: [],
    });
    const createdGroup = purposeGroupRepo.save.mock.calls[0][0] as BookingPurposeGroup;
    purposeGroupRepo.list.mockResolvedValue([createdGroup]);

    const second = await useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'FULL_LAB',
      purpose: 'Học môn IoT',
      startTime: new Date('2026-07-18T04:30:00.000Z'),
      endTime: new Date('2026-07-18T06:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 2,
      equipments: [],
    });

    expect(first.purposeGroupId).toBe(createdGroup.id.toString());
    expect(second.purposeGroupId).toBe(createdGroup.id.toString());
    expect(createdGroup.normalizedKey).toBe('iot');
    expect(purposeGroupRepo.save).toHaveBeenCalledTimes(1);
  });

  it('cho phép nhân viên có quyền đăng ký thay và audit đúng người thao tác', async () => {
    const targetId = '99f91d27-91a3-45e2-9580-421dad7a7892';
    userRepo.findById.mockResolvedValue({
      id: { toString: () => targetId },
      fullName: 'Người dùng được đăng ký thay',
      status: 'ACTIVE',
    });

    const booking = await useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['LAB_STAFF'],
      actorPermissions: ['BOOKING_CREATE', 'BOOKING_CREATE_FOR_USER'],
      requesterId: targetId,
      bookingType: 'FULL_LAB',
      purpose: 'Đăng ký thay giảng viên',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 20,
      numberOfComputers: 20,
      equipments: [],
    });

    expect(booking.requesterId).toBe(targetId);
    expect(auditLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: requesterId,
        newValueJson: expect.stringContaining(targetId),
      }),
      transaction,
    );
  });

  it('từ chối tạo booking cho tài khoản không hoạt động', async () => {
    userRepo.findById.mockResolvedValue({
      id: { toString: () => requesterId },
      fullName: 'Tài khoản bị khóa',
      status: 'LOCKED',
    });

    await expect(useCase.execute({
      actorUserId: requesterId,
      actorRoles: ['TEACHER'],
      actorPermissions: ['BOOKING_CREATE'],
      bookingType: 'COMPUTERS_ONLY',
      purpose: 'Thực hành mạng máy tính',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 2,
      equipments: [],
    })).rejects.toMatchObject({ code: 'BOOKING_REQUESTER_INACTIVE', statusCode: 422 });

    expect(availability.execute).not.toHaveBeenCalled();
  });
});

describe('SQL booking UUID serialization', () => {
  it('chuyển ID booking và booking equipment thành chuỗi UUID trước khi gửi SQL Server', () => {
    const booking = BookingRequest.create({
      requestCode: 'BR-20260718-1001',
      requesterId: 'f8e749cf-3b73-48c7-9713-49696e308a93',
      bookingType: 'EQUIPMENT_ONLY',
      purpose: 'Mượn thiết bị thực hành',
      startTime: new Date('2026-07-18T01:30:00.000Z'),
      endTime: new Date('2026-07-18T03:30:00.000Z'),
      numberOfPeople: 2,
      numberOfComputers: 0,
      status: 'PENDING',
    });
    const item = BookingEquipmentItem.create({
      bookingRequestId: booking.id.toString(),
      equipmentId: '8e49a188-ac9b-452c-ad39-63082256d70e',
      requestedQuantity: 1,
    });

    const bookingRaw = (new SqlBookingRequestRepository() as any).toPersistence(booking);
    const itemRaw = (new SqlBookingEquipmentItemRepository() as any).toPersistence(item);

    expect(typeof bookingRaw.Id).toBe('string');
    expect(typeof itemRaw.Id).toBe('string');
    expect(validateUuid(bookingRaw.Id)).toBe(true);
    expect(validateUuid(itemRaw.Id)).toBe(true);
  });
});
