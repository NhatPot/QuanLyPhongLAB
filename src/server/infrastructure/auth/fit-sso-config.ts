import "../../config/load-environment";
import { AppError } from "../../shared/errors/AppError";

export interface FitSsoConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  flowKey: string;
  allowedOrigins: string[];
}
export function readFitSsoConfig(): FitSsoConfig {
  return {
    enabled: process.env.FIT_SSO_ENABLED === "true",
    issuer: (process.env.FIT_SSO_ISSUER || "https://auth.fitlhu.com").replace(
      /\/$/,
      "",
    ),
    clientId: process.env.FIT_SSO_CLIENT_ID || "",
    clientSecret: process.env.FIT_SSO_CLIENT_SECRET || "",
    flowKey: process.env.FIT_SSO_FLOW_KEY || "",
    allowedOrigins: (
      process.env.FIT_SSO_ALLOWED_ORIGINS ||
      "http://localhost:3000,https://lab.fitlhu.com"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
export function assertFitSsoConfig(c: FitSsoConfig) {
  if (
    !c.enabled ||
    c.issuer !== "https://auth.fitlhu.com" ||
    !c.clientId ||
    !c.clientSecret ||
    !/^[a-f0-9]{64}$/i.test(c.flowKey)
  )
    throw new AppError(
      "Đăng nhập FIT LHU SSO chưa được cấu hình đầy đủ.",
      "SSO_UNAVAILABLE",
      503,
    );
}
export function ssoOrigin(c: FitSsoConfig, candidate: string) {
  const origin = new URL(candidate).origin;
  if (
    !c.allowedOrigins.includes(origin) ||
    !(
      origin.startsWith("https://") ||
      /^http:\/\/localhost(?::\d+)?$/.test(origin)
    )
  )
    throw new AppError(
      "Địa chỉ ứng dụng chưa được cho phép đăng nhập SSO.",
      "SSO_ORIGIN_INVALID",
      400,
    );
  return origin;
}

/**
 * Reverse proxies commonly terminate HTTPS and forward requests to Next.js over
 * HTTP. APP_ORIGIN is the configured public origin and must take precedence over
 * the protocol seen by the application. The selected origin is still checked
 * against the SSO allowlist before it is used in redirects.
 */
export function ssoRequestOrigin(c: FitSsoConfig, requestOrigin: string) {
  return ssoOrigin(c, process.env.APP_ORIGIN || requestOrigin);
}
