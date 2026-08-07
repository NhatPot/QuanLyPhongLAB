import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.incidentController.options, { permissions: ['INCIDENT_VIEW', 'INCIDENT_VIEW_OWN', 'INCIDENT_VIEW_ASSIGNED'] });
}
