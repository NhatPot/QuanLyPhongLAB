import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { User } from "../../../domain/entities/User";
import { UniqueEntityId } from "../../../domain/value-objects/UniqueEntityId";
import {
  AuthSessionProps,
  IAuthSessionRepository,
} from "../../../domain/repositories/IAuthSessionRepository";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IUnitOfWork } from "../../../domain/repositories/IUnitOfWork";
import { IAuditLogRepository } from "../../../domain/repositories/IAuditLogRepository";
import { IRolePermissionQuery } from "../../ports/IRolePermissionQuery";
import { JwtTokenService } from "../../../infrastructure/auth/JwtTokenService";
import { LoginUseCase } from "./LoginUseCase";
import {IssueSession} from './IssueSession';
import { RefreshSessionUseCase } from "./RefreshSessionUseCase";
import { ValidateAccessSessionUseCase } from "./ValidateAccessSessionUseCase";
import { LogoutUseCase } from "./LogoutUseCase";
import { LogoutAllSessionsUseCase } from "./LogoutAllSessionsUseCase";
import { ChangePasswordUseCase } from "./ChangePasswordUseCase";
import {
  UpdateUserStatusUseCase,
  ResetUserPasswordUseCase,
} from "../user/UserManagementUseCases";

beforeEach(() => vi.stubEnv("JWT_SECRET", "unit-test-session-signing-key"));
afterEach(() => vi.unstubAllEnvs());

function setup() {
  const userId = "11111111-1111-4111-8111-111111111111";
  const user = User.create(
    {
      username: "tester",
      email: "tester@example.test",
      fullName: "Test User",
      passwordHash: "hash:123",
      status: "ACTIVE",
      mustChangePassword: false,
    },
    new UniqueEntityId(userId),
  );
  const records = new Map<string, AuthSessionProps>();
  const sessions: IAuthSessionRepository = {
    findById: async (id) => {
      const s = records.get(id);
      return s ? { ...s } : null;
    },
    findByHash: async (hash) => {
      const s = [...records.values()].find((s) => s.refreshTokenHash === hash);
      return s ? { ...s } : null;
    },
    save: async (s) => {
      records.set(s.id!, { ...s });
    },
    revokeByUserId: async (id) => {
      for (const s of records.values())
        if (s.userId === id) s.revokedAt = new Date();
    },
    revokeAllExcept: async (id, active) => {
      for (const s of records.values())
        if (s.userId === id && s.id !== active) s.revokedAt = new Date();
    },
    rotateRefreshToken: async (s, expected) => {
      const current = records.get(s.id!);
      if (
        !current ||
        current.revokedAt ||
        current.refreshTokenHash !== expected ||
        current.expiresAt.getTime() <= Date.now()
      )
        return false;
      records.set(s.id!, { ...s });
      return true;
    },
  };
  const users = {
    findById: vi.fn(async () => user),
    findByUsernameOrEmail: vi.fn(async () => user),
    save: vi.fn(async () => undefined),
    findByIdWithRoles: vi.fn(async () => ({ user, roles: ["STUDENT"] })),
  } as unknown as IUserRepository;
  const roles = {
    getRolePermissionsByUserId: vi.fn(async () => ({
      roles: ["STUDENT"],
      permissions: ["BOOKING_CREATE"],
    })),
  } as IRolePermissionQuery;
  const transaction = { testTransaction: true };
  const uow = {
    complete: async <T>(run: () => Promise<T>) => run(),
    getTransaction: () => transaction,
  } as IUnitOfWork;
  const audit = {
    save: vi.fn(async () => undefined),
  } as unknown as IAuditLogRepository;
  const hasher = {
    compare: async (plain: string, hash: string) => hash === `hash:${plain}`,
    hash: async (plain: string) => `hash:${plain}`,
  };
  const tokens = new JwtTokenService();
  const login = new LoginUseCase(
    users,
    sessions,
    roles,
    hasher,
    tokens,
    uow,
    audit,
  );
  const refresh = new RefreshSessionUseCase(
    users,
    sessions,
    roles,
    tokens,
    uow,
  );
  const validate = new ValidateAccessSessionUseCase(
    tokens,
    sessions,
    users,
    roles,
  );
  const logout = new LogoutUseCase(sessions, uow);
  const signIn = async () =>
    (await login.execute({ identifier: "tester", password: "123" })).getValue();
  return {
    userId,
    user,
    records,
    sessions,
    users,
    roles,
    uow,
    audit,
    hasher,
    tokens,
    login,
    refresh,
    validate,
    logout,
    signIn,
  };
}

