import { NextRequest } from 'next/server';
import { handleExpressRoute } from '@/server/utils/route-helper';
import { openApiSpec } from '@/swagger/openapi-spec';

export async function GET(req: NextRequest) {
  return handleExpressRoute(
    req,
    undefined,
    async (_req, res) => {
      res.status(200).json(openApiSpec);
    },
    { permissions: ['PERMISSION_MANAGE'] }
  );
}
