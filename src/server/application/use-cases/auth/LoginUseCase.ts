import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { ITokenService } from '../../ports/ITokenService';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IssueSession } from './IssueSession';

export interface LoginInput {
  identifier: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  adminOnly?: boolean;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  refreshExpiresAt: Date;
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

      const isPasswordValid = user.passwordHash ? await this.hasher.compare(input.password, user.passwordHash) : false;
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
      if(input.adminOnly){const {roles}=await this.rolePermQuery.getRolePermissionsByUserId(user.id.toString());if(!roles.includes('ADMIN'))return Result.fail<LoginOutput>('Vui lòng đăng nhập bằng FIT LHU SSO.');}

      if (user.status === 'LOCKED') return Result.fail<LoginOutput>('Tài khoản của bạn đã bị khóa.');
      if (user.status === 'INACTIVE') return Result.fail<LoginOutput>('Tài khoản chưa được kích hoạt. Nếu vừa đăng ký giảng viên, vui lòng chờ quản trị viên phê duyệt.');
      return Result.ok<LoginOutput>(await new IssueSession(this.userRepo, this.sessionRepo, this.rolePermQuery, this.tokenService, this.uow, this.auditLogRepo).execute(user, {
        ipAddress: input.ipAddress, userAgent: input.userAgent, correlationId: input.correlationId,
      }));

    } catch (error) {
      return Result.fail<LoginOutput>('Không thể đăng nhập lúc này. Vui lòng thử lại sau.');
    }

  }
}
