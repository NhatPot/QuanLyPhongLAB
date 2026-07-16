import { IIdGenerator } from '../../ports/IIdGenerator';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IMaintenanceScheduleRepository } from '../../../domain/repositories/IMaintenanceScheduleRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Computer } from '../../../domain/entities/Computer';
import { MaintenanceSchedule, MaintenanceTriggerSource } from '../../../domain/entities/MaintenanceSchedule';
import { UniqueEntityId } from '../../../domain/value-objects/UniqueEntityId';

export const COMPUTER_MAINTENANCE_INTERVAL_DAYS = 270;

export interface MaintenanceProposalContext {
  actorUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class ComputerMaintenanceProposalService {
  constructor(
    private readonly maintenanceRepo: IMaintenanceScheduleRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async ensureProposal(
    computer: Computer,
    source: Extract<MaintenanceTriggerSource, 'BROKEN_STATUS' | 'MAINTENANCE_STATUS' | 'PERIODIC_270'>,
    context: MaintenanceProposalContext,
    transaction: any,
  ): Promise<MaintenanceSchedule | null> {
    if (await this.maintenanceRepo.hasActiveForTarget('COMPUTER', computer.id.toString(), transaction)) return null;

    const now = new Date();
    const baseDate = computer.lastMaintenanceDate || computer.createdAt || now;
    const dueAt = source === 'BROKEN_STATUS' || source === 'MAINTENANCE_STATUS'
      ? now
      : new Date(baseDate.getTime() + COMPUTER_MAINTENANCE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    const expectedEndAt = new Date(dueAt.getTime() + 2 * 60 * 60 * 1000);
    const id = this.idGenerator.generate();
    const maintenance = MaintenanceSchedule.create({
      code: maintenanceCode(id),
      targetType: 'COMPUTER',
      targetId: computer.id.toString(),
      targetCode: computer.code,
      targetName: computer.name,
      title: source === 'BROKEN_STATUS' ? `Kiểm tra và sửa chữa ${computer.code}` : source === 'MAINTENANCE_STATUS' ? `Tiếp nhận máy đang bảo trì ${computer.code}` : `Bảo trì định kỳ ${computer.code}`,
      description: source === 'BROKEN_STATUS' ? computer.note || 'Đề xuất tự động khi máy tính được chuyển sang trạng thái bị hỏng.' : source === 'MAINTENANCE_STATUS' ? 'Hồ sơ tự động liên kết máy đã ở trạng thái bảo trì trước khi kích hoạt module bảo trì.' : `Đề xuất tự động theo chu kỳ ${COMPUTER_MAINTENANCE_INTERVAL_DAYS} ngày.`,
      reason: source === 'BROKEN_STATUS' ? 'Máy tính được ghi nhận bị hỏng và cần được kiểm tra.' : source === 'MAINTENANCE_STATUS' ? 'Đồng bộ máy tính đang bảo trì với danh sách bảo trì.' : `Máy tính đã đến hạn bảo trì định kỳ ${COMPUTER_MAINTENANCE_INTERVAL_DAYS} ngày.`,
      scheduledStartAt: dueAt,
      expectedEndAt,
      startedAt: source === 'MAINTENANCE_STATUS' ? now : undefined,
      status: source === 'MAINTENANCE_STATUS' ? 'IN_PROGRESS' : 'PENDING',
      quantity: 1,
      estimatedCost: 0,
      triggerSource: source,
      triggeredAt: now,
      createdBy: context.actorUserId,
      createdAt: now,
      updatedAt: now,
    }, new UniqueEntityId(id));

    await this.maintenanceRepo.save(maintenance, transaction);
    await this.auditLogRepo.save({
      userId: context.actorUserId,
      action: source === 'MAINTENANCE_STATUS' ? 'MAINTENANCE_LINK_CREATED' : 'MAINTENANCE_PROPOSAL_CREATED',
      entityName: 'MaintenanceSchedules',
      entityId: maintenance.id.toString(),
      newValueJson: JSON.stringify({
        code: maintenance.code,
        targetId: maintenance.targetId,
        targetCode: maintenance.targetCode,
        status: maintenance.status,
        triggerSource: maintenance.triggerSource,
        dueAt: maintenance.scheduledStartAt,
      }),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
    }, transaction);
    return maintenance;
  }
}

export class SyncComputerMaintenanceRemindersUseCase {
  constructor(
    private readonly computerRepo: IComputerRepository,
    private readonly proposalService: ComputerMaintenanceProposalService,
    private readonly uow: IUnitOfWork,
  ) {}

  public async execute(context: MaintenanceProposalContext): Promise<{ created: number; intervalDays: number }> {
    const cutoffDate = new Date(Date.now() - COMPUTER_MAINTENANCE_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
    const candidates = await this.computerRepo.listMaintenanceCandidates(cutoffDate);
    if (candidates.length === 0) return { created: 0, intervalDays: COMPUTER_MAINTENANCE_INTERVAL_DAYS };

    let created = 0;
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      for (const computer of candidates) {
        const source = computer.status === 'BROKEN' ? 'BROKEN_STATUS' : computer.status === 'MAINTENANCE' ? 'MAINTENANCE_STATUS' : 'PERIODIC_270';
        if (await this.proposalService.ensureProposal(computer, source, context, transaction)) created += 1;
      }
    });
    return { created, intervalDays: COMPUTER_MAINTENANCE_INTERVAL_DAYS };
  }
}

function maintenanceCode(id: string): string {
  const date = new Date();
  const part = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `MT-${part}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}
