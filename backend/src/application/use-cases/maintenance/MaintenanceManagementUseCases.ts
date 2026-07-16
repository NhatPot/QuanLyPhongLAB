import { IIdGenerator } from '../../ports/IIdGenerator';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';
import { IEquipmentInventoryTransactionRepository } from '../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import {
  IMaintenanceScheduleRepository,
  MaintenanceDetail,
  MaintenanceListFilters,
  MaintenanceOptions,
  MaintenanceSummary,
} from '../../../domain/repositories/IMaintenanceScheduleRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import {
  MaintenanceOutcome,
  MaintenanceSchedule,
  MaintenanceSource,
  MaintenanceTargetType,
} from '../../../domain/entities/MaintenanceSchedule';
import { EquipmentInventoryTransaction } from '../../../domain/entities/EquipmentInventoryTransaction';
import { UniqueEntityId } from '../../../domain/value-objects/UniqueEntityId';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';

export interface MaintenanceOperationContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface MaintenanceScheduleInput {
  targetType: MaintenanceTargetType;
  targetId: string;
  title: string;
  description?: string;
  reason: string;
  scheduledStartAt: Date;
  expectedEndAt: Date;
  technicianId?: string;
  quantity: number;
  maintenanceSource?: MaintenanceSource;
  estimatedCost: number;
  partsNote?: string;
}

interface MaintenanceDependencies {
  maintenanceRepo: IMaintenanceScheduleRepository;
  labRepo: ILabProfileRepository;
  computerRepo: IComputerRepository;
  computerActivityRepo: IComputerActivityRepository;
  equipmentRepo: IEquipmentRepository;
  userRepo: IUserRepository;
  equipmentTxRepo: IEquipmentInventoryTransactionRepository;
  uow: IUnitOfWork;
  auditLogRepo: IAuditLogRepository;
}

export class ListMaintenancesUseCase {
  constructor(private readonly repo: IMaintenanceScheduleRepository) {}
  public execute(filters: MaintenanceListFilters) { return this.repo.list(filters); }
}

export class GetMaintenanceSummaryUseCase {
  constructor(private readonly repo: IMaintenanceScheduleRepository) {}
  public execute(): Promise<MaintenanceSummary> { return this.repo.getSummary(); }
}

export class GetMaintenanceOptionsUseCase {
  constructor(private readonly repo: IMaintenanceScheduleRepository) {}
  public execute(): Promise<MaintenanceOptions> { return this.repo.getOptions(); }
}

export class GetMaintenanceUseCase {
  constructor(private readonly repo: IMaintenanceScheduleRepository) {}
  public async execute(id: string): Promise<MaintenanceDetail> {
    const detail = await this.repo.getDetailById(id);
    if (!detail) throw new NotFoundError('Không tìm thấy lịch bảo trì.');
    return detail;
  }
}

export class CreateMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies, private readonly idGenerator: IIdGenerator) {}

  public async execute(input: MaintenanceScheduleInput & MaintenanceOperationContext): Promise<MaintenanceDetail> {
    const snapshot = await resolveTarget(input.targetType, input.targetId, this.deps);
    await validateTechnician(input.technicianId, this.deps.userRepo);
    await ensureNoOverlap(input, this.deps.maintenanceRepo);

    const entityId = this.idGenerator.generate();
    const maintenance = MaintenanceSchedule.create({
      code: createMaintenanceCode(entityId),
      targetType: input.targetType,
      targetId: input.targetId,
      targetCode: snapshot.code,
      targetName: snapshot.name,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      reason: input.reason.trim(),
      scheduledStartAt: input.scheduledStartAt,
      expectedEndAt: input.expectedEndAt,
      status: 'SCHEDULED',
      technicianId: input.technicianId || undefined,
      quantity: input.targetType === 'EQUIPMENT' ? input.quantity : 1,
      maintenanceSource: input.targetType === 'EQUIPMENT' ? input.maintenanceSource || 'AVAILABLE' : undefined,
      estimatedCost: input.estimatedCost || 0,
      partsNote: input.partsNote?.trim() || undefined,
      triggerSource: 'MANUAL',
      createdBy: input.actorUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, new UniqueEntityId(entityId));

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, input, 'MAINTENANCE_CREATED', maintenance, null);
    });

    return (await this.deps.maintenanceRepo.getDetailById(maintenance.id.toString())) || {
      maintenance, technicianName: null, technicianUsername: null, createdByName: null,
    };
  }
}

