import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { ITokenService } from '../../ports/ITokenService';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import cryptoNode from 'crypto';

export interface LoginInput {
  identifier: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}

export class LoginUseCase {
  constructor(
    private userRepo: IUserRepository,
    private sessionRepo: IAuthSessionRepository,
    private rolePermQuery: IRolePermissionQuery,
    private hasher: IPasswordHasher,
    private tokenService: ITokenService,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: LoginInput): Promise<Result<LoginOutput>> {
    try {
      const user = await this.userRepo.findByUsernameOrEmail(input.identifier);
      if (!user) {
        return Result.fail<LoginOutput>("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      if (user.status === 'LOCKED') {
        return Result.fail<LoginOutput>("Tài khoản của bạn đã bị khóa.");
      }
      if (user.status === 'INACTIVE') {
        return Result.fail<LoginOutput>("Tài khoản chưa được kích hoạt.");
      }

      const isPasswordValid = await this.hasher.compare(input.password, user.passwordHash);
      if (!isPasswordValid) {
        await this.auditLogRepo.save({
          userId: user.id.toString(),
          action: 'LOGIN_FAILED',
          entityName: 'Users',
          entityId: user.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: `Sai mật khẩu cho định danh: ${input.identifier}`
        } as any);

        return Result.fail<LoginOutput>("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      const { roles, permissions } = await this.rolePermQuery.getRolePermissionsByUserId(user.id.toString());

      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id.toString(),
        roles,
        permissions
      });

      const refreshToken = this.tokenService.generateRefreshToken();
      const refreshTokenHash = cryptoNode.createHash('sha256').update(refreshToken).digest('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.uow.complete(async () => {
        await this.sessionRepo.save({
          userId: user.id.toString(),
          refreshTokenHash,
          expiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent
        });

        user.updateLastLogin(new Date());
        await this.userRepo.save(user);

        await this.auditLogRepo.save({
          userId: user.id.toString(),
          action: 'LOGIN_SUCCESS',
          entityName: 'Users',
          entityId: user.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        });
      });

      return Result.ok<LoginOutput>({
        accessToken,
        refreshToken,
        mustChangePassword: user.mustChangePassword
      });

    } catch (error) {
      return Result.fail<LoginOutput>((error as any).message || "Đã xảy ra lỗi trong quá trình đăng nhập.");
    }

  }
}
