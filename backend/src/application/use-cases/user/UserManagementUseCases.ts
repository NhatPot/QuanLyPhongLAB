import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IAuthSessionRepository } from '../../../domain/repositories/IAuthSessionRepository';
import {
  IUserRepository,
  UserListFilters,
  UserListResult,
  UserSummary,
  UserWithRoles,
} from '../../../domain/repositories/IUserRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { User, UserStatus } from '../../../domain/entities/User';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/AppError';

export interface UserOperationContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface CreateUserInput extends UserOperationContext {
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  department?: string;
  status?: UserStatus;
  roleCodes: string[];
  temporaryPassword: string;
}

export interface UpdateUserInput extends UserOperationContext {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  department?: string;
}

export interface UpdateUserStatusInput extends UserOperationContext {
  id: string;
  status: UserStatus;
}

export interface AssignUserRolesInput extends UserOperationContext {
  id: string;
  roleCodes: string[];
}

export interface ResetUserPasswordInput extends UserOperationContext {
  id: string;
  temporaryPassword: string;
}

export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public execute(filters: UserListFilters): Promise<UserListResult> {
    return this.userRepo.list(filters);
  }
}

export class GetUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public async execute(id: string): Promise<UserWithRoles> {
    const detail = await this.userRepo.findByIdWithRoles(id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');
    return detail;
  }
}

