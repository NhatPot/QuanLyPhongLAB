import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type {
  ISelfServiceAuthStore,
  SelfServiceTransaction,
  AuthChallenge,
  AuthAccount,
  AccountSetupProfile,
} from "../../ports/ISelfServiceAuthStore";
import type {
  IFitSsoProvider,
  SsoIdentity,
  SsoAuthorization,
} from "../../ports/IFitSsoProvider";
import type { IPasswordHasher } from "../../ports/IPasswordHasher";
import type { IGoogleIdentityVerifier } from "../../ports/IAuthDelivery";
import type { FitSsoConfig } from "../../../infrastructure/auth/fit-sso-config";
import {
  assertFitSsoConfig,
  ssoOrigin,
} from "../../../infrastructure/auth/fit-sso-config";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/AppError";
import type { AuthFlowContext } from "./SelfServiceAuth";

type Flow = SsoAuthorization & { origin: string; returnTo: string };
export type SsoOutcome =
  | {
      state: "active" | "pending_review";
      userId: string;
      identity: SsoIdentity;
      returnTo: string;
    }
  | { state: "link_required"; pendingId: string };
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const ssoReturnTo = (value: string) =>
  /^\/(?!\/)/.test(value) &&
  !/[\\\u0000-\u0020]/.test(value) &&
  !/^\/(?:api|login|register|sso-link|complete-account)(?:\/|\?|$)/.test(value)
    ? value
    : "/";
