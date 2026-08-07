import { Router } from 'express';
import { z } from 'zod';
import { UserController } from '../controllers/UserController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const userStatusSchema = z.enum(['ACTIVE', 'LOCKED', 'INACTIVE']);
const userIdParams = z.object({ id: z.string().uuid('ID người dùng không hợp lệ.') });
const roleCodesSchema = z.array(
  z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
).min(1, 'Người dùng phải có ít nhất một vai trò.').max(10);
const temporaryPasswordSchema = z.string()
  .min(1, 'Mật khẩu tạm thời không được để trống.');

const profileBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự.').max(255),
  email: z.string().trim().email('Email không đúng định dạng.').max(255),
  username: z.string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự.')
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'),
  phone: z.string().trim().max(50).optional(),
  department: z.string().trim().max(255).optional(),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    keyword: z.string().trim().max(255).optional(),
    status: userStatusSchema.optional(),
    roleCode: z.string().trim().max(50).transform((value) => value.toUpperCase()).optional(),
  }),
});

export const getUserSchema = z.object({ params: userIdParams });

export const createUserSchema = z.object({
  body: profileBodySchema.extend({
    status: userStatusSchema.default('ACTIVE'),
    roleCodes: roleCodesSchema,
    temporaryPassword: temporaryPasswordSchema,
  }),
});

export const updateUserSchema = z.object({
  params: userIdParams,
  body: profileBodySchema,
});

export const updateUserStatusSchema = z.object({
  params: userIdParams,
  body: z.object({ status: userStatusSchema }),
});

export const assignUserRolesSchema = z.object({
  params: userIdParams,
  body: z.object({ roleCodes: roleCodesSchema }),
});

export const resetUserPasswordSchema = z.object({
  params: userIdParams,
  body: z.object({ temporaryPassword: temporaryPasswordSchema }),
});

export function createUserRouter(controller: UserController): Router {
  const router = Router();

  router.use(authMiddleware);
  router.get('/summary', requirePermissions('USER_VIEW'), controller.summary);
  router.get('/', requirePermissions('USER_VIEW'), validateRequest(listUsersSchema), controller.list);
  router.get('/:id', requirePermissions('USER_VIEW'), validateRequest(getUserSchema), controller.get);
  router.post('/', requirePermissions('USER_CREATE'), validateRequest(createUserSchema), controller.create);
  router.put('/:id', requirePermissions('USER_UPDATE'), validateRequest(updateUserSchema), controller.update);
  router.patch(
    '/:id/status',
    requirePermissions('USER_STATUS_UPDATE'),
    validateRequest(updateUserStatusSchema),
    controller.updateStatus,
  );
  router.put(
    '/:id/roles',
    requirePermissions('ROLE_ASSIGN'),
    validateRequest(assignUserRolesSchema),
    controller.assignRoles,
  );
  router.post(
    '/:id/reset-password',
    requirePermissions('USER_UPDATE'),
    validateRequest(resetUserPasswordSchema),
    controller.resetPassword,
  );
  router.delete(
    '/:id',
    requirePermissions('USER_DELETE'),
    validateRequest(getUserSchema),
    controller.delete,
  );

  return router;
}
