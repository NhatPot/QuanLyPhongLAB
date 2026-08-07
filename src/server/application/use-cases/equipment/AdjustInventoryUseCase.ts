import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IEquipmentInventoryTransactionRepository } from '../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Equipment } from '../../../domain/entities/Equipment';
import { EquipmentInventoryTransaction } from '../../../domain/entities/EquipmentInventoryTransaction';

export interface AdjustInventoryInput {
  equipmentId: string;
  delta: number;
  note?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class AdjustInventoryUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private transactionRepo: IEquipmentInventoryTransactionRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: AdjustInventoryInput): Promise<Result<Equipment>> {
    try {
      const equipment = await this.equipmentRepo.findById(input.equipmentId);
      if (!equipment) {
        return Result.fail<Equipment>("Không tìm thấy thiết bị.");
      }

      const oldTotal = equipment.totalQuantity;
      const oldAvailable = equipment.availableQuantity;

      equipment.adjustInventory(input.delta);

      const tx = EquipmentInventoryTransaction.create({
        equipmentId: equipment.id.toString(),
        transactionType: 'ADJUSTMENT',
        deltaTotal: input.delta,
        deltaAvailable: input.delta,
        deltaReserved: 0,
        deltaBorrowed: 0,
        deltaBroken: 0,
        deltaMaintenance: 0,
        deltaLost: 0,
        performedBy: input.userId || undefined,
        note: input.note
      });

      await this.uow.complete(async () => {
        await this.equipmentRepo.save(equipment);
        await this.transactionRepo.save(tx);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'EQUIPMENT_INVENTORY_ADJUSTED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            delta: input.delta,
            oldTotal,
            newTotal: equipment.totalQuantity,
            oldAvailable,
            newAvailable: equipment.availableQuantity
          })
        } as any);
      });

      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi điều chỉnh kho.");
    }
  }
}