describe("session-bound access tokens", () => {
  it('allows local administrator fallback but refuses local student login in SSO mode',async()=>{
    const s=setup();const denied=await s.login.execute({identifier:'tester',password:'123',adminOnly:true});expect(denied.isFailure).toBe(true);expect(s.records.size).toBe(0);
    vi.mocked(s.roles.getRolePermissionsByUserId).mockResolvedValue({roles:['ADMIN'],permissions:[]});expect((await s.login.execute({identifier:'tester',password:'123',adminOnly:true})).isSuccess).toBe(true);
  });
  it('bounds an SSO-backed Lab session to the provider token expiry',async()=>{
    const s=setup(),expiresAt=new Date(Date.now()+600000);
    const issued=await new IssueSession(s.users,s.sessions,s.roles,s.tokens,s.uow,s.audit).execute(s.user,{}, {expiresAt,authenticationMethod:'SSO'});
    expect(s.records.get(issued.sessionId)?.expiresAt.getTime()).toBe(expiresAt.getTime());
    const session=s.records.get(issued.sessionId)!;session.authenticationMethod='SSO';expect((await s.validate.execute(issued.accessToken)).usesSso).toBe(true);
    session.expiresAt=new Date(Date.now()-1);await expect(s.validate.execute(issued.accessToken)).rejects.toMatchObject({code:'SESSION_REVOKED'});
  });
  it('reads setup requirement from current account state on every token validation',async()=>{
    const s=setup(),auth=await s.signIn();
    expect((await s.validate.execute(auth.accessToken)).requiresAccountSetup).toBe(false);
    vi.mocked(s.users.findById).mockResolvedValue(User.create({fullName:'Google User',username:'google@lhu.edu.vn',email:'google@lhu.edu.vn',passwordHash:null,status:'ACTIVE',mustChangePassword:false},new UniqueEntityId(s.userId)));
    expect((await s.validate.execute(auth.accessToken)).requiresAccountSetup).toBe(true);
  });
  it('does not create a session when SQL detects an account/password change during login', async () => {
    const s = setup();
    s.users.touchLastLogin = vi.fn(async () => false);
    const result = await s.login.execute({ identifier: 'tester', password: '123' });
    expect(result.isFailure).toBe(true);
    expect(s.records.size).toBe(0);
  });
  it("logs in with unchanged short-password policy and creates a matching 15-minute JWT/session", async () => {
    const s = setup();
    const result = await s.signIn();
    const payload = s.tokens.verifyAccessToken(result.accessToken);
    expect(s.records.get(payload.sessionId)?.userId).toBe(s.userId);
    expect(await s.validate.execute(result.accessToken)).toMatchObject({
      userId: s.userId,
      roles: ["STUDENT"],
    });
    const decoded = JSON.parse(
      Buffer.from(result.accessToken.split(".")[1], "base64url").toString(),
    );
    expect(decoded.exp - decoded.iat).toBe(900);
  });
  it("rejects the existing access token immediately after logout", async () => {
    const s = setup();
    const auth = await s.signIn();
    expect(
      (await s.logout.execute({ refreshToken: auth.refreshToken })).isSuccess,
    ).toBe(true);
    await expect(s.validate.execute(auth.accessToken)).rejects.toMatchObject({
      code: "SESSION_REVOKED",
    });
    expect(
      (await s.refresh.execute({ refreshToken: auth.refreshToken })).isFailure,
    ).toBe(true);
  });
  it("supports bearer logout using the validated session identity", async () => {
    const s = setup();
    const auth = await s.signIn();
    const identity = await s.validate.execute(auth.accessToken);
    await s.logout.execute(identity);
    await expect(s.validate.execute(auth.accessToken)).rejects.toThrow();
  });
  it("reads current permissions instead of trusting old ADMIN claims", async () => {
    const s = setup();
    vi.mocked(s.roles.getRolePermissionsByUserId).mockResolvedValue({
      roles: ["ADMIN"],
      permissions: ["USER_DELETE"],
    });
    const auth = await s.signIn();
    vi.mocked(s.roles.getRolePermissionsByUserId).mockResolvedValue({
      roles: ["TEACHER"],
      permissions: [],
    });
    expect(await s.validate.execute(auth.accessToken)).toMatchObject({
      roles: ["TEACHER"],
      permissions: [],
    });
  });
  it("rejects legacy JWTs, expired JWTs and an unexpected signing algorithm", () => {
    const s = setup();
    const secret = process.env.JWT_SECRET!;
    const payload = {
      userId: s.userId,
      sessionId: "22222222-2222-4222-8222-222222222222",
      roles: [],
      permissions: [],
    };
    expect(() =>
      s.tokens.verifyAccessToken(jwt.sign({ userId: s.userId }, secret)),
    ).toThrow();
    expect(() =>
      s.tokens.verifyAccessToken(
        jwt.sign(
          { ...payload, exp: Math.floor(Date.now() / 1000) - 1 },
          secret,
        ),
      ),
    ).toThrow();
    expect(() =>
      s.tokens.verifyAccessToken(
        jwt.sign(payload, secret, { algorithm: "HS384" }),
      ),
    ).toThrow();
  });
  it("rejects locked/deleted users and expired or mismatched sessions", async () => {
    const s = setup();
    const auth = await s.signIn();
    const payload = s.tokens.verifyAccessToken(auth.accessToken);
    s.user.updateStatus("LOCKED");
    await expect(s.validate.execute(auth.accessToken)).rejects.toMatchObject({
      code: "ACCOUNT_UNAVAILABLE",
    });
    s.user.updateStatus("ACTIVE");
    s.records.get(payload.sessionId)!.expiresAt = new Date(0);
    await expect(s.validate.execute(auth.accessToken)).rejects.toThrow();
    s.records.get(payload.sessionId)!.expiresAt = new Date(Date.now() + 10000);
    s.records.get(payload.sessionId)!.userId = "another-user";
    await expect(s.validate.execute(auth.accessToken)).rejects.toThrow();
  });
  it("revokes all sessions on an admin lock; unlocking does not restore old sessions", async () => {
    const s = setup();
    const one = await s.signIn();
    const two = await s.signIn();
    const status = new UpdateUserStatusUseCase(
      s.users,
      s.uow,
      s.audit,
      s.sessions,
    );
    await status.execute({
      id: s.userId,
      status: "LOCKED",
      actorUserId: "other-admin",
    });
    s.user.updateStatus("ACTIVE");
    await expect(s.validate.execute(one.accessToken)).rejects.toThrow();
    await expect(s.validate.execute(two.accessToken)).rejects.toThrow();
  });
  it("logout-all invalidates every session of the account", async () => {
    const s = setup();
    const one = await s.signIn();
    const two = await s.signIn();
    await new LogoutAllSessionsUseCase(s.sessions, s.uow).execute(s.userId);
    await expect(s.validate.execute(one.accessToken)).rejects.toThrow();
    await expect(s.validate.execute(two.accessToken)).rejects.toThrow();
  });
  it("a user password change preserves only the current session", async () => {
    const s = setup();
    const one = await s.signIn();
    const two = await s.signIn();
    const change = new ChangePasswordUseCase(
      s.users,
      s.sessions,
      s.hasher,
      s.uow,
      s.audit,
    );
    const result = await change.execute({
      userId: s.userId,
      currentPasswordHashOrText: "123",
      newPasswordText: "1",
      activeRefreshToken: two.refreshToken,
    });
    expect(result.isSuccess).toBe(true);
    await expect(s.validate.execute(one.accessToken)).rejects.toThrow();
    await expect(s.validate.execute(two.accessToken)).resolves.toMatchObject({
      userId: s.userId,
    });
  });
  it("admin password reset revokes all existing sessions without adding password restrictions", async () => {
    const s = setup();
    const auth = await s.signIn();
    await new ResetUserPasswordUseCase(
      s.users,
      s.sessions,
      s.hasher,
      s.uow,
      s.audit,
    ).execute({ id: s.userId, temporaryPassword: "1", actorUserId: "admin" });
    await expect(s.validate.execute(auth.accessToken)).rejects.toThrow();
  });
});

