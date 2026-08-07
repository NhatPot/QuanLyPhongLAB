import { Router } from 'express';
import { z } from 'zod';
import { ExpenseController } from '../controllers/ExpenseController';
import { authMiddleware, requireAnyPermissions, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const idParams = z.object({ id: z.string().uuid() });
const itemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(50),
  unitPrice: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxAmount: z.coerce.number().min(0).default(0),
  targetType: z.enum(['LAB', 'COMPUTER', 'EQUIPMENT', 'OTHER']).default('OTHER'),
  targetId: z.string().uuid().optional().nullable().transform((value) => value || undefined),
  note: z.string().trim().max(1000).optional().nullable().transform((value) => value || undefined),
});
const expenseBody = z.object({
  expenseDate: z.coerce.date(),
  categoryId: z.string().uuid(),
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(10000).optional().nullable(),
  vendorName: z.string().trim().max(255).optional().nullable(),
  invoiceNumber: z.string().trim().max(100).optional().nullable(),
  fundingSource: z.enum(['CENTER', 'FACULTY', 'UNIVERSITY', 'SPONSOR', 'OTHER']),
  paymentMethod: z.string().trim().max(50).optional().nullable(),
  currency: z.string().trim().min(3).max(10).default('VND'),
  attachmentUrl: z.string().trim().url().max(2000).optional().nullable().or(z.literal('')),
  items: z.array(itemSchema).min(1).max(100),
});
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
  expenseClass: z.enum(['CAPEX', 'OPEX']).optional(),
  categoryId: z.string().uuid().optional(),
  fundingSource: z.enum(['CENTER', 'FACULTY', 'UNIVERSITY', 'SPONSOR', 'OTHER']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export function createExpenseRouter(controller: ExpenseController): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/summary', requireAnyPermissions('EXPENSE_VIEW', 'REPORT_VIEW'), controller.summary);
  router.get('/options', requirePermissions('EXPENSE_VIEW'), controller.options);
  router.get('/categories', requirePermissions('EXPENSE_VIEW'), controller.listCategories);
  router.post('/categories', requirePermissions('EXPENSE_CATEGORY_MANAGE'), validateRequest(z.object({
    body: z.object({
      code: z.string().trim().min(1).max(50),
      name: z.string().trim().min(1).max(255),
      expenseClass: z.enum(['CAPEX', 'OPEX']),
      description: z.string().trim().max(1000).optional().nullable(),
    }),
  })), controller.createCategory);
  router.put('/categories/:id', requirePermissions('EXPENSE_CATEGORY_MANAGE'), validateRequest(z.object({
    params: idParams,
    body: z.object({
      name: z.string().trim().min(1).max(255),
      expenseClass: z.enum(['CAPEX', 'OPEX']),
      description: z.string().trim().max(1000).optional().nullable(),
      isActive: z.boolean(),
    }),
  })), controller.updateCategory);

  router.get('/', requirePermissions('EXPENSE_VIEW'), validateRequest(z.object({ query: listQuery })), controller.list);
  router.get('/:id', requirePermissions('EXPENSE_VIEW'), validateRequest(z.object({ params: idParams })), controller.get);
  router.post('/', requirePermissions('EXPENSE_CREATE'), validateRequest(z.object({ body: expenseBody })), controller.create);
  router.put('/:id', requirePermissions('EXPENSE_UPDATE'), validateRequest(z.object({ params: idParams, body: expenseBody })), controller.update);
  router.post('/:id/submit', requirePermissions('EXPENSE_SUBMIT'), validateRequest(z.object({ params: idParams })), controller.submit);
  router.post('/:id/approve', requirePermissions('EXPENSE_APPROVE'), validateRequest(z.object({ params: idParams })), controller.approve);
  router.post('/:id/reject', requirePermissions('EXPENSE_APPROVE'), validateRequest(z.object({
    params: idParams, body: z.object({ reason: z.string().trim().min(2).max(1000) }),
  })), controller.reject);
  router.post('/:id/mark-paid', requirePermissions('EXPENSE_MARK_PAID'), validateRequest(z.object({
    params: idParams,
    body: z.object({
      paymentMethod: z.string().trim().min(1).max(50),
      paymentDate: z.coerce.date(),
      postInventory: z.boolean().default(false),
    }),
  })), controller.markPaid);
  router.post('/:id/cancel', requirePermissions('EXPENSE_CANCEL'), validateRequest(z.object({
    params: idParams, body: z.object({ reason: z.string().trim().min(2).max(1000) }),
  })), controller.cancel);
  router.delete('/:id', requirePermissions('EXPENSE_DELETE'), validateRequest(z.object({ params: idParams })), controller.delete);

  return router;
}
