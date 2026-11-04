import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const { service, mock, issue } = vi.hoisted(() => ({
  service: {
    config: {
      googleEnabled: false,
      registrationEnabled: false,
      mailReady: false,
      studentDomains: ["lachong.edu.vn"],
      teacherDomains: ["lhu.edu.vn"],
    },
    requestCode: vi.fn(),
    completeRegistration: vi.fn(),
    completeAccountSetup: vi.fn(),
    google: vi.fn(),
    googleNonce: vi.fn(),
    listReviews: vi.fn(),
  },
  mock: {
    userRepo: { findById: vi.fn() },
    validateAccessSessionUseCase: { execute: vi.fn() },
  },
  issue: vi.fn(),
}));
vi.mock("../../../container/dependency-container", () => ({ container: mock }));
vi.mock("../../../container/self-service-container", () => ({
  selfServiceAuth: () => service,
}));
vi.mock("../../../application/use-cases/auth/IssueSession", () => ({
  IssueSession: class {
    execute = issue;
  },
}));
import { SelfServiceAuthController } from "../controllers/SelfServiceAuthController";
import { createCsrfToken } from "./web-session";
import { handleExpressRoute } from "../../../utils/route-helper";
const controller = new SelfServiceAuthController(),
  origin = "http://localhost:3000";
