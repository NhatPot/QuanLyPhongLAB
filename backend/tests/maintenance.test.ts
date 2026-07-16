import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { Computer } from '../src/domain/entities/Computer';
import { MaintenanceSchedule } from '../src/domain/entities/MaintenanceSchedule';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

const adminId = '8272b1c1-50f8-4d09-860b-4ef42d2b8564';
const technicianId = '347c07c7-9c76-4cd4-89f0-dddc849aef38';
const computerId = 'd4c728e8-d102-4c28-98e6-e17f7d1b326e';
const maintenanceId = '1d3dcf79-b131-41c1-92e0-457a8e9da568';

function scheduledMaintenance() {
  return MaintenanceSchedule.create({
    code: 'MT-20260716-1D3DCF', targetType: 'COMPUTER', targetId: computerId,
    targetCode: 'PC-01', targetName: 'Máy tính PC-01', title: 'Bảo trì PC-01',
    reason: 'Bảo trì định kỳ', scheduledStartAt: new Date('2026-07-20T01:00:00.000Z'),
    expectedEndAt: new Date('2026-07-20T03:00:00.000Z'), status: 'SCHEDULED',
    technicianId, quantity: 1, estimatedCost: 200000, createdBy: adminId,
    triggerSource: 'MANUAL',
    createdAt: new Date('2026-07-16T01:00:00.000Z'), updatedAt: new Date('2026-07-16T01:00:00.000Z'),
  }, new UniqueEntityId(maintenanceId));
}

function activeComputer() {
  return Computer.create({
    code: 'PC-01', name: 'Máy tính PC-01', cpu: 'Intel Core i5', ram: '16GB',
    storage: '512GB SSD', status: 'ACTIVE', position: 'Bàn 01',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  }, new UniqueEntityId(computerId));
}

const detailOf = (maintenance: MaintenanceSchedule) => ({
  maintenance, technicianName: 'Nguyễn Kỹ Thuật', technicianUsername: 'technician', createdByName: 'Administrator',
});

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => work());
vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);
vi.spyOn(container.computerActivityRepo, 'transition').mockResolvedValue();
vi.spyOn(container.computerActivityRepo, 'closeCurrent').mockResolvedValue();

