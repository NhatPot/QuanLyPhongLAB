import { Router } from 'express';
import { z } from 'zod';
import { IncidentController } from '../controllers/IncidentController';
import { authMiddleware, requireAnyPermissions, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const idParams = z.object({ id: z.string().uuid('ID sự cố không hợp lệ.') });
const nullableUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional();
const contentBody = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(3).max(10000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  computerId: nullableUuid,
  equipmentId: nullableUuid,
  bookingRequestId: nullableUuid,
  imageUrl: z.union([z.string().url().max(2000), z.literal(''), z.null()]).optional(),
}).refine((body) => !(body.computerId && body.equipmentId), {
  message: 'Một sự cố chỉ được liên kết với một loại tài sản.', path: ['computerId'],
});

const viewPermissions = ['INCIDENT_VIEW', 'INCIDENT_VIEW_OWN', 'INCIDENT_VIEW_ASSIGNED'] as const;

export function createIncidentRouter(controller: IncidentController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get('/summary', requireAnyPermissions(...viewPermissions), controller.summary);
  router.get('/options', requireAnyPermissions('INCIDENT_CREATE', 'INCIDENT_ASSIGN', 'INCIDENT_UPDATE', ...viewPermissions), controller.options);
  router.get('/', requireAnyPermissions(...viewPermissions), validateRequest(z.object({ query: z.object({
    page: z.coerce.number().int().min(1).optional(), pageSize: z.coerce.number().int().min(1).max(100).optional(),
    keyword: z.string().trim().max(255).optional(), status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    assetType: z.enum(['COMPUTER', 'EQUIPMENT', 'BOOKING', 'GENERAL']).optional(), assignedTo: z.string().uuid().optional(),
  }) })), controller.list);
  router.get('/:id', requireAnyPermissions(...viewPermissions), validateRequest(z.object({ params: idParams })), controller.get);
  router.post('/', requirePermissions('INCIDENT_CREATE'), validateRequest(z.object({ body: contentBody })), controller.create);
  router.put('/:id', requirePermissions('INCIDENT_UPDATE'), validateRequest(z.object({ params: idParams, body: contentBody })), controller.update);
  router.post('/:id/assign', requirePermissions('INCIDENT_ASSIGN'), validateRequest(z.object({ params: idParams, body: z.object({ assignedTo: z.string().uuid() }) })), controller.assign);
  router.post('/:id/start', requirePermissions('INCIDENT_UPDATE'), validateRequest(z.object({ params: idParams })), controller.start);
  router.post('/:id/resolve', requirePermissions('INCIDENT_RESOLVE'), validateRequest(z.object({ params: idParams, body: z.object({ resultNote: z.string().trim().min(3).max(10000) }) })), controller.resolve);
  router.post('/:id/close', requirePermissions('INCIDENT_CLOSE'), validateRequest(z.object({ params: idParams, body: z.object({ resultNote: z.string().trim().max(10000).optional().nullable() }) })), controller.close);
  return router;
}
