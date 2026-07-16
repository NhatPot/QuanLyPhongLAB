import mssql from 'mssql';
import {
  IRolePermissionRepository,
  PermissionRecord,
  RoleRecord,
} from '../../../../domain/repositories/IRolePermissionRepository';
import { SqlConnectionFactory } from '../connection';

export class SqlRolePermissionRepository implements IRolePermissionRepository {
  public async listRoles(): Promise<RoleRecord[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT
        r.Id,
        r.Code,
        r.Name,
        r.Description,
        (SELECT COUNT(DISTINCT ur.UserId) FROM UserRoles ur WHERE ur.RoleId = r.Id) AS UserCount,
        COALESCE((
          SELECT STRING_AGG(CONVERT(NVARCHAR(MAX), p.Code), N',')
          FROM RolePermissions rp
          INNER JOIN Permissions p ON p.Id = rp.PermissionId
          WHERE rp.RoleId = r.Id
        ), N'') AS PermissionCodes
      FROM Roles r
      ORDER BY CASE WHEN r.Code = 'ADMIN' THEN 0 ELSE 1 END, r.Name ASC
    `);
    return result.recordset.map((row) => this.toRoleRecord(row));
  }

  public async getRoleByCode(code: string): Promise<RoleRecord | null> {
    const roles = await this.listRoles();
    return roles.find((role) => role.code === code.toUpperCase()) || null;
  }

  public async listPermissions(): Promise<PermissionRecord[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT Id, Code, Name, Description
      FROM Permissions
      ORDER BY
        CASE
          WHEN Code LIKE 'USER_%' OR Code IN ('ROLE_ASSIGN', 'PERMISSION_MANAGE', 'AUDIT_LOG_VIEW') THEN 0
          WHEN Code LIKE 'LAB_%' THEN 1
          WHEN Code LIKE 'COMPUTER_%' THEN 2
          WHEN Code LIKE 'EQUIPMENT_%' THEN 3
          WHEN Code LIKE 'BOOKING_%' THEN 4
          WHEN Code LIKE 'INCIDENT_%' THEN 5
          WHEN Code LIKE 'DASHBOARD_%' OR Code LIKE 'REPORT_%' THEN 6
          ELSE 7
        END,
        Code ASC
    `);
    return result.recordset.map((row) => ({
      id: String(row.Id),
      code: String(row.Code),
      name: String(row.Name),
      description: row.Description ? String(row.Description) : null,
      group: permissionGroupOf(String(row.Code)),
    }));
  }

  public async findExistingPermissionCodes(codes: string[]): Promise<string[]> {
    const uniqueCodes = Array.from(new Set(codes));
    if (uniqueCodes.length === 0) return [];

    const pool = await SqlConnectionFactory.getPool();
    const request = pool.request();
    const parameters = uniqueCodes.map((code, index) => {
      request.input(`permission${index}`, mssql.NVarChar, code);
      return `@permission${index}`;
    });
    const result = await request.query(`SELECT Code FROM Permissions WHERE Code IN (${parameters.join(', ')})`);
    return result.recordset.map((row) => String(row.Code));
  }

  public async replacePermissions(
    roleCode: string,
    permissionCodes: string[],
    transaction?: mssql.Transaction,
  ): Promise<void> {
    if (transaction) {
      await this.replacePermissionsInTransaction(roleCode, permissionCodes, transaction);
      return;
    }

    const pool = await SqlConnectionFactory.getPool();
    const localTransaction = new mssql.Transaction(pool);
    await localTransaction.begin();
    try {
      await this.replacePermissionsInTransaction(roleCode, permissionCodes, localTransaction);
      await localTransaction.commit();
    } catch (error) {
      await localTransaction.rollback();
      throw error;
    }
  }

  private async replacePermissionsInTransaction(
    roleCode: string,
    permissionCodes: string[],
    transaction: mssql.Transaction,
  ): Promise<void> {
    const roleRequest = new mssql.Request(transaction)
      .input('roleCode', mssql.NVarChar, roleCode);
    const roleResult = await roleRequest.query('SELECT Id FROM Roles WHERE Code = @roleCode');
    if (roleResult.recordset.length === 0) {
      throw new Error(`Vai trò '${roleCode}' không tồn tại.`);
    }

    const roleId = roleResult.recordset[0].Id;
    await new mssql.Request(transaction)
      .input('roleId', mssql.UniqueIdentifier, roleId)
      .query('DELETE FROM RolePermissions WHERE RoleId = @roleId');

    const uniqueCodes = Array.from(new Set(permissionCodes));
    if (uniqueCodes.length === 0) return;

    const permissionRequest = new mssql.Request(transaction)
      .input('roleId', mssql.UniqueIdentifier, roleId);
    const parameters = uniqueCodes.map((code, index) => {
      permissionRequest.input(`permission${index}`, mssql.NVarChar, code);
      return `@permission${index}`;
    });
    await permissionRequest.query(`
      INSERT INTO RolePermissions (RoleId, PermissionId)
      SELECT @roleId, Id
      FROM Permissions
      WHERE Code IN (${parameters.join(', ')})
    `);
  }

  private toRoleRecord(row: any): RoleRecord {
    return {
      id: String(row.Id),
      code: String(row.Code),
      name: String(row.Name),
      description: row.Description ? String(row.Description) : null,
      userCount: Number(row.UserCount || 0),
      permissionCodes: row.PermissionCodes ? String(row.PermissionCodes).split(',').filter(Boolean) : [],
    };
  }
}

export function permissionGroupOf(code: string): string {
  if (code.startsWith('USER_') || ['ROLE_ASSIGN', 'PERMISSION_MANAGE', 'AUDIT_LOG_VIEW'].includes(code)) return 'users';
  if (code.startsWith('LAB_')) return 'lab';
  if (code.startsWith('COMPUTER_')) return 'computers';
  if (code.startsWith('EQUIPMENT_')) return 'equipment';
  if (code.startsWith('MAINTENANCE_')) return 'maintenance';
  if (code.startsWith('BOOKING_')) return 'bookings';
  if (code.startsWith('INCIDENT_')) return 'incidents';
  return 'reports';
}
