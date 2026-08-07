import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { User } from '../src/domain/entities/User';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => {
  return work();
});

const mockUser = User.create({
  fullName: 'Admin Test',
  email: 'admin@test.com',
  username: 'admin',
  passwordHash: '$2b$10$YourMockedHashPasswordHere!!!!!!!!!!',
  status: 'ACTIVE',
  mustChangePassword: true,
}, new UniqueEntityId('d86eb4c0-3f41-4c6e-9080-87729f27c3e5'));


describe('Authentication API', () => {
  const app = createExpressApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      vi.spyOn(container.userRepo, 'findByUsernameOrEmail').mockResolvedValue(mockUser);
      vi.spyOn(container.hasher, 'compare').mockResolvedValue(true);
      vi.spyOn(container.rolePermQuery, 'getRolePermissionsByUserId').mockResolvedValue({
        roles: ['ADMIN'],
        permissions: ['USER_VIEW', 'USER_CREATE']
      });
      vi.spyOn(container.sessionRepo, 'save').mockResolvedValue();
      vi.spyOn(container.userRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'admin',
          password: 'p'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('mustChangePassword', true);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=');
    });

    it('should return 401 when password is wrong', async () => {
      vi.spyOn(container.userRepo, 'findByUsernameOrEmail').mockResolvedValue(mockUser);
      vi.spyOn(container.hasher, 'compare').mockResolvedValue(false);
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'admin',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '',
          password: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when unauthorized', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('should return user info when authorized', async () => {
      const token = container.tokenService.generateAccessToken({
        userId: 'd86eb4c0-3f41-4c6e-9080-87729f27c3e5',
        roles: ['ADMIN'],
        permissions: ['USER_VIEW']
      });

      vi.spyOn(container.userRepo, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(container.rolePermQuery, 'getRolePermissionsByUserId').mockResolvedValue({
        roles: ['ADMIN'],
        permissions: ['USER_VIEW']
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('d86eb4c0-3f41-4c6e-9080-87729f27c3e5');
      expect(response.body.data.roles).toContain('ADMIN');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const token = container.tokenService.generateAccessToken({
        userId: 'd86eb4c0-3f41-4c6e-9080-87729f27c3e5',
        roles: ['ADMIN'],
        permissions: []
      });

      vi.spyOn(container.userRepo, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(container.hasher, 'compare').mockResolvedValue(true);
      vi.spyOn(container.hasher, 'hash').mockResolvedValue('newHash');
      vi.spyOn(container.userRepo, 'save').mockResolvedValue();
      vi.spyOn(container.sessionRepo, 'findByHash').mockResolvedValue({
        id: 'a47a1772-e1d5-45dc-bf27-183416fa484b',
        userId: 'd86eb4c0-3f41-4c6e-9080-87729f27c3e5',
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 10000)
      });
      vi.spyOn(container.sessionRepo, 'revokeAllExcept').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', ['refreshToken=mockedRefresh'])
        .send({
          currentPassword: 'p',
          newPassword: 'n'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
