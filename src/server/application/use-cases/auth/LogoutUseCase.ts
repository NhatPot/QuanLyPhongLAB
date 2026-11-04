import { Result } from '../../../shared/result/Result';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import cryptoNode from 'crypto';

export interface LogoutInput {
  refreshToken?: string;
  userId?: string;
  sessionId?: string;
}

export class LogoutUseCase {
  constructor(
    private sessionRepo: IAuthSessionRepository,
    private uow: IUnitOfWork
  ) {}

  public async execute(input: LogoutInput): Promise<Result<void>> {
    try {
      const session = input.sessionId && input.userId
        ? await this.sessionRepo.findById(input.sessionId)
        : input.refreshToken ? await this.sessionRepo.findByHash(cryptoNode.createHash('sha256').update(input.refreshToken).digest('hex')) : null;
      if (session && input.userId && session.userId !== input.userId) return Result.fail<void>('Phiên không thuộc tài khoản.');

      if (session) {
        await this.uow.complete(async () => {
          session.revokedAt = new Date();
          await this.sessionRepo.save(session, this.uow.getTransaction());
        });
      }

      return Result.ok<void>();
    } catch (error) {
      return Result.fail<void>('Không thể thu hồi phiên lúc này. Vui lòng thử lại sau.');
    }

  }
}
