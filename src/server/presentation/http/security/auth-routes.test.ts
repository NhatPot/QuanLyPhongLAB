import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Result } from "../../../shared/result/Result";
import { UnauthorizedError } from "../../../shared/errors/AppError";

const { mock } = vi.hoisted(() => ({
  mock: {
    loginUseCase: { execute: vi.fn() },
    refreshSessionUseCase: { execute: vi.fn() },
    tokenService: { verifyAccessToken: vi.fn() },
    getCurrentUserUseCase: { execute: vi.fn() },
    validateAccessSessionUseCase: { execute: vi.fn() },
    logoutUseCase: { execute: vi.fn() },
    logoutAllSessionsUseCase: { execute: vi.fn() },
  },
}));
vi.mock("../../../container/dependency-container", () => ({ container: mock }));

import { AuthController } from "../controllers/AuthController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { getAuthUser, handleExpressRoute } from "../../../utils/route-helper";

const origin = "http://localhost:3000";
const controller = new AuthController();
function req(
  path: string,
  method = "GET",
  headers: Record<string, string> = {},
  body: object = {},
) {
  return new NextRequest(`${origin}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
async function csrf() {
  const response = await handleExpressRoute(
    req("auth/csrf"),
    undefined,
    controller.csrf,
    { requireAuth: false },
  );
  return (await response.json()).data.csrfToken as string;
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("JWT_SECRET", "test-http-signing-key");
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("TRUST_PROXY", "false");
  mock.loginUseCase.execute.mockResolvedValue(
    Result.ok({
      accessToken: "test-access",
      refreshToken: "test-refresh",
      refreshExpiresAt: new Date(Date.now() + 86400_000),
      mustChangePassword: false,
    }),
  );
  mock.tokenService.verifyAccessToken.mockReturnValue({ userId: "user" });
  mock.getCurrentUserUseCase.execute.mockResolvedValue(
    Result.ok({ id: "user", roles: ["ADMIN"] }),
  );
  mock.validateAccessSessionUseCase.execute.mockResolvedValue({
    userId: "user",
    sessionId: "session",
    roles: ["ADMIN"],
    permissions: [],
  });
  mock.logoutUseCase.execute.mockResolvedValue(Result.ok());
});
afterEach(() => vi.unstubAllEnvs());

describe("web authentication HTTP boundary", () => {
  it("applies the same session and CSRF checks in the Express middleware", async () => {
    const next = vi.fn();
    const request: any = {
      method: "GET",
      protocol: "http",
      cookies: { accessToken: "access" },
      headers: {},
      get: (name: string) => (name === "host" ? "localhost:3000" : undefined),
    };
    const response: any = { setHeader: vi.fn() };
    await authMiddleware(request, response, next);
    expect(request.user.sessionId).toBe("session");
    expect(next).toHaveBeenCalledWith();
    next.mockClear();
    mock.validateAccessSessionUseCase.execute.mockClear();
    request.method = "PUT";
    await authMiddleware(request, response, next);
    expect(next.mock.calls[0][0]).toMatchObject({ code: "CSRF_INVALID" });
    expect(mock.validateAccessSessionUseCase.execute).not.toHaveBeenCalled();
  });
  it("does not call login or write cookies for a request missing CSRF", async () => {
    const response = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        { Origin: origin },
        { identifier: "user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    expect(response.status).toBe(403);
    expect(mock.loginUseCase.execute).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
  it("logs browser users in with HttpOnly cookies and never returns auth tokens in JSON", async () => {
    const token = await csrf();
    const response = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        { Origin: origin, Cookie: `csrfToken=${token}`, "X-CSRF-Token": token },
        { identifier: "web-user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accessToken).toBeUndefined();
    expect(body.token).toBeUndefined();
    expect(body.data.accessToken).toBeUndefined();
    expect(body.data.refreshToken).toBeUndefined();
    expect(body.data.csrfToken).toBeTruthy();
    const authCookies = response.headers
      .getSetCookie()
      .filter((c) => /^(accessToken|refreshToken)=/.test(c));
    expect(authCookies).toHaveLength(2);
    authCookies.forEach((c) => {
      expect(c).toMatch(/HttpOnly/i);
      expect(c).toMatch(/SameSite=lax/i);
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("supports explicit cookie-free native login and sets no browser cookies", async () => {
    const response = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        { "X-Auth-Mode": "bearer" },
        { identifier: "native-user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      accessToken: "test-access",
      refreshToken: "test-refresh",
    });
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
  it("does not let browser callers opt into native mode to avoid CSRF", async () => {
    const response = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        { Origin: origin, "X-Auth-Mode": "bearer" },
        { identifier: "user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    expect(response.status).toBe(403);
    expect(mock.loginUseCase.execute).not.toHaveBeenCalled();
  });
  it("rejects foreign-origin writes before executing a protected handler", async () => {
    const action = vi.fn();
    const token = await csrf();
    const response = await handleExpressRoute(
      req("equipments", "POST", {
        Origin: "https://attacker.test",
        Cookie: `accessToken=access; csrfToken=${token}`,
        "X-CSRF-Token": token,
      }),
      undefined,
      action,
    );
    expect(response.status).toBe(403);
    expect(action).not.toHaveBeenCalled();
  });
  it("checks session revocation even for GET and direct getAuthUser consumers", async () => {
    mock.validateAccessSessionUseCase.execute.mockRejectedValue(
      new UnauthorizedError("revoked", "SESSION_REVOKED"),
    );
    await expect(
      getAuthUser(
        req("bookings/catalog", "GET", { Cookie: "accessToken=old-access" }),
      ),
    ).rejects.toMatchObject({ code: "SESSION_REVOKED" });
    const action = vi.fn();
    const response = await handleExpressRoute(
      req("users", "GET", { Cookie: "accessToken=old-access" }),
      undefined,
      action,
    );
    expect(response.status).toBe(401);
    expect(action).not.toHaveBeenCalled();
  });
  it("does not clear cookies when server logout fails", async () => {
    const token = await csrf();
    mock.logoutUseCase.execute.mockResolvedValue(
      Result.fail("storage unavailable"),
    );
    const response = await handleExpressRoute(
      req("auth/logout", "POST", {
        Cookie: `csrfToken=${token}`,
        "X-CSRF-Token": token,
      }),
      undefined,
      controller.logout,
      { requireAuth: false },
    );
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
  it("refreshes cookies without exposing either auth token in the response", async () => {
    const bootstrap = await csrf();
    const login = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        { Cookie: `csrfToken=${bootstrap}`, "X-CSRF-Token": bootstrap },
        { identifier: "refresh-user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    const token = (await login.json()).data.csrfToken;
    mock.refreshSessionUseCase.execute.mockResolvedValue(
      Result.ok({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        refreshExpiresAt: new Date(Date.now() + 100000),
      }),
    );
    const response = await handleExpressRoute(
      req("auth/refresh", "POST", {
        Cookie: cookies(login),
        "X-CSRF-Token": token,
      }),
      undefined,
      controller.refresh,
      { requireAuth: false },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.accessToken).toBeUndefined();
    expect(body.data.refreshToken).toBeUndefined();
    expect(cookies(response)).toContain("refreshToken=new-refresh");
  });
  it("does not require browser CSRF from cookie-free device telemetry, but still rejects browser cookie requests", async () => {
    const action = vi.fn(async (_req, res) => res.json({ success: true }));
    const native = await handleExpressRoute(
      req("devices/metrics", "POST", { "X-API-Key": "device-api-key" }),
      undefined,
      action,
      { requireAuth: false },
    );
    expect(native.status).toBe(200);
    expect(action).toHaveBeenCalledOnce();
    const browser = await handleExpressRoute(
      req("devices/metrics", "POST", {
        Cookie: "accessToken=access",
        Origin: origin,
      }),
      undefined,
      action,
      { requireAuth: false },
    );
    expect(browser.status).toBe(403);
    expect(action).toHaveBeenCalledOnce();
  });
  it("returns 429 before authentication and does not trust arbitrary forwarding headers", async () => {
    const token = await csrf();
    for (let i = 0; i < 10; i++) {
      const response = await handleExpressRoute(
        req(
          "auth/login",
          "POST",
          {
            Cookie: `csrfToken=${token}`,
            "X-CSRF-Token": token,
            "X-Forwarded-For": `192.0.2.${i}`,
          },
          { identifier: "rate-limit-user", password: "123" },
        ),
        undefined,
        controller.login,
        { requireAuth: false },
      );
      expect(response.status).toBe(200);
    }
    const response = await handleExpressRoute(
      req(
        "auth/login",
        "POST",
        {
          Cookie: `csrfToken=${token}`,
          "X-CSRF-Token": token,
          "X-Forwarded-For": "192.0.2.99",
        },
        { identifier: "rate-limit-user", password: "123" },
      ),
      undefined,
      controller.login,
      { requireAuth: false },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(mock.loginUseCase.execute).toHaveBeenCalledTimes(10);
  });
});