export class FitSsoAuth {
  constructor(
    readonly config: FitSsoConfig,
    private store: ISelfServiceAuthStore,
    private provider: IFitSsoProvider,
    private hasher: IPasswordHasher,
    private google: IGoogleIdentityVerifier,
    private domains: { studentDomains: string[]; teacherDomains: string[] },
    private googleNonceSecret: string,
    private now: () => Date = () => new Date(),
  ) {}
  private hash(value: string) {
    return createHmac("sha256", Buffer.from(this.config.flowKey, "hex"))
      .update(value)
      .digest("hex");
  }
  private seal(value: unknown) {
    const iv = randomBytes(12),
      cipher = createCipheriv(
        "aes-256-gcm",
        Buffer.from(this.config.flowKey, "hex"),
        iv,
      );
    const data = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), data]
      .map((v) => v.toString("base64url"))
      .join(".");
  }
  private open<T>(value: string): T {
    try {
      const [iv, tag, data] = value
        .split(".")
        .map((v) => Buffer.from(v, "base64url"));
      const cipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(this.config.flowKey, "hex"),
        iv,
      );
      cipher.setAuthTag(tag);
      return JSON.parse(
        Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
      );
    } catch {
      throw new UnauthorizedError(
        "Phiên SSO không hợp lệ. Vui lòng đăng nhập lại.",
        "SSO_FLOW_INVALID",
      );
    }
  }
  private valid(
    c: AuthChallenge | null,
    purpose: AuthChallenge["purpose"],
    ctx: AuthFlowContext,
  ): asserts c is AuthChallenge {
    if (
      !c ||
      c.purpose !== purpose ||
      c.consumedAt ||
      Date.parse(c.expiresAt) <= this.now().getTime() ||
      !equal(c.binding, this.hash(ctx.binding))
    )
      throw new UnauthorizedError(
        "Phiên SSO đã hết hạn hoặc không đúng trình duyệt. Vui lòng đăng nhập lại.",
        "SSO_FLOW_INVALID",
      );
  }
  private async rate(
    tx: SelfServiceTransaction,
    key: string,
    max: number,
    window: number,
  ) {
    const hash = this.hash(key),
      b = await tx.budget(hash, new Date(this.now().getTime() - window));
    if (b.count >= max)
      throw new AppError(
        "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
        "AUTH_RATE_LIMITED",
        429,
        {
          retryAfter: Math.max(
            1,
            Math.ceil(
              ((b.firstAt?.getTime() || this.now().getTime()) +
                window -
                this.now().getTime()) /
                1000,
            ),
          ),
        },
      );
    await tx.spend(hash, this.now());
  }
  private available(account: AuthAccount) {
    if (account.deletedAt)
      throw new UnauthorizedError(
        "Tài khoản Lab đã bị xóa. Vui lòng liên hệ quản trị viên.",
        "ACCOUNT_DELETED",
      );
    if (account.status === "LOCKED")
      throw new UnauthorizedError(
        "Tài khoản Lab đang bị khóa.",
        "ACCOUNT_LOCKED",
      );
    if (account.registrationStatus === "REJECTED")
      throw new UnauthorizedError(
        "Đăng ký giảng viên đã bị từ chối.",
        "REGISTRATION_REJECTED",
      );
    if (
      account.status === "INACTIVE" &&
      account.registrationStatus === "PENDING_REVIEW"
    )
      return "pending_review" as const;
    if (account.status !== "ACTIVE")
      throw new UnauthorizedError(
        "Tài khoản Lab chưa khả dụng.",
        "ACCOUNT_UNAVAILABLE",
      );
    return "active" as const;
  }
  private identity(identity: SsoIdentity) {
    if (
      identity.issuer !== this.config.issuer ||
      !identity.subject ||
      !identity.emailVerified ||
      !/^\S+@[^@\s]+\.[^@\s]+$/.test(identity.email) ||
      !Number.isFinite(Date.parse(identity.expiresAt)) ||
      Date.parse(identity.expiresAt) <= this.now().getTime()
    )
      throw new UnauthorizedError(
        "Thông tin SSO chưa được xác minh hợp lệ.",
        "SSO_IDENTITY_INVALID",
      );
  }
  async start(origin: string, returnTo: string, ctx: AuthFlowContext) {
    assertFitSsoConfig(this.config);
    origin = ssoOrigin(this.config, origin);
    const flow: Flow = {
      origin,
      returnTo: ssoReturnTo(returnTo),
      redirectUri: origin + "/api/auth/sso/callback",
      state: randomBytes(32).toString("base64url"),
      nonce: randomBytes(32).toString("base64url"),
      verifier: randomBytes(48).toString("base64url"),
    };
    const url = await this.provider.authorizationUrl(flow);
    const c: AuthChallenge = {
      id: randomUUID(),
      email: "",
      purpose: "SSO_FLOW",
      binding: this.hash(ctx.binding),
      codeHash: this.hash(flow.state),
      createdAt: this.now().toISOString(),
      expiresAt: new Date(+this.now() + 600000).toISOString(),
      eligible: true,
      encryptedPayload: this.seal(flow),
    };
    await this.store.transaction(async (tx) => {
      await this.rate(tx, "sso-start:" + ctx.binding, 10, 600000);
      await this.rate(tx, "sso-start-ip:" + ctx.ip, 300, 600000);
      await tx.saveChallenge(c);
    });
    return { authorizationUrl: url, flowId: c.id };
  }
  async callback(
    url: URL,
    flowId: string,
    ctx: AuthFlowContext,
  ): Promise<SsoOutcome> {
    assertFitSsoConfig(this.config);
    const flow = await this.store.transaction(async (tx) => {
      const c = await tx.challenge(flowId);
      this.valid(c, "SSO_FLOW", ctx);
      if (!equal(c.codeHash, this.hash(url.searchParams.get("state") || "")))
        throw new UnauthorizedError(
          "Phản hồi SSO không đúng phiên đăng nhập.",
          "SSO_STATE_INVALID",
        );
      const flow = this.open<Flow>(c.encryptedPayload!);
      if (
        url.origin !== flow.origin ||
        url.origin + url.pathname !== flow.redirectUri
      )
        throw new UnauthorizedError(
          "Địa chỉ quay lại SSO không hợp lệ.",
          "SSO_ORIGIN_INVALID",
        );
      c.consumedAt = this.now().toISOString();
      c.encryptedPayload = undefined;
      await tx.saveChallenge(c);
      return flow;
    });
    if (url.searchParams.has("error"))
      throw new UnauthorizedError(
        "Bạn chưa hoàn tất đăng nhập FIT LHU SSO. Vui lòng thử lại.",
        "SSO_CANCELLED",
      );
    const identity = await this.provider.exchange(url, flow);
    this.identity(identity);
    return this.store.transaction(async (tx) => {
      const linked = await tx.accountBySso(identity.issuer, identity.subject);
      if (linked) {
        if (linked.email !== identity.email)
          throw new ConflictError(
            "Email SSO đã thay đổi. Vui lòng liên hệ quản trị viên Lab.",
            "SSO_EMAIL_CHANGED",
          );
        return {
          state: this.available(linked),
          userId: linked.id,
          identity,
          returnTo: flow.returnTo,
        };
      }
      const existing = await tx.account(identity.email);
      if (existing) {
        this.available(existing);
        if (existing.ssoLinked)
          throw new ConflictError(
            "Tài khoản Lab đã liên kết với một định danh SSO khác.",
            "SSO_ALREADY_LINKED",
          );
        const c: AuthChallenge = {
          id: randomUUID(),
          email: identity.email,
          userId: existing.id,
          purpose: "SSO_LINK",
          binding: this.hash(ctx.binding),
          codeHash: "",
          eligible: true,
          createdAt: this.now().toISOString(),
          expiresAt: new Date(+this.now() + 600000).toISOString(),
          encryptedPayload: this.seal({ identity, returnTo: flow.returnTo }),
        };
        await tx.saveChallenge(c);
        return { state: "link_required", pendingId: c.id };
      }
      const domain = identity.email.split("@")[1],
        role = this.domains.studentDomains.includes(domain)
          ? "STUDENT"
          : this.domains.teacherDomains.includes(domain)
            ? "TEACHER"
            : null;
      if (!role || identity.email.length > 100)
        throw new ValidationError(
          "Vui lòng dùng email trường phù hợp để đăng ký Lab.",
        );
      const account: AuthAccount = {
        id: randomUUID(),
        email: identity.email,
        username: identity.email,
        fullName: identity.name.trim().slice(0, 255) || identity.email,
        passwordHash: null,
        status: role === "STUDENT" ? "ACTIVE" : "INACTIVE",
        deletedAt: null,
        emailVerifiedAt: this.now(),
        department: null,
        phone: null,
      };
      await tx.createAccount(account, role);
      await tx.linkSso(
        account.id,
        identity.issuer,
        identity.subject,
        identity.email,
      );
      await tx.audit("SSO_REGISTRATION_COMPLETED", account.id);
      return {
        state: role === "STUDENT" ? "active" : "pending_review",
        userId: account.id,
        identity,
        returnTo: flow.returnTo,
      };
    });
  }
  async pending(id: string, ctx: AuthFlowContext) {
    return this.store.transaction(async (tx) => {
      const c = await tx.challenge(id);
      this.valid(c, "SSO_LINK", ctx);
      const account = await tx.accountById(c.userId!);
      if (!account) throw new UnauthorizedError();
      this.available(account);
      return {
        email: c.email,
        hasPassword: !!account.passwordHash,
        googleLinked: await tx.googleLinked(account.id),
      };
    });
  }
  async link(
    id: string,
    input: {
      password?: string;
      googleCredential?: string;
      googleChallengeId?: string;
    },
    ctx: AuthFlowContext,
  ): Promise<SsoOutcome> {
    assertFitSsoConfig(this.config);
    const snapshot = await this.store.transaction(async (tx) => {
      const c = await tx.challenge(id);
      this.valid(c, "SSO_LINK", ctx);
      const a = await tx.accountById(c.userId!);
      if (!a) throw new UnauthorizedError();
      this.available(a);
      await this.rate(tx, "sso-link-requests:" + ctx.binding, 30, 900000);
      if (
        (
          await tx.budget(
            this.hash("sso-link-fail:" + a.id),
            new Date(+this.now() - 900000),
          )
        ).count >= 5
      )
        throw new AppError(
          "Bạn đã xác nhận sai quá nhiều lần. Vui lòng thử lại sau.",
          "AUTH_RATE_LIMITED",
          429,
          { retryAfter: 900 },
        );
      return { ...a };
    });
    const passwordOk = !!(
      input.password &&
      snapshot.passwordHash &&
      (await this.hasher.compare(input.password, snapshot.passwordHash))
    );
    const google = input.googleCredential
      ? await this.google.verify(input.googleCredential)
      : undefined;
    const result = await this.store.transaction(async (tx) => {
      const c = await tx.challenge(id);
      this.valid(c, "SSO_LINK", ctx);
      const account = await tx.accountById(c.userId!);
      if (!account || account.email !== c.email) throw new UnauthorizedError();
      this.available(account);
      const failKey = this.hash("sso-link-fail:" + account.id);
      if ((await tx.budget(failKey, new Date(+this.now() - 900000))).count >= 5)
        throw new AppError(
          "Bạn đã xác nhận sai quá nhiều lần. Vui lòng thử lại sau.",
          "AUTH_RATE_LIMITED",
          429,
          { retryAfter: 900 },
        );
      let proof = passwordOk && account.passwordHash === snapshot.passwordHash;
      if (google && input.googleChallengeId) {
        const n = await tx.challenge(input.googleChallengeId);
        // Google nonce uses the existing auth HMAC key, separate from the SSO state key.
        const hash = (value: string) =>
          createHmac("sha256", this.googleNonceSecret)
            .update(value)
            .digest("hex");
        if (
          n &&
          n.purpose === "GOOGLE" &&
          !n.consumedAt &&
          Date.parse(n.expiresAt) > +this.now() &&
          equal(n.binding, hash(ctx.binding)) &&
          equal(n.codeHash, hash(google.nonce))
        ) {
          n.consumedAt = this.now().toISOString();
          await tx.saveChallenge(n);
          const owner = await tx.accountByGoogle(google.sub);
          proof = owner?.id === account.id && google.email === account.email;
        }
      }
      if (!proof) {
        await tx.spend(failKey, this.now());
        return { error: true } as const;
      }
      const data = this.open<{ identity: SsoIdentity; returnTo: string }>(
        c.encryptedPayload!,
      );
      this.identity(data.identity);
      await tx.linkSso(
        account.id,
        data.identity.issuer,
        data.identity.subject,
        account.email,
      );
      c.consumedAt = this.now().toISOString();
      c.encryptedPayload = undefined;
      await tx.saveChallenge(c);
      await tx.audit("SSO_IDENTITY_LINKED", account.id);
      return {
        state: this.available(account),
        userId: account.id,
        ...data,
      } as const;
    });
    if ("error" in result)
      throw new UnauthorizedError(
        "Chưa xác nhận được tài khoản Lab cũ. Kiểm tra mật khẩu hoặc chọn Google đã liên kết.",
        "SSO_LINK_PROOF_INVALID",
      );
    return result;
  }
  async completeProfile(input: AccountSetupProfile, ctx: AuthFlowContext) {
    const profile = {
      fullName: input.fullName.trim(),
      department: input.department.trim(),
      phone: input.phone.trim(),
    };
    if (
      profile.fullName.length < 2 ||
      profile.fullName.length > 255 ||
      profile.department.length < 2 ||
      profile.department.length > 255 ||
      !profile.phone ||
      profile.phone.length > 50
    )
      throw new ValidationError(
        "Vui lòng nhập họ tên, ngành / phòng ban và số điện thoại hợp lệ.",
      );
    return this.store.transaction(async (tx) => {
      const account = await tx.accountById(ctx.actorId!);
      if (
        !account ||
        !account.ssoLinked ||
        this.available(account) !== "active"
      )
        throw new UnauthorizedError();
      await tx.completeSsoProfile(account.id, profile);
      await tx.audit("SSO_PROFILE_COMPLETED", account.id);
      return { state: "profile_completed" };
    });
  }
  async saveSession(
    sessionId: string,
    userId: string,
    identity: SsoIdentity,
    returnTo: string,
    expiresAt: Date,
  ) {
    await this.store.transaction((tx) =>
      tx.saveChallenge({
        id: sessionId,
        userId,
        email: identity.email,
        purpose: "SSO_SESSION",
        binding: "",
        codeHash: "",
        eligible: true,
        createdAt: this.now().toISOString(),
        expiresAt: expiresAt.toISOString(),
        encryptedPayload: this.seal({
          idToken: identity.idToken,
          tokenExpiresAt: identity.expiresAt,
          returnTo,
        }),
      }),
    );
  }
  async session(sessionId: string) {
    return this.store.transaction(async (tx) => {
      const c = await tx.challenge(sessionId);
      if (
        c?.purpose !== "SSO_SESSION" ||
        c.consumedAt ||
        Date.parse(c.expiresAt) <= +this.now()
      )
        return null;
      return this.open<{
        idToken: string;
        tokenExpiresAt: string;
        returnTo: string;
      }>(c.encryptedPayload!);
    });
  }
  async logout(sessionId: string, origin: string) {
    const data = await this.session(sessionId);
    if (!data) return undefined;
    return this.provider.logoutUrl(
      ssoOrigin(this.config, origin),
      Date.parse(data.tokenExpiresAt) > +this.now() ? data.idToken : undefined,
    );
  }
  async prepareLogout(sessionId: string, origin: string, ctx: AuthFlowContext) {
    const url = await this.logout(sessionId, origin);
    if (!url) return undefined;
    const c: AuthChallenge = {
      id: randomUUID(),
      email: "",
      purpose: "SSO_LOGOUT",
      binding: this.hash(ctx.binding),
      codeHash: "",
      eligible: true,
      createdAt: this.now().toISOString(),
      expiresAt: new Date(+this.now() + 60000).toISOString(),
      encryptedPayload: this.seal({ url }),
    };
    await this.store.transaction((tx) => tx.saveChallenge(c));
    return c.id;
  }
  async finishLogout(id: string, ctx: AuthFlowContext) {
    return this.store.transaction(async (tx) => {
      const c = await tx.challenge(id);
      this.valid(c, "SSO_LOGOUT", ctx);
      const { url } = this.open<{ url: string }>(c.encryptedPayload!);
      if (new URL(url).origin !== this.config.issuer)
        throw new UnauthorizedError();
      c.consumedAt = this.now().toISOString();
      c.encryptedPayload = undefined;
      await tx.saveChallenge(c);
      return url;
    });
  }
}
