import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';

export interface DeleteEquipmentInput {
  id: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class DeleteEquipmentUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: DeleteEquipmentInput): Promise<Result<void>> {
    try {
      const equipment = await this.equipmentRepo.findById(input.id);
      if (!equipment) {
        return Result.fail<void>('Không tìm thấy thiết bị cần xóa.');
      }

      equipment.delete();

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.equipmentRepo.save(equipment, transaction);
        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'EQUIPMENT_DELETED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          oldValueJson: JSON.stringify({
            code: equipment.code,
            name: equipment.name,
            categoryId: equipment.categoryId,
            status: equipment.status
          }),
          newValueJson: JSON.stringify({ deletedAt: equipment.deletedAt }),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any, transaction);
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail<void>((error as any).message || 'Đã xảy ra lỗi khi xóa thiết bị.');
    }
  }
}
