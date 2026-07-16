import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { Computer } from '../src/domain/entities/Computer';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => {
  return work();
});
vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);

const mockComputer = Computer.create({
  code: 'PC01',
  name: 'Máy số 1',
  cpu: 'Intel i5',
  ram: '16GB',
  storage: '512GB SSD',
  status: 'ACTIVE',
  position: 'Dãy A'
}, new UniqueEntityId('d4c728e8-d102-4c28-98e6-e17f7d1b326e'));

describe('Computer API', () => {
  const app = createExpressApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/computers', () => {
    it('should return list of computers successfully', async () => {
      vi.spyOn(container.computerRepo, 'list').mockResolvedValue({
        data: [mockComputer],
        total: 1
      });

      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['COMPUTER_VIEW']
      });

      const res = await request(app)
        .get('/api/computers')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('code', 'PC01');
    });
  });

  describe('POST /api/computers', () => {
    it('should create computer successfully', async () => {
      vi.spyOn(container.computerRepo, 'findByCode').mockResolvedValue(null);
      vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['COMPUTER_CREATE']
      });

      const res = await request(app)
        .post('/api/computers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          code: 'PC02',
          name: 'Máy số 2',
          cpu: 'Intel i7',
          ram: '32GB',
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('code', 'PC02');
    });
  });

  describe('PUT /api/computers/:id', () => {
    it('should update computer hardware info', async () => {
      vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(mockComputer);
      vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['COMPUTER_UPDATE']
      });

      const res = await request(app)
        .put(`/api/computers/${mockComputer.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          code: 'PC01',
          name: 'Máy số 1 Cải tiến',
          cpu: 'Intel i9',
          ram: '64GB',
          status: 'ACTIVE'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('cpu', 'Intel i9');
    });
  });

  describe('DELETE /api/computers/:id', () => {
    it('should soft delete computer successfully', async () => {
      vi.spyOn(container.computerRepo, 'findById').mockResolvedValue(mockComputer);
      vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['COMPUTER_DELETE']
      });

      const res = await request(app)
        .delete(`/api/computers/${mockComputer.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
});
