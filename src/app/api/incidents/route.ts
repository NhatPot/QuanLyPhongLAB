import { NextRequest } from 'next/server';
import { container } from '@/server/container/dependency-container';
import { handleExpressRoute } from '@/server/utils/route-helper';

export async function GET(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.incidentController.list, { permissions: ['INCIDENT_VIEW', 'INCIDENT_VIEW_OWN', 'INCIDENT_VIEW_ASSIGNED'] });
}

export async function POST(req: NextRequest) {
  return handleExpressRoute(req, undefined, container.incidentController.create, { permissions: ['INCIDENT_CREATE'] });
}
