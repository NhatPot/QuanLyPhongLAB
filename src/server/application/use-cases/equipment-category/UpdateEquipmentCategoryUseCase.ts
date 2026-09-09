import { z } from "zod";
import { equipmentCategorySchema } from "../../../../lib/equipment-category";
import { IEquipmentCategoryRepository } from "../../../domain/repositories/IEquipmentCategoryRepository";
import { EquipmentCategory } from "../../../domain/entities/EquipmentCategory";
import { Result } from "../../../shared/result/Result";

export class UpdateEquipmentCategoryUseCase {
  constructor(private readonly categoryRepo: IEquipmentCategoryRepository) {}

  async execute(
    id: string,
    input: unknown,
  ): Promise<Result<EquipmentCategory>> {
    if (!z.string().uuid().safeParse(id).success)
      return Result.fail("ID danh mục không hợp lệ.");
    const parsed = equipmentCategorySchema.safeParse(input);
    if (!parsed.success)
      return Result.fail(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    try {
      const category = await this.categoryRepo.findById(id);
      if (!category)
        return Result.fail(
          "Danh mục không còn tồn tại. Hãy tải lại danh sách.",
        );
      const duplicate = await this.categoryRepo.findByCode(parsed.data.code);
      if (duplicate && !duplicate.id.equals(category.id))
        return Result.fail("Mã danh mục đã tồn tại. Hãy chọn mã khác.");
      category.update(
        parsed.data.name,
        parsed.data.description,
        parsed.data.code,
      );
      if (!(await this.categoryRepo.update(category)))
        return Result.fail("Danh mục đã bị xóa. Hãy tải lại danh sách.");
      return Result.ok(category);
    } catch (error) {
      const sqlError = error as {
        number?: number;
        originalError?: { info?: { number?: number } };
      };
      if (
        [2601, 2627].includes(
          sqlError.number ?? sqlError.originalError?.info?.number ?? 0,
        )
      )
        return Result.fail("Mã danh mục đã tồn tại. Hãy chọn mã khác.");
      return Result.fail(
        "Không thể cập nhật danh mục. Hãy kiểm tra kết nối và thử lại.",
      );
    }
  }
}
