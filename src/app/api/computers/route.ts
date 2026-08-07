import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.computerController.list, { permissions: ['COMPUTER_VIEW'] });
}

export async function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.computerController.create, { permissions: ['COMPUTER_CREATE'] });
}
