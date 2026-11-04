import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export const dynamic = 'force-dynamic';
export function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.authController.csrf, { requireAuth: false });
}
