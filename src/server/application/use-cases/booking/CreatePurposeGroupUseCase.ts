import { IBookingPurposeGroupRepository } from '../../../domain/repositories/IBookingPurposeGroupRepository';
import { BookingPurposeGroup } from '../../../domain/entities/BookingPurposeGroup';
import { BusinessRuleError } from '../../../shared/errors/AppError';
import { normalizePurposeKey, purposeGroupCode, findMatchingPurposeGroup } from './purpose-normalization';

export class CreatePurposeGroupUseCase {
  constructor(private purposeGroupRepo: IBookingPurposeGroupRepository) {}

  public async execute(name: string): Promise<BookingPurposeGroup> {
    const existingGroups = await this.purposeGroupRepo.list();
    
    if (findMatchingPurposeGroup(name, existingGroups)) {
      throw new BusinessRuleError(`Nhóm mục đích "${name}" đã tồn tại hoặc trùng với nhóm hiện có.`, 'PURPOSE_GROUP_DUPLICATE');
    }

    const normalizedKey = normalizePurposeKey(name);
    const code = purposeGroupCode(normalizedKey);

    const group = BookingPurposeGroup.create({
      code,
      name,
      normalizedKey,
    });

    await this.purposeGroupRepo.save(group);
    return group;
  }
}
