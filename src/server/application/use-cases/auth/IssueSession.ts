import { createHash, randomUUID } from "crypto";
import type { User } from "../../../domain/entities/User";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";
import type { IAuthSessionRepository } from "../../../domain/repositories/IAuthSessionRepository";
import type { IAuditLogRepository } from "../../../domain/repositories/IAuditLogRepository";
import type { IUnitOfWork } from "../../../domain/repositories/IUnitOfWork";
import type { IRolePermissionQuery } from "../../ports/IRolePermissionQuery";
import type { ITokenService } from "../../ports/ITokenService";
import { UnauthorizedError } from "../../../shared/errors/AppError";
import {requiresAccountSetup} from "./account-setup-state";
export interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}
export class IssueSession {
  constructor(
    private users: IUserRepository,
    private sessions: IAuthSessionRepository,
    private roles: IRolePermissionQuery,
    private tokens: ITokenService,
    private uow: IUnitOfWork,
    private audit: IAuditLogRepository,
  ) {}
  async execute(user: User, context: SessionContext, options?: {expiresAt:Date;authenticationMethod:'SSO'}) {
    if (user.status !== "ACTIVE" || user.deletedAt)
      throw new UnauthorizedError("Tài khoản không khả dụng.");
    const { roles, permissions } = await this.roles.getRolePermissionsByUserId(
      user.id.toString(),
    );
    const sessionId = randomUUID();
    const accessToken = this.tokens.generateAccessToken({
      userId: user.id.toString(),
      sessionId,
      roles,
      permissions,
    });
    const refreshToken = this.tokens.generateRefreshToken();
    const expiresAt = options?.expiresAt || new Date(Date.now() + 7 * 86400000);
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      user.updateLastLogin(new Date());
      if (this.users.touchLastLogin) {
        if (
          !(await this.users.touchLastLogin(
            user.id.toString(),
            user.lastLoginAt!,
            user.passwordHash,
            transaction,
          ))
        )
          throw new UnauthorizedError(
            "Tài khoản đã thay đổi. Vui lòng đăng nhập lại.",
          );
      } else await this.users.save(user, transaction);
      await this.sessions.save(
        {
          id: sessionId,
          userId: user.id.toString(),
          refreshTokenHash: createHash("sha256")
            .update(refreshToken)
            .digest("hex"),
          expiresAt,
          ...context,
        },
        transaction,
      );
      await this.audit.save(
        {
          userId: user.id.toString(),
          action: "LOGIN_SUCCESS",
          entityName: "Users",
          entityId: user.id.toString(),
          ...context,
        },
        transaction,
      );
    });
    return {
      accessToken,
      refreshToken,
      sessionId,
      mustChangePassword: options?.authenticationMethod==='SSO'?false:user.mustChangePassword,
      requiresAccountSetup: requiresAccountSetup(user,{usesSso:options?.authenticationMethod==='SSO',roles}),
      refreshExpiresAt: expiresAt,
    };
  }
}