export class GetUserSummaryUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  public execute(): Promise<UserSummary> {
    return this.userRepo.getSummary();
  }
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: CreateUserInput): Promise<UserWithRoles> {
    const roleCodes = normalizeRoleCodes(input.roleCodes);
    await assertRolesExist(this.userRepo, roleCodes);

    const duplicated = await this.userRepo.isEmailOrUsernameTaken(input.email, input.username);
    if (duplicated) {
      throw new ConflictError('Email hoặc tên đăng nhập đã tồn tại.', 'USER_IDENTITY_EXISTS');
    }

    const passwordHash = await this.hasher.hash(input.temporaryPassword);
    const createdAt = new Date();
    const user = User.create({
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      username: input.username.trim(),
      phone: cleanOptional(input.phone),
      department: cleanOptional(input.department),
      passwordHash,
      status: input.status || 'ACTIVE',
      mustChangePassword: true,
      createdAt,
      updatedAt: createdAt,
    });

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.userRepo.save(user, transaction);
      await this.userRepo.replaceRoles(user.id.toString(), roleCodes, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_CREATED',
        entityName: 'Users',
        entityId: user.id.toString(),
        newValueJson: JSON.stringify({ ...snapshotUser(user), roles: roleCodes }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return { user, roles: roleCodes };
  }
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: UpdateUserInput): Promise<UserWithRoles> {
    const detail = await this.userRepo.findByIdWithRoles(input.id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');

    const duplicated = await this.userRepo.isEmailOrUsernameTaken(input.email, input.username, input.id);
    if (duplicated) {
      throw new ConflictError('Email hoặc tên đăng nhập đã được tài khoản khác sử dụng.', 'USER_IDENTITY_EXISTS');
    }

    const oldValue = { ...snapshotUser(detail.user), roles: detail.roles };
    detail.user.updateProfile({
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      username: input.username.trim(),
      phone: cleanOptional(input.phone),
      department: cleanOptional(input.department),
    });

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.userRepo.save(detail.user, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_UPDATED',
        entityName: 'Users',
        entityId: detail.user.id.toString(),
        oldValueJson: JSON.stringify(oldValue),
        newValueJson: JSON.stringify({ ...snapshotUser(detail.user), roles: detail.roles }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return detail;
  }
}

export class UpdateUserStatusUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: UpdateUserStatusInput): Promise<UserWithRoles> {
    const detail = await this.userRepo.findByIdWithRoles(input.id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');

    if (input.id === input.actorUserId && input.status !== 'ACTIVE') {
      throw new ForbiddenError('Bạn không thể khóa hoặc ngừng tài khoản đang đăng nhập.');
    }

    const protectsLastAdmin =
      detail.user.status === 'ACTIVE' &&
      input.status !== 'ACTIVE' &&
      detail.roles.includes('ADMIN');

    if (detail.user.status === input.status) return detail;

    const previousStatus = detail.user.status;
    detail.user.updateStatus(input.status);
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      if (protectsLastAdmin && (await this.userRepo.countActiveUsersByRole('ADMIN', transaction)) <= 1) {
        throw new BusinessRuleError('Hệ thống phải luôn có ít nhất một quản trị viên đang hoạt động.', 'LAST_ACTIVE_ADMIN');
      }
      await this.userRepo.save(detail.user, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_STATUS_UPDATED',
        entityName: 'Users',
        entityId: detail.user.id.toString(),
        oldValueJson: JSON.stringify({ status: previousStatus }),
        newValueJson: JSON.stringify({ status: input.status }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return detail;
  }
}

export class DeleteUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: IAuthSessionRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: UserOperationContext & { id: string }): Promise<void> {
    const detail = await this.userRepo.findByIdWithRoles(input.id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');
    if (input.id === input.actorUserId) {
      throw new ForbiddenError('Bạn không thể xóa tài khoản đang đăng nhập.');
    }

    const protectsLastAdmin =
      detail.user.status === 'ACTIVE' &&
      detail.roles.includes('ADMIN');
    const oldValue = { ...snapshotUser(detail.user), roles: detail.roles };
    detail.user.markDeleted();

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      if (protectsLastAdmin && (await this.userRepo.countActiveUsersByRole('ADMIN', transaction)) <= 1) {
        throw new BusinessRuleError('Không thể xóa quản trị viên đang hoạt động cuối cùng.', 'LAST_ACTIVE_ADMIN');
      }
      await this.userRepo.save(detail.user, transaction);
      await this.sessionRepo.revokeByUserId(input.id, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_DELETED',
        entityName: 'Users',
        entityId: detail.user.id.toString(),
        oldValueJson: JSON.stringify(oldValue),
        newValueJson: JSON.stringify({ deletedAt: detail.user.deletedAt }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });
  }
}

export class AssignUserRolesUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: AssignUserRolesInput): Promise<UserWithRoles> {
    const detail = await this.userRepo.findByIdWithRoles(input.id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');

    const roleCodes = normalizeRoleCodes(input.roleCodes);
    await assertRolesExist(this.userRepo, roleCodes);

    const protectsLastAdmin =
      detail.user.status === 'ACTIVE' &&
      detail.roles.includes('ADMIN') &&
      !roleCodes.includes('ADMIN');

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      if (protectsLastAdmin && (await this.userRepo.countActiveUsersByRole('ADMIN', transaction)) <= 1) {
        throw new BusinessRuleError('Không thể thu hồi vai trò của quản trị viên cuối cùng.', 'LAST_ACTIVE_ADMIN');
      }
      await this.userRepo.replaceRoles(input.id, roleCodes, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_ROLES_UPDATED',
        entityName: 'Users',
        entityId: input.id,
        oldValueJson: JSON.stringify({ roles: detail.roles }),
        newValueJson: JSON.stringify({ roles: roleCodes }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return { user: detail.user, roles: roleCodes };
  }
}

export class ResetUserPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: IAuthSessionRepository,
    private readonly hasher: IPasswordHasher,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: ResetUserPasswordInput): Promise<UserWithRoles> {
    const detail = await this.userRepo.findByIdWithRoles(input.id);
    if (!detail) throw new NotFoundError('Không tìm thấy người dùng.');

    const passwordHash = await this.hasher.hash(input.temporaryPassword);
    detail.user.resetPassword(passwordHash);

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.userRepo.save(detail.user, transaction);
      await this.sessionRepo.revokeByUserId(input.id, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'USER_PASSWORD_RESET',
        entityName: 'Users',
        entityId: input.id,
        newValueJson: JSON.stringify({ mustChangePassword: true, sessionsRevoked: true }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return detail;
  }
}

function normalizeRoleCodes(roleCodes: string[]): string[] {
  return Array.from(new Set(roleCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
}

async function assertRolesExist(userRepo: IUserRepository, roleCodes: string[]): Promise<void> {
  if (roleCodes.length === 0) throw new ValidationError('Người dùng phải có ít nhất một vai trò.');
  const existing = await userRepo.findExistingRoleCodes(roleCodes);
  const invalid = roleCodes.filter((code) => !existing.includes(code));
  if (invalid.length > 0) {
    throw new ValidationError(`Vai trò không tồn tại: ${invalid.join(', ')}.`);
  }
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function snapshotUser(user: User) {
  return {
    id: user.id.toString(),
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    phone: user.phone || null,
    department: user.department || null,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    deletedAt: user.deletedAt || null,
  };
}