export class UpdateMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies) {}

  public async execute(id: string, input: MaintenanceScheduleInput & MaintenanceOperationContext): Promise<MaintenanceDetail> {
    const maintenance = await requireMaintenance(id, this.deps.maintenanceRepo);
    const before = maintenanceSnapshot(maintenance);
    const target = await resolveTarget(input.targetType, input.targetId, this.deps);
    await validateTechnician(input.technicianId, this.deps.userRepo);
    await ensureNoOverlap(input, this.deps.maintenanceRepo, id);

    try {
      maintenance.updateSchedule({
        targetType: input.targetType, targetId: input.targetId, targetCode: target.code, targetName: target.name,
        title: input.title.trim(), description: input.description?.trim() || undefined, reason: input.reason.trim(),
        scheduledStartAt: input.scheduledStartAt, expectedEndAt: input.expectedEndAt,
        technicianId: input.technicianId || undefined,
        quantity: input.targetType === 'EQUIPMENT' ? input.quantity : 1,
        maintenanceSource: input.targetType === 'EQUIPMENT' ? input.maintenanceSource || 'AVAILABLE' : undefined,
        estimatedCost: input.estimatedCost || 0, partsNote: input.partsNote?.trim() || undefined,
      });
    } catch (error) {
      throw new BusinessRuleError((error as Error).message, 'MAINTENANCE_UPDATE_NOT_ALLOWED');
    }

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, input, 'MAINTENANCE_UPDATED', maintenance, before);
    });
    return (await this.deps.maintenanceRepo.getDetailById(id))!;
  }
}

export class StartMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies) {}

  public async execute(id: string, context: MaintenanceOperationContext): Promise<MaintenanceDetail> {
    const maintenance = await requireMaintenance(id, this.deps.maintenanceRepo);
    const before = maintenanceSnapshot(maintenance);
    const target = await resolveTarget(maintenance.targetType, maintenance.targetId, this.deps);

    try {
      maintenance.start();
      if (target.kind === 'LAB') {
        if (target.asset.status !== 'ACTIVE') throw new Error('Phòng Lab phải đang hoạt động trước khi bắt đầu bảo trì.');
        target.asset.changeStatus('MAINTENANCE');
      } else if (target.kind === 'COMPUTER') {
        if (!['ACTIVE', 'BROKEN'].includes(target.asset.status)) throw new Error('Máy tính không ở trạng thái có thể bắt đầu bảo trì.');
        target.asset.changeStatus('MAINTENANCE');
      } else {
        if (target.asset.status !== 'ACTIVE') throw new Error('Thiết bị phải đang hoạt động trước khi bảo trì.');
        target.asset.startMaintenance(maintenance.quantity, maintenance.maintenanceSource || 'AVAILABLE');
      }
    } catch (error) {
      throw new BusinessRuleError((error as Error).message, 'MAINTENANCE_START_NOT_ALLOWED');
    }

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      if (target.kind === 'LAB') await this.deps.labRepo.save(target.asset, transaction);
      if (target.kind === 'COMPUTER') {
        await this.deps.computerRepo.save(target.asset, transaction);
        await this.deps.computerActivityRepo.transition({
          computerId: target.asset.id.toString(),
          activityType: 'MAINTENANCE',
          occurredAt: maintenance.startedAt || new Date(),
          maintenanceScheduleId: maintenance.id.toString(),
          performedBy: context.actorUserId,
          note: maintenance.reason,
        }, transaction);
      }
      if (target.kind === 'EQUIPMENT') {
        await this.deps.equipmentRepo.save(target.asset, transaction);
        await this.deps.equipmentTxRepo.save(EquipmentInventoryTransaction.create({
          equipmentId: target.asset.id.toString(), transactionType: 'MAINTENANCE_START', deltaTotal: 0,
          deltaAvailable: maintenance.maintenanceSource === 'AVAILABLE' ? -maintenance.quantity : 0,
          deltaReserved: 0, deltaBorrowed: 0,
          deltaBroken: maintenance.maintenanceSource === 'BROKEN' ? -maintenance.quantity : 0,
          deltaMaintenance: maintenance.quantity, deltaLost: 0, referenceType: 'MAINTENANCE',
          referenceId: maintenance.id.toString(), performedBy: context.actorUserId,
          note: maintenance.reason,
        }), transaction);
      }
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, context, 'MAINTENANCE_STARTED', maintenance, before);
    });
    return (await this.deps.maintenanceRepo.getDetailById(id))!;
  }
}

