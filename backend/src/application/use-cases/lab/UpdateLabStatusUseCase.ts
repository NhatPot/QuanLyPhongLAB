import { Result } from '../../../shared/result/Result';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { LabProfile, LabStatus } from '../../../domain/entities/LabProfile';

export interface UpdateLabStatusInput {
  status: LabStatus;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class UpdateLabStatusUseCase {
  constructor(
    private labProfileRepo: ILabProfileRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: UpdateLabStatusInput): Promise<Result<LabProfile>> {
    try {
      const profile = await this.labProfileRepo.get();
      if (!profile) {
        return Result.fail<LabProfile>("Không tìm thấy thông tin cấu hình phòng Lab.");
      }

      const oldStatus = profile.status;
      if (oldStatus === input.status) {
        return Result.ok<LabProfile>(profile);
      }

      profile.changeStatus(input.status);

      await this.uow.complete(async () => {
        await this.labProfileRepo.save(profile);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'LAB_STATUS_CHANGED',
          entityName: 'LabProfile',
          entityId: profile.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            old: oldStatus,
            new: input.status
          })
        } as any);
      });

      return Result.ok<LabProfile>(profile);
    } catch (error) {
      return Result.fail<LabProfile>((error as any).message || "Đã xảy ra lỗi khi đổi trạng thái phòng Lab.");
    }
  }
}
