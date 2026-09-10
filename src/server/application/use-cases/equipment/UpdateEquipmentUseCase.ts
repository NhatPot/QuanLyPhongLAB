import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Equipment } from '../../../domain/entities/Equipment';

export interface UpdateEquipmentInput {
  isLendable?: boolean;
  id: string;
  code: string;
  name: string;
  categoryId: string;
  location?: string;
  managerId?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  imageUrl?: string;
  note?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class UpdateEquipmentUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: UpdateEquipmentInput): Promise<Result<Equipment>> {
    try {
      const equipment = await this.equipmentRepo.findById(input.id);
      if (!equipment) {
        return Result.fail<Equipment>("Không tìm thấy thiết bị cần cập nhật.");
      }

      if (equipment.code !== input.code) {
        const existing = await this.equipmentRepo.findByCode(input.code);
        if (existing) {
          return Result.fail<Equipment>(`Mã thiết bị '${input.code}' đã tồn tại.`);
        }
      }

      const oldState = {
        isLendable: equipment.isLendable,
        code: equipment.code,
        name: equipment.name,
        categoryId: equipment.categoryId,
        status: equipment.status
      };

      equipment.updateInformation({
        isLendable: input.isLendable,
        code: input.code,
        name: input.name,
        categoryId: input.categoryId,
        location: input.location,
        managerId: input.managerId || undefined,
        status: input.status,
        imageUrl: input.imageUrl,
        note: input.note
      });

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.equipmentRepo.save(equipment, transaction);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'EQUIPMENT_UPDATED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          oldValueJson: JSON.stringify(oldState),
          newValueJson: JSON.stringify({
            old: oldState,
            new: {
              isLendable: equipment.isLendable,
              code: equipment.code,
              name: equipment.name,
              categoryId: equipment.categoryId,
              status: equipment.status
            }
          })
        }, transaction);
      });

      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi cập nhật thiết bị.");
    }
  }
}
