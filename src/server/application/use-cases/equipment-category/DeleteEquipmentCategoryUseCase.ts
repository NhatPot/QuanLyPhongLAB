import { Result } from '../../../shared/result/Result';
import { IEquipmentCategoryRepository } from '../../../domain/repositories/IEquipmentCategoryRepository';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';

export class DeleteEquipmentCategoryUseCase {
  constructor(
    private categoryRepo: IEquipmentCategoryRepository,
    private equipmentRepo: IEquipmentRepository
  ) {}

  public async execute(id: string): Promise<Result<void>> {
    try {
      const category = await this.categoryRepo.findById(id);
      if (!category) {
        return Result.fail<void>(`Không tìm thấy danh mục thiết bị với ID ${id}.`);
      }

      const equipments = await this.equipmentRepo.list({ categoryId: id, page: 1, pageSize: 1 });
      if (equipments.total > 0) {
        return Result.fail<void>(`Không thể xóa danh mục đang có thiết bị phụ thuộc.`);
      }

      await this.categoryRepo.delete(id);
      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>((error as any).message || "Đã xảy ra lỗi khi xóa danh mục.");
    }
  }
}
