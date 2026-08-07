import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.userController.get, { permissions: ['USER_VIEW'] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.userController.update, { permissions: ['USER_UPDATE'] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleExpressRoute(req, params, container.userController.delete, { permissions: ['USER_DELETE'] });
}
