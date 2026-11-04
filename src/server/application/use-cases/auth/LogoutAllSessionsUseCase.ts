import { IAuthSessionRepository } from "../../../domain/repositories/IAuthSessionRepository";
import { IUnitOfWork } from "../../../domain/repositories/IUnitOfWork";

export class LogoutAllSessionsUseCase {
  constructor(
    private readonly sessions: IAuthSessionRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  execute(userId: string) {
    return this.uow.complete(() =>
      this.sessions.revokeByUserId(userId, this.uow.getTransaction()),
    );
  }
}
