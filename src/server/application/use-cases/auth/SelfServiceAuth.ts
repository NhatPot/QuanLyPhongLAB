import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import type {
  AccountRole,
  AccountSetupProfile,
  AuthAccount,
  AuthChallenge,
  AuthPurpose,
  ISelfServiceAuthStore,
  SelfServiceTransaction,
} from "../../ports/ISelfServiceAuthStore";
import type {
  IAuthDelivery,
  IGoogleIdentityVerifier,
} from "../../ports/IAuthDelivery";
import type { IPasswordHasher } from "../../ports/IPasswordHasher";
import type { SelfServiceConfig } from "../../ports/SelfServiceConfig";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/AppError";

export interface AuthFlowContext {
  binding: string;
  ip: string;
  actorId?: string;
}
export type AccountOutcome = {
  state: "active" | "pending_review";
  userId: string;
};
const minute = 60000;
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function assertNewPassword(value: string) {
  if (value.length < 12 || Buffer.byteLength(value, "utf8") > 72)
    throw new ValidationError(
      "Mật khẩu cần ít nhất 12 ký tự và không quá 72 byte UTF-8.",
    );
}
const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export class SelfServiceAuth {
  constructor(
    readonly config: SelfServiceConfig,
    private readonly store: ISelfServiceAuthStore,
    private readonly delivery: IAuthDelivery,
    private readonly hasher: IPasswordHasher,
    private readonly googleVerifier: IGoogleIdentityVerifier,
    private readonly now: () => Date = () => new Date(),
  ) {}
  private hash(value: string) {
    return createHmac("sha256", this.config.secret).update(value).digest("hex");
  }
  private unavailable() {
    return new AppError(
      "Chức năng xác minh email chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
      "AUTH_SERVICE_UNAVAILABLE",
      503,
    );
  }
  private mailAvailable() {
    if(this.config.ssoEnabled)throw new AppError("Vui lòng quản lý tài khoản và xác minh email tại FIT LHU SSO.","SSO_REQUIRED",403);
    if (!this.config.mailReady || this.config.secret.length < 32)
      throw this.unavailable();
  }
  private role(email: string): AccountRole {
    const domain = email.split("@")[1];
    if (this.config.studentDomains.includes(domain)) return "STUDENT";
    if (this.config.teacherDomains.includes(domain)) return "TEACHER";
    throw new ValidationError(
      "Vui lòng sử dụng email sinh viên @lachong.edu.vn hoặc email giảng viên @lhu.edu.vn.",
    );
  }
  private active(account: AuthAccount | null) {
    if (!account || account.deletedAt || account.status !== "ACTIVE")
      throw new UnauthorizedError(
        "Tài khoản chưa được duyệt hoặc không khả dụng.",
        "ACCOUNT_UNAVAILABLE",
      );
    return account;
  }
  private accountExists() {
    return new ConflictError(
      "Email đã có tài khoản. Vui lòng đăng nhập bằng Google hoặc tài khoản hiện có; nếu quên mật khẩu, chọn Quên mật khẩu.",
      "ACCOUNT_EXISTS",
    );
  }
  private accountProfile(input: {fullName: string; department?: string; phone?: string}): AccountSetupProfile {
    const fullName = input.fullName.trim(), department = input.department?.trim() || "", phone = input.phone?.trim() || "";
    if (fullName.length < 2 || fullName.length > 255) throw new ValidationError("Họ tên cần từ 2 đến 255 ký tự.");
    if (department.length < 2 || department.length > 255) throw new ValidationError("Vui lòng nhập ngành / phòng ban từ 2 đến 255 ký tự.");
    if (!phone || phone.length > 50) throw new ValidationError("Vui lòng nhập số điện thoại không quá 50 ký tự.");
    return {fullName, department, phone};
  }
  private challengeValid(
    c: AuthChallenge | null,
    purpose: AuthPurpose,
    context: AuthFlowContext,
    grant = false,
  ): asserts c is AuthChallenge {
    const end = grant ? c?.grantExpiresAt : c?.expiresAt;
    if (
      !c ||
      c.purpose !== purpose ||
      !safeEqual(c.binding, this.hash(context.binding)) ||
      c.consumedAt ||
      !end ||
      Date.parse(end) <= this.now().getTime()
    ) {
      throw new UnauthorizedError(
        "Mã xác minh hoặc phiên xác minh đã hết hạn. Vui lòng yêu cầu mã mới.",
        "CHALLENGE_INVALID",
      );
    }
  }
  private async limit(
    tx: SelfServiceTransaction,
    parts: string,
    max: number,
    windowMs: number,
    cooldown = 0,
    spend = true,
  ) {
    const key = this.hash(parts),
      now = this.now();
    const b = await tx.budget(key, new Date(now.getTime() - windowMs));
    const wait =
      b.count >= max
        ? Math.max(
            1,
            Math.ceil(
              ((b.firstAt?.getTime() || now.getTime()) +
                windowMs -
                now.getTime()) /
                1000,
            ),
          )
        : b.lastAt && now.getTime() - b.lastAt.getTime() < cooldown
          ? Math.ceil((b.lastAt.getTime() + cooldown - now.getTime()) / 1000)
          : 0;
    if (wait)
      throw new AppError(
        "Bạn đã đạt giới hạn yêu cầu. Vui lòng thử lại sau.",
        "AUTH_RATE_LIMITED",
        429,
        { retryAfter: wait },
      );
    if (spend) await tx.spend(key, now);
    return b.count;
  }
  private async reserve(
    tx: SelfServiceTransaction,
    email: string,
    purpose: AuthPurpose,
    ip: string,
  ) {
    await this.limit(tx, "delivery:blocked", 1, 1440 * minute, 0, false);
    const specs: [string, number, number, number][] = [
      [`send:${email}:${purpose}`, 6, 60 * minute, minute],
      [`email:${email}`, 12, 60 * minute, 0],
      [`ip:${ip}`, this.config.ipHourlyLimit || 30, 60 * minute, 0],
      ["delivery:global", this.config.senderBudget, 1440 * minute, 0],
    ];
    const counts: number[] = [];
    for (const [key, max, window, cooldown] of specs)
      counts.push(await this.limit(tx, key, max, window, cooldown, false));
    for (const [key] of specs) await tx.spend(this.hash(key), this.now());
    if (
      counts[3] < Math.ceil(this.config.senderBudget * 0.8) &&
      counts[3] + 1 >= Math.ceil(this.config.senderBudget * 0.8)
    )
      await tx.audit("AUTH_EMAIL_BUDGET_80_PERCENT");
    return counts[0];
  }
  private async issueOtp(
    tx: SelfServiceTransaction,
    input: {
      email: string;
      purpose: AuthPurpose;
      eligible: boolean;
      userId?: string;
      originalEmail?: string;
      googleSub?: string;
      fullName?: string;
    },
    context: AuthFlowContext,
  ) {
    const count = await this.reserve(
      tx,
      input.email,
      input.purpose,
      context.ip,
    );
    await tx.invalidate(input.email, input.purpose);
    const code = String(randomInt(100000, 1000000));
    const c: AuthChallenge = {
      ...input,
      id: randomUUID(),
      binding: this.hash(context.binding),
      codeHash: "",
      createdAt: this.now().toISOString(),
      expiresAt: new Date(this.now().getTime() + 5 * minute).toISOString(),
    };
    c.codeHash = this.hash(`${c.id}:${code}`);
    await tx.saveChallenge(c);
    if (c.eligible)
      await tx.enqueue({
        id: randomUUID(),
        challengeId: c.id,
        ciphertext: this.delivery.encrypt({
          kind: "otp",
          email: c.email,
          purpose: c.purpose,
          code,
          expiresAt: c.expiresAt,
        }),
        expiresAt: new Date(c.expiresAt),
        attempts: 0,
        status: "QUEUED",
      });
    return {
      challengeId: c.id,
      email: c.email,
      expiresAt: c.expiresAt,
      resendAt: new Date(this.now().getTime() + minute).toISOString(),
      resendsRemaining: Math.max(0, 5 - count),
    };
  }
  async requestCode(
    input: {
      email: string;
      purpose: "REGISTER" | "RESET_PASSWORD" | "SET_PASSWORD" | "CHANGE_EMAIL";
      googleSub?: string;
      fullName?: string;
    },
    context: AuthFlowContext,
  ) {
    this.mailAvailable();
    if (input.purpose === "REGISTER" && !this.config.registrationEnabled)
      throw this.unavailable();
    const email = normalizeEmail(input.email);
    if (input.purpose === "REGISTER") this.role(email);
    return this.store.transaction(async (tx) => {
      const account = await tx.account(email);
      if (input.purpose === "REGISTER" && account) throw this.accountExists();
      const eligible =
        input.purpose === "REGISTER"
          ? true
          : input.purpose === "SET_PASSWORD"
            ? Boolean(
                account &&
                account.id === context.actorId &&
                account.status === "ACTIVE" &&
                !account.deletedAt &&
                !account.passwordHash,
              )
            : input.purpose === "CHANGE_EMAIL"
              ? Boolean(
                  account &&
                  account.id === context.actorId &&
                  account.status === "ACTIVE" &&
                  !account.deletedAt,
                )
              : Boolean(
                  account &&
                  !account.deletedAt &&
                  account.status === "ACTIVE" &&
                  account.passwordHash,
                );
      return this.issueOtp(
        tx,
        { ...input, email, eligible, userId: account?.id },
        context,
      );
    });
  }
  async resend(id: string, context: AuthFlowContext) {
    const c = await this.store.transaction(async (tx) => {
      const current = await tx.challenge(id);
      if (
        !current ||
        ![
          "REGISTER",
          "RESET_PASSWORD",
          "SET_PASSWORD",
          "CHANGE_EMAIL",
          "CHANGE_EMAIL_NEW",
        ].includes(current.purpose) ||
        !safeEqual(current.binding, this.hash(context.binding)) ||
        current.consumedAt ||
        current.verifiedAt
      )
        throw new UnauthorizedError("Phiên xác minh không hợp lệ.");
      if (
        ["SET_PASSWORD", "CHANGE_EMAIL", "CHANGE_EMAIL_NEW"].includes(
          current.purpose,
        ) &&
        (!context.actorId || context.actorId !== current.userId)
      )
        throw new UnauthorizedError();
      return current;
    });
    if (c.purpose === "CHANGE_EMAIL_NEW")
      return this.store.transaction(async (tx) => {
        const user = this.active(await tx.accountById(context.actorId!));
        if (user.email !== c.originalEmail || (await tx.account(c.email)))
          throw new ConflictError(
            "Email tài khoản đã thay đổi. Vui lòng bắt đầu lại.",
          );
        return this.issueOtp(
          tx,
          {
            email: c.email,
            purpose: "CHANGE_EMAIL_NEW",
            eligible: true,
            userId: user.id,
            originalEmail: c.originalEmail,
          },
          context,
        );
      });
    return this.requestCode(
      {
        email: c.email,
        purpose: c.purpose as
          "REGISTER" | "RESET_PASSWORD" | "SET_PASSWORD" | "CHANGE_EMAIL",
        googleSub: c.googleSub,
        fullName: c.fullName,
      },
      context,
    );
  }
  async verifyCode(
    id: string,
    code: string,
    purpose: AuthPurpose,
    context: AuthFlowContext,
  ) {
    this.mailAvailable();
    // Expected wrong-code responses are returned from the transaction so attempts commit.
    const result = await this.store.transaction(async (tx) => {
      const c = await tx.challenge(id);
      this.challengeValid(c, purpose, context);
      if (c.verifiedAt)
        throw new UnauthorizedError("Mã xác minh đã được sử dụng.");
      const key = this.hash(`fail:${c.email}:${purpose}`);
      const failed = await tx.budget(
        key,
        new Date(this.now().getTime() - 60 * minute),
      );
      if (failed.count >= 5)
        return {
          error:
            "Bạn đã nhập sai mã quá số lần cho phép. Vui lòng thử lại sau.",
        };
      if (!c.eligible || !safeEqual(c.codeHash, this.hash(`${id}:${code}`))) {
        await tx.spend(key, this.now());
        return { error: "Mã xác minh không đúng hoặc đã hết hiệu lực." };
      }
      // An account may have been created since the OTP was requested, including
      // challenges issued before duplicate registration was blocked at entry.
      if (purpose === "REGISTER" && (await tx.account(c.email)))
        throw this.accountExists();
      const grant = randomBytes(32).toString("hex");
      c.verifiedAt = this.now().toISOString();
      c.grantHash = this.hash(grant);
      c.grantExpiresAt = new Date(
        this.now().getTime() + 10 * minute,
      ).toISOString();
      await tx.saveChallenge(c);
      return {
        grant,
        challengeId: c.id,
        email: c.email,
        requiresPassword: !c.googleSub,
        fullName: c.fullName || "",
      };
    });
    if ("error" in result)
      throw new UnauthorizedError(result.error, "OTP_INVALID");
    return result;
  }
  private async grant(
    tx: SelfServiceTransaction,
    id: string,
    grant: string,
    purpose: AuthPurpose,
    context: AuthFlowContext,
  ) {
    const c = await tx.challenge(id);
    this.challengeValid(c, purpose, context, true);
    if (
      !c.verifiedAt ||
      !c.grantHash ||
      !safeEqual(c.grantHash, this.hash(grant)) ||
      !c.eligible
    )
      throw new UnauthorizedError("Phiên xác minh không hợp lệ.");
    return c;
  }
  private async create(
    tx: SelfServiceTransaction,
    c: AuthChallenge,
    fullName: string,
    passwordHash: string | null,
    profile?: AccountSetupProfile,
  ): Promise<AccountOutcome> {
    if (await tx.account(c.email)) throw this.accountExists();
    const role = this.role(c.email);
    if (c.email.length > 100) throw new ValidationError('Email trường vượt độ dài tài khoản được hỗ trợ.');
    const account: AuthAccount = {
      id: randomUUID(),
      email: c.email,
      fullName: fullName.trim(),
      username: c.email,
      passwordHash,
      status: role === "STUDENT" ? "ACTIVE" : "INACTIVE",
      deletedAt: null,
      emailVerifiedAt: this.now(),
      department: profile?.department || null,
      phone: profile?.phone || null,
    };
    await tx.createAccount(account, role, c.googleSub);
    c.consumedAt = this.now().toISOString();
    await tx.saveChallenge(c);
    await tx.audit("SELF_REGISTRATION_COMPLETED", account.id);
    return {
      state: role === "STUDENT" ? "active" : "pending_review",
      userId: account.id,
    };
  }
  async completeRegistration(
    input: {
      challengeId: string;
      grant: string;
      fullName: string;
      password?: string;
      department?: string;
      phone?: string;
    },
    context: AuthFlowContext,
  ) {
    if (!this.config.registrationEnabled) throw this.unavailable();
    if (input.fullName.trim().length < 2 || input.fullName.trim().length > 255)
      throw new ValidationError("Họ tên cần từ 2 đến 255 ký tự.");
    // Password work happens before holding the SQL transaction lock.
    if (input.password !== undefined) assertNewPassword(input.password);
    const hash = input.password ? await this.hasher.hash(input.password) : null;
    return this.store.transaction(async (tx) => {
      const c = await this.grant(
        tx,
        input.challengeId,
        input.grant,
        "REGISTER",
        context,
      );
      if (!c.googleSub && !hash)
        throw new ValidationError("Vui lòng đặt mật khẩu cho tài khoản.");
      const profile = c.googleSub ? undefined : this.accountProfile(input);
      return this.create(tx, c, input.fullName, c.googleSub ? null : hash, profile);
    });
  }
  async completeAccountSetup(
    input: {fullName: string; department: string; phone?: string; password: string; confirmPassword: string},
    context: AuthFlowContext,
  ) {
    if(this.config.ssoEnabled)throw new AppError("Vui lòng hoàn thiện hồ sơ qua phiên FIT LHU SSO.","SSO_REQUIRED",403);
    if (!context.actorId) throw new UnauthorizedError();
    const profile = this.accountProfile(input);
    if (input.password !== input.confirmPassword) throw new ValidationError('Mật khẩu xác nhận không khớp.');
    assertNewPassword(input.password);
    const hash = await this.hasher.hash(input.password);
    return this.store.transaction(async tx => {
      const user = this.active(await tx.accountById(context.actorId!));
      if (user.passwordHash || !(await tx.googleLinked(user.id))) throw new ConflictError('Tài khoản không còn yêu cầu hoàn thiện hồ sơ.');
      this.role(user.email);
      if (user.email.length > 100) throw new ValidationError('Email trường vượt độ dài tài khoản được hỗ trợ.');
      await tx.completeAccountSetup(user.id, profile, hash);
      await tx.invalidate(user.email, 'SET_PASSWORD');
      await tx.invalidate(user.email, 'RESET_PASSWORD');
      await tx.audit('ACCOUNT_SETUP_COMPLETED', user.id);
      return {state: 'account_setup_completed' as const};
    });
  }
  async resetPassword(
    input: { challengeId: string; grant: string; password: string },
    context: AuthFlowContext,
    purpose: "RESET_PASSWORD" | "SET_PASSWORD" = "RESET_PASSWORD",
  ) {
    this.mailAvailable();
    assertNewPassword(input.password);
    const hash = await this.hasher.hash(input.password);
    await this.store.transaction(async (tx) => {
      const c = await this.grant(
        tx,
        input.challengeId,
        input.grant,
        purpose,
        context,
      );
      const user = this.active(await tx.account(c.email));
      if (
        user.id !== c.userId ||
        (purpose === "SET_PASSWORD"
          ? user.id !== context.actorId || Boolean(user.passwordHash)
          : !user.passwordHash)
      )
        throw new UnauthorizedError(
          "Tài khoản đã thay đổi. Vui lòng xác minh lại.",
        );
      await tx.setPassword(user.id, hash);
      await tx.invalidate(c.email, "RESET_PASSWORD");
      await tx.invalidate(c.email, "SET_PASSWORD");
      await tx.audit("SELF_PASSWORD_RESET", user.id);
      await this.notice(
        tx,
        user.email,
        "Mật khẩu LHU IT LAB của bạn vừa được cập nhật. Các phiên đăng nhập cũ đã được đăng xuất. Nếu bạn không thực hiện, vui lòng liên hệ quản trị viên phòng Lab.",
      );
    });
  }
  async googleNonce(context: AuthFlowContext, previousId?: string) {
    if (!this.config.googleEnabled)
      throw new AppError(
        "Đăng nhập Google chưa được cấu hình.",
        "GOOGLE_UNAVAILABLE",
        503,
      );
    return this.store.transaction(async (tx) => {
      // Re-rendering/reloading a page must not spend another initialization
      // allowance while this browser still has an unused, unexpired nonce.
      if (previousId) {
        const current = await tx.challenge(previousId);
        const nonce = this.hash(`google-nonce:${context.binding}:${previousId}`);
        if (current?.purpose === "GOOGLE" && !current.consumedAt &&
          Date.parse(current.expiresAt) > this.now().getTime() &&
          safeEqual(current.binding, this.hash(context.binding)) &&
          safeEqual(current.codeHash, this.hash(nonce)))
          return {nonce, challengeId:current.id, clientId:this.config.googleClientId, expiresAt:current.expiresAt};
      }
      await this.limit(tx, `google:${context.ip}`, 30, 60 * minute);
      const challengeId = randomUUID();
      const nonce = this.hash(`google-nonce:${context.binding}:${challengeId}`);
      const c: AuthChallenge = {
        id: challengeId,
        email: "",
        purpose: "GOOGLE",
        binding: this.hash(context.binding),
        codeHash: this.hash(nonce),
        eligible: true,
        createdAt: this.now().toISOString(),
        expiresAt: new Date(this.now().getTime() + 5 * minute).toISOString(),
      };
      await tx.saveChallenge(c);
      return { nonce, challengeId: c.id, clientId: this.config.googleClientId, expiresAt:c.expiresAt };
    });
  }
  async google(credential: string, nonceId: string, context: AuthFlowContext) {
    if(this.config.ssoEnabled)throw new AppError("Vui lòng đăng nhập qua FIT LHU SSO.","SSO_REQUIRED",403);
    if (!this.config.googleEnabled)
      throw new AppError(
        "Đăng nhập Google chưa được cấu hình.",
        "GOOGLE_UNAVAILABLE",
        503,
      );
    await this.store.transaction((tx) =>
      this.limit(tx, `google-verify:${context.ip}`, 30, 60 * minute),
    );
    const identity = await this.googleVerifier.verify(credential);
    this.role(identity.email);
    if (
      identity.hostedDomain &&
      this.config.hostedDomains.length &&
      !this.config.hostedDomains.includes(identity.hostedDomain)
    )
      throw new UnauthorizedError(
        "Tài khoản Google không thuộc miền trường được cho phép.",
      );
    const result = await this.store.transaction(async (tx) => {
      const nonce = await tx.challenge(nonceId);
      this.challengeValid(nonce, "GOOGLE", context);
      if (!safeEqual(nonce.codeHash, this.hash(identity.nonce)))
        throw new UnauthorizedError("Phiên đăng nhập Google không hợp lệ.");
      nonce.consumedAt = this.now().toISOString();
      await tx.saveChallenge(nonce);
      const linked = await tx.accountByGoogle(identity.sub);
      if (linked) {
        if (context.actorId && linked.id !== context.actorId)
          return { error: "GOOGLE_ALREADY_LINKED" } as const;
        // These status messages are only shown after Google ownership and nonce verification.
        // Keep the public recovery responses uniform; never resurrect a deleted account here.
        if (linked.deletedAt)
          return { accountError: 'ACCOUNT_DELETED', message: 'Tài khoản này đã bị xóa. Vui lòng liên hệ quản trị viên để khôi phục; đăng nhập Google không tự tạo lại tài khoản.' } as const;
        if (linked.status === 'LOCKED')
          return { accountError: 'ACCOUNT_LOCKED', message: 'Tài khoản này đang bị khóa. Vui lòng liên hệ quản trị viên để mở khóa.' } as const;
        if (
          linked.status === "INACTIVE" &&
          !linked.deletedAt &&
          linked.registrationStatus === "PENDING_REVIEW"
        )
          return { state: "pending_review", userId: linked.id } as const;
        if (linked.registrationStatus === 'REJECTED')
          return { accountError: 'REGISTRATION_REJECTED', message: 'Đăng ký giảng viên đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm thông tin.' } as const;
        return { state: "active", userId: this.active(linked).id } as const;
      }
      const existing = await tx.account(identity.email);
      if (existing) return { error: "ACCOUNT_LINK_REQUIRED" } as const;
      if (!this.config.registrationEnabled)
        return { error: "REGISTRATION_DISABLED" } as const;
      if (!identity.hostedDomain || !this.config.hostedDomains.length)
        return { state: "email_verification" } as const;
      const grant = randomBytes(32).toString("hex");
      const c: AuthChallenge = {
        id: randomUUID(),
        email: identity.email,
        purpose: "REGISTER",
        binding: this.hash(context.binding),
        codeHash: "",
        eligible: true,
        googleSub: identity.sub,
        fullName: identity.name,
        createdAt: this.now().toISOString(),
        expiresAt: new Date(this.now().getTime() + 10 * minute).toISOString(),
        verifiedAt: this.now().toISOString(),
        grantExpiresAt: new Date(
          this.now().getTime() + 10 * minute,
        ).toISOString(),
        grantHash: this.hash(grant),
      };
      await tx.saveChallenge(c);
      if (identity.name.trim().length >= 2)
        return this.create(tx, c, identity.name, null);
      return {
        state: "complete_profile",
        challengeId: c.id,
        grant,
        email: identity.email,
        fullName: identity.name,
        requiresPassword: false,
      } as const;
    });
    if ('accountError' in result) throw new UnauthorizedError(result.message, result.accountError);
    if ("error" in result)
      throw new ConflictError(
        result.error === "ACCOUNT_LINK_REQUIRED"
          ? "Email đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu để liên kết Google trong hồ sơ."
          : "Không thể sử dụng liên kết Google này.",
        result.error,
      );
    if (result.state === "email_verification") {
      if (!this.config.mailReady) {
        throw new AppError(
          identity.hostedDomain
            ? `Cần quản trị viên xác nhận miền Google Workspace ${identity.hostedDomain} trước khi tạo tài khoản. Dịch vụ gửi mã email hiện chưa được bật.`
            : "Tài khoản Google này cần xác minh thêm email, nhưng dịch vụ gửi mã hiện chưa được bật. Vui lòng liên hệ quản trị viên.",
          "GOOGLE_EMAIL_VERIFICATION_UNAVAILABLE",
          503,
          { hostedDomain: identity.hostedDomain || null },
        );
      }
      const challenge = await this.requestCode(
        {
          email: identity.email,
          purpose: "REGISTER",
          googleSub: identity.sub,
          fullName: identity.name,
        },
        context,
      );
      return { state: "verify_email" as const, ...challenge };
    }
    return result;
  }
  async linkGoogle(
    credential: string,
    nonceId: string,
    password: string | undefined,
    context: AuthFlowContext,
  ) {
    if (!context.actorId || !this.config.googleEnabled)
      throw new UnauthorizedError();
    const identity = await this.googleVerifier.verify(credential);
    await this.store.transaction(async (tx) => {
      const user = this.active(await tx.accountById(context.actorId!));
      const nonce = await tx.challenge(nonceId);
      this.challengeValid(nonce, "GOOGLE", context);
      if (
        identity.email !== user.email ||
        !identity.hostedDomain ||
        !this.config.hostedDomains.includes(identity.hostedDomain) ||
        !safeEqual(nonce.codeHash, this.hash(identity.nonce))
      )
        throw new UnauthorizedError(
          "Google phải xác minh đúng email trường của tài khoản hiện tại.",
        );
      if (
        !user.passwordHash ||
        !password ||
        !(await this.hasher.compare(password, user.passwordHash))
      )
        throw new UnauthorizedError(
          "Cần xác nhận mật khẩu hiện tại để liên kết Google.",
        );
      await tx.linkGoogle(user.id, identity.sub, user.email);
      nonce.consumedAt = this.now().toISOString();
      await tx.saveChallenge(nonce);
      await tx.audit("GOOGLE_LINKED", user.id);
    });
  }
  async listReviews() {
    return this.store.transaction((tx) => tx.listReviews());
  }
  async requestNewEmail(
    input: { challengeId: string; grant: string; email: string },
    context: AuthFlowContext,
  ) {
    this.mailAvailable();
    if (!context.actorId) throw new UnauthorizedError();
    const email = normalizeEmail(input.email);
    return this.store.transaction(async (tx) => {
      const c = await this.grant(
        tx,
        input.challengeId,
        input.grant,
        "CHANGE_EMAIL",
        context,
      );
      const user = this.active(await tx.accountById(context.actorId!));
      if (c.userId !== user.id || c.email !== user.email)
        throw new UnauthorizedError(
          "Tài khoản đã thay đổi. Vui lòng xác minh lại.",
        );
      if (this.role(email) !== this.role(user.email))
        throw new ValidationError(
          "Email mới phải thuộc cùng loại tài khoản sinh viên hoặc giảng viên.",
        );
      if (await tx.account(email))
        throw new ConflictError("Email mới không khả dụng.");
      c.consumedAt = this.now().toISOString();
      await tx.saveChallenge(c);
      return this.issueOtp(
        tx,
        {
          email,
          purpose: "CHANGE_EMAIL_NEW",
          eligible: true,
          userId: user.id,
          originalEmail: user.email,
        },
        context,
      );
    });
  }
  async completeEmailChange(
    input: { challengeId: string; grant: string },
    context: AuthFlowContext,
  ) {
    this.mailAvailable();
    if (!context.actorId) throw new UnauthorizedError();
    await this.store.transaction(async (tx) => {
      const c = await this.grant(
        tx,
        input.challengeId,
        input.grant,
        "CHANGE_EMAIL_NEW",
        context,
      );
      const user = this.active(await tx.accountById(context.actorId!));
      if (c.userId !== user.id || c.originalEmail !== user.email)
        throw new UnauthorizedError("Tài khoản đã thay đổi.");
      if (await tx.account(c.email))
        throw new ConflictError("Email mới không khả dụng.");
      await tx.changeEmail(user.id, c.email);
      c.consumedAt = this.now().toISOString();
      await tx.saveChallenge(c);
      await tx.invalidate(c.originalEmail!, "RESET_PASSWORD");
      await tx.invalidate(c.originalEmail!, "SET_PASSWORD");
      await tx.invalidate(c.originalEmail!, "CHANGE_EMAIL");
      await tx.audit("VERIFIED_EMAIL_CHANGED", user.id);
      await this.notice(
        tx,
        c.originalEmail!,
        "Email đăng nhập LHU IT LAB của bạn vừa được thay đổi sau khi xác minh. Các phiên cũ đã được đăng xuất. Nếu bạn không thực hiện, vui lòng liên hệ quản trị viên phòng Lab.",
      );
      await this.notice(
        tx,
        c.email,
        "Email mới đã được xác minh và cập nhật cho tài khoản LHU IT LAB. Vui lòng đăng nhập lại.",
      );
    });
  }
  async review(id: string, approved: boolean, actorId: string, note: string) {
    if (!approved && !note.trim())
      throw new ValidationError("Vui lòng nhập lý do từ chối.");
    return this.store.transaction(async (tx) => {
      const user = await tx.decideReview(id, approved, actorId, note);
      if (this.config.mailReady)
        await this.notice(
          tx,
          user.email,
          approved
            ? "Tài khoản giảng viên LHU IT LAB của bạn đã được duyệt. Bạn có thể đăng nhập để sử dụng hệ thống."
            : "Đăng ký giảng viên LHU IT LAB của bạn chưa được chấp thuận. Vui lòng liên hệ quản trị viên phòng Lab để biết thêm thông tin.",
        );
      return { state: approved ? "approved" : "rejected" };
    });
  }
  private async notice(
    tx: SelfServiceTransaction,
    email: string,
    text: string,
  ) {
    // Notifications are queued only with an available global send reservation.
    const count = await tx.budget(
      this.hash("delivery:global"),
      new Date(this.now().getTime() - 1440 * minute),
    );
    if (count.count >= this.config.senderBudget) {
      await tx.audit("AUTH_NOTIFICATION_QUOTA_EXHAUSTED");
      return;
    }
    await tx.spend(this.hash("delivery:global"), this.now());
    await tx.enqueue({
      id: randomUUID(),
      challengeId: null,
      ciphertext: this.delivery.encrypt({ kind: "notice", email, text }),
      expiresAt: new Date(this.now().getTime() + 1440 * minute),
      attempts: 0,
      status: "QUEUED",
    });
  }
  async deliverNext(): Promise<boolean> {
    this.mailAvailable();
    const mail = await this.store.transaction(async (tx) => {
      const blocked = await tx.budget(
        this.hash("delivery:blocked"),
        new Date(this.now().getTime() - 1440 * minute),
      );
      if (blocked.count) return null;
      const item = await tx.claimMail(this.now());
      if (!item) return null;
      const c = item.challengeId ? await tx.challenge(item.challengeId) : null;
      if (
        item.expiresAt.getTime() <= this.now().getTime() ||
        (item.challengeId && (!c || c.consumedAt || c.verifiedAt))
      ) {
        await tx.finishMail(item.id, "EXPIRED");
        return null;
      }
      if (item.attempts > 1) {
        try {
          await this.limit(
            tx,
            "delivery:global",
            this.config.senderBudget,
            1440 * minute,
          );
        } catch {
          await tx.finishMail(
            item.id,
            "QUEUED",
            new Date(this.now().getTime() + 60 * minute),
          );
          return null;
        }
      }
      return item;
    });
    if (!mail) return false;
    try {
      await this.delivery.send(mail.ciphertext);
      await this.store.transaction((tx) => tx.finishMail(mail.id, "SENT"));
    } catch (error) {
      const smtp = error as {
        responseCode?: number;
        code?: string;
        message?: string;
      };
      const recipientIssue = /mailbox|recipient|5\.2\.2/i.test(
        smtp.message || "",
      );
      const quota =
        !recipientIssue &&
        /daily.{0,30}limit|sending.{0,30}limit|quota.{0,30}exceed|rate.{0,30}limit|4\.7\.28/i.test(
          smtp.message || "",
        );
      const permanent =
        smtp.code === "EAUTH" || (smtp.responseCode || 0) >= 500;
      await this.store.transaction(async (tx) => {
        if (quota || smtp.code === "EAUTH") {
          await tx.spend(this.hash("delivery:blocked"), this.now());
          await tx.audit(
            quota ? "AUTH_SMTP_QUOTA_REJECTED" : "AUTH_SMTP_CONFIG_REJECTED",
          );
        }
        await tx.finishMail(
          mail.id,
          permanent || mail.attempts >= 3 || smtp.message === "EMAIL_EXPIRED"
            ? "FAILED"
            : "QUEUED",
          new Date(
            this.now().getTime() +
              (quota ? 60 * minute : 30000 * mail.attempts),
          ),
        );
      });
    }
    return true;
  }
  async cleanup() {
    await this.store.transaction((tx) => tx.cleanup(this.now()));
  }
  async verifyDelivery() {
    this.mailAvailable();
    if (!this.delivery.verify) throw this.unavailable();
    await this.delivery.verify();
  }
  async resumeDelivery() {
    await this.verifyDelivery();
    await this.store.transaction(async (tx) => {
      // Keep all real send/request counters; only clear the operational pause.
      await tx.resetBudget(this.hash("delivery:blocked"));
      await tx.audit("AUTH_MAIL_RESUMED");
    });
  }
}
