import { IClock } from '../application/ports/IClock';
import { IIdGenerator } from '../application/ports/IIdGenerator';
import { ILogger } from '../application/ports/ILogger';
import { IPasswordHasher } from '../application/ports/IPasswordHasher';
import { ITokenService } from '../application/ports/ITokenService';
import { IRolePermissionQuery } from '../application/ports/IRolePermissionQuery';

import { SystemClock } from '../infrastructure/services/SystemClock';
import { UuidGenerator } from '../infrastructure/services/UuidGenerator';
import { PinoLogger } from '../infrastructure/logger/PinoLogger';
import { BcryptHasher } from '../infrastructure/auth/BcryptHasher';
import { JwtTokenService } from '../infrastructure/auth/JwtTokenService';

import { IUserRepository } from '../domain/repositories/IUserRepository';
import { IAuthSessionRepository } from '../domain/repositories/IAuthSessionRepository';
import { IAuditLogRepository } from '../domain/repositories/IAuditLogRepository';
import { IUnitOfWork } from '../domain/repositories/IUnitOfWork';

import { SqlUserRepository } from '../infrastructure/database/sqlserver/repositories/SqlUserRepository';
import { SqlAuthSessionRepository } from '../infrastructure/database/sqlserver/repositories/SqlAuthSessionRepository';
import { SqlRolePermissionQuery } from '../infrastructure/database/sqlserver/repositories/SqlRolePermissionQuery';
import { SqlAuditLogRepository } from '../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository';
import { SqlUnitOfWork } from '../infrastructure/database/sqlserver/unit-of-work/SqlUnitOfWork';

import { GetHealthUseCase } from '../application/use-cases/GetHealthUseCase';
import { LoginUseCase } from '../application/use-cases/auth/LoginUseCase';
import { RefreshSessionUseCase } from '../application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '../application/use-cases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '../application/use-cases/auth/GetCurrentUserUseCase';
import { ChangePasswordUseCase } from '../application/use-cases/auth/ChangePasswordUseCase';

import { HealthController } from '../presentation/http/controllers/HealthController';

class DependencyContainer {
  public readonly clock: IClock;
  public readonly idGenerator: IIdGenerator;
  public readonly logger: ILogger;
  public readonly hasher: IPasswordHasher;
  public readonly tokenService: ITokenService;
  
  public readonly userRepo: IUserRepository;
  public readonly sessionRepo: IAuthSessionRepository;
  public readonly auditLogRepo: IAuditLogRepository;
  public readonly rolePermQuery: IRolePermissionQuery;
  public readonly uow: IUnitOfWork;

  // Controllers
  public readonly healthController: HealthController;

  // Use cases
  public readonly getHealthUseCase: GetHealthUseCase;
  public readonly loginUseCase: LoginUseCase;
  public readonly refreshSessionUseCase: RefreshSessionUseCase;
  public readonly logoutUseCase: LogoutUseCase;
  public readonly getCurrentUserUseCase: GetCurrentUserUseCase;
  public readonly changePasswordUseCase: ChangePasswordUseCase;

  constructor() {
    this.clock = new SystemClock();
    this.idGenerator = new UuidGenerator();
    this.logger = new PinoLogger();
    this.hasher = new BcryptHasher();
    this.tokenService = new JwtTokenService();

    this.userRepo = new SqlUserRepository();
    this.sessionRepo = new SqlAuthSessionRepository();
    this.auditLogRepo = new SqlAuditLogRepository();
    this.rolePermQuery = new SqlRolePermissionQuery();
    this.uow = new SqlUnitOfWork();

    this.getHealthUseCase = new GetHealthUseCase();
    this.healthController = new HealthController(this.getHealthUseCase);

    this.loginUseCase = new LoginUseCase(
      this.userRepo,
      this.sessionRepo,
      this.rolePermQuery,
      this.hasher,
      this.tokenService,
      this.uow,
      this.auditLogRepo
    );
    this.refreshSessionUseCase = new RefreshSessionUseCase(
      this.userRepo,
      this.sessionRepo,
      this.rolePermQuery,
      this.tokenService,
      this.uow
    );
    this.logoutUseCase = new LogoutUseCase(
      this.sessionRepo,
      this.uow
    );
    this.getCurrentUserUseCase = new GetCurrentUserUseCase(
      this.userRepo,
      this.rolePermQuery
    );
    this.changePasswordUseCase = new ChangePasswordUseCase(
      this.userRepo,
      this.sessionRepo,
      this.hasher,
      this.uow,
      this.auditLogRepo
    );
  }
}


export const container = new DependencyContainer();
