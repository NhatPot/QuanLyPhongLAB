import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IRolePermissionRepository, PermissionRecord, RoleRecord } from '../../../domain/repositories/IRolePermissionRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';

export interface RoleOperationContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface UpdateRolePermissionsInput extends RoleOperationContext {
  roleCode: string;
  permissionCodes: string[];
}

export class ListRolesUseCase {
  constructor(private readonly roleRepo: IRolePermissionRepository) {}

  public execute(): Promise<RoleRecord[]> {
    return this.roleRepo.listRoles();
  }
}

export class GetRoleCatalogUseCase {
  constructor(private readonly roleRepo: IRolePermissionRepository) {}

  public async execute(): Promise<{ roles: RoleRecord[]; permissions: PermissionRecord[] }> {
    const [roles, permissions] = await Promise.all([
      this.roleRepo.listRoles(),
      this.roleRepo.listPermissions(),
    ]);
    return { roles, permissions };
  }
}

export class GetRoleUseCase {
  constructor(private readonly roleRepo: IRolePermissionRepository) {}

  public async execute(roleCode: string): Promise<RoleRecord> {
    const role = await this.roleRepo.getRoleByCode(roleCode);
    if (!role) throw new NotFoundError('Không tìm thấy vai trò.');
    return role;
  }
}

export class UpdateRolePermissionsUseCase {
  constructor(
    private readonly roleRepo: IRolePermissionRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  public async execute(input: UpdateRolePermissionsInput): Promise<RoleRecord> {
    const roleCode = input.roleCode.trim().toUpperCase();
    const role = await this.roleRepo.getRoleByCode(roleCode);
    if (!role) throw new NotFoundError('Không tìm thấy vai trò.');
    if (roleCode === 'ADMIN') {
      throw new BusinessRuleError('Vai trò ADMIN được bảo vệ và không thể chỉnh sửa ma trận quyền.', 'PROTECTED_ROLE');
    }

    const permissionCodes = normalizeCodes(input.permissionCodes);
    const existingCodes = await this.roleRepo.findExistingPermissionCodes(permissionCodes);
    const invalidCodes = permissionCodes.filter((code) => !existingCodes.includes(code));
    if (invalidCodes.length > 0) {
      throw new ValidationError(`Quyền không tồn tại: ${invalidCodes.join(', ')}.`);
    }

    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.roleRepo.replacePermissions(roleCode, permissionCodes, transaction);
      await this.auditLogRepo.save({
        userId: input.actorUserId,
        action: 'ROLE_PERMISSIONS_UPDATED',
        entityName: 'Roles',
        entityId: role.id,
        oldValueJson: JSON.stringify({ permissionCodes: role.permissionCodes }),
        newValueJson: JSON.stringify({ permissionCodes }),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId,
      }, transaction);
    });

    return {
      ...role,
      permissionCodes,
    };
  }
}

function normalizeCodes(codes: string[]): string[] {
  return Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))).sort();
}
