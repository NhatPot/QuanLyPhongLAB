import { describe, expect, it, vi } from 'vitest';
import { User } from '../../../domain/entities/User';
import { UniqueEntityId } from '../../../domain/value-objects/UniqueEntityId';
import { AuditLogProps, IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import { ConflictError, ValidationError } from '../../../shared/errors/AppError';
import { UpdateCurrentUserProfileUseCase } from './UpdateCurrentUserProfileUseCase';

const userId = '11111111-1111-4111-8111-111111111111';

function setup(options?: { duplicate?: boolean }) {
  const user = User.create({
    fullName: 'Giảng viên Test',
    email: 'teacher@lhu.edu.vn',
    username: 'teacher.test',
    phone: '0900000000',
    department: 'Khoa CNTT',
    passwordHash: 'hashed',
    status: 'ACTIVE',
    mustChangePassword: false,
  }, new UniqueEntityId(userId));

  const save = vi.fn(async () => undefined);
  const userRepo = {
    findById: vi.fn(async () => user),
    isEmailOrUsernameTaken: vi.fn(async () => options?.duplicate || false),
    save,
  } as unknown as IUserRepository;
  const rolePermissionQuery = {
    getRolePermissionsByUserId: vi.fn(async () => ({ roles: ['TEACHER'], permissions: ['BOOKING_VIEW_OWN'] })),
  } as IRolePermissionQuery;
  const auditSave = vi.fn(async (_log: AuditLogProps, _transaction?: unknown) => undefined);
  const auditLogRepo = { save: auditSave } as unknown as IAuditLogRepository;
  const transaction = { id: 'test-transaction' };
  const uow = {
    complete: async <T>(work: () => Promise<T>) => work(),
    getTransaction: () => transaction,
  } as unknown as IUnitOfWork;
  const useCase = new UpdateCurrentUserProfileUseCase(userRepo, rolePermissionQuery, uow, auditLogRepo);

  return { useCase, user, save, auditSave };
}

describe('UpdateCurrentUserProfileUseCase', () => {
  it('cập nhật hồ sơ và avatar nhưng giữ nguyên username, vai trò', async () => {
    const { useCase, user, save, auditSave } = setup();
    const avatarUrl = 'data:image/png;base64,aGVsbG8=';

    const result = await useCase.execute({
      userId,
      fullName: 'Giảng viên Nguyễn Văn A',
      email: 'nguyenvana@lhu.edu.vn',
      phone: '0912345678',
      department: 'Khoa Công nghệ Thông tin',
      avatarUrl,
    });

    expect(user.username).toBe('teacher.test');
    expect(result.roles).toEqual(['TEACHER']);
    expect(result.avatarUrl).toBe(avatarUrl);
    expect(save).toHaveBeenCalledOnce();
    expect(auditSave).toHaveBeenCalledOnce();
    const audit = auditSave.mock.calls[0][0];
    expect(audit.action).toBe('USER_PROFILE_UPDATED');
    expect(audit.newValueJson).not.toContain(avatarUrl);
    expect(audit.newValueJson).toContain('"hasAvatar":true');
  });

  it('từ chối dữ liệu avatar không an toàn', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({
      userId,
      fullName: 'Giảng viên Test',
      email: 'teacher@lhu.edu.vn',
      avatarUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('từ chối email đã thuộc tài khoản khác', async () => {
    const { useCase } = setup({ duplicate: true });
    await expect(useCase.execute({
      userId,
      fullName: 'Giảng viên Test',
      email: 'duplicate@lhu.edu.vn',
    })).rejects.toBeInstanceOf(ConflictError);
  });
});
