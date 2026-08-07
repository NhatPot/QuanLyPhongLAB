import mssql from 'mssql';
import { IRolePermissionQuery, UserRolePermissions } from '../../../../application/ports/IRolePermissionQuery';
import { SqlConnectionFactory } from '../connection';

export class SqlRolePermissionQuery implements IRolePermissionQuery {
  public async getRolePermissionsByUserId(userId: string): Promise<UserRolePermissions> {
    const pool = await SqlConnectionFactory.getPool();

    const rolesResult = await pool.request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .query(`
        SELECT r.Code 
        FROM Roles r
        INNER JOIN UserRoles ur ON ur.RoleId = r.Id
        WHERE ur.UserId = @userId
      `);

    const roles = rolesResult.recordset.map(row => row.Code);

    const permissionsResult = await pool.request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .query(`
        SELECT DISTINCT p.Code 
        FROM Permissions p
        INNER JOIN RolePermissions rp ON rp.PermissionId = p.Id
        INNER JOIN UserRoles ur ON ur.RoleId = rp.RoleId
        WHERE ur.UserId = @userId
      `);

    const permissions = permissionsResult.recordset.map(row => row.Code);

    return { roles, permissions };
  }
}
