import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';
import {requiresAccountSetup} from './account-setup-state';

export interface GetCurrentUserOutput {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: string | null;
  department: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  requiresAccountSetup: boolean;
  emailVerified?: boolean;
  ssoLinked: boolean;
  usesSso: boolean;
}

export class GetCurrentUserUseCase {
  constructor(
    private userRepo: IUserRepository,
    private rolePermQuery: IRolePermissionQuery
  ) {}

  public async execute(userId: string, usesSso=false): Promise<Result<GetCurrentUserOutput>> {
    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        return Result.fail<GetCurrentUserOutput>("Không tìm thấy người dùng.");
      }

      const { roles, permissions } = await this.rolePermQuery.getRolePermissionsByUserId(userId);

      return Result.ok<GetCurrentUserOutput>({
        id: user.id.toString(),
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        phone: user.phone || null,
        department: user.department || null,
        avatarUrl: user.avatarUrl || null,
        roles,
        permissions,
        mustChangePassword: usesSso?false:user.mustChangePassword,
        requiresAccountSetup: requiresAccountSetup(user,{usesSso,roles}),
        ssoLinked: user.ssoLinked,
        usesSso,
        emailVerified: Boolean(user.emailVerifiedAt),
      });
    } catch (error) {
      return Result.fail<GetCurrentUserOutput>((error as any).message || "Đã xảy ra lỗi khi lấy thông tin người dùng.");
    }

  }
}
