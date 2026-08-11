import { IBookingPurposeGroupRepository } from '../../../domain/repositories/IBookingPurposeGroupRepository';
import { NotFoundError } from '../../../shared/errors/AppError';

export class DeletePurposeGroupUseCase {
  constructor(private purposeGroupRepo: IBookingPurposeGroupRepository) {}

  public async execute(id: string): Promise<void> {
    const group = await this.purposeGroupRepo.findById(id);
    if (!group) {
      throw new NotFoundError('Nhóm mục đích không tồn tại.');
    }

    await this.purposeGroupRepo.softDelete(id);
  }
}
