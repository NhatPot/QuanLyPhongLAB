import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { Equipment } from '../src/domain/entities/Equipment';
import { EquipmentCategory } from '../src/domain/entities/EquipmentCategory';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';

vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => {
  return work();
});
vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);

const mockCategory = EquipmentCategory.create({
  code: 'CAT01',
  name: 'Chuột máy tính',
  description: 'Thiết bị ngoại vi'
}, new UniqueEntityId('c1284a1e-cf65-4927-b50a-b3287dfb6ef5'));

const mockEquipment = Equipment.create({
  code: 'EQ01',
  name: 'Chuột Logitech G102',
  categoryId: 'c1284a1e-cf65-4927-b50a-b3287dfb6ef5',
  totalQuantity: 10,
  availableQuantity: 10,
  reservedQuantity: 0,
  borrowedQuantity: 0,
  brokenQuantity: 0,
  maintenanceQuantity: 0,
  lostQuantity: 0,
  status: 'ACTIVE',
  rowVersion: Buffer.from('mock-version-hex', 'utf-8')
}, new UniqueEntityId('e1284a1e-cf65-4927-b50a-b3287dfb6ef5'));

describe('Equipment API', () => {
  const app = createExpressApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/equipments/categories', () => {
    it('should return categories successfully', async () => {
      vi.spyOn(container.equipmentCategoryRepo, 'list').mockResolvedValue([mockCategory]);
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_CATEGORY_VIEW']
      });

      const res = await request(app)
        .get('/api/equipments/categories')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/equipments', () => {
    it('should create equipment successfully', async () => {
      vi.spyOn(container.equipmentRepo, 'findByCode').mockResolvedValue(null);
      vi.spyOn(container.equipmentRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_CREATE']
      });

      const res = await request(app)
        .post('/api/equipments')
        .set('Authorization', 'Bearer valid-token')
        .send({
          code: 'EQ02',
          name: 'Bàn phím Dell KB216',
          categoryId: 'c1284a1e-cf65-4927-b50a-b3287dfb6ef5',
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('code', 'EQ02');
      expect(res.body.data).toHaveProperty('totalQuantity', 1);
      expect(res.body.data).toHaveProperty('availableQuantity', 1);
    });

    it('should generate a code from the category when code is omitted', async () => {
      const existingGenerated = Equipment.create({
        code: 'CAT01-001',
        name: 'Thiết bị đã có mã tự sinh',
        categoryId: mockCategory.id.toString(),
        totalQuantity: 1,
        availableQuantity: 1,
        reservedQuantity: 0,
        borrowedQuantity: 0,
        brokenQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        status: 'ACTIVE'
      });
      vi.spyOn(container.equipmentCategoryRepo, 'findById').mockResolvedValue(mockCategory);
      vi.spyOn(container.equipmentRepo, 'list').mockResolvedValue({ data: [existingGenerated], total: 1 });
      vi.spyOn(container.equipmentRepo, 'findByCode').mockResolvedValue(null);
      vi.spyOn(container.equipmentRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_CREATE']
      });

      const res = await request(app)
        .post('/api/equipments')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'ESP32 DevKit',
          categoryId: mockCategory.id.toString(),
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('code', 'CAT01-002');
    });
  });

  describe('DELETE /api/equipments/:id', () => {
    it('should reject users without delete permission', async () => {
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'lab-staff-id',
        roles: ['LAB_STAFF'],
        permissions: ['EQUIPMENT_VIEW']
      });

      const res = await request(app)
        .delete(`/api/equipments/${mockEquipment.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });

    it('should reject equipment that is currently borrowed', async () => {
      const borrowedEquipment = Equipment.create({
        code: 'EQ-BORROWED',
        name: 'Thiết bị đang mượn',
        categoryId: 'c1284a1e-cf65-4927-b50a-b3287dfb6ef5',
        totalQuantity: 10,
        availableQuantity: 9,
        reservedQuantity: 0,
        borrowedQuantity: 1,
        brokenQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        status: 'ACTIVE'
      }, new UniqueEntityId('e2284a1e-cf65-4927-b50a-b3287dfb6ef5'));
      vi.spyOn(container.equipmentRepo, 'findById').mockResolvedValue(borrowedEquipment);
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_DELETE']
      });

      const res = await request(app)
        .delete(`/api/equipments/${borrowedEquipment.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('mượn');
    });

    it('should soft delete equipment for an administrator', async () => {
      vi.spyOn(container.equipmentRepo, 'findById').mockResolvedValue(mockEquipment);
      vi.spyOn(container.equipmentRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_DELETE']
      });

      const res = await request(app)
        .delete(`/api/equipments/${mockEquipment.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(container.equipmentRepo.save).toHaveBeenCalled();
      expect(container.auditLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('POST /api/equipments/:id/adjust', () => {
    it('should adjust inventory successfully', async () => {
      vi.spyOn(container.equipmentRepo, 'findById').mockResolvedValue(mockEquipment);
      vi.spyOn(container.equipmentRepo, 'save').mockResolvedValue();
      vi.spyOn(container.equipmentTxRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_INVENTORY_ADJUST']
      });

      const res = await request(app)
        .post(`/api/equipments/${mockEquipment.id}/adjust`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          delta: 5,
          note: 'Nhập thêm chuột mới'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('totalQuantity', 15);
      expect(res.body.data).toHaveProperty('availableQuantity', 15);
    });
  });

  describe('POST /api/equipments/:id/report-broken', () => {
    it('should report broken equipment and reduce available quantity', async () => {
      vi.spyOn(container.equipmentRepo, 'findById').mockResolvedValue(mockEquipment);
      vi.spyOn(container.equipmentRepo, 'save').mockResolvedValue();
      vi.spyOn(container.equipmentTxRepo, 'save').mockResolvedValue();
      vi.spyOn(container.auditLogRepo, 'save').mockResolvedValue();
      vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
        userId: 'admin-id',
        roles: ['ADMIN'],
        permissions: ['EQUIPMENT_DAMAGE_REPORT']
      });

      const res = await request(app)
        .post(`/api/equipments/${mockEquipment.id}/report-broken`)
        .set('Authorization', 'Bearer valid-token')
        .send({
          quantity: 2,
          from: 'AVAILABLE',
          note: 'Bị hỏng do học viên làm rơi'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('brokenQuantity', 2);
    });
  });
});
