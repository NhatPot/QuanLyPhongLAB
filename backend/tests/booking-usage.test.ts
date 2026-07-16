import { describe, expect, it, vi } from 'vitest';
import { BookingRequest } from '../src/domain/entities/BookingRequest';
import { Computer } from '../src/domain/entities/Computer';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';
import { CheckInBookingUseCase } from '../src/application/use-cases/booking/CheckInBookingUseCase';
import { CheckOutBookingUseCase } from '../src/application/use-cases/booking/CheckOutBookingUseCase';
import { GetLabUsageStatisticsUseCase } from '../src/application/use-cases/booking/GetLabUsageStatisticsUseCase';
import type { IAuditLogRepository } from '../src/domain/repositories/IAuditLogRepository';
import type { IBookingRequestRepository } from '../src/domain/repositories/IBookingRequestRepository';
import type { ICheckInOutLogRepository, LabUsageSession } from '../src/domain/repositories/ICheckInOutLogRepository';
import type { IComputerRepository } from '../src/domain/repositories/IComputerRepository';
import type { ComputerActivityRecord, IComputerActivityRepository } from '../src/domain/repositories/IComputerActivityRepository';
import type { IUnitOfWork } from '../src/domain/repositories/IUnitOfWork';

const bookingId = 'a71db6e4-3d38-4e6e-b807-48f0d6705c1b';
const userId = '9131b7ef-042b-42e9-a2e3-d2a7994e6435';
const computerIds = ['d4c728e8-d102-4c28-98e6-e17f7d1b326e', 'b8039eaf-c915-4f74-8c0c-7cd6c46a6fa9'];

function booking(status: 'APPROVED' | 'CHECKED_IN' = 'APPROVED') {
  return BookingRequest.create({
    id: bookingId,
    requestCode: 'BK-202607-001', requesterId: userId, bookingType: 'COMPUTERS_ONLY', purpose: 'Thực hành mạng',
    startTime: new Date('2026-07-10T01:00:00.000Z'), endTime: new Date('2026-07-10T03:00:00.000Z'),
    numberOfPeople: 20, numberOfComputers: 2, status,
  });
}

function computer(id: string, index: number, status: 'ACTIVE' | 'IN_USE' = 'ACTIVE') {
  return Computer.create({ code: `PC-0${index + 1}`, name: `Máy ${index + 1}`, status }, new UniqueEntityId(id));
}

function logRepository(): ICheckInOutLogRepository {
  return {
    checkIn: vi.fn(async (input) => ({ bookingRequestId: input.bookingRequestId, checkInTime: new Date('2026-07-10T01:10:00.000Z'), checkOutTime: null, checkedInBy: input.checkedInBy, checkedOutBy: null, actualPeopleCount: input.actualPeopleCount, actualComputerCount: input.actualComputerCount, initialCondition: input.initialCondition || null, returnCondition: null, note: input.note || null })),
    checkOut: vi.fn(async (input) => ({ bookingRequestId: input.bookingRequestId, checkInTime: new Date('2026-07-10T01:10:00.000Z'), checkOutTime: new Date('2026-07-10T03:00:00.000Z'), checkedInBy: userId, checkedOutBy: input.checkedOutBy, actualPeopleCount: 18, actualComputerCount: 2, initialCondition: null, returnCondition: input.returnCondition || null, note: input.note || null })),
    findUsageSessions: vi.fn(),
  };
}

function activityRecord(computerId: string, index: number, startedAt = new Date('2026-07-10T01:10:00.000Z'), endedAt: Date | null = null): ComputerActivityRecord {
  return {
    id: `activity-${index}`, computerId, computerCode: `PC-${String(index + 1).padStart(2, '0')}`, computerName: `Máy ${index + 1}`,
    activityType: 'IN_USE', startedAt, endedAt, bookingRequestId: bookingId, bookingRequestCode: 'BK-202607-001',
    bookingPurpose: 'Thực hành mạng', requesterName: 'Giảng viên', maintenanceScheduleId: null, maintenanceCode: null,
    performedBy: userId, performedByName: 'Nhân viên Lab', note: null,
  };
}

function activityRepository(active: ComputerActivityRecord[] = []): IComputerActivityRepository {
  return {
    transition: vi.fn(), closeCurrent: vi.fn(),
    findActiveUsageByBooking: vi.fn().mockResolvedValue(active),
    findActivities: vi.fn().mockResolvedValue([]),
    findCurrentActivities: vi.fn().mockResolvedValue([]),
  };
}

function unitOfWork(): IUnitOfWork {
  return {
    startTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(),
    complete: vi.fn(async (work) => work()), getTransaction: vi.fn(() => ({})),
  };
}

