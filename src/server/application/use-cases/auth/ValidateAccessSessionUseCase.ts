import { ITokenService } from "../../ports/ITokenService";
import { IRolePermissionQuery } from "../../ports/IRolePermissionQuery";
import { IAuthSessionRepository } from "../../../domain/repositories/IAuthSessionRepository";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { UnauthorizedError } from "../../../shared/errors/AppError";
import {requiresAccountSetup} from "./account-setup-state";

export class ValidateAccessSessionUseCase {
  constructor(
    private readonly tokens: ITokenService,
    private readonly sessions: IAuthSessionRepository,
    private readonly users: IUserRepository,
    private readonly rolePermissions: IRolePermissionQuery,
  ) {}

  async execute(token: string) {
    const payload = this.tokens.verifyAccessToken(token);
    if (!/^[a-f0-9-]{36}$/i.test(payload.sessionId || ""))
      throw new UnauthorizedError("Vui lòng đăng nhập lại.", "SESSION_REVOKED");
    const session = await this.sessions.findById(payload.sessionId);
    if (
      !session ||
      session.revokedAt ||
      session.userId !== payload.userId ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedError(
        "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.",
        "SESSION_REVOKED",
      );
    }
    const user = await this.users.findById(payload.userId);
    if (!user || user.deletedAt || user.status !== "ACTIVE") {
      throw new UnauthorizedError(
        "Tài khoản không còn hoạt động.",
        "ACCOUNT_UNAVAILABLE",
      );
    }
    const { roles, permissions } =
      await this.rolePermissions.getRolePermissionsByUserId(payload.userId);
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      username: user.username,
      email: user.email,
      roles,
      permissions,
      requiresAccountSetup: requiresAccountSetup(user,{usesSso:session.authenticationMethod==='SSO',roles}),
      usesSso: session.authenticationMethod==='SSO',
    };
  }
}
