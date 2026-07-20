import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { attachBookingRequesters } from './BookingRequester';

export class GetBookingCalendarUseCase {
  constructor(
    private bookingRepo: IBookingRequestRepository,
    private userRepo: IUserRepository,
  ) {}

  public async execute(startDate: Date, endDate: Date, role: string) {
    const bookings = await this.bookingRepo.findApprovedByDateRange(startDate, endDate);
    const isPrivileged = role === 'ADMIN' || role === 'LAB_STAFF';
    const details = isPrivileged
      ? await attachBookingRequesters(bookings, this.userRepo)
      : bookings.map((booking) => ({ booking, requester: null }));
    
    // Format theo privacy rules
    return details.map(({ booking: b, requester }) => {
      return {
        id: b.id.toString(),
        title: isPrivileged ? b.purpose : (b.bookingType === 'FULL_LAB' ? 'Đặt trọn phòng' : 'Sử dụng một phần'),
        start: b.startTime,
        end: b.endTime,
        type: b.bookingType,
        status: b.status,
        requesterId: isPrivileged ? b.requesterId : undefined,
        requester: isPrivileged ? requester : undefined,
        numberOfPeople: isPrivileged ? b.numberOfPeople : undefined,
        numberOfComputers: isPrivileged ? b.numberOfComputers : undefined,
      };
    });
  }
}
