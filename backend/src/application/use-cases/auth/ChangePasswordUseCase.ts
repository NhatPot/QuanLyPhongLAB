import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import cryptoNode from 'crypto';

export interface ChangePasswordInput {
  userId: string;
  currentPasswordHashOrText: string;
  newPasswordText: string;
  activeRefreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class ChangePasswordUseCase {
  constructor(
    private userRepo: IUserRepository,
    private sessionRepo: IAuthSessionRepository,
    private hasher: IPasswordHasher,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: ChangePasswordInput): Promise<Result<void>> {
    try {
      const user = await this.userRepo.findById(input.userId);
      if (!user) {
        return Result.fail<void>("Người dùng không tồn tại.");
      }

      const isPasswordValid = await this.hasher.compare(input.currentPasswordHashOrText, user.passwordHash);
      if (!isPasswordValid) {
        return Result.fail<void>("Mật khẩu hiện tại không chính xác.");
      }

      if (input.currentPasswordHashOrText === input.newPasswordText) {
        return Result.fail<void>("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      }

      const newPasswordHash = await this.hasher.hash(input.newPasswordText);
      user.updatePassword(newPasswordHash);

      const activeTokenHash = cryptoNode.createHash('sha256').update(input.activeRefreshToken).digest('hex');
      const activeSession = await this.sessionRepo.findByHash(activeTokenHash);

      await this.uow.complete(async () => {
        await this.userRepo.save(user);

        if (activeSession && activeSession.id) {
          await this.sessionRepo.revokeAllExcept(user.id.toString(), activeSession.id);
        } else {
          await this.sessionRepo.revokeByUserId(user.id.toString());
        }

        await this.auditLogRepo.save({
          userId: user.id.toString(),
          action: 'CHANGE_PASSWORD_SUCCESS',
          entityName: 'Users',
          entityId: user.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        });
      });

      return Result.ok<void>();

    } catch (error) {
      return Result.fail<void>((error as any).message || "Đã xảy ra lỗi khi thay đổi mật khẩu.");
    }

  }
}
