import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { User } from '../src/domain/entities/User';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

const adminId = '8272b1c1-50f8-4d09-860b-4ef42d2b8564';
const teacherId = 'eb9f0d65-4fed-44d8-bd55-47c9bd8f57f9';

const adminUser = User.create({
  fullName: 'Quản trị viên',
  email: 'admin@lhu.edu.vn',
  username: 'administrator',
  passwordHash: 'admin-hash',
  status: 'ACTIVE',
  mustChangePassword: false,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}, new UniqueEntityId(adminId));

const teacherUser = User.create({
  fullName: 'Nguyễn Văn Giảng',
  email: 'teacher@lhu.edu.vn',
  username: 'teacher',
  passwordHash: 'teacher-hash',
  department: 'Khoa Công nghệ thông tin',
  status: 'ACTIVE',
  mustChangePassword: true,
  createdAt: new Date('2026-02-01T00:00:00Z'),
  updatedAt: new Date('2026-02-01T00:00:00Z'),
}, new UniqueEntityId(teacherId));

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => work());
vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);

describe('User management API', () => {
  const app = createExpressApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/users allows ADMIN and returns paginated users', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: adminId,
      roles: ['ADMIN'],
      permissions: [],
    });
    vi.spyOn(container.userRepo, 'list').mockResolvedValue({
      data: [{ user: teacherUser, roles: ['TEACHER'] }],
      total: 1,
    });

    const response = await request(app)
      .get('/api/users?page=1&pageSize=20')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].passwordHash).toBeUndefined();
    expect(response.body.data[0].roles).toEqual(['TEACHER']);
    expect(response.body.meta.totalItems).toBe(1);
  });

  it('GET /api/users rejects a user without USER_VIEW', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: teacherId,
      roles: ['TEACHER'],
      permissions: [],
    });

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/users creates a user with roles and never returns the password', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: adminId,
      roles: ['ADMIN'],
      permissions: [],
    });
    vi.spyOn(container.userRepo, 'findExistingRoleCodes').mockResolvedValue(['TEACHER']);
    vi.spyOn(container.userRepo, 'isEmailOrUsernameTaken').mockResolvedValue(false);
    vi.spyOn(container.hasher, 'hash').mockResolvedValue('new-password-hash');
    vi.spyOn(container.userRepo, 'save').mockResolvedValue();
    vi.spyOn(container.userRepo, 'replaceRoles').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer admin-token')
      .send({
        fullName: 'Trần Minh Khoa',
        email: 'khoatm@lhu.edu.vn',
        username: 'khoatm',
        phone: '0901234567',
        department: 'Khoa Công nghệ thông tin',
        status: 'ACTIVE',
        roleCodes: ['TEACHER'],
        temporaryPassword: 'ChangeMe123',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.fullName).toBe('Trần Minh Khoa');
    expect(response.body.data.roles).toEqual(['TEACHER']);
    expect(response.body.data.mustChangePassword).toBe(true);
    expect(response.body.data.temporaryPassword).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('PATCH /api/users/:id/status prevents locking the current account', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: adminId,
      roles: ['ADMIN'],
      permissions: [],
    });
    vi.spyOn(container.userRepo, 'findByIdWithRoles').mockResolvedValue({
      user: adminUser,
      roles: ['ADMIN'],
    });

    const response = await request(app)
      .patch(`/api/users/${adminId}/status`)
      .set('Authorization', 'Bearer admin-token')
      .send({ status: 'LOCKED' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('PUT /api/users/:id/roles protects the last active administrator', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: adminId,
      roles: ['ADMIN'],
      permissions: [],
    });
    vi.spyOn(container.userRepo, 'findByIdWithRoles').mockResolvedValue({
      user: adminUser,
      roles: ['ADMIN'],
    });
    vi.spyOn(container.userRepo, 'findExistingRoleCodes').mockResolvedValue(['MANAGER']);
    vi.spyOn(container.userRepo, 'countActiveUsersByRole').mockResolvedValue(1);

    const response = await request(app)
      .put(`/api/users/${adminId}/roles`)
      .set('Authorization', 'Bearer admin-token')
      .send({ roleCodes: ['MANAGER'] });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('LAST_ACTIVE_ADMIN');
  });

  it('POST /api/users/:id/reset-password revokes existing sessions', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: adminId,
      roles: ['ADMIN'],
      permissions: [],
    });
    vi.spyOn(container.userRepo, 'findByIdWithRoles').mockResolvedValue({
      user: teacherUser,
      roles: ['TEACHER'],
    });
    vi.spyOn(container.hasher, 'hash').mockResolvedValue('reset-password-hash');
    vi.spyOn(container.userRepo, 'save').mockResolvedValue();
    const revokeSpy = vi.spyOn(container.sessionRepo, 'revokeByUserId').mockResolvedValue();
    vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

    const response = await request(app)
      .post(`/api/users/${teacherId}/reset-password`)
      .set('Authorization', 'Bearer admin-token')
      .send({ temporaryPassword: 'ResetPass123' });

    expect(response.status).toBe(200);
    expect(response.body.data.mustChangePassword).toBe(true);
    expect(revokeSpy).toHaveBeenCalledWith(teacherId, expect.anything());
  });
});

