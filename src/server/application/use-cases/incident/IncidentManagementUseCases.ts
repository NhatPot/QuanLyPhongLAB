import { IIdGenerator } from '../../ports/IIdGenerator';
import { canManageLabAssets } from '../../../../lib/lending-policy';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { IncidentReport, IncidentSeverity } from '../../../domain/entities/IncidentReport';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IBookingRequestRepository } from '../../../domain/repositories/IBookingRequestRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import {
  IIncidentReportRepository,
  IncidentDetail,
  IncidentListFilters,
  IncidentVisibility,
} from '../../../domain/repositories/IIncidentReportRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UniqueEntityId } from '../../../domain/value-objects/UniqueEntityId';
import { BusinessRuleError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';

export interface IncidentOperationContext {
  actorUserId: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface IncidentContentInput {
  title: string;
  description: string;
  severity: IncidentSeverity;
  computerId?: string;
  equipmentId?: string;
  bookingRequestId?: string;
  imageUrl?: string;
}

interface IncidentDependencies {
  incidentRepo: IIncidentReportRepository;
  computerRepo: IComputerRepository;
  equipmentRepo: IEquipmentRepository;
  bookingRepo: IBookingRequestRepository;
  userRepo: IUserRepository;
  rolePermissionQuery: IRolePermissionQuery;
  uow: IUnitOfWork;
  auditLogRepo: IAuditLogRepository;
}

export class ListIncidentsUseCase {
  constructor(private readonly incidentRepo: IIncidentReportRepository) {}
  public execute(filters: Omit<IncidentListFilters, keyof IncidentVisibility>, context: IncidentOperationContext) {
    return this.incidentRepo.list({ ...filters, ...visibilityOf(context) });
  }
}

export class GetIncidentSummaryUseCase {
  constructor(private readonly incidentRepo: IIncidentReportRepository) {}
  public execute(context: IncidentOperationContext) { return this.incidentRepo.getSummary(visibilityOf(context)); }
}

export class GetIncidentOptionsUseCase {
  constructor(private readonly incidentRepo: IIncidentReportRepository) {}
  public execute(context: IncidentOperationContext) { return this.incidentRepo.getOptions(!canManageLabAssets(context.roles)); }
}

export class GetIncidentUseCase {
  constructor(private readonly incidentRepo: IIncidentReportRepository) {}
  public async execute(id: string, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.incidentRepo, id);
    assertVisible(detail, context);
    return detail;
  }
}

export class CreateIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies, private readonly idGenerator: IIdGenerator) {}

  public async execute(input: IncidentContentInput, context: IncidentOperationContext): Promise<IncidentDetail> {
    await validateContentTargets(this.deps, input, context);
    const id = this.idGenerator.generate();
    const incident = IncidentReport.create({
      code: incidentCode(id), reporterId: context.actorUserId,
      title: input.title, description: input.description, severity: input.severity, status: 'OPEN',
      computerId: cleanOptional(input.computerId), equipmentId: cleanOptional(input.equipmentId),
      bookingRequestId: cleanOptional(input.bookingRequestId), imageUrl: cleanOptional(input.imageUrl),
    }, new UniqueEntityId(id));

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      await this.deps.incidentRepo.save(incident, transaction);
      if (incident.bookingRequestId) {
        const booking = await this.deps.bookingRepo.findById(incident.bookingRequestId, transaction);
        if (!booking) throw new NotFoundError('Không tìm thấy yêu cầu sử dụng liên quan.');
        if (!booking.hasIncident) { booking.markIncident(); await this.deps.bookingRepo.save(booking, transaction); }
      }
      await audit(this.deps.auditLogRepo, context, 'INCIDENT_CREATED', incident, null, snapshot(incident), transaction);
    });
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

export class UpdateIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies) {}
  public async execute(id: string, input: IncidentContentInput, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.deps.incidentRepo, id);
    assertMutableBy(detail, context);
    await validateContentTargets(this.deps, input, context);
    const oldValue = snapshot(detail.incident);
    transition(() => detail.incident.updateDetails({
      ...input,
      computerId: cleanOptional(input.computerId), equipmentId: cleanOptional(input.equipmentId),
      bookingRequestId: cleanOptional(input.bookingRequestId), imageUrl: cleanOptional(input.imageUrl),
    }));
    await saveWithAudit(this.deps, context, detail.incident, 'INCIDENT_UPDATED', oldValue);
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

export class AssignIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies) {}
  public async execute(id: string, assignedTo: string, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.deps.incidentRepo, id);
    const user = await this.deps.userRepo.findById(assignedTo);
    if (!user || user.status !== 'ACTIVE') throw new ValidationError('Người được phân công không tồn tại hoặc đang ngừng hoạt động.');
    const access = await this.deps.rolePermissionQuery.getRolePermissionsByUserId(assignedTo);
    if (!access.roles.includes('ADMIN') && !access.permissions.some((code) => ['INCIDENT_VIEW_ASSIGNED', 'INCIDENT_UPDATE', 'INCIDENT_RESOLVE'].includes(code))) {
      throw new ValidationError('Người được chọn chưa có quyền tiếp nhận và xử lý sự cố.');
    }
    const oldValue = snapshot(detail.incident);
    transition(() => detail.incident.assign(assignedTo));
    await saveWithAudit(this.deps, context, detail.incident, 'INCIDENT_ASSIGNED', oldValue);
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

export class StartIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies) {}
  public async execute(id: string, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.deps.incidentRepo, id);
    assertMutableBy(detail, context);
    const oldValue = snapshot(detail.incident);
    transition(() => detail.incident.start(context.actorUserId));
    await saveWithAudit(this.deps, context, detail.incident, 'INCIDENT_STARTED', oldValue);
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

