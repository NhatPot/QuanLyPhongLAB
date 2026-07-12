import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Equipment } from '../../../domain/entities/Equipment';

export interface CreateEquipmentInput {
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

export class CreateEquipmentUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: CreateEquipmentInput): Promise<Result<Equipment>> {
    try {
      const existing = await this.equipmentRepo.findByCode(input.code);
      if (existing) {
        return Result.fail<Equipment>(`Mã thiết bị '${input.code}' đã tồn tại.`);
      }

      const equipment = Equipment.create({
        code: input.code,
        name: input.name,
        categoryId: input.categoryId,
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        borrowedQuantity: 0,
        brokenQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        location: input.location,
        managerId: input.managerId || undefined,
        status: input.status,
        imageUrl: input.imageUrl,
        note: input.note
      });

      await this.uow.complete(async () => {
        await this.equipmentRepo.save(equipment);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'EQUIPMENT_CREATED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any);
      });

      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi tạo thiết bị.");
    }
  }
}
