import { Router } from 'express';
import { z } from 'zod';
import { RoleController } from '../controllers/RoleController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const roleCodeParams = z.object({
  code: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
});

export const getRoleSchema = z.object({ params: roleCodeParams });
export const updateRolePermissionsSchema = z.object({
  params: roleCodeParams,
  body: z.object({
    permissionCodes: z.array(
      z.string().trim().min(1).max(100).transform((value) => value.toUpperCase()),
    ).max(100),
  }),
});

export function createRoleRouter(controller: RoleController): Router {
  const router = Router();
  router.use(authMiddleware, requirePermissions('PERMISSION_MANAGE'));
  router.get('/catalog', controller.catalog);
  router.get('/', controller.list);
  router.get('/:code', validateRequest(getRoleSchema), controller.get);
  router.put('/:code/permissions', validateRequest(updateRolePermissionsSchema), controller.updatePermissions);
  return router;
}

