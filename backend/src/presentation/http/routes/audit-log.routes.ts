import { Router } from 'express';
import { z } from 'zod';
import { AuditLogController } from '../controllers/AuditLogController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(255).optional(),
    action: z.string().trim().max(255).optional(),
    entityName: z.string().trim().max(255).optional(),
    userId: z.string().uuid().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
  }),
});

export function createAuditLogRouter(controller: AuditLogController): Router {
  const router = Router();
  router.get(
    '/',
    authMiddleware,
    requirePermissions('AUDIT_LOG_VIEW'),
    validateRequest(listAuditLogsSchema),
    controller.list,
  );
  return router;
}

