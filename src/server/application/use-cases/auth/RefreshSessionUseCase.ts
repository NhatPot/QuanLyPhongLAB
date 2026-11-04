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
  refreshExpiresAt: Date;
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

      if (session.expiresAt.getTime() <= Date.now()) {
        await this.uow.complete(async () => {
          session.revokedAt = new Date();
          await this.sessionRepo.save(session, this.uow.getTransaction());
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

      const rotated = await this.uow.complete(() => this.sessionRepo.rotateRefreshToken(session, hash, this.uow.getTransaction()));
      if (!rotated) return Result.fail<RefreshOutput>('Phiên đã thay đổi hoặc bị thu hồi. Vui lòng đăng nhập lại.');

      const { roles, permissions } = await this.rolePermQuery.getRolePermissionsByUserId(user.id.toString());
      const accessToken = this.tokenService.generateAccessToken({
        userId: user.id.toString(),
        sessionId: session.id!,
        roles,
        permissions
      });

      return Result.ok<RefreshOutput>({
        accessToken,
        refreshToken: newRefreshToken,
        refreshExpiresAt: session.expiresAt,
      });

    } catch (error) {
      return Result.fail<RefreshOutput>('Không thể làm mới phiên lúc này. Vui lòng thử lại sau.');
    }

  }
}
