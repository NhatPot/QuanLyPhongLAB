import { BookingRequest } from '../../../domain/entities/BookingRequest';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export interface BookingRequester {
  id: string;
  fullName: string;
  username: string;
  email: string;
  department: string | null;
}

export interface BookingWithRequester {
  booking: BookingRequest;
  requester: BookingRequester | null;
}

export async function attachBookingRequesters(
  bookings: BookingRequest[],
  userRepo: IUserRepository,
): Promise<BookingWithRequester[]> {
  const requesterPromises = new Map<string, Promise<BookingRequester | null>>();

  const getRequester = (requesterId: string): Promise<BookingRequester | null> => {
    const cached = requesterPromises.get(requesterId);
    if (cached) return cached;

    const promise = userRepo.findById(requesterId).then((user) => user ? ({
      id: user.id.toString(),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      department: user.department || null,
    }) : null);
    requesterPromises.set(requesterId, promise);
    return promise;
  };

  return Promise.all(bookings.map(async (booking) => ({
    booking,
    requester: await getRequester(booking.requesterId),
  })));
}
