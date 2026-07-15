import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';

const adminId = '8272b1c1-50f8-4d09-860b-4ef42d2b8564';
const managerId = 'eb9f0d65-4fed-44d8-bd55-47c9bd8f57f9';
const role = {
  id: 'f598fd39-c7f7-4872-b6d7-4f45e23e6773',
  code: 'MANAGER',
  name: 'Quản lý',
  description: 'Xem dashboard và báo cáo.',
  userCount: 2,
  permissionCodes: ['REPORT_VIEW'],
};

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => work());
vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);

describe('Role and permission API', () => {
  const app = createExpressApp();

  beforeEach(() => vi.clearAllMocks());

  it('GET /api/roles/catalog returns roles and permissions for an administrator', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.rolePermissionRepo, 'listRoles').mockResolvedValue([role]);
    vi.spyOn(container.rolePermissionRepo, 'listPermissions').mockResolvedValue([
      { id: '8dfbd1f1-b8bd-4d18-8898-c54d7b4e0c7a', code: 'REPORT_VIEW', name: 'Xem báo cáo', description: 'Xem báo cáo tổng hợp.', group: 'reports' },
    ]);

    const response = await request(app).get('/api/roles/catalog').set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data.roles[0].code).toBe('MANAGER');
    expect(response.body.data.permissions[0].group).toBe('reports');
  });

  it('PUT /api/roles/ADMIN/permissions rejects protected administrator role', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.rolePermissionRepo, 'getRoleByCode').mockResolvedValue({ ...role, code: 'ADMIN', name: 'Quản trị viên' });

    const response = await request(app)
      .put('/api/roles/ADMIN/permissions')
      .set('Authorization', 'Bearer admin-token')
      .send({ permissionCodes: ['REPORT_VIEW'] });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('PROTECTED_ROLE');
  });

  it('PUT /api/roles/MANAGER/permissions updates permissions and records audit', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: adminId, roles: ['ADMIN'], permissions: [] });
    vi.spyOn(container.rolePermissionRepo, 'getRoleByCode').mockResolvedValue(role);
    vi.spyOn(container.rolePermissionRepo, 'findExistingPermissionCodes').mockResolvedValue(['REPORT_VIEW', 'REPORT_EXPORT']);
    vi.spyOn(container.rolePermissionRepo, 'replacePermissions').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

    const response = await request(app)
      .put('/api/roles/MANAGER/permissions')
      .set('Authorization', 'Bearer admin-token')
      .send({ permissionCodes: ['REPORT_VIEW', 'REPORT_EXPORT'] });

    expect(response.status).toBe(200);
    expect(response.body.data.permissionCodes).toEqual(['REPORT_EXPORT', 'REPORT_VIEW']);
  });

  it('GET /api/roles/catalog rejects a manager without PERMISSION_MANAGE', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({ userId: managerId, roles: ['MANAGER'], permissions: ['REPORT_VIEW'] });

    const response = await request(app).get('/api/roles/catalog').set('Authorization', 'Bearer manager-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

