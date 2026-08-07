import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return handleExpressRoute(req, params, container.roleController.get, { permissions: ['PERMISSION_MANAGE'] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return handleExpressRoute(req, params, container.roleController.updatePermissions, { permissions: ['PERMISSION_MANAGE'] });
}