export class ResolveIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies) {}
  public async execute(id: string, resultNote: string, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.deps.incidentRepo, id);
    assertMutableBy(detail, context);
    const oldValue = snapshot(detail.incident);
    transition(() => detail.incident.resolve(resultNote));
    await saveWithAudit(this.deps, context, detail.incident, 'INCIDENT_RESOLVED', oldValue);
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

export class CloseIncidentUseCase {
  constructor(private readonly deps: IncidentDependencies) {}
  public async execute(id: string, resultNote: string | undefined, context: IncidentOperationContext): Promise<IncidentDetail> {
    const detail = await findIncident(this.deps.incidentRepo, id);
    const oldValue = snapshot(detail.incident);
    transition(() => detail.incident.close(resultNote));
    await saveWithAudit(this.deps, context, detail.incident, 'INCIDENT_CLOSED', oldValue);
    return (await this.deps.incidentRepo.findById(id))!;
  }
}

async function validateContentTargets(deps: IncidentDependencies, input: IncidentContentInput, context: IncidentOperationContext): Promise<void> {
  if (input.computerId && input.equipmentId) throw new ValidationError('Một sự cố chỉ được liên kết với một loại tài sản.');
  if (input.computerId && !(await deps.computerRepo.findById(input.computerId))) throw new NotFoundError('Không tìm thấy máy tính liên quan.');
  if (input.equipmentId) {
    const equipment = await deps.equipmentRepo.findById(input.equipmentId);
    if (!equipment || (!canManageLabAssets(context.roles) && !equipment.isLendable)) throw new NotFoundError('Không tìm thấy thiết bị liên quan.');
  }
  if (input.bookingRequestId && !(await deps.bookingRepo.findById(input.bookingRequestId))) throw new NotFoundError('Không tìm thấy yêu cầu sử dụng liên quan.');
}

async function findIncident(repo: IIncidentReportRepository, id: string): Promise<IncidentDetail> {
  const detail = await repo.findById(id);
  if (!detail) throw new NotFoundError('Không tìm thấy sự cố.');
  return detail;
}

function assertVisible(detail: IncidentDetail, context: IncidentOperationContext): void {
  const visibility = visibilityOf(context);
  if (visibility.viewAll) return;
  const own = visibility.viewOwn && detail.incident.reporterId === context.actorUserId;
  const assigned = visibility.viewAssigned && detail.incident.assignedTo === context.actorUserId;
  if (!own && !assigned) throw new ForbiddenError('Bạn không có quyền xem sự cố này.');
}

function assertMutableBy(detail: IncidentDetail, context: IncidentOperationContext): void {
  const canManageAll = context.roles.includes('ADMIN') || context.permissions.includes('INCIDENT_VIEW');
  if (!canManageAll && detail.incident.assignedTo !== context.actorUserId) {
    throw new ForbiddenError('Bạn chỉ có thể cập nhật sự cố được phân công cho mình.');
  }
}

function visibilityOf(context: IncidentOperationContext): IncidentVisibility {
  const viewAll = context.roles.includes('ADMIN') || context.permissions.includes('INCIDENT_VIEW');
  return {
    viewerId: context.actorUserId,
    viewAll,
    viewOwn: viewAll || context.permissions.includes('INCIDENT_VIEW_OWN'),
    viewAssigned: viewAll || context.permissions.includes('INCIDENT_VIEW_ASSIGNED'),
  };
}

async function saveWithAudit(
  deps: IncidentDependencies,
  context: IncidentOperationContext,
  incident: IncidentReport,
  action: string,
  oldValue: unknown,
): Promise<void> {
  await deps.uow.complete(async () => {
    const transaction = deps.uow.getTransaction();
    await deps.incidentRepo.save(incident, transaction);
    if (incident.bookingRequestId) {
      const booking = await deps.bookingRepo.findById(incident.bookingRequestId, transaction);
      if (booking && !booking.hasIncident) { booking.markIncident(); await deps.bookingRepo.save(booking, transaction); }
    }
    await audit(deps.auditLogRepo, context, action, incident, oldValue, snapshot(incident), transaction);
  });
}

function audit(repo: IAuditLogRepository, context: IncidentOperationContext, action: string, incident: IncidentReport, oldValue: unknown, newValue: unknown, transaction: any) {
  return repo.save({
    userId: context.actorUserId, action, entityName: 'IncidentReport', entityId: incident.id.toString(),
    oldValueJson: oldValue ? JSON.stringify(oldValue) : null,
    newValueJson: newValue ? JSON.stringify(newValue) : null,
    ipAddress: context.ipAddress, userAgent: context.userAgent, correlationId: context.correlationId,
  }, transaction);
}

function transition(work: () => void): void {
  try { work(); }
  catch (error) { throw new BusinessRuleError((error as Error).message, 'INVALID_INCIDENT_TRANSITION'); }
}

function snapshot(incident: IncidentReport) {
  return {
    code: incident.code, reporterId: incident.reporterId, computerId: incident.computerId || null,
    equipmentId: incident.equipmentId || null, bookingRequestId: incident.bookingRequestId || null,
    title: incident.title, description: incident.description, severity: incident.severity, status: incident.status,
    imageUrl: incident.imageUrl || null, assignedTo: incident.assignedTo || null,
    resolvedAt: incident.resolvedAt || null, closedAt: incident.closedAt || null,
    resultNote: incident.resultNote || null,
  };
}

function incidentCode(id: string): string {
  const date = new Date();
  const day = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return `SC-${day}-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function cleanOptional(value?: string): string | undefined { return value?.trim() || undefined; }
