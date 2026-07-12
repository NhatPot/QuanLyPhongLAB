import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository, EquipmentFilter } from '../../../domain/repositories/IEquipmentRepository';
import { Equipment } from '../../../domain/entities/Equipment';

export interface ListEquipmentOutput {
  data: Equipment[];
  total: number;
}

export class ListEquipmentUseCase {
  constructor(private equipmentRepo: IEquipmentRepository) {}

  public async execute(filter: EquipmentFilter): Promise<Result<ListEquipmentOutput>> {
    try {
      const result = await this.equipmentRepo.list(filter);
      return Result.ok<ListEquipmentOutput>(result);
    } catch (error) {
      return Result.fail<ListEquipmentOutput>((error as any).message || "Đã xảy ra lỗi khi lấy danh sách thiết bị.");
    }
  }
}
