import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { Equipment } from '../../../domain/entities/Equipment';

export class GetEquipmentUseCase {
  constructor(private equipmentRepo: IEquipmentRepository) {}

  public async execute(id: string, lendableOnly = false): Promise<Result<Equipment>> {
    try {
      const equipment = await this.equipmentRepo.findById(id);
      if (lendableOnly && !equipment?.isLendable) return Result.fail('Không tìm thấy thiết bị.');
      if (!equipment) {
        return Result.fail<Equipment>("Không tìm thấy thiết bị.");
      }
      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi lấy thông tin thiết bị.");
    }
  }
}
