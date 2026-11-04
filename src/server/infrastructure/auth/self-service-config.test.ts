import { afterEach, describe, expect, it, vi } from "vitest";
import { readSelfServiceConfig } from "./self-service-config";
afterEach(() => vi.unstubAllEnvs());
describe("self-service feature configuration", () => {
  it("keeps sending disabled until the owner explicitly enables it even with credentials present", () => {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])
      vi.stubEnv(key, "synthetic-test-value");
    vi.stubEnv("AUTH_OTP_SECRET", "s".repeat(48));
    vi.stubEnv("AUTH_EMAIL_ENCRYPTION_KEY", "a".repeat(64));
    vi.stubEnv("AUTH_EMAIL_ENABLED", "false");
    expect(readSelfServiceConfig().mailReady).toBe(false);
    vi.stubEnv("AUTH_EMAIL_ENABLED", "true");
    expect(readSelfServiceConfig().mailReady).toBe(true);
  });
});
