import { NextRequest } from "next/server";
import { handleExpressRoute } from "@/server/utils/route-helper";
import { SelfServiceAuthController } from "@/server/presentation/http/controllers/SelfServiceAuthController";
export async function GET(req: NextRequest) {
  return handleExpressRoute(
    req,
    undefined,
    new SelfServiceAuthController().reviews,
    { permissions: ["ACCOUNT_REGISTRATION_REVIEW"] },
  );
}
