import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { LabProfile } from '../src/domain/entities/LabProfile';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => {
  return work();
});

const mockLabProfile = LabProfile.create({
  labCode: 'IT-LAB-01',
  labName: 'Phòng thực hành máy tính số 1',
  location: 'Tầng 3 - Tòa B',
  capacity: 45,
  description: 'Phòng Lab chính thức của Khoa CNTT',
  rules: 'Không mang đồ ăn uống vào phòng.',
  status: 'ACTIVE'
}, new UniqueEntityId('c1284a1e-cf65-4927-b50a-b3287dfb6ef5'));

describe('Lab Profile API', () => {
  const app = createExpressApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/lab-profile', () => {
    it('should return lab profile successfully for authorized user', async () => {
      vi.spyOn(container.labProfileRepo, 'get').mockResolvedValue(mockLabProfile);

      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['LAB_PROFILE_VIEW']
      });

      const res = await request(app)
        .get('/api/lab-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('labCode', 'IT-LAB-01');
    });

    it('should return 403 when user lacks permission', async () => {
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'student-id',
        roles: ['STUDENT'],
        permissions: []
      });

      const res = await request(app)
        .get('/api/lab-profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/lab-profile', () => {
    it('should update lab profile and write audit log', async () => {
      vi.spyOn(container.labProfileRepo, 'get').mockResolvedValue(mockLabProfile);
      vi.spyOn(container.labProfileRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['LAB_PROFILE_UPDATE']
      });

      const res = await request(app)
        .put('/api/lab-profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          labName: 'Phòng Lab Tin học Cải tiến',
          location: 'Tầng 4 - Tòa B',
          capacity: 50,
          description: 'Cập nhật mô tả',
          rules: 'Nội quy mới'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('labName', 'Phòng Lab Tin học Cải tiến');
      expect(container.auditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/lab-profile/status', () => {
    it('should change status successfully', async () => {
      vi.spyOn(container.labProfileRepo, 'get').mockResolvedValue(mockLabProfile);
      vi.spyOn(container.labProfileRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['LAB_STATUS_UPDATE']
      });

      const res = await request(app)
        .patch('/api/lab-profile/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'MAINTENANCE'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'MAINTENANCE');
    });
  });
});
