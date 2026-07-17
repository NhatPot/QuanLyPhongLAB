import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validate as validateUuid } from 'uuid';
import { CreateBookingUseCase } from '../src/application/use-cases/booking/CreateBookingUseCase';
import { BookingRequest } from '../src/domain/entities/BookingRequest';
import { BookingEquipmentItem } from '../src/domain/entities/BookingEquipmentItem';
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
    useCase = new CreateBookingUseCase(bookingRepo, equipmentItemRepo, availability, unitOfWork, auditLogRepo);
  });

  it('tạo yêu cầu của giáo viên với UUID hợp lệ và chỉ lưu booking một lần', async () => {
    const booking = await useCase.execute({
      requesterId,
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
