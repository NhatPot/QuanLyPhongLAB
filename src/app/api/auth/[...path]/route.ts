import { NextRequest, NextResponse } from "next/server";
import { SelfServiceAuthController } from "@/server/presentation/http/controllers/SelfServiceAuthController";
import { handleExpressRoute } from "@/server/utils/route-helper";
import {FitSsoController} from "@/server/presentation/http/controllers/FitSsoController";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const controller = new SelfServiceAuthController();
const sso = new FitSsoController();
const routes = {
  "POST sso/start": {handler:sso.start,auth:false},
  "GET sso/callback": {handler:sso.callback,auth:false},
  "GET sso/pending": {handler:sso.pending,auth:false},
  "POST sso/link": {handler:sso.link,auth:false},
  "POST sso/profile": {handler:sso.profile,auth:true},
  "POST sso/logout": {handler:sso.logout,auth:true},
  "GET sso/logout-redirect": {handler:sso.logoutRedirect,auth:false},
  "GET config": { handler: controller.config, auth: false },
  "POST account-setup": { handler: controller.accountSetup, auth: true },
  "GET me/security": { handler: controller.security, auth: true },
  "POST register/request-code": {
    handler: controller.requestRegister,
    auth: false,
  },
  "POST register/verify-code": {
    handler: controller.verifyRegister,
    auth: false,
  },
  "POST register/complete": { handler: controller.complete, auth: false },
  "POST otp/resend": { handler: controller.resend, auth: false },
  "POST password/request-reset": {
    handler: controller.requestReset,
    auth: false,
  },
  "POST password/verify-reset": {
    handler: controller.verifyReset,
    auth: false,
  },
  "POST password/reset": { handler: controller.reset, auth: false },
  "POST google/nonce": { handler: controller.googleNonce, auth: false },
  "POST google": { handler: controller.google, auth: false },
  "POST me/google/link": { handler: controller.linkGoogle, auth: true },
  "POST me/password/request-code": {
    handler: controller.requestSetPassword,
    auth: true,
  },
  "POST me/password/verify-code": {
    handler: controller.verifySetPassword,
    auth: true,
  },
  "POST me/password/set": { handler: controller.setPassword, auth: true },
  "POST me/email/request-code": {
    handler: controller.requestEmailChange,
    auth: true,
  },
  "POST me/email/verify-current": {
    handler: controller.verifyCurrentEmail,
    auth: true,
  },
  "POST me/email/request-new": {
    handler: controller.requestNewEmail,
    auth: true,
  },
  "POST me/email/verify-code": {
    handler: controller.verifyNewEmail,
    auth: true,
  },
  "POST me/email/change": { handler: controller.changeEmail, auth: true },
};
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const route =
    routes[`${req.method} ${path.join("/")}` as keyof typeof routes];
  if (!route)
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Không tìm thấy chức năng." },
      },
      { status: 404 },
    );
  return handleExpressRoute(req, undefined, route.handler, {
    requireAuth: route.auth,
  });
}
export const GET = handle;
export const POST = handle;
