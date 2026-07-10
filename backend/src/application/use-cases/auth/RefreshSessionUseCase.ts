import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { ITokenService } from '../../ports/ITokenService';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import cryptoNode from 'crypto';

export interface RefreshInput {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshOutput {
  accessToken: string;
  refreshToken: string;
}

export class RefreshSessionUseCase {
  constructor(
    private userRepo: IUserRepository,
    private sessionRepo: IAuthSessionRepository,
    private rolePermQuery: IRolePermissionQuery,
    private tokenService: ITokenService,
    private uow: IUnitOfWork
  ) {}

  public async execute(input: RefreshInput): Promise<Result<RefreshOutput>> {
    try {
      const hash = cryptoNode.createHash('sha256').update(input.refreshToken).digest('hex');
      const session = await this.sessionRepo.findByHash(hash);

      if (!session) {
        return Result.fail<RefreshOutput>("Phiên làm việc không tồn tại hoặc đã hết hạn.");
      }

      if (session.revokedAt) {
        return Result.fail<RefreshOutput>("Phiên làm việc đã bị hủy.");
      }

      if (session.expiresAt.getTime() < Date.now()) {
        await this.uow.complete(async () => {
          session.revokedAt = new Date();
          await this.sessionRepo.save(session);
        });
        return Result.fail<RefreshOutput>("Phiên làm việc đã hết hạn.");
      }

      const user = await this.userRepo.findById(session.userId);
      if (!user || user.status !== 'ACTIVE') {
        return Result.fail<RefreshOutput>("Người dùng không khả dụng hoặc bị khóa.");
      }

      const newRefreshToken = this.tokenService.generateRefreshToken();
      const newRefreshTokenHash = cryptoNode.createHash('sha256').update(newRefreshToken).digest('hex');

      session.refreshTokenHash = newRefreshTokenHash;
      session.ipAddress = input.ipAddress;
      session.userAgent = input.userAgent;

      await this.uow.complete(async () => {
        await this.sessionRepo.save(session);
      });

      const { roles, permissions } = await this.rolePermQuery.getRolePermissionsByUserId(user.id.toString());
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id.toString(),
        roles,
        permissions
      });

      return Result.ok<RefreshOutput>({
        accessToken,
        refreshToken: newRefreshToken
      });

    } catch (error) {
      return Result.fail<RefreshOutput>((error as any).message || "Đã xảy ra lỗi khi tạo lại phiên mới.");
    }

  }
}
