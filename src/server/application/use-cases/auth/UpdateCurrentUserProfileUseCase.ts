import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { GetCurrentUserOutput } from './GetCurrentUserUseCase';
import {requiresAccountSetup} from './account-setup-state';

const MAX_AVATAR_DATA_URL_LENGTH = 700_000;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export interface UpdateCurrentUserProfileInput {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  avatarUrl?: string | null;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  usesSso?: boolean;
}

export class UpdateCurrentUserProfileUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly rolePermissionQuery: IRolePermissionQuery,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: UpdateCurrentUserProfileInput): Promise<GetCurrentUserOutput> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) throw new NotFoundError('Không tìm thấy người dùng.');

    const fullName = input.fullName.trim();
    const email = input.email.trim();
    if (user.emailVerifiedAt && email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ValidationError('Email đã xác minh không thể đổi trực tiếp trong hồ sơ. Vui lòng liên hệ quản trị viên.');
    }
    const phone = cleanOptional(input.phone);
    const department = cleanOptional(input.department);
    if(user.ssoLinked&&(!phone||!department))throw new ValidationError('Vui lòng nhập ngành / phòng ban và số điện thoại.');
    const avatarUrl = input.avatarUrl === undefined
      ? user.avatarUrl
      : validateAvatar(input.avatarUrl);

    const duplicated = await this.userRepo.isEmailOrUsernameTaken(email, user.username, input.userId);
    if (duplicated) {
      throw new ConflictError('Email đã được tài khoản khác sử dụng.', 'USER_EMAIL_EXISTS');
    }

    const oldValue = profileSnapshot(user);
    user.updatePersonalProfile({ fullName, email, phone, department, avatarUrl });
    const newValue = profileSnapshot(user);

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.userRepo.save(user, transaction);
      await this.auditLogRepo.save({
        userId: input.userId,
        action: 'USER_PROFILE_UPDATED',
        entityName: 'Users',
        entityId: input.userId,
        oldValueJson: JSON.stringify(oldValue),
        newValueJson: JSON.stringify(newValue),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    const { roles, permissions } = await this.rolePermissionQuery.getRolePermissionsByUserId(input.userId);
    return {
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phone: user.phone || null,
      department: user.department || null,
      avatarUrl: user.avatarUrl || null,
      roles,
      permissions,
      mustChangePassword: input.usesSso?false:user.mustChangePassword,
      requiresAccountSetup: requiresAccountSetup(user,{usesSso:input.usesSso,roles}),
      ssoLinked: user.ssoLinked,
      usesSso: !!input.usesSso,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
  }
}

function validateAvatar(value: string | null): string | undefined {
  if (value === null || value === '') return undefined;
  if (value.length > MAX_AVATAR_DATA_URL_LENGTH || !AVATAR_DATA_URL_PATTERN.test(value)) {
    throw new ValidationError('Ảnh đại diện không hợp lệ hoặc vượt quá dung lượng cho phép.');
  }
  return value;
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function profileSnapshot(user: {
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  avatarUrl?: string;
}) {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || null,
    department: user.department || null,
    hasAvatar: Boolean(user.avatarUrl),
  };
}
