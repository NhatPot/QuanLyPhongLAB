import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.authController.logoutAll);
}
