import { Router } from 'express';
import { z } from 'zod';
import { MaintenanceController } from '../controllers/MaintenanceController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const idParams = z.object({ id: z.string().uuid('ID lịch bảo trì không hợp lệ.') });
const nullableUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional();

const scheduleBody = z.object({
  targetType: z.enum(['LAB', 'COMPUTER', 'EQUIPMENT']),
  targetId: z.string().uuid('Đối tượng bảo trì không hợp lệ.'),
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(4000).optional().nullable(),
  reason: z.string().trim().min(2).max(4000),
  scheduledStartAt: z.string().datetime(),
  expectedEndAt: z.string().datetime(),
  technicianId: nullableUuid,
  quantity: z.number().int().min(1).max(9999),
  maintenanceSource: z.enum(['AVAILABLE', 'BROKEN']).optional().nullable(),
  estimatedCost: z.number().min(0).max(999999999999),
  partsNote: z.string().trim().max(4000).optional().nullable(),
});

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    keyword: z.string().trim().max(255).optional(),
    status: z.enum(['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    targetType: z.enum(['LAB', 'COMPUTER', 'EQUIPMENT']).optional(),
    technicianId: z.string().uuid().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});

export function createMaintenanceRouter(controller: MaintenanceController): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/summary', requirePermissions('MAINTENANCE_VIEW'), controller.summary);
  router.get('/options', requirePermissions('MAINTENANCE_VIEW'), controller.options);
  router.post('/sync-reminders', requirePermissions('MAINTENANCE_CREATE'), controller.syncReminders);
  router.get('/', requirePermissions('MAINTENANCE_VIEW'), validateRequest(listSchema), controller.list);
  router.get('/:id', requirePermissions('MAINTENANCE_VIEW'), validateRequest(z.object({ params: idParams })), controller.get);
  router.post('/', requirePermissions('MAINTENANCE_CREATE'), validateRequest(z.object({ body: scheduleBody })), controller.create);
  router.put('/:id', requirePermissions('MAINTENANCE_UPDATE'), validateRequest(z.object({ params: idParams, body: scheduleBody })), controller.update);
  router.post('/:id/start', requirePermissions('MAINTENANCE_START'), validateRequest(z.object({ params: idParams })), controller.start);
  router.post('/:id/complete', requirePermissions('MAINTENANCE_COMPLETE'), validateRequest(z.object({
    params: idParams,
    body: z.object({
      resultNote: z.string().trim().min(2).max(4000),
      actualCost: z.number().min(0).max(999999999999),
      partsNote: z.string().trim().max(4000).optional().nullable(),
      outcome: z.enum(['AVAILABLE', 'BROKEN']),
    }),
  })), controller.complete);
  router.post('/:id/cancel', requirePermissions('MAINTENANCE_CANCEL'), validateRequest(z.object({
    params: idParams, body: z.object({ reason: z.string().trim().min(2).max(2000) }),
  })), controller.cancel);
  router.delete('/:id', requirePermissions('MAINTENANCE_DELETE'), validateRequest(z.object({ params: idParams })), controller.delete);

  return router;
}
