import { Router } from 'express';
import { LabController } from '../controllers/LabController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { z } from 'zod';

export const updateLabProfileSchema = z.object({
  body: z.object({
    labName: z.string().min(1, 'Tên phòng Lab không được trống.'),
    location: z.string().min(1, 'Vị trí phòng Lab không được trống.'),
    capacity: z.number().int().positive('Sức chứa phòng Lab phải lớn hơn 0.'),
    description: z.string().optional(),
    rules: z.string().optional(),
    managerId: z.string().uuid('ID Người quản lý không hợp lệ.').optional().nullable()
  })
});

export const updateLabStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'MAINTENANCE', 'LOCKED', 'INACTIVE'], {
      errorMap: () => ({ message: 'Trạng thái phòng Lab không hợp lệ.' })
    })
  })
});

export function createLabRouter(controller: LabController): Router {
  const router = Router();

  router.get('/', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('LAB_PROFILE_VIEW')) {
      return controller.getProfile(req, res);
    }
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem thông tin phòng Lab.' }
    });
  });

  router.put('/', authMiddleware, validateRequest(updateLabProfileSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('LAB_PROFILE_UPDATE')) {
      return controller.updateProfile(req, res);
    }
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Bạn không có quyền sửa thông tin phòng Lab.' }
    });
  });

  router.patch('/status', authMiddleware, validateRequest(updateLabStatusSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('LAB_STATUS_UPDATE')) {
      return controller.updateStatus(req, res);
    }
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Bạn không có quyền đổi trạng thái phòng Lab.' }
    });
  });

  return router;
}
