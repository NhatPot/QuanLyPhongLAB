import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.expenseController.get, { permissions: ['EXPENSE_VIEW'] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.expenseController.update, { permissions: ['EXPENSE_UPDATE'] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.expenseController.delete, { permissions: ['EXPENSE_DELETE'] });
}
