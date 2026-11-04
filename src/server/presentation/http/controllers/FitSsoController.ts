import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { fitSsoAuth } from "../../../container/fit-sso-container";
import { container } from "../../../container/dependency-container";
import { IssueSession } from "../../../application/use-cases/auth/IssueSession";
import type { SsoOutcome } from "../../../application/use-cases/auth/FitSsoAuth";
import type { AuthFlowContext } from "../../../application/use-cases/auth/SelfServiceAuth";
import {
  readFitSsoConfig,
  ssoRequestOrigin,
} from "../../../infrastructure/auth/fit-sso-config";
import { readSelfServiceConfig } from "../../../infrastructure/auth/self-service-config";
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

const id = z.string().uuid();
export class FitSsoController {
  private origin(req: Request) {
    return ssoRequestOrigin(
      readFitSsoConfig(),
      `${req.protocol}://${req.get("host")}`,
    );
  }
  private context(req: Request, res: Response): AuthFlowContext {
    let binding = req.cookies?.authFlow;
    if (!/^[a-f0-9]{64}$/.test(binding || "")) {
      binding = randomBytes(32).toString("hex");
      this.cookie(res, "authFlow", binding, 3600000);
    }
    return { binding, ip: req.ip || "unknown", actorId: req.user?.userId };
  }
  private cookie(res: Response, name: string, value: string, maxAge = 600000) {
    res.cookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  }
  private headers(res: Response) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
  }
  private fail(error: unknown, next: NextFunction) {
    next(
      error instanceof AppError
        ? error
        : error instanceof z.ZodError
          ? new ValidationError(
              error.issues[0]?.message || "Dữ liệu không hợp lệ.",
            )
          : new AppError(
              "Chưa kết nối được FIT LHU SSO. Vui lòng thử lại.",
              "SSO_TEMPORARILY_UNAVAILABLE",
              503,
            ),
    );
  }
  private async finish(
    result: Exclude<SsoOutcome, { state: "link_required" }>,
    req: Request,
    res: Response,
  ) {
    if (result.state === "pending_review") return "/registration-status";
    const user = await container.userRepo.findById(result.userId);
    if (!user) throw new UnauthorizedError();
    const expiresAt = new Date(
      Math.min(Date.parse(result.identity.expiresAt), Date.now() + 600000),
    );
    const issued = await new IssueSession(
      container.userRepo,
      container.sessionRepo,
      container.rolePermQuery,
      container.tokenService,
      container.uow,
      container.auditLogRepo,
    ).execute(
      user,
      { ipAddress: req.ip, userAgent: req.get("user-agent") },
      { expiresAt, authenticationMethod: "SSO" },
    );
    try {
      await fitSsoAuth().saveSession(
        issued.sessionId,
        result.userId,
        result.identity,
        result.returnTo,
        expiresAt,
      );
    } catch (error) {
      await container.logoutUseCase.execute({
        userId: result.userId,
        sessionId: issued.sessionId,
      });
      throw error;
    }
    setSessionCookies(
      res,
      issued.accessToken,
      issued.refreshToken,
      issued.refreshExpiresAt,
    );
    res.clearCookie("fitSsoPendingId", { path: "/" });
    return issued.requiresAccountSetup
      ? "/complete-account?from=" + encodeURIComponent(result.returnTo)
      : result.returnTo;
  }
  start = async (req: Request, res: Response, next: NextFunction) => {
    try {
      protectAuthRequest(req);
      this.headers(res);
      const body = z
        .object({ returnTo: z.string().max(2000).optional() })
        .parse(req.body || {});
      const result = await fitSsoAuth().start(
        this.origin(req),
        body.returnTo || "/",
        this.context(req, res),
      );
      // Beginning an explicit account switch must not leave the previous Lab
      // account active when SSO is cancelled, pending review or needs linking.
      if (req.cookies?.refreshToken) {
        await container.logoutUseCase.execute({
          refreshToken: req.cookies.refreshToken,
        });
        clearSessionCookies(res);
      }
      this.cookie(res, "fitSsoFlowId", result.flowId);
      res.status(200).json({
        success: true,
        data: { authorizationUrl: result.authorizationUrl },
      });
    } catch (error) {
      this.fail(error, next);
    }
  };
  callback = async (req: Request, res: Response, _next: NextFunction) => {
    this.headers(res);
    let origin: string;
    try {
      origin = this.origin(req);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: "SSO_ORIGIN_INVALID",
          message: "Địa chỉ ứng dụng không hợp lệ.",
        },
      });
      return;
    }
    try {
      const flowId = id.parse(req.cookies?.fitSsoFlowId),
        url = new URL(req.originalUrl, origin);
      const result = await fitSsoAuth().callback(
        url,
        flowId,
        this.context(req, res),
      );
      res.clearCookie("fitSsoFlowId", { path: "/" });
      let target: string;
      if (result.state === "link_required") {
        this.cookie(res, "fitSsoPendingId", result.pendingId);
        target = "/sso-link";
      } else target = await this.finish(result, req, res);
      res.setHeader("Location", origin + target);
      res.status(303).json({});
    } catch (error) {
      const code = error instanceof AppError ? error.code : "SSO_LOGIN_FAILED";
      res.setHeader(
        "Location",
        origin + "/login?sso_error=" + encodeURIComponent(code),
      );
      res.status(303).json({});
    }
  };
  pending = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.headers(res);
      const result = await fitSsoAuth().pending(
        id.parse(req.cookies?.fitSsoPendingId),
        this.context(req, res),
      );
      res.status(200).json({
        success: true,
        data: { ...result, googleLinked: result.googleLinked && readSelfServiceConfig().googleEnabled },
      });
    } catch (error) {
      this.fail(error, next);
    }
  };
  link = async (req: Request, res: Response, next: NextFunction) => {
    try {
      protectAuthRequest(req);
      this.headers(res);
      const input = z
        .object({
          password: z.string().max(256).optional(),
          googleCredential: z.string().max(16000).optional(),
          googleChallengeId: id.optional(),
        })
        .parse(req.body || {});
      if (input.googleCredential && !readSelfServiceConfig().googleEnabled)
        throw new AppError("Liên kết Google cũ đã được tắt. Vui lòng dùng mật khẩu Lab hoặc liên hệ quản trị viên.", "GOOGLE_UNAVAILABLE", 403);
      const result = await fitSsoAuth().link(
        id.parse(req.cookies?.fitSsoPendingId),
        input,
        this.context(req, res),
      );
      if (result.state === "link_required") throw new UnauthorizedError();
      const redirectTo = await this.finish(result, req, res);
      res.status(200).json({ success: true, data: { redirectTo } });
    } catch (error) {
      this.fail(error, next);
    }
  };
  profile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      protectAuthRequest(req);
      this.headers(res);
      if (!req.user?.userId || !(req.user as any).usesSso)
        throw new UnauthorizedError();
      const input = z
        .object({
          fullName: z.string().trim().min(2).max(255),
          department: z.string().trim().min(2).max(255),
          phone: z.string().trim().min(1).max(50),
        })
        .parse(req.body);
      const result = await fitSsoAuth().completeProfile(
        input,
        this.context(req, res),
      );
      const data = await fitSsoAuth().session((req.user as any).sessionId);
      res.status(200).json({
        success: true,
        data: { ...result, redirectTo: data?.returnTo || "/" },
      });
    } catch (error) {
      this.fail(error, next);
    }
  };
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      protectAuthRequest(req);
      this.headers(res);
      if (!req.user?.userId) throw new UnauthorizedError();
      let redirectTo: string | undefined;
      try {
        const logoutId = await fitSsoAuth().prepareLogout(
          (req.user as any).sessionId,
          this.origin(req),
          this.context(req, res),
        );
        if (logoutId) {
          this.cookie(res, "fitSsoLogoutId", logoutId, 60000);
          redirectTo = "/api/auth/sso/logout-redirect";
        }
      } catch {
        /* Local sign-out must still succeed if the provider is unavailable. */
      }
      await container.logoutUseCase.execute({
        refreshToken: req.cookies?.refreshToken,
        userId: req.user.userId,
        sessionId: (req.user as any).sessionId,
      });
      clearSessionCookies(res);
      res.status(200).json({ success: true, data: { redirectTo } });
    } catch (error) {
      this.fail(error, next);
    }
  };
  logoutRedirect = async (req: Request, res: Response, _next: NextFunction) => {
    this.headers(res);
    try {
      const url = await fitSsoAuth().finishLogout(
        id.parse(req.cookies?.fitSsoLogoutId),
        this.context(req, res),
      );
      res.clearCookie("fitSsoLogoutId", { path: "/" });
      res.setHeader("Location", url);
      res.status(303).json({});
    } catch {
      res.setHeader("Location", this.origin(req) + "/login");
      res.status(303).json({});
    }
  };
}
