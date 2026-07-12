import { Result } from '../../../shared/result/Result';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { LabProfile } from '../../../domain/entities/LabProfile';

export interface UpdateLabProfileInput {
  labName: string;
  location: string;
  capacity: number;
  description?: string;
  rules?: string;
  managerId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class UpdateLabProfileUseCase {
  constructor(
    private labProfileRepo: ILabProfileRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: UpdateLabProfileInput): Promise<Result<LabProfile>> {
    try {
      const profile = await this.labProfileRepo.get();
      if (!profile) {
        return Result.fail<LabProfile>("Không tìm thấy thông tin cấu hình phòng Lab.");
      }

      const oldState = {
        labName: profile.labName,
        location: profile.location,
        capacity: profile.capacity,
        description: profile.description,
        rules: profile.rules,
        managerId: profile.managerId
      };

      profile.updateInformation({
        labName: input.labName,
        location: input.location,
        capacity: input.capacity,
        description: input.description,
        rules: input.rules,
        managerId: input.managerId
      });

      await this.uow.complete(async () => {
        await this.labProfileRepo.save(profile);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'LAB_PROFILE_UPDATED',
          entityName: 'LabProfile',
          entityId: profile.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            old: oldState,
            new: {
              labName: profile.labName,
              location: profile.location,
              capacity: profile.capacity,
              description: profile.description,
              rules: profile.rules,
              managerId: profile.managerId
            }
          })
        } as any);
      });

      return Result.ok<LabProfile>(profile);
    } catch (error) {
      return Result.fail<LabProfile>((error as any).message || "Đã xảy ra lỗi khi cập nhật cấu hình phòng Lab.");
    }
  }
}
