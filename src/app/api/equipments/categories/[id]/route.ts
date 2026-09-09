import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, context.params, container.equipmentController.updateCategory, { permissions: ['EQUIPMENT_CATEGORY_MANAGE'] });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return handleExpressRoute(req, params, container.equipmentController.deleteCategory, { permissions: ['EQUIPMENT_CATEGORY_MANAGE'] });
}