describe('Maintenance API and authorization', () => {
  const app = createExpressApp();

  beforeEach(() => vi.clearAllMocks());

  it('requires authentication for maintenance data', async () => {
    const response = await request(app).get('/api/maintenances/summary');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a user without MAINTENANCE_VIEW', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: technicianId, roles: ['TEACHER'], permissions: ['COMPUTER_VIEW'] });

    const response = await request(app).get('/api/maintenances').set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns maintenance summary to an authorized user', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: technicianId, roles: ['LAB_STAFF'], permissions: ['MAINTENANCE_VIEW'] });
    vi.spyOn(container.maintenanceRepo, 'getSummary').mockResolvedValue({
      total: 6, pending: 1, scheduled: 2, inProgress: 1, completed: 1, cancelled: 1, overdue: 1, totalActualCost: 420000,
    });

    const response = await request(app).get('/api/maintenances/summary').set('Authorization', 'Bearer staff-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ total: 6, pending: 1, inProgress: 1, overdue: 1, totalActualCost: 420000 });
  });

  it('validates route input before reaching the maintenance repository', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    const findSpy = vi.spyOn(container.maintenanceRepo, 'getDetailById');

    const response = await request(app).get('/api/maintenances/not-a-uuid').set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('creates a computer maintenance schedule and records an audit log', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(activeComputer());
    vi.spyOn(container.userRepo, 'findByIdWithRoles').mockResolvedValue(null);
    vi.spyOn(container.maintenanceRepo, 'hasOverlap').mockResolvedValue(false);
    const saveSpy = vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.maintenanceRepo, 'getDetailById').mockResolvedValue(null);
    const auditSpy = vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
    vi.spyOn(container.idGenerator, 'generate').mockReturnValue(maintenanceId);

    const response = await request(app)
      .post('/api/maintenances')
      .set('Authorization', 'Bearer admin-token')
      .send({
        targetType: 'COMPUTER', targetId: computerId, title: 'Bảo trì PC-01', reason: 'Bảo trì định kỳ',
        scheduledStartAt: '2026-07-20T01:00:00.000Z', expectedEndAt: '2026-07-20T03:00:00.000Z',
        technicianId: null, quantity: 1, maintenanceSource: null, estimatedCost: 200000,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ id: maintenanceId, targetType: 'COMPUTER', targetCode: 'PC-01', status: 'SCHEDULED' });
    expect(saveSpy).toHaveBeenCalledOnce();
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'MAINTENANCE_CREATED', entityName: 'MaintenanceSchedules' }), expect.anything());
  });

  it('starts a scheduled maintenance and moves its computer to MAINTENANCE', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: technicianId, roles: ['LAB_STAFF'], permissions: ['MAINTENANCE_START'] });
    const maintenance = scheduledMaintenance(); const computer = activeComputer();
    vi.spyOn(container.maintenanceRepo, 'findById').mockResolvedValue(maintenance);
    vi.spyOn(container.maintenanceRepo, 'getDetailById').mockImplementation(async () => detailOf(maintenance));
    vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(computer);
    const computerSaveSpy = vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
    vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

    const response = await request(app).post(`/api/maintenances/${maintenanceId}/start`).set('Authorization', 'Bearer staff-token');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('IN_PROGRESS');
    expect(computer.status).toBe('MAINTENANCE');
    expect(computerSaveSpy).toHaveBeenCalledOnce();
  });

  it('does not complete a schedule that has not started', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: technicianId, roles: ['LAB_STAFF'], permissions: ['MAINTENANCE_COMPLETE'] });
    const maintenance = scheduledMaintenance();
    vi.spyOn(container.maintenanceRepo, 'findById').mockResolvedValue(maintenance);
    vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(activeComputer());

    const response = await request(app)
      .post(`/api/maintenances/${maintenanceId}/complete`)
      .set('Authorization', 'Bearer staff-token')
      .send({ resultNote: 'Đã hoàn tất kiểm tra', actualCost: 150000, outcome: 'AVAILABLE' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('MAINTENANCE_COMPLETE_NOT_ALLOWED');
  });

  it('creates one pending maintenance proposal when a computer becomes broken', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    const computer = activeComputer();
    vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(computer);
    vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
    vi.spyOn(container.maintenanceRepo, 'hasActiveForTarget').mockResolvedValue(false);
    const maintenanceSaveSpy = vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
    vi.spyOn(container.idGenerator, 'generate').mockReturnValue('6b98fb2a-f372-4908-8aad-ed3989cf5fa9');

    const response = await request(app)
      .patch(`/api/computers/${computerId}/status`)
      .set('Authorization', 'Bearer admin-token')
      .send({ status: 'BROKEN' });

    expect(response.status).toBe(200);
    expect(computer.status).toBe('BROKEN');
    expect(maintenanceSaveSpy).toHaveBeenCalledWith(expect.objectContaining({}), expect.anything());
    const proposal = maintenanceSaveSpy.mock.calls[0][0];
    expect(proposal.status).toBe('PENDING');
    expect(proposal.triggerSource).toBe('BROKEN_STATUS');
  });

  it('does not create a duplicate proposal for a broken computer with an active maintenance record', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    const computer = activeComputer();
    vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(computer);
    vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
    vi.spyOn(container.maintenanceRepo, 'hasActiveForTarget').mockResolvedValue(true);
    const maintenanceSaveSpy = vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

    const response = await request(app)
      .patch(`/api/computers/${computerId}/status`)
      .set('Authorization', 'Bearer admin-token')
      .send({ status: 'BROKEN' });

    expect(response.status).toBe(200);
    expect(maintenanceSaveSpy).not.toHaveBeenCalled();
  });

  it('syncs 270-day reminders into pending maintenance proposals', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.computerRepo, 'listMaintenanceCandidates').mockResolvedValue([activeComputer()]);
    vi.spyOn(container.maintenanceRepo, 'hasActiveForTarget').mockResolvedValue(false);
    const maintenanceSaveSpy = vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
    vi.spyOn(container.idGenerator, 'generate').mockReturnValue('9faf5aad-515c-4d5f-a2ef-e6d12f93f39e');

    const response = await request(app)
      .post('/api/maintenances/sync-reminders')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ created: 1, intervalDays: 270 });
    const proposal = maintenanceSaveSpy.mock.calls[0][0];
    expect(proposal.status).toBe('PENDING');
    expect(proposal.triggerSource).toBe('PERIODIC_270');
  });

  it('links a legacy MAINTENANCE computer to an in-progress maintenance record', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    const computer = activeComputer(); computer.changeStatus('MAINTENANCE');
    vi.spyOn(container.computerRepo, 'listMaintenanceCandidates').mockResolvedValue([computer]);
    vi.spyOn(container.maintenanceRepo, 'hasActiveForTarget').mockResolvedValue(false);
    const maintenanceSaveSpy = vi.spyOn(container.maintenanceRepo, 'save').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
    vi.spyOn(container.idGenerator, 'generate').mockReturnValue('0ef03116-2d30-481b-af8a-04743dde3fee');

    const response = await request(app)
      .post('/api/maintenances/sync-reminders')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    const linked = maintenanceSaveSpy.mock.calls[0][0];
    expect(linked.status).toBe('IN_PROGRESS');
    expect(linked.triggerSource).toBe('MAINTENANCE_STATUS');
    expect(linked.startedAt).toBeInstanceOf(Date);
  });
});
