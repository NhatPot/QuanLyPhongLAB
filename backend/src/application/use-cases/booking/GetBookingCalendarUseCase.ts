import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';

export class GetBookingCalendarUseCase {
  constructor(private bookingRepo: IBookingRequestRepository) {}

  public async execute(startDate: Date, endDate: Date, role: string) {
    const bookings = await this.bookingRepo.findApprovedByDateRange(startDate, endDate);
    
    // Format theo privacy rules
    return bookings.map(b => {
      const isPrivileged = role === 'ADMIN' || role === 'LAB_STAFF';
      return {
        id: b.id.toString(),
        title: isPrivileged ? b.purpose : (b.bookingType === 'FULL_LAB' ? 'Đặt trọn phòng' : 'Sử dụng một phần'),
        start: b.startTime,
        end: b.endTime,
        type: b.bookingType,
        status: b.status,
        requesterId: isPrivileged ? b.requesterId : undefined,
        numberOfPeople: isPrivileged ? b.numberOfPeople : undefined,
        numberOfComputers: isPrivileged ? b.numberOfComputers : undefined,
      };
    });
  }
}
