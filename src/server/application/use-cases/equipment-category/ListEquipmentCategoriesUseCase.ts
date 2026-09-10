import { Result } from '../../../shared/result/Result';
import { IEquipmentCategoryRepository } from '../../../domain/repositories/IEquipmentCategoryRepository';
import { EquipmentCategory } from '../../../domain/entities/EquipmentCategory';

export class ListEquipmentCategoriesUseCase {
  constructor(private categoryRepo: IEquipmentCategoryRepository) {}

  public async execute(lendableOnly = false): Promise<Result<EquipmentCategory[]>> {
    try {
      const list = await this.categoryRepo.list(lendableOnly);
      return Result.ok<EquipmentCategory[]>(list);
    } catch (error) {
      return Result.fail<EquipmentCategory[]>((error as any).message || "Đã xảy ra lỗi khi lấy danh mục.");
    }
  }
}
