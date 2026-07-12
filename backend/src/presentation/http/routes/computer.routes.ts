import { Router } from 'express';
import { ComputerController } from '../controllers/ComputerController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { z } from 'zod';

export const createComputerSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Mã máy tính không được trống.'),
    name: z.string().min(1, 'Tên máy tính không được trống.'),
    cpu: z.string().optional(),
    ram: z.string().optional(),
    storage: z.string().optional(),
    gpu: z.string().optional(),
    operatingSystem: z.string().optional(),
    installedSoftware: z.string().optional(),
    ipAddress: z.string().optional(),
    macAddress: z.string().optional(),
    position: z.string().optional(),
    status: z.enum(['ACTIVE', 'IN_USE', 'BROKEN', 'MAINTENANCE', 'LOCKED', 'INACTIVE']),
    note: z.string().optional()
  })
});

export const updateComputerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID máy tính không được trống.')
  }),
  body: z.object({
    code: z.string().min(1, 'Mã máy tính không được trống.'),
    name: z.string().min(1, 'Tên máy tính không được trống.'),
    cpu: z.string().optional(),
    ram: z.string().optional(),
    storage: z.string().optional(),
    gpu: z.string().optional(),
    operatingSystem: z.string().optional(),
    installedSoftware: z.string().optional(),
    ipAddress: z.string().optional(),
    macAddress: z.string().optional(),
    position: z.string().optional(),
    status: z.enum(['ACTIVE', 'IN_USE', 'BROKEN', 'MAINTENANCE', 'LOCKED', 'INACTIVE']),
    note: z.string().optional()
  })
});

export const updateComputerStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID máy tính không được trống.')
  }),
  body: z.object({
    status: z.enum(['ACTIVE', 'IN_USE', 'BROKEN', 'MAINTENANCE', 'LOCKED', 'INACTIVE'])
  })
});

export function createComputerRouter(controller: ComputerController): Router {
  const router = Router();

  router.get('/availability-summary', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_VIEW')) {
      return controller.getAvailabilitySummary(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_VIEW')) {
      return controller.list(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.get('/:id', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_VIEW')) {
      return controller.get(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.post('/', authMiddleware, validateRequest(createComputerSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_CREATE')) {
      return controller.create(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.put('/:id', authMiddleware, validateRequest(updateComputerSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_UPDATE')) {
      return controller.update(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.patch('/:id/status', authMiddleware, validateRequest(updateComputerStatusSchema), (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_STATUS_UPDATE')) {
      return controller.updateStatus(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  router.delete('/:id', authMiddleware, (req, res) => {
    if (req.user?.roles.includes('ADMIN') || req.user?.permissions.includes('COMPUTER_DELETE')) {
      return controller.delete(req, res);
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Bạn không có quyền.' } });
  });

  return router;
}
