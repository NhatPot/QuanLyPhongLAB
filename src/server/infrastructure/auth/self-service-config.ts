import "../../config/load-environment";

import type { SelfServiceConfig } from "../../application/ports/SelfServiceConfig";
export type { SelfServiceConfig } from "../../application/ports/SelfServiceConfig";
const domains = (value: string | undefined, fallback = "") =>
  (value || fallback)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
export function readSelfServiceConfig(): SelfServiceConfig {
  const secret = process.env.AUTH_OTP_SECRET || "";
  const outboxKey = process.env.AUTH_EMAIL_ENCRYPTION_KEY || "";
  const cryptoReady = secret.length >= 32 && /^[a-f\d]{64}$/i.test(outboxKey);
  const mailReady =
    process.env.AUTH_EMAIL_ENABLED === "true" &&
    cryptoReady &&
    ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"].every((k) =>
      Boolean(process.env[k]),
    );
  const budget = Number(process.env.AUTH_EMAIL_DAILY_LIMIT || 500);
  const ipLimit = Number(process.env.AUTH_EMAIL_IP_HOURLY_LIMIT || 30);
  return {
    ssoEnabled: process.env.FIT_SSO_ENABLED === "true",
    registrationEnabled:
      process.env.FIT_SSO_ENABLED !== "true" && process.env.SELF_REGISTRATION_ENABLED === "true" && cryptoReady,
    googleEnabled:
      process.env.GOOGLE_AUTH_ENABLED === "true" &&
      cryptoReady &&
      Boolean(process.env.GOOGLE_CLIENT_ID),
    mailReady,
    secret,
    outboxKey,
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    studentDomains: domains(
      process.env.STUDENT_EMAIL_DOMAINS,
      "lachong.edu.vn",
    ),
    teacherDomains: domains(process.env.TEACHER_EMAIL_DOMAINS, "lhu.edu.vn"),
    hostedDomains: domains(process.env.GOOGLE_ALLOWED_HOSTED_DOMAINS),
    senderBudget:
      Number.isInteger(budget) && budget > 0 ? Math.min(budget, 1500) : 500,
    ipHourlyLimit:
      Number.isInteger(ipLimit) && ipLimit > 0 ? Math.min(ipLimit, 10000) : 30,
  };
}
