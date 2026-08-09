import { NextFunction, Request, Response } from 'express';
import {
  AssignUserRolesUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserSummaryUseCase,
  GetUserUseCase,
  ListUsersUseCase,
  ResetUserPasswordUseCase,
  UpdateUserStatusUseCase,
  UpdateUserUseCase,
  UserOperationContext,
} from '../../../application/use-cases/user/UserManagementUseCases';
import { UserWithRoles } from '../../../domain/repositories/IUserRepository';
import { UserStatus } from '../../../domain/entities/User';
import { ApiResponse } from '../presenters/ApiResponse';

export class UserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserSummaryUseCase: GetUserSummaryUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    private readonly assignUserRolesUseCase: AssignUserRolesUseCase,
    private readonly resetUserPasswordUseCase: ResetUserPasswordUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const output = await this.listUsersUseCase.execute({
        page,
        pageSize,
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as UserStatus | undefined,
        roleCode: req.query.roleCode as string | undefined,
      });

      res.status(200).json(ApiResponse.paginated(
        output.data.map((detail) => this.toResponseDto(detail)),
        {
          page,
          pageSize,
          totalItems: output.total,
          totalPages: Math.ceil(output.total / pageSize),
        },
        'Lấy danh sách người dùng thành công.',
      ));
    } catch (error) {
      next(error);
    }
  };

  public summary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.getUserSummaryUseCase.execute();
      res.status(200).json(ApiResponse.success(summary, 'Lấy thống kê người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.getUserUseCase.execute(req.params.id as string);
      res.status(200).json(ApiResponse.success(this.toResponseDto(detail), 'Lấy thông tin người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.createUserUseCase.execute({
        ...req.body,
        ...this.contextOf(req),
      });
      res.status(201).json(ApiResponse.created(this.toResponseDto(detail), 'Tạo người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.updateUserUseCase.execute({
        id: req.params.id as string,
        ...req.body,
        ...this.contextOf(req),
      });
      res.status(200).json(ApiResponse.success(this.toResponseDto(detail), 'Cập nhật người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.updateUserStatusUseCase.execute({
        id: req.params.id as string,
        status: req.body.status,
        ...this.contextOf(req),
      });
      res.status(200).json(ApiResponse.success(this.toResponseDto(detail), 'Cập nhật trạng thái người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public assignRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.assignUserRolesUseCase.execute({
        id: req.params.id as string,
        roleCodes: req.body.roleCodes,
        ...this.contextOf(req),
      });
      res.status(200).json(ApiResponse.success(this.toResponseDto(detail), 'Cập nhật vai trò người dùng thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.resetUserPasswordUseCase.execute({
        id: req.params.id as string,
        temporaryPassword: req.body.temporaryPassword,
        ...this.contextOf(req),
      });
      res.status(200).json(ApiResponse.success(
        this.toResponseDto(detail),
        'Đặt lại mật khẩu thành công. Người dùng phải đổi mật khẩu khi đăng nhập lại.',
      ));
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUserUseCase.execute({
        id: req.params.id as string,
        ...this.contextOf(req),
      });
      res.status(200).json(ApiResponse.success(null, 'Xóa tài khoản thành công.'));
    } catch (error) {
      next(error);
    }
  };

  private contextOf(req: Request): UserOperationContext {
    return {
      actorUserId: req.user!.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId,
    };
  }

  private toResponseDto({ user, roles }: UserWithRoles) {
    return {
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      phone: user.phone || null,
      department: user.department || null,
      avatarUrl: user.avatarUrl || null,
      status: user.status,
      roles,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt || null,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null,
    };
  }
}
