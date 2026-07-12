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
