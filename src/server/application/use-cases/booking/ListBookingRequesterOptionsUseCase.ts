import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { BookingRequester } from './BookingRequester';

export class ListBookingRequesterOptionsUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public async execute(keyword?: string): Promise<BookingRequester[]> {
    const result = await this.userRepo.list({
      page: 1,
      pageSize: 50,
      keyword,
      status: 'ACTIVE',
    });

    return result.data.map(({ user }) => ({
      id: user.id.toString(),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      department: user.department || null,
    }));
  }
}
