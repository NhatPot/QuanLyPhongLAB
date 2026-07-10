import { Result } from '../../../shared/result/Result';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import cryptoNode from 'crypto';

export interface LogoutInput {
  refreshToken: string;
}

export class LogoutUseCase {
  constructor(
    private sessionRepo: IAuthSessionRepository,
    private uow: IUnitOfWork
  ) {}

  public async execute(input: LogoutInput): Promise<Result<void>> {
    try {
      const hash = cryptoNode.createHash('sha256').update(input.refreshToken).digest('hex');
      const session = await this.sessionRepo.findByHash(hash);

      if (session) {
        await this.uow.complete(async () => {
          session.revokedAt = new Date();
          await this.sessionRepo.save(session);
        });
      }

      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>((error as any).message || "Đã xảy ra lỗi khi đăng xuất.");
    }

  }
}
