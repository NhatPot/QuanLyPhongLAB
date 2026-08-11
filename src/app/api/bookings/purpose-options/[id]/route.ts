import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  return handleExpressRoute(req, params, container.bookingController.deletePurposeGroup, { permissions: ['BOOKING_APPROVE'] });
}
