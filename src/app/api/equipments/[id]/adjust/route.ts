import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.equipmentController.adjustInventory, { permissions: ['EQUIPMENT_INVENTORY_ADJUST'] });
}
