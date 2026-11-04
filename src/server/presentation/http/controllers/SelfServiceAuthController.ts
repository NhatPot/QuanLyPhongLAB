import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { selfServiceAuth } from "../../../container/self-service-container";
import { container } from "../../../container/dependency-container";
import { IssueSession } from "../../../application/use-cases/auth/IssueSession";
import {
  AppError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors/AppError";
import {
  protectAuthRequest,
  setSessionCookies,
  clearSessionCookies,
} from "../security/web-session";
import type {
  AccountOutcome,
  AuthFlowContext,
} from "../../../application/use-cases/auth/SelfServiceAuth";
import { loginRateLimiter } from "../security/login-rate-limiter";
import { SqlSelfServiceAuthStore } from "../../../infrastructure/database/sqlserver/repositories/SqlSelfServiceAuthStore";
import {readFitSsoConfig} from "../../../infrastructure/auth/fit-sso-config";

const email = z.string().trim().email("Email không đúng định dạng.").max(255);
const id = z.string().uuid();
const secret = z.string().min(1).max(16000);
const codeSchema = z.object({
  challengeId: id,
  code: z.string().regex(/^\d{6}$/, "Mã xác minh gồm 6 chữ số."),
});
const grantSchema = z.object({
  challengeId: id,
  grant: z.string().regex(/^[a-f0-9]{64}$/),
});
const googleSchema = z.object({
  credential: secret,
  challengeId: id,
  password: z.string().max(256).optional(),
});

export class SelfServiceAuthController {
  private action(
    fn: (
      req: Request,
      res: Response,
      context: AuthFlowContext,
    ) => Promise<unknown>,
    auth = false,
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.method !== "GET") protectAuthRequest(req);
        if (auth && !req.user?.userId) throw new UnauthorizedError();
        let binding = req.cookies?.authFlow;
        if (!/^[a-f0-9]{64}$/.test(binding || "")) {
          binding = randomBytes(32).toString("hex");
          res.cookie("authFlow", binding, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600000,
          });
        }
        const result = await fn(req, res, {
          binding,
          ip: req.ip || "unknown",
          actorId: req.user?.userId,
        });
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        if (error instanceof z.ZodError)
          return next(
            new ValidationError(
              error.issues[0]?.message || "Dữ liệu không hợp lệ.",
            ),
          );
        if (error instanceof AppError && error.statusCode === 429)
          res.setHeader("Retry-After", String(error.details?.retryAfter || 60));
        // Avoid leaking database/SMTP details through the generic adapter error handler.
        next(
          error instanceof AppError
            ? error
            : new AppError(
                "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.",
                "AUTH_TEMPORARILY_UNAVAILABLE",
                503,
              ),
        );
      }
    };
  }
  private async outcome(result: AccountOutcome, req: Request, res: Response) {
    if (result.state !== "active") return { state: result.state };
    const user = await container.userRepo.findById(result.userId);
    if (!user) throw new UnauthorizedError();
    const issued = await new IssueSession(
      container.userRepo,
      container.sessionRepo,
      container.rolePermQuery,
      container.tokenService,
      container.uow,
      container.auditLogRepo,
    ).execute(user, { ipAddress: req.ip, userAgent: req.get("user-agent") });
    const csrfToken = setSessionCookies(
      res,
      issued.accessToken,
      issued.refreshToken,
      issued.refreshExpiresAt,
    );
    return {
      state: "active",
      csrfToken,
      mustChangePassword: issued.mustChangePassword,
      requiresAccountSetup: issued.requiresAccountSetup,
    };
  }
  config = this.action(async () => {
    const c = selfServiceAuth().config;
    const sso=readFitSsoConfig();
    return {
      ssoEnabled:sso.enabled,
      ssoAccountUrl:sso.issuer+'/account',
      legacyGoogleLinkEnabled:sso.enabled&&c.googleEnabled,
      registrationEnabled: sso.enabled || c.registrationEnabled && c.mailReady,
      googleEnabled: !sso.enabled && c.googleEnabled,
      passwordResetEnabled: !sso.enabled && c.mailReady,
      googleClientId: c.googleEnabled ? c.googleClientId : "",
      studentDomains: c.studentDomains,
      teacherDomains: c.teacherDomains,
    };
  });
  accountSetup = this.action(async (req, res, context) => {
    const input = z.object({
      fullName: z.string().trim().min(2).max(255),
      department: z.string().trim().min(2).max(255),
      phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại.").max(50),
      password: z.string().max(256),
      confirmPassword: z.string().max(256),
    }).parse(req.body);
    const result = await selfServiceAuth().completeAccountSetup(input, context);
    clearSessionCookies(res);
    return result;
  }, true);
  requestRegister = this.action(async (req, _res, context) =>
    selfServiceAuth().requestCode(
      { email: email.parse(req.body?.email), purpose: "REGISTER" },
      context,
    ),
  );
  requestReset = this.action(async (req, _res, context) =>
    selfServiceAuth().requestCode(
      { email: email.parse(req.body?.email), purpose: "RESET_PASSWORD" },
      context,
    ),
  );
  resend = this.action(async (req, _res, context) =>
    selfServiceAuth().resend(id.parse(req.body?.challengeId), context),
  );
  verifyRegister = this.action(async (req, _res, context) => {
    const body = codeSchema.parse(req.body);
    return selfServiceAuth().verifyCode(
      body.challengeId,
      body.code,
      "REGISTER",
      context,
    );
  });
  verifyReset = this.action(async (req, _res, context) => {
    const body = codeSchema.parse(req.body);
    return selfServiceAuth().verifyCode(
      body.challengeId,
      body.code,
      "RESET_PASSWORD",
      context,
    );
  });
  complete = this.action(async (req, res, context) => {
    const body = grantSchema
      .extend({
        fullName: z.string().trim().min(2).max(255),
        password: z.string().max(256).optional(),
        department: z.string().trim().min(2).max(255).optional(),
        phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại.").max(50).optional(),
      })
      .parse(req.body);
    return this.outcome(
      await selfServiceAuth().completeRegistration(body, context),
      req,
      res,
    );
  });
  reset = this.action(async (req, res, context) => {
    const body = grantSchema
      .extend({ password: z.string().max(256) })
      .parse(req.body);
    await selfServiceAuth().resetPassword(body, context);
    clearSessionCookies(res);
    return { state: "password_updated" };
  });
  googleNonce = this.action(async (req, res, context) => {
    const previous = id.safeParse(req.cookies?.googleNonceId);
    const result = await selfServiceAuth().googleNonce(context, previous.success ? previous.data : undefined);
    res.cookie("googleNonceId", result.challengeId, {
      httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:300000,
    });
    return result;
  });
  google = this.action(async (req, res, context) => {
    const body = googleSchema.parse(req.body);
    const result = await selfServiceAuth().google(
      body.credential,
      body.challengeId,
      { ...context, actorId: undefined },
    );
    return result.state === "active" || result.state === "pending_review"
      ? this.outcome(result as AccountOutcome, req, res)
      : result;
  });
  linkGoogle = this.action(async (req, _res, context) => {
    const body = googleSchema.parse(req.body);
    loginRateLimiter.consume(context.actorId!, context.ip);
    await selfServiceAuth().linkGoogle(
      body.credential,
      body.challengeId,
      body.password,
      context,
    );
    return { state: "linked" };
  }, true);
  requestSetPassword = this.action(async (req, _res, context) => {
    const user = await container.userRepo.findById(context.actorId!);
    if (!user) throw new UnauthorizedError();
    return selfServiceAuth().requestCode(
      { email: user.email, purpose: "SET_PASSWORD" },
      context,
    );
  }, true);
  security = this.action(async (_req, _res, context) => {
    const user = await container.userRepo.findById(context.actorId!);
    if (!user) throw new UnauthorizedError();
    const config = selfServiceAuth().config;
    const googleLinked =
      config.googleEnabled ||
      config.registrationEnabled ||
      user.emailVerifiedAt ||
      !user.passwordHash
        ? await new SqlSelfServiceAuthStore().transaction((tx) =>
            tx.googleLinked(context.actorId!),
          )
        : false;
    return {
      hasPassword: Boolean(user.passwordHash),
      ssoEnabled: readFitSsoConfig().enabled,
      ssoLinked: user.ssoLinked,
      ssoAccountUrl: readFitSsoConfig().issuer+'/account',
      emailVerified: Boolean(user.emailVerifiedAt),
      googleLinked,
      googleEnabled: config.googleEnabled,
    };
  }, true);
  requestEmailChange = this.action(async (_req, _res, context) => {
    const user = await container.userRepo.findById(context.actorId!);
    if (!user) throw new UnauthorizedError();
    return selfServiceAuth().requestCode(
      { email: user.email, purpose: "CHANGE_EMAIL" },
      context,
    );
  }, true);
  verifyCurrentEmail = this.action(async (req, _res, context) => {
    const body = codeSchema.parse(req.body);
    return selfServiceAuth().verifyCode(
      body.challengeId,
      body.code,
      "CHANGE_EMAIL",
      context,
    );
  }, true);
  requestNewEmail = this.action(
    async (req, _res, context) =>
      selfServiceAuth().requestNewEmail(
        grantSchema.extend({ email }).parse(req.body),
        context,
      ),
    true,
  );
  verifyNewEmail = this.action(async (req, _res, context) => {
    const body = codeSchema.parse(req.body);
    return selfServiceAuth().verifyCode(
      body.challengeId,
      body.code,
      "CHANGE_EMAIL_NEW",
      context,
    );
  }, true);
  changeEmail = this.action(async (req, res, context) => {
    await selfServiceAuth().completeEmailChange(
      grantSchema.parse(req.body),
      context,
    );
    clearSessionCookies(res);
    return { state: "email_updated" };
  }, true);
  verifySetPassword = this.action(async (req, _res, context) => {
    const body = codeSchema.parse(req.body);
    return selfServiceAuth().verifyCode(
      body.challengeId,
      body.code,
      "SET_PASSWORD",
      context,
    );
  }, true);
  setPassword = this.action(async (req, res, context) => {
    const body = grantSchema
      .extend({ password: z.string().max(256) })
      .parse(req.body);
    await selfServiceAuth().resetPassword(body, context, "SET_PASSWORD");
    clearSessionCookies(res);
    return { state: "password_updated" };
  }, true);
  reviews = this.action(async () => selfServiceAuth().listReviews(), true);
  review = this.action(async (req, _res, context) => {
    const body = z
      .object({
        approved: z.boolean(),
        note: z.string().trim().max(1000).default(""),
      })
      .parse(req.body);
    return selfServiceAuth().review(
      id.parse(req.params.id),
      body.approved,
      context.actorId!,
      body.note,
    );
  }, true);
}
