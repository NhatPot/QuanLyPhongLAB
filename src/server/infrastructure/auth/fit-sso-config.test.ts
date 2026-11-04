import { afterEach, describe, expect, it, vi } from "vitest";
import { readFitSsoConfig, ssoRequestOrigin } from "./fit-sso-config";

afterEach(() => vi.unstubAllEnvs());

describe("FIT LHU SSO public origin", () => {
  it("uses APP_ORIGIN when a reverse proxy forwards HTTPS requests internally over HTTP", () => {
    vi.stubEnv("APP_ORIGIN", "https://lab.fitlhu.com");
    const config = readFitSsoConfig();

    expect(
      ssoRequestOrigin(config, "http://lab.fitlhu.com"),
    ).toBe("https://lab.fitlhu.com");
  });

  it("rejects a public APP_ORIGIN that is not in the SSO allowlist", () => {
    vi.stubEnv("APP_ORIGIN", "https://other.example");
    const config = readFitSsoConfig();

    expect(() => ssoRequestOrigin(config, "http://lab.fitlhu.com")).toThrow(
      expect.objectContaining({ code: "SSO_ORIGIN_INVALID", statusCode: 400 }),
    );
  });

  it("falls back to the request origin when APP_ORIGIN is not configured", () => {
    vi.stubEnv("APP_ORIGIN", "");
    const config = readFitSsoConfig();

    expect(
      ssoRequestOrigin(config, "http://localhost:3000"),
    ).toBe("http://localhost:3000");
  });
});
