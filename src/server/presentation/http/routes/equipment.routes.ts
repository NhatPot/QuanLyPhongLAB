import { Router } from 'express';
import { EquipmentController } from '../controllers/EquipmentController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Mã danh mục không được trống.'),
    name: z.string().min(1, 'Tên danh mục không được trống.'),
    description: z.string().optional()
  })
});

export const createEquipmentSchema = z.object({
  body: z.object({
    isLendable: z.boolean().default(false),
    quantity: z.coerce.number().int().min(1, 'Số lượng thiết bị tối thiểu là 1.').default(1),
    code: z.string().trim().max(50, 'Mã thiết bị tối đa 50 ký tự.').optional().default(''),
    name: z.string().min(1, 'Tên thiết bị không được trống.'),
    categoryId: z.string().min(1, 'Mã danh mục không được trống.'),
    location: z.string().optional(),
    managerId: z.string().optional(),
    status: z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']),
    imageUrl: z.string().optional(),
    note: z.string().optional()
  })
});

export const updateEquipmentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID thiết bị không được trống.')
  }),
  body: z.object({
    isLendable: z.boolean().optional(),
    code: z.string().min(1, 'Mã thiết bị không được trống.'),
    name: z.string().min(1, 'Tên thiết bị không được trống.'),
    categoryId: z.string().min(1, 'Mã danh mục không được trống.'),
    location: z.string().optional(),
    managerId: z.string().optional(),
    status: z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']),
    imageUrl: z.string().optional(),
    note: z.string().optional()
  })
});

export const adjustInventorySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID thiết bị không được trống.')
  }),
  body: z.object({
    delta: z.number().int('Delta phải là số nguyên.'),
    note: z.string().optional()
  })
});

export const reportBrokenSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID thiết bị không được trống.')
  }),
  body: z.object({
    quantity: z.number().int().min(1, 'Số lượng báo hỏng tối thiểu phải là 1.'),
    from: z.enum(['AVAILABLE', 'BORROWED']),
    note: z.string().optional()
  })
});

export function createEquipmentRouter(controller: EquipmentController): Router {
  const router = Router();

  router.put('/categories/:id', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_CATEGORY_MANAGE')) return controller.updateCategory(req, res);
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền sửa danh mục.' } });
  });

  router.post('/categories', authMiddleware, validateRequest(createCategorySchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_CATEGORY_CREATE')) {
      return controller.createCategory(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/categories', authMiddleware, (req, res) => {
    if (
      req.user?.roles.includes('ADMIN')
      || req.user?.permissions.includes('EQUIPMENT_VIEW')
      || req.user?.permissions.includes('EQUIPMENT_CATEGORY_VIEW')
    ) {
      return controller.listCategories(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_VIEW')) {
      return controller.list(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/:id', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_VIEW')) {
      return controller.get(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.post('/', authMiddleware, validateRequest(createEquipmentSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_CREATE')) {
      return controller.create(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.put('/:id', authMiddleware, validateRequest(updateEquipmentSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_UPDATE')) {
      return controller.update(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_DELETE')) {
      return controller.delete(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.post('/:id/adjust', authMiddleware, validateRequest(adjustInventorySchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_INVENTORY_ADJUST')) {
      return controller.adjustInventory(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.post('/:id/report-broken', authMiddleware, validateRequest(reportBrokenSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_DAMAGE_REPORT')) {
      return controller.reportBroken(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/:id/transactions', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('EQUIPMENT_VIEW')) {
      return controller.listTransactions(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  return router;
}
