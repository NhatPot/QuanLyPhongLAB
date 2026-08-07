import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.expenseController.list, { permissions: ['EXPENSE_VIEW'] });
}

export async function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.expenseController.create, { permissions: ['EXPENSE_CREATE'] });
}