describe('Booking check-in/out and usage statistics', () => {
  it('records selected computers at check-in and opens individual machine activities', async () => {
    const item = booking();
    const bookingRepo = { findById: vi.fn().mockResolvedValue(item), save: vi.fn() } as unknown as IBookingRequestRepository;
    const logs = logRepository();
    const computers = computerIds.map((id, index) => computer(id, index));
    const computerRepo = { findById: vi.fn(async (id) => computers.find((entry) => entry.id.toString() === id) || null), save: vi.fn() } as unknown as IComputerRepository;
    const activities = activityRepository();
    const audit = { save: vi.fn() } as unknown as IAuditLogRepository;
    const useCase = new CheckInBookingUseCase(bookingRepo, logs, computerRepo, activities, unitOfWork(), audit);

    const result = await useCase.execute({ bookingId, userId, actualPeopleCount: 18, actualComputerCount: 2, computerIds });

    expect(result.booking.status).toBe('CHECKED_IN');
    expect(result.computerIds).toEqual(computerIds);
    expect(logs.checkIn).toHaveBeenCalledWith(expect.objectContaining({ actualPeopleCount: 18, actualComputerCount: 2 }), expect.anything());
    expect(activities.transition).toHaveBeenCalledTimes(2);
    expect(computers.every((entry) => entry.status === 'IN_USE')).toBe(true);
    expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'BOOKING_CHECKED_IN', entityId: bookingId }), expect.anything());
  });

  it('closes each active machine session when the room checks out', async () => {
    const item = booking('CHECKED_IN');
    const bookingRepo = { findById: vi.fn().mockResolvedValue(item), save: vi.fn() } as unknown as IBookingRequestRepository;
    const logs = logRepository();
    const active = computerIds.map((id, index) => activityRecord(id, index));
    const activities = activityRepository(active);
    const computers = computerIds.map((id, index) => computer(id, index, 'IN_USE'));
    const computerRepo = { findById: vi.fn(async (id) => computers.find((entry) => entry.id.toString() === id) || null), save: vi.fn() } as unknown as IComputerRepository;
    const audit = { save: vi.fn() } as unknown as IAuditLogRepository;
    const useCase = new CheckOutBookingUseCase(bookingRepo, logs, computerRepo, activities, unitOfWork(), audit);

    const result = await useCase.execute({ bookingId, userId, returnCondition: 'Phòng được bàn giao sạch sẽ.' });

    expect(result.booking.status).toBe('COMPLETED');
    expect(result.computerIds).toEqual(computerIds);
    expect(logs.checkOut).toHaveBeenCalledWith(expect.objectContaining({ checkedOutBy: userId }), expect.anything());
    expect(activities.transition).toHaveBeenCalledTimes(2);
    expect(computers.every((entry) => entry.status === 'ACTIVE')).toBe(true);
    expect(audit.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'BOOKING_CHECKED_OUT', entityId: bookingId }), expect.anything());
  });

  it('splits exact per-machine usage over days and calculates computer-hours', async () => {
    const sessions: LabUsageSession[] = [{
      bookingRequestId: bookingId, requestCode: 'BK-202607-001', purpose: 'Thực hành mạng', bookingType: 'COMPUTERS_ONLY',
      checkInTime: new Date('2026-07-02T16:00:00.000Z'), checkOutTime: new Date('2026-07-02T18:30:00.000Z'),
      checkedInBy: userId, checkedOutBy: userId, actualPeopleCount: 10, actualComputerCount: 8,
      initialCondition: null, returnCondition: null, note: null, requestedPeopleCount: 12, requestedComputerCount: 8,
    }];
    const logs = { ...logRepository(), findUsageSessions: vi.fn().mockResolvedValue(sessions) } as ICheckInOutLogRepository;
    const machineActivities = Array.from({ length: 8 }, (_, index) => activityRecord(`computer-${index}`, index, new Date('2026-07-02T16:00:00.000Z'), new Date('2026-07-02T18:30:00.000Z')));
    const activities = activityRepository();
    vi.mocked(activities.findActivities).mockResolvedValue(machineActivities);
    const useCase = new GetLabUsageStatisticsUseCase(logs, activities);

    const result = await useCase.execute('2026-07');

    expect(result.totalUsageHours).toBe(2.5);
    expect(result.totalComputerHours).toBe(20);
    expect(result.daily.find((day) => day.date === '2026-07-02')).toMatchObject({ usageHours: 1, computerHours: 8, checkInCount: 1 });
    expect(result.daily.find((day) => day.date === '2026-07-03')).toMatchObject({ usageHours: 1.5, computerHours: 12, checkOutCount: 1 });
    expect(result.sessions[0].computerHoursSource).toBe('MACHINE_LOGS');
    expect(result.sessions[0].computerCodes).toHaveLength(8);
  });
});