export class CompleteMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies) {}

  public async execute(id: string, input: MaintenanceOperationContext & {
    resultNote: string;
    actualCost: number;
    partsNote?: string;
    outcome: MaintenanceOutcome;
  }): Promise<MaintenanceDetail> {
    const maintenance = await requireMaintenance(id, this.deps.maintenanceRepo);
    const before = maintenanceSnapshot(maintenance);
    const target = await resolveTarget(maintenance.targetType, maintenance.targetId, this.deps);

    try {
      maintenance.complete(input);
      if (target.kind === 'LAB') target.asset.changeStatus('ACTIVE');
      if (target.kind === 'COMPUTER') target.asset.completeMaintenance(input.outcome === 'BROKEN');
      if (target.kind === 'EQUIPMENT') target.asset.completeMaintenance(maintenance.quantity, input.outcome === 'BROKEN');
    } catch (error) {
      throw new BusinessRuleError((error as Error).message, 'MAINTENANCE_COMPLETE_NOT_ALLOWED');
    }

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      if (target.kind === 'LAB') await this.deps.labRepo.save(target.asset, transaction);
      if (target.kind === 'COMPUTER') {
        await this.deps.computerRepo.save(target.asset, transaction);
        await this.deps.computerActivityRepo.transition({
          computerId: target.asset.id.toString(),
          activityType: input.outcome === 'BROKEN' ? 'BROKEN' : 'ACTIVE',
          occurredAt: maintenance.completedAt || new Date(),
          maintenanceScheduleId: maintenance.id.toString(),
          performedBy: input.actorUserId,
          note: input.resultNote,
        }, transaction);
      }
      if (target.kind === 'EQUIPMENT') {
        await this.deps.equipmentRepo.save(target.asset, transaction);
        await this.deps.equipmentTxRepo.save(EquipmentInventoryTransaction.create({
          equipmentId: target.asset.id.toString(), transactionType: 'MAINTENANCE_COMPLETE', deltaTotal: 0,
          deltaAvailable: input.outcome === 'AVAILABLE' ? maintenance.quantity : 0,
          deltaReserved: 0, deltaBorrowed: 0, deltaBroken: input.outcome === 'BROKEN' ? maintenance.quantity : 0,
          deltaMaintenance: -maintenance.quantity, deltaLost: 0, referenceType: 'MAINTENANCE',
          referenceId: maintenance.id.toString(), performedBy: input.actorUserId,
          note: input.resultNote,
        }), transaction);
      }
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, input, 'MAINTENANCE_COMPLETED', maintenance, before);
    });
    return (await this.deps.maintenanceRepo.getDetailById(id))!;
  }
}

export class CancelMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies) {}
  public async execute(id: string, reason: string, context: MaintenanceOperationContext): Promise<MaintenanceDetail> {
    const maintenance = await requireMaintenance(id, this.deps.maintenanceRepo);
    const before = maintenanceSnapshot(maintenance);
    try { maintenance.cancel(reason); } catch (error) {
      throw new BusinessRuleError((error as Error).message, 'MAINTENANCE_CANCEL_NOT_ALLOWED');
    }
    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, context, 'MAINTENANCE_CANCELLED', maintenance, before);
    });
    return (await this.deps.maintenanceRepo.getDetailById(id))!;
  }
}

export class DeleteMaintenanceUseCase {
  constructor(private readonly deps: MaintenanceDependencies) {}
  public async execute(id: string, context: MaintenanceOperationContext): Promise<void> {
    const maintenance = await requireMaintenance(id, this.deps.maintenanceRepo);
    const before = maintenanceSnapshot(maintenance);
    try { maintenance.markDeleted(); } catch (error) {
      throw new BusinessRuleError((error as Error).message, 'MAINTENANCE_DELETE_NOT_ALLOWED');
    }
    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      await this.deps.maintenanceRepo.save(maintenance, transaction);
      await saveAudit(this.deps.auditLogRepo, transaction, context, 'MAINTENANCE_DELETED', maintenance, before);
    });
  }
}

