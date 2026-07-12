import { Result } from '../../../shared/result/Result';
import { IEquipmentCategoryRepository } from '../../../domain/repositories/IEquipmentCategoryRepository';
import { EquipmentCategory } from '../../../domain/entities/EquipmentCategory';

export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string;
}

export class CreateEquipmentCategoryUseCase {
  constructor(private categoryRepo: IEquipmentCategoryRepository) {}

  public async execute(input: CreateCategoryInput): Promise<Result<EquipmentCategory>> {
    try {
      const existing = await this.categoryRepo.findByCode(input.code);
      if (existing) {
        return Result.fail<EquipmentCategory>(`Mã danh mục '${input.code}' đã tồn tại.`);
      }

      const category = EquipmentCategory.create({
        code: input.code,
        name: input.name,
        description: input.description
      });

      await this.categoryRepo.save(category);
      return Result.ok<EquipmentCategory>(category);
    } catch (error) {
      return Result.fail<EquipmentCategory>((error as any).message || "Đã xảy ra lỗi khi tạo danh mục.");
    }
  }
}
