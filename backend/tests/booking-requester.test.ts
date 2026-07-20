import { describe, expect, it, vi } from 'vitest';
import { BookingRequest } from '../src/domain/entities/BookingRequest';
import { GetBookingCalendarUseCase } from '../src/application/use-cases/booking/GetBookingCalendarUseCase';

describe('Booking requester privacy', () => {
  const requesterId = 'f8e749cf-3b73-48c7-9713-49696e308a93';
  const booking = BookingRequest.create({
    requestCode: 'BR-20260720-1001',
    requesterId,
    bookingType: 'FULL_LAB',
    purpose: 'Thực hành mạng máy tính',
    startTime: new Date('2026-07-21T01:00:00.000Z'),
    endTime: new Date('2026-07-21T03:00:00.000Z'),
    numberOfPeople: 30,
    numberOfComputers: 20,
    status: 'APPROVED',
  });
  const bookingRepo = { findApprovedByDateRange: vi.fn().mockResolvedValue([booking]) };
  const userRepo = {
    findById: vi.fn().mockResolvedValue({
      id: { toString: () => requesterId },
      fullName: 'Nguyễn Văn A',
      username: 'nguyenvana',
      email: 'nguyenvana@example.edu.vn',
      department: 'Khoa CNTT',
    }),
  };

  it('hiển thị danh tính người đăng ký cho quản trị viên', async () => {
    const useCase = new GetBookingCalendarUseCase(bookingRepo as any, userRepo as any);
    const events = await useCase.execute(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
      'ADMIN',
    );

    expect(events[0].requester).toEqual(expect.objectContaining({
      id: requesterId,
      fullName: 'Nguyễn Văn A',
      username: 'nguyenvana',
    }));
  });

  it('ẩn danh tính người đăng ký trên lịch đối với người dùng thường', async () => {
    userRepo.findById.mockClear();
    const useCase = new GetBookingCalendarUseCase(bookingRepo as any, userRepo as any);
    const events = await useCase.execute(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
      'TEACHER',
    );

    expect(events[0].requester).toBeUndefined();
    expect(events[0].requesterId).toBeUndefined();
    expect(events[0].title).not.toBe(booking.purpose);
    expect(userRepo.findById).not.toHaveBeenCalled();
  });
});
