import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.bookingController.listRequesterOptions, { permissions: ['BOOKING_CREATE', 'BOOKING_CREATE_FOR_USER'] });
}
