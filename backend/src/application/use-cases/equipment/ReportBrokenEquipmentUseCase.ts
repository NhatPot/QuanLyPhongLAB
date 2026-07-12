import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IEquipmentInventoryTransactionRepository } from '../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Equipment } from '../../../domain/entities/Equipment';
import { EquipmentInventoryTransaction } from '../../../domain/entities/EquipmentInventoryTransaction';

export interface ReportBrokenInput {
  equipmentId: string;
  quantity: number;
  from: 'AVAILABLE' | 'BORROWED';
  note?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class ReportBrokenEquipmentUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private transactionRepo: IEquipmentInventoryTransactionRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: ReportBrokenInput): Promise<Result<Equipment>> {
    try {
      const equipment = await this.equipmentRepo.findById(input.equipmentId);
      if (!equipment) {
        return Result.fail<Equipment>("Không tìm thấy thiết bị.");
      }

      const oldAvailable = equipment.availableQuantity;
      const oldBorrowed = equipment.borrowedQuantity;
      const oldBroken = equipment.brokenQuantity;

      equipment.reportBroken(input.quantity, input.from);

      const deltaAvailable = input.from === 'AVAILABLE' ? -input.quantity : 0;
      const deltaBorrowed = input.from === 'BORROWED' ? -input.quantity : 0;

      const tx = EquipmentInventoryTransaction.create({
        equipmentId: equipment.id.toString(),
        transactionType: 'DAMAGE_REPORT',
        deltaTotal: 0,
        deltaAvailable,
        deltaReserved: 0,
        deltaBorrowed,
        deltaBroken: input.quantity,
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
          action: 'EQUIPMENT_DAMAGE_REPORTED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            quantity: input.quantity,
            from: input.from,
            oldAvailable,
            newAvailable: equipment.availableQuantity,
            oldBorrowed,
            newBorrowed: equipment.borrowedQuantity,
            oldBroken,
            newBroken: equipment.brokenQuantity
          })
        } as any);
      });

      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi báo hỏng thiết bị.");
    }
  }
}
