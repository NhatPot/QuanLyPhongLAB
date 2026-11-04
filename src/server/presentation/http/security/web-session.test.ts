import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertCsrf,
  createCsrfToken,
  setSessionCookies,
  clearSessionCookies,
  CsrfRequest,
} from "./web-session";
import { LoginRateLimiter } from "./login-rate-limiter";

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", "test-secret-only");
  vi.stubEnv("APP_ORIGIN", "https://lab.example");
});
afterEach(() => vi.unstubAllEnvs());

function request(refreshToken = "session-refresh"): CsrfRequest {
  const token = createCsrfToken(refreshToken);
  return {
    method: "POST",
    requestOrigin: "https://lab.example",
    origin: "https://lab.example",
    csrfCookie: token,
    csrfHeader: token,
    refreshToken,
    accessToken: "access",
  };
}

describe("cookie and CSRF protection", () => {
  it("accepts a signed token bound to the same refresh session", () => {
    expect(() => assertCsrf(request())).not.toThrow();
  });
  it.each([
    "missing-header",
    "missing-cookie",
    "wrong-signature",
    "different-session",
    "foreign-origin",
  ])("rejects %s", (mode) => {
    const r = request();
    if (mode === "missing-header") r.csrfHeader = null;
    if (mode === "missing-cookie") r.csrfCookie = undefined;
    if (mode === "wrong-signature") {
      r.csrfCookie = `${"a".repeat(64)}.${"b".repeat(64)}`;
      r.csrfHeader = r.csrfCookie;
    }
    if (mode === "different-session") r.refreshToken = "other-session";
    if (mode === "foreign-origin") r.origin = "https://attacker.example";
    expect(() => assertCsrf(r)).toThrow();
  });
  it("requires CSRF even with a bearer header when auth cookies are present", () => {
    const r = request();
    r.csrfHeader = null;
    r.authorization = "Bearer token";
    expect(() => assertCsrf(r)).toThrow();
  });
  it("permits cookie-free bearer clients but rejects cross-site callers", () => {
    const r = {
      method: "POST",
      requestOrigin: "https://lab.example",
      authorization: "Bearer token",
    };
    expect(() => assertCsrf(r)).not.toThrow();
    expect(() =>
      assertCsrf({ ...r, origin: "https://attacker.example" }),
    ).toThrow();
  });
  it("requires CSRF for anonymous browser login; native mode is explicit and not available to browser requests", () => {
    const r = { method: "POST", requestOrigin: "https://lab.example" };
    expect(() => assertCsrf(r)).toThrow();
    expect(() => assertCsrf({ ...r, authMode: "bearer" })).not.toThrow();
    expect(() =>
      assertCsrf({ ...r, authMode: "bearer", origin: "https://lab.example" }),
    ).toThrow();
  });
  it("uses HttpOnly for both auth cookies and keeps refresh expiry absolute", () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookie = vi.fn();
    const res = { cookie, setHeader: vi.fn() };
    const end = new Date(Date.now() + 120_000);
    setSessionCookies(res, "access", "refresh", end);
    expect(cookie.mock.calls[0]).toEqual([
      "accessToken",
      "access",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 900_000,
      }),
    ]);
    expect(cookie.mock.calls[1][2].httpOnly).toBe(true);
    expect(cookie.mock.calls[1][2].maxAge).toBeLessThanOrEqual(120_000);
    expect(cookie.mock.calls[2][0]).toBe("csrfToken");
    const clearCookie = vi.fn();
    clearSessionCookies({ clearCookie, setHeader: vi.fn() });
    expect(clearCookie).toHaveBeenCalledWith(
      "accessToken",
      expect.objectContaining({ path: "/", secure: true }),
    );
  });
});

describe("login rate limits", () => {
  it("limits repeat attempts and permits retry after the window", () => {
    let clock = 1000;
    const limiter = new LoginRateLimiter(() => clock);
    for (let i = 0; i < 10; i++) limiter.consume("ADMIN", "ip-one");
    expect(() => limiter.consume(" admin ", "ip-one")).toThrow();
    clock += 15 * 60_000;
    expect(() => limiter.consume("admin", "ip-one")).not.toThrow();
  });
  it("limits one account across changing IPs and IP spraying across accounts", () => {
    const accounts = new LoginRateLimiter();
    for (let i = 0; i < 20; i++) accounts.consume("admin", `ip-${i}`);
    expect(() => accounts.consume("admin", "new-ip")).toThrow();
    const ips = new LoginRateLimiter();
    for (let i = 0; i < 50; i++) ips.consume(`user-${i}`, "same-ip");
    expect(() => ips.consume("new-user", "same-ip")).toThrow();
  });
});