type ResolvedTarget =
  | { kind: 'LAB'; code: string; name: string; asset: NonNullable<Awaited<ReturnType<ILabProfileRepository['get']>>> }
  | { kind: 'COMPUTER'; code: string; name: string; asset: NonNullable<Awaited<ReturnType<IComputerRepository['findById']>>> }
  | { kind: 'EQUIPMENT'; code: string; name: string; asset: NonNullable<Awaited<ReturnType<IEquipmentRepository['findById']>>> };

async function resolveTarget(type: MaintenanceTargetType, targetId: string, deps: Pick<MaintenanceDependencies, 'labRepo' | 'computerRepo' | 'equipmentRepo'>): Promise<ResolvedTarget> {
  if (type === 'LAB') {
    const asset = await deps.labRepo.get();
    if (!asset || asset.id.toString() !== targetId) throw new NotFoundError('Không tìm thấy phòng Lab cần bảo trì.');
    return { kind: 'LAB', code: asset.labCode, name: asset.labName, asset };
  }
  if (type === 'COMPUTER') {
    const asset = await deps.computerRepo.findById(targetId);
    if (!asset) throw new NotFoundError('Không tìm thấy máy tính cần bảo trì.');
    return { kind: 'COMPUTER', code: asset.code, name: asset.name, asset };
  }
  const asset = await deps.equipmentRepo.findById(targetId);
  if (!asset) throw new NotFoundError('Không tìm thấy thiết bị cần bảo trì.');
  return { kind: 'EQUIPMENT', code: asset.code, name: asset.name, asset };
}

async function validateTechnician(technicianId: string | undefined, userRepo: IUserRepository): Promise<void> {
  if (!technicianId) return;
  const detail = await userRepo.findByIdWithRoles(technicianId);
  if (!detail || detail.user.status !== 'ACTIVE') throw new ValidationError('Người phụ trách không tồn tại hoặc không hoạt động.');
  if (!detail.roles.some((role) => ['ADMIN', 'LAB_STAFF', 'COLLABORATOR'].includes(role))) {
    throw new ValidationError('Người phụ trách phải thuộc nhóm quản trị, nhân viên Lab hoặc cộng tác viên.');
  }
}

async function ensureNoOverlap(input: MaintenanceScheduleInput, repo: IMaintenanceScheduleRepository, excludeId?: string): Promise<void> {
  if (await repo.hasOverlap({ targetType: input.targetType, targetId: input.targetId, startAt: input.scheduledStartAt, endAt: input.expectedEndAt, excludeId })) {
    throw new BusinessRuleError('Tài sản đã có lịch bảo trì trùng thời gian.', 'MAINTENANCE_TIME_CONFLICT');
  }
}

async function requireMaintenance(id: string, repo: IMaintenanceScheduleRepository): Promise<MaintenanceSchedule> {
  const maintenance = await repo.findById(id);
  if (!maintenance) throw new NotFoundError('Không tìm thấy lịch bảo trì.');
  return maintenance;
}

function createMaintenanceCode(id: string): string {
  const date = new Date();
  const datePart = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `MT-${datePart}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function maintenanceSnapshot(maintenance: MaintenanceSchedule) {
  return {
    code: maintenance.code, targetType: maintenance.targetType, targetId: maintenance.targetId,
    title: maintenance.title, status: maintenance.status, scheduledStartAt: maintenance.scheduledStartAt,
    expectedEndAt: maintenance.expectedEndAt, technicianId: maintenance.technicianId,
    quantity: maintenance.quantity, estimatedCost: maintenance.estimatedCost, actualCost: maintenance.actualCost,
  };
}

async function saveAudit(
  repo: IAuditLogRepository,
  transaction: any,
  context: MaintenanceOperationContext,
  action: string,
  maintenance: MaintenanceSchedule,
  oldValue: unknown,
) {
  await repo.save({
    userId: context.actorUserId, action, entityName: 'MaintenanceSchedules', entityId: maintenance.id.toString(),
    oldValueJson: oldValue ? JSON.stringify(oldValue) : undefined,
    newValueJson: JSON.stringify(maintenanceSnapshot(maintenance)),
    ipAddress: context.ipAddress, userAgent: context.userAgent, correlationId: context.correlationId,
  }, transaction);
}
