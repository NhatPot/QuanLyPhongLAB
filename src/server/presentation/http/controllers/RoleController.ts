import { NextFunction, Request, Response } from 'express';
import {
  GetRoleCatalogUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  UpdateRolePermissionsUseCase,
} from '../../../application/use-cases/role/RoleManagementUseCases';
import { RoleRecord } from '../../../domain/repositories/IRolePermissionRepository';
import { ApiResponse } from '../presenters/ApiResponse';

export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleCatalogUseCase: GetRoleCatalogUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
  ) {}

  public list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.listRolesUseCase.execute();
      res.status(200).json(ApiResponse.success(roles, 'Lấy danh sách vai trò thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public catalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const catalog = await this.getRoleCatalogUseCase.execute();
      res.status(200).json(ApiResponse.success(catalog, 'Lấy ma trận vai trò và quyền thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.getRoleUseCase.execute(req.params.code as string);
      res.status(200).json(ApiResponse.success(role, 'Lấy thông tin vai trò thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public updatePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.updateRolePermissionsUseCase.execute({
        roleCode: req.params.code as string,
        permissionCodes: req.body.permissionCodes,
        actorUserId: req.user!.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        correlationId: req.correlationId,
      });
      res.status(200).json(ApiResponse.success(this.toResponseDto(role), 'Cập nhật ma trận quyền thành công.'));
    } catch (error) {
      next(error);
    }
  };

  private toResponseDto(role: RoleRecord) {
    return {
      ...role,
      permissionCount: role.permissionCodes.length,
    };
  }
}

