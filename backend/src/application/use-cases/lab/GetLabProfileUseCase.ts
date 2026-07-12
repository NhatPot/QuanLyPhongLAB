import { Result } from '../../../shared/result/Result';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import { LabProfile } from '../../../domain/entities/LabProfile';

export class GetLabProfileUseCase {
  constructor(private labProfileRepo: ILabProfileRepository) {}

  public async execute(): Promise<Result<LabProfile>> {
    try {
      const profile = await this.labProfileRepo.get();
      if (!profile) {
        return Result.fail<LabProfile>("Không tìm thấy thông tin cấu hình phòng Lab.");
      }
      return Result.ok<LabProfile>(profile);
    } catch (error) {
      return Result.fail<LabProfile>((error as any).message || "Đã xảy ra lỗi khi lấy cấu hình phòng Lab.");
    }
  }
}
