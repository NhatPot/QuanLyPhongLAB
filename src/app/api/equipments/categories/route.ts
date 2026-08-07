import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.equipmentController.listCategories, { permissions: ['EQUIPMENT_VIEW'] });
}

export async function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.equipmentController.createCategory, { permissions: ['EQUIPMENT_CATEGORY_MANAGE'] });
}
