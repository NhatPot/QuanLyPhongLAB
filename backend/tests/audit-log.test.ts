import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';

const adminId = '8272b1c1-50f8-4d09-860b-4ef42d2b8564';
const managerId = 'eb9f0d65-4fed-44d8-bd55-47c9bd8f57f9';

describe('Audit log API', () => {
  const app = createExpressApp();

  beforeEach(() => vi.clearAllMocks());

  it('GET /api/audit-logs returns paginated audit records for authorized users', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.auditLogRepo, 'list').mockResolvedValue({
      data: [{
        id: 'b7d86c72-1637-4fdf-8b97-4a8fd9b3be4a',
        userId: adminId,
        actorName: 'Quản trị viên',
        actorUsername: 'administrator',
        action: 'USER_CREATED',
        entityName: 'Users',
        entityId: adminId,
        oldValueJson: null,
        newValueJson: '{"status":"ACTIVE"}',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
        correlationId: 'test-correlation',
        createdAt: new Date('2026-07-15T10:00:00Z'),
      }],
      total: 1,
    });

    const response = await request(app).get('/api/audit-logs?page=1&pageSize=20').set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].newValue).toEqual({ status: 'ACTIVE' });
    expect(response.body.meta.totalItems).toBe(1);
  });

  it('GET /api/audit-logs rejects a manager without AUDIT_LOG_VIEW', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: managerId, roles: ['MANAGER'], permissions: ['REPORT_VIEW'] });

    const response = await request(app).get('/api/audit-logs').set('Authorization', 'Bearer manager-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

