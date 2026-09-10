import { IComputerBookingRepository } from '../../../domain/repositories/IComputerBookingRepository';
import { ForbiddenError, ValidationError } from '../../../shared/errors/AppError';
import { canManageLabAssets } from '../../../../lib/lending-policy';

export class GetComputerBookingHistoryUseCase {
  constructor(private computerBookings: IComputerBookingRepository) {}
  async execute(computerId: string, page: number, roles: string[]) {
    if (!canManageLabAssets(roles)) throw new ForbiddenError('Chỉ nhân sự quản lý Lab được tra cứu lịch sử người sử dụng máy.');
    if (!Number.isInteger(page) || page < 1 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(computerId)) throw new ValidationError('Máy hoặc trang tra cứu không hợp lệ.');
    const result = await this.computerBookings.history(computerId, page);
    return { ...result, page, pageSize: 20 };
  }
}