describe("refresh rotation", () => {
  it("replaces the refresh token without extending the seven-day session", async () => {
    const s = setup();
    const auth = await s.signIn();
    const renewed = (
      await s.refresh.execute({ refreshToken: auth.refreshToken })
    ).getValue();
    expect(renewed.refreshToken).not.toBe(auth.refreshToken);
    expect(renewed.refreshExpiresAt.getTime()).toBe(
      auth.refreshExpiresAt.getTime(),
    );
    expect(
      (await s.refresh.execute({ refreshToken: auth.refreshToken })).isFailure,
    ).toBe(true);
    await expect(s.validate.execute(renewed.accessToken)).resolves.toBeTruthy();
  });
  it("only one concurrent refresh can consume the same old token", async () => {
    const s = setup();
    const auth = await s.signIn();
    const results = await Promise.all([
      s.refresh.execute({ refreshToken: auth.refreshToken }),
      s.refresh.execute({ refreshToken: auth.refreshToken }),
    ]);
    expect(results.filter((r) => r.isSuccess)).toHaveLength(1);
    expect(results.filter((r) => r.isFailure)).toHaveLength(1);
  });
  it("does not revive a session revoked between lookup and atomic rotation", async () => {
    const s = setup();
    const auth = await s.signIn();
    const rotate = s.sessions.rotateRefreshToken;
    s.sessions.rotateRefreshToken = async (...args) => {
      await s.sessions.revokeByUserId(s.userId);
      return rotate(...args);
    };
    expect(
      (await s.refresh.execute({ refreshToken: auth.refreshToken })).isFailure,
    ).toBe(true);
  });
});
