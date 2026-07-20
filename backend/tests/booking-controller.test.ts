import { describe, expect, it, vi } from 'vitest';
import { BookingController } from '../src/presentation/http/controllers/BookingController';

describe('BookingController authentication claims', () => {
  it('lấy requesterId từ userId trong JWT khi giáo viên tạo booking', async () => {
    const createBookingUseCase = {
      execute: vi.fn().mockResolvedValue({
        id: { toString: () => '1c2b3a4d-5e6f-4789-9012-3456789abcde' },
        requestCode: 'BR-TEST-0001',
        status: 'PENDING',
      }),
    };
    const controller = new BookingController(
      createBookingUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const request = {
      user: { userId: 'f8e749cf-3b73-48c7-9713-49696e308a93', roles: ['TEACHER'], permissions: ['BOOKING_CREATE'] },
      body: {
        bookingType: 'COMPUTERS_ONLY',
        purpose: 'Thực hành mạng máy tính',
        startTime: '2026-07-17T13:41:00.000Z',
        endTime: '2026-07-17T15:42:00.000Z',
        numberOfPeople: 2,
        numberOfComputers: 2,
        equipments: [],
      },
      get: vi.fn(),
    };
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await controller.create(request as any, response as any, next);

    expect(createBookingUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: request.user.userId,
      requesterId: undefined,
    }));
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(201);
  });
});