function request(
  path: string,
  body?: object,
  token?: string,
  headers: Record<string, string> = {},
) {
  return new NextRequest(origin + "/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { cookie: "csrfToken=" + token, "x-csrf-token": token, origin }
        : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("JWT_SECRET", "http-boundary-test-key");
  vi.stubEnv("APP_ORIGIN", origin);
  issue.mockResolvedValue({
    accessToken: "access-secret",
    refreshToken: "refresh-secret",
    refreshExpiresAt: new Date(Date.now() + 86400000),
    mustChangePassword: false,
  });
  mock.userRepo.findById.mockResolvedValue({ id: "user", status: "ACTIVE" });
  service.requestCode.mockResolvedValue({
    challengeId: "challenge",
    resendsRemaining: 5,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("self-service auth HTTP boundary", () => {
  it('binds nonce reuse to the HttpOnly cookie rather than a body-supplied challenge',async()=>{
    const token=createCsrfToken(), previous='11111111-1111-4111-8111-111111111111';
    service.googleNonce.mockResolvedValue({nonce:'synthetic-nonce',challengeId:previous,clientId:'test-client',expiresAt:'2026-11-04T10:00:00Z'});
    const response=await handleExpressRoute(request('auth/google/nonce',{challengeId:'forged'},token,{cookie:`csrfToken=${token}; authFlow=${'b'.repeat(64)}; googleNonceId=${previous}`}),undefined,controller.googleNonce,{requireAuth:false});
    expect(response.status).toBe(200);
    expect(service.googleNonce).toHaveBeenCalledWith(expect.objectContaining({binding:'b'.repeat(64)}),previous);
    expect(response.headers.getSetCookie().find(c=>c.startsWith('googleNonceId='))).toMatch(/HttpOnly/);
  });
  it('allows only own profile and setup API for a Google-only session, strips forged identity fields and clears cookies', async () => {
    const token=createCsrfToken();
    mock.validateAccessSessionUseCase.execute.mockResolvedValue({userId:'user',roles:['STUDENT'],permissions:[],requiresAccountSetup:true});
    const headers={cookie:`csrfToken=${token}; accessToken=test-session`};
    const denied = await handleExpressRoute(request('users',undefined,undefined,headers),undefined,async()=>{throw new Error('Must not reach business API');});
    expect(denied.status).toBe(403);
    expect((await denied.json()).error.code).toBe('ACCOUNT_SETUP_REQUIRED');
    service.completeAccountSetup.mockResolvedValue({state:'account_setup_completed'});
    const input={phone:'0901234567',fullName:'Họ tên',department:'Khoa CNTT',password:'new-password-123',confirmPassword:'new-password-123'};
    const response=await handleExpressRoute(request('auth/account-setup',{...input,userId:'forged-user',email:'forged@lhu.edu.vn',role:'ADMIN'},token,headers),undefined,controller.accountSetup);
    expect(response.status).toBe(200);
    expect(service.completeAccountSetup).toHaveBeenCalledWith(input,expect.objectContaining({actorId:'user'}));
    expect(response.headers.getSetCookie().some(value=>value.startsWith('accessToken=;'))).toBe(true);
  });
  it.each(["active", "pending_review"])("handles Google outcome %s through the shared session boundary", async (state) => {
    service.google.mockResolvedValue({ state, userId: "user" });
    const response = await handleExpressRoute(request("auth/google", {
      credential: "synthetic-token", challengeId: "11111111-1111-4111-8111-111111111111",
      role: "ADMIN", userId: "forged-user",
    }, createCsrfToken()), undefined, controller.google, { requireAuth: false });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain("access-secret");
    expect(body).not.toContain("refresh-secret");
    expect(service.google).toHaveBeenCalledWith("synthetic-token", "11111111-1111-4111-8111-111111111111", expect.objectContaining({ actorId: undefined }));
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("accessToken="));
    if (state === "active") {
      expect(cookie).toMatch(/HttpOnly/i);
      expect(issue).toHaveBeenCalledTimes(1);
    } else {
      expect(cookie).toBeUndefined();
      expect(issue).not.toHaveBeenCalled();
    }
  });
  it("requires CSRF and rejects foreign Origin before requesting mail", async () => {
    const missing = await handleExpressRoute(
      request("auth/register/request-code", { email: "123@lachong.edu.vn" }),
      undefined,
      controller.requestRegister,
      { requireAuth: false },
    );
    expect(missing.status).toBe(403);
    const token = createCsrfToken();
    const foreign = await handleExpressRoute(
      request(
        "auth/register/request-code",
        { email: "123@lachong.edu.vn" },
        token,
        { origin: "https://evil.test" },
      ),
      undefined,
      controller.requestRegister,
      { requireAuth: false },
    );
    expect(foreign.status).toBe(403);
    expect(service.requestCode).not.toHaveBeenCalled();
  });
  it("strips user-supplied role and Google subject and creates an HttpOnly browser binding", async () => {
    const token = createCsrfToken();
    const response = await handleExpressRoute(
      request(
        "auth/register/request-code",
        {
          email: "123@lachong.edu.vn",
          roleCodes: ["ADMIN"],
          googleSub: "forged",
        },
        token,
      ),
      undefined,
      controller.requestRegister,
      { requireAuth: false },
    );
    expect(response.status).toBe(200);
    expect(service.requestCode.mock.calls[0][0]).toEqual({
      email: "123@lachong.edu.vn",
      purpose: "REGISTER",
    });
    expect(response.headers.get("set-cookie")).toMatch(/authFlow=.*HttpOnly/i);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("activates students with HttpOnly session cookies and no raw tokens in JSON", async () => {
    service.completeRegistration.mockResolvedValue({
      state: "active",
      userId: "user",
    });
    const response = await handleExpressRoute(
      request(
        "auth/register/complete",
        {
          challengeId: "11111111-1111-4111-8111-111111111111",
          grant: "a".repeat(64),
          fullName: "Sinh viên",
          department: "Khoa CNTT",
          phone: "0901234567",
          password: "test-passphrase",
        },
        createCsrfToken(),
      ),
      undefined,
      controller.complete,
      { requireAuth: false },
    );
    expect(response.status).toBe(200);
    expect(service.completeRegistration).toHaveBeenCalledWith(expect.objectContaining({department:"Khoa CNTT",phone:"0901234567"}),expect.anything());
    const body = await response.text();
    expect(body).not.toContain("access-secret");
    expect(body).not.toContain("refresh-secret");
    expect(
      response.headers.getSetCookie().find((c) => c.startsWith("accessToken=")),
    ).toMatch(/HttpOnly/i);
    expect(
      response.headers
        .getSetCookie()
        .find((c) => c.startsWith("refreshToken=")),
    ).toMatch(/HttpOnly/i);
  });
  it("does not issue dashboard cookies to pending teachers", async () => {
    service.completeRegistration.mockResolvedValue({
      state: "pending_review",
      userId: "teacher",
    });
    const response = await handleExpressRoute(
      request(
        "auth/register/complete",
        {
          challengeId: "11111111-1111-4111-8111-111111111111",
          grant: "a".repeat(64),
          fullName: "Giảng viên",
          password: "test-passphrase",
        },
        createCsrfToken(),
      ),
      undefined,
      controller.complete,
      { requireAuth: false },
    );
    expect((await response.json()).data.state).toBe("pending_review");
    expect(issue).not.toHaveBeenCalled();
    expect(
      response.headers.getSetCookie().some((c) => c.startsWith("accessToken=")),
    ).toBe(false);
  });
  it("requires the dedicated review permission rather than ordinary USER_VIEW", async () => {
    mock.validateAccessSessionUseCase.execute.mockResolvedValue({
      userId: "student",
      roles: ["STUDENT"],
      permissions: ["USER_VIEW"],
    });
    const response = await handleExpressRoute(
      request("account-registrations", undefined, undefined, {
        cookie: "accessToken=access",
      }),
      undefined,
      controller.reviews,
      { permissions: ["ACCOUNT_REGISTRATION_REVIEW"] },
    );
    expect(response.status).toBe(403);
    expect(service.listReviews).not.toHaveBeenCalled();
  });
  it("rejects malformed fields before entering the service and sanitizes unexpected errors", async () => {
    const bad = await handleExpressRoute(
      request(
        "auth/register/request-code",
        { email: "invalid" },
        createCsrfToken(),
      ),
      undefined,
      controller.requestRegister,
      { requireAuth: false },
    );
    expect(bad.status).toBe(400);
    expect(service.requestCode).not.toHaveBeenCalled();
    service.requestCode.mockRejectedValue(
      new Error("private SQL connection failure"),
    );
    const response = await handleExpressRoute(
      request(
        "auth/register/request-code",
        { email: "123@lachong.edu.vn" },
        createCsrfToken(),
      ),
      undefined,
      controller.requestRegister,
      { requireAuth: false },
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private SQL");
  });
});
