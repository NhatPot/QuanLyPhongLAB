import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function PATCH(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.labController.updateStatus, { permissions: ['LAB_STATUS_UPDATE'] });
}
