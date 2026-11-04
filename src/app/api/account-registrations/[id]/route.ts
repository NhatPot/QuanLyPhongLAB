import { NextRequest } from "next/server";
import { handleExpressRoute } from "@/server/utils/route-helper";
import { SelfServiceAuthController } from "@/server/presentation/http/controllers/SelfServiceAuthController";
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleExpressRoute(
    req,
    context.params,
    new SelfServiceAuthController().review,
    { permissions: ["ACCOUNT_REGISTRATION_REVIEW"] },
  );
}
