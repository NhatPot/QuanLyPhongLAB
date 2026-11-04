import crypto from "crypto";
import "../../../config/load-environment";
import { AppError } from "../../../shared/errors/AppError";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";
export const CSRF_COOKIE = "csrfToken";
export const CSRF_HEADER = "x-csrf-token";

const baseCookie = () => ({
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

function csrfSignature(nonce: string, refreshToken = "") {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("Thiếu cấu hình khóa bảo vệ phiên.");
  return crypto
    .createHmac("sha256", secret)
    .update(`${nonce}:${refreshToken}`)
    .digest("hex");
}

export function createCsrfToken(refreshToken?: string) {
  const nonce = crypto.randomBytes(32).toString("hex");
  return `${nonce}.${csrfSignature(nonce, refreshToken)}`;
}

export interface CsrfRequest {
  method: string;
  requestOrigin: string;
  origin?: string | null;
  fetchSite?: string | null;
  csrfCookie?: string;
  csrfHeader?: string | null;
  refreshToken?: string;
  accessToken?: string;
  authorization?: string | null;
  authMode?: string | null;
}

export function isNativeAuthRequest(
  request: Pick<CsrfRequest, "authMode" | "origin" | "fetchSite">,
) {
  return request.authMode === "bearer" && !request.origin && !request.fetchSite;
}

export function assertRequestOrigin(request: CsrfRequest) {
  const configured = process.env.APP_ORIGIN;
  const allowed = new Set([
    configured ? new URL(configured).origin : request.requestOrigin,
  ]);
  if (request.origin && !allowed.has(request.origin)) {
    throw new AppError(
      "Nguồn gửi yêu cầu không được phép.",
      "CSRF_INVALID",
      403,
    );
  }
  if (!request.origin && request.fetchSite === "cross-site") {
    throw new AppError(
      "Nguồn gửi yêu cầu không được phép.",
      "CSRF_INVALID",
      403,
    );
  }
}

export function assertCsrf(request: CsrfRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;
  assertRequestOrigin(request);
  // Explicit native clients do not authenticate using browser cookies.
  if (
    !request.accessToken &&
    !request.refreshToken &&
    (isNativeAuthRequest(request) ||
      /^Bearer\s+\S+$/i.test(request.authorization || ""))
  )
    return;
  const token = request.csrfCookie;
  if (
    !token ||
    token !== request.csrfHeader ||
    !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)
  ) {
    throw new AppError(
      "Phiên bảo vệ yêu cầu đã thay đổi. Vui lòng thử lại.",
      "CSRF_INVALID",
      403,
    );
  }
  const [nonce, signature] = token.split(".");
  const expected = csrfSignature(nonce, request.refreshToken);
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    )
  ) {
    throw new AppError("Mã bảo vệ yêu cầu không hợp lệ.", "CSRF_INVALID", 403);
  }
}

export function expressSecurityRequest(req: any): CsrfRequest {
  return {
    method: req.method,
    requestOrigin: `${req.protocol || "http"}://${req.get("host")}`,
    origin: req.get("origin"),
    fetchSite: req.get("sec-fetch-site"),
    csrfCookie: req.cookies?.csrfToken,
    csrfHeader: req.get(CSRF_HEADER),
    accessToken: req.cookies?.accessToken,
    refreshToken: req.cookies?.refreshToken,
    authorization: req.get("authorization"),
    authMode: req.get("x-auth-mode"),
  };
}

export function protectAuthRequest(req: any) {
  const security = expressSecurityRequest(req);
  assertCsrf({ ...security, authorization: null });
  return (
    isNativeAuthRequest(security) &&
    !security.accessToken &&
    !security.refreshToken
  );
}

export function setCsrfCookie(res: any, refreshToken?: string) {
  const csrfToken = createCsrfToken(refreshToken);
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookie(), httpOnly: false });
  res.setHeader("Cache-Control", "no-store");
  return csrfToken;
}

export function setSessionCookies(
  res: any,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie(),
    httpOnly: true,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    httpOnly: true,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
  return setCsrfCookie(res, refreshToken);
}

export function clearSessionCookies(res: any) {
  for (const name of [
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    CSRF_COOKIE,
    "token",
    "auth_token",
  ]) {
    res.clearCookie(name, baseCookie());
  }
  res.setHeader("Cache-Control", "no-store");
}
