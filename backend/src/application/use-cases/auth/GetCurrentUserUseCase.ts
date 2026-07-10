import { Result } from '../../../shared/result/Result';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IRolePermissionQuery } from '../../ports/IRolePermissionQuery';

export interface GetCurrentUserOutput {
  id: string;
  fullName: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

export class GetCurrentUserUseCase {
  constructor(
    private userRepo: IUserRepository,
    private rolePermQuery: IRolePermissionQuery
  ) {}

  public async execute(userId: string): Promise<Result<GetCurrentUserOutput>> {
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
        roles,
        permissions,
        mustChangePassword: user.mustChangePassword
      });
    } catch (error) {
      return Result.fail<GetCurrentUserOutput>((error as any).message || "Đã xảy ra lỗi khi lấy thông tin người dùng.");
    }

  }
}
