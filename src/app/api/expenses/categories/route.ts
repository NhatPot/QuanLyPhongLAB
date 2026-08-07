import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.expenseController.listCategories, { permissions: ['EXPENSE_VIEW'] });
}

export async function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.expenseController.createCategory, { permissions: ['EXPENSE_CATEGORY_MANAGE'] });
}
