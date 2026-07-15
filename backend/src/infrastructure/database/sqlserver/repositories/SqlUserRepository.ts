import mssql from 'mssql';
import {
  IUserRepository,
  UserListFilters,
  UserListResult,
  UserSummary,
  UserWithRoles,
} from '../../../../domain/repositories/IUserRepository';
import { User } from '../../../../domain/entities/User';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

export class SqlUserRepository implements IUserRepository {
  public async findById(id: string): Promise<User | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM Users WHERE Id = @id AND DeletedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const pool = await SqlConnectionFactory.getPool();
    const normalized = identifier.toLowerCase().trim();
    const result = await pool.request()
      .input('normalized', mssql.NVarChar, normalized)
      .query(`
        SELECT * FROM Users 
        WHERE (EmailNormalized = @normalized OR UsernameNormalized = @normalized)
        AND DeletedAt IS NULL
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const roles = await this.getRoleCodesByUserId(id);
    return { user, roles };
  }

  public async list(filters: UserListFilters): Promise<UserListResult> {
    const pool = await SqlConnectionFactory.getPool();
    const offset = (filters.page - 1) * filters.pageSize;
    const keyword = filters.keyword?.trim() || null;
    const status = filters.status || null;
    const roleCode = filters.roleCode?.trim() || null;
    const whereClause = `
      u.DeletedAt IS NULL
      AND (@keyword IS NULL OR u.FullName LIKE '%' + @keyword + '%'
        OR u.Email LIKE '%' + @keyword + '%'
        OR u.Username LIKE '%' + @keyword + '%'
        OR u.Department LIKE '%' + @keyword + '%')
      AND (@status IS NULL OR u.Status = @status)
      AND (@roleCode IS NULL OR EXISTS (
        SELECT 1
        FROM UserRoles filterUr
        INNER JOIN Roles filterRole ON filterRole.Id = filterUr.RoleId
        WHERE filterUr.UserId = u.Id AND filterRole.Code = @roleCode
      ))
    `;

    const countResult = await pool.request()
      .input('keyword', mssql.NVarChar, keyword)
      .input('status', mssql.NVarChar, status)
      .input('roleCode', mssql.NVarChar, roleCode)
      .query(`SELECT COUNT(*) AS Total FROM Users u WHERE ${whereClause}`);

    const dataResult = await pool.request()
      .input('keyword', mssql.NVarChar, keyword)
      .input('status', mssql.NVarChar, status)
      .input('roleCode', mssql.NVarChar, roleCode)
      .input('offset', mssql.Int, offset)
      .input('pageSize', mssql.Int, filters.pageSize)
      .query(`
        SELECT
          u.Id,
          u.FullName,
          u.Email,
          u.EmailNormalized,
          u.Username,
          u.UsernameNormalized,
          u.Phone,
          u.PasswordHash,
          u.Department,
          u.Status,
          u.MustChangePassword,
          u.LastLoginAt,
          u.CreatedAt,
          u.UpdatedAt,
          COALESCE(STRING_AGG(CONVERT(NVARCHAR(MAX), r.Code), N','), N'') AS RoleCodes
        FROM Users u
        LEFT JOIN UserRoles ur ON ur.UserId = u.Id
        LEFT JOIN Roles r ON r.Id = ur.RoleId
        WHERE ${whereClause}
        GROUP BY
          u.Id, u.FullName, u.Email, u.EmailNormalized, u.Username, u.UsernameNormalized,
          u.Phone, u.PasswordHash, u.Department, u.Status, u.MustChangePassword,
          u.LastLoginAt, u.CreatedAt, u.UpdatedAt
        ORDER BY u.CreatedAt DESC, u.FullName ASC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);

    return {
      data: dataResult.recordset.map((row) => ({
        user: this.toDomain(row),
        roles: row.RoleCodes ? String(row.RoleCodes).split(',').filter(Boolean) : [],
      })),
      total: Number(countResult.recordset[0]?.Total || 0),
    };
  }

  public async isEmailOrUsernameTaken(email: string, username: string, excludeUserId?: string): Promise<boolean> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('email', mssql.NVarChar, email.toLowerCase().trim())
      .input('username', mssql.NVarChar, username.toLowerCase().trim())
      .input('excludeUserId', mssql.UniqueIdentifier, excludeUserId || null)
      .query(`
        SELECT TOP 1 1 AS Found
        FROM Users
        WHERE DeletedAt IS NULL
          AND (EmailNormalized = @email OR UsernameNormalized = @username)
          AND (@excludeUserId IS NULL OR Id <> @excludeUserId)
      `);
    return result.recordset.length > 0;
  }

  public async getSummary(): Promise<UserSummary> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS Total,
        SUM(CASE WHEN Status = 'ACTIVE' THEN 1 ELSE 0 END) AS Active,
        SUM(CASE WHEN Status = 'LOCKED' THEN 1 ELSE 0 END) AS Locked,
        SUM(CASE WHEN Status = 'INACTIVE' THEN 1 ELSE 0 END) AS Inactive
      FROM Users
      WHERE DeletedAt IS NULL
    `);
    const row = result.recordset[0] || {};
    return {
      total: Number(row.Total || 0),
      active: Number(row.Active || 0),
      locked: Number(row.Locked || 0),
      inactive: Number(row.Inactive || 0),
    };
  }

  public async findExistingRoleCodes(roleCodes: string[]): Promise<string[]> {
    const uniqueCodes = Array.from(new Set(roleCodes));
    if (uniqueCodes.length === 0) return [];

    const pool = await SqlConnectionFactory.getPool();
    const request = pool.request();
    const parameters = uniqueCodes.map((code, index) => {
      request.input(`role${index}`, mssql.NVarChar, code);
      return `@role${index}`;
    });
    const result = await request.query(`SELECT Code FROM Roles WHERE Code IN (${parameters.join(', ')})`);
    return result.recordset.map((row) => String(row.Code));
  }

  public async getRoleCodesByUserId(userId: string): Promise<string[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('userId', mssql.UniqueIdentifier, userId)
      .query(`
        SELECT r.Code
        FROM UserRoles ur
        INNER JOIN Roles r ON r.Id = ur.RoleId
        WHERE ur.UserId = @userId
        ORDER BY r.Code
      `);
    return result.recordset.map((row) => String(row.Code));
  }

  public async replaceRoles(userId: string, roleCodes: string[], transaction?: mssql.Transaction): Promise<void> {
    if (transaction) {
      await this.replaceRolesInTransaction(userId, roleCodes, transaction);
      return;
    }

    const pool = await SqlConnectionFactory.getPool();
    const localTransaction = new mssql.Transaction(pool);
    await localTransaction.begin();
    try {
      await this.replaceRolesInTransaction(userId, roleCodes, localTransaction);
      await localTransaction.commit();
    } catch (error) {
      await localTransaction.rollback();
      throw error;
    }
  }

  public async countActiveUsersByRole(roleCode: string, transaction?: mssql.Transaction): Promise<number> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await connection
      .input('roleCode', mssql.NVarChar, roleCode)
      .query(`
        SELECT COUNT(DISTINCT u.Id) AS Total
        FROM Users u WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN UserRoles ur WITH (UPDLOCK, HOLDLOCK) ON ur.UserId = u.Id
        INNER JOIN Roles r ON r.Id = ur.RoleId
        WHERE u.DeletedAt IS NULL AND u.Status = 'ACTIVE' AND r.Code = @roleCode
      `);
    return Number(result.recordset[0]?.Total || 0);
  }

  public async save(user: User, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(user);

    await connection
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('fullName', mssql.NVarChar, raw.FullName)
      .input('email', mssql.NVarChar, raw.Email)
      .input('emailNorm', mssql.NVarChar, raw.EmailNormalized)
      .input('username', mssql.NVarChar, raw.Username)
      .input('usernameNorm', mssql.NVarChar, raw.UsernameNormalized)
      .input('phone', mssql.NVarChar, raw.Phone)
      .input('passwordHash', mssql.NVarChar, raw.PasswordHash)
      .input('department', mssql.NVarChar, raw.Department)
      .input('status', mssql.NVarChar, raw.Status)
      .input('mustChangePassword', mssql.Bit, raw.MustChangePassword)
      .input('lastLoginAt', mssql.DateTime2, raw.LastLoginAt)
      .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
      .query(`
        MERGE INTO Users AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET 
            FullName = @fullName,
            Email = @email,
            EmailNormalized = @emailNorm,
            Username = @username,
            UsernameNormalized = @usernameNorm,
            Phone = @phone,
            PasswordHash = @passwordHash,
            Department = @department,
            Status = @status,
            MustChangePassword = @mustChangePassword,
            LastLoginAt = @lastLoginAt,
            UpdatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (Id, FullName, Email, EmailNormalized, Username, UsernameNormalized, Phone, PasswordHash, Department, Status, MustChangePassword, LastLoginAt)
          VALUES (@id, @fullName, @email, @emailNorm, @username, @usernameNorm, @phone, @passwordHash, @department, @status, @mustChangePassword, @lastLoginAt);
      `);
  }

  private toDomain(raw: any): User {
    return User.create({
      fullName: raw.FullName,
      email: raw.Email,
      username: raw.Username,
      passwordHash: raw.PasswordHash,
      phone: raw.Phone || undefined,
      department: raw.Department || undefined,
      status: raw.Status,
      mustChangePassword: raw.MustChangePassword === true || raw.MustChangePassword === 1,
      lastLoginAt: raw.LastLoginAt || undefined,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt,
    }, new UniqueEntityId(raw.Id));
  }

  private toPersistence(user: User): any {
    return {
      Id: user.id.toString(),
      FullName: user.fullName,
      Email: user.email,
      EmailNormalized: user.email.toLowerCase().trim(),
      Username: user.username,
      UsernameNormalized: user.username.toLowerCase().trim(),
      Phone: user.phone || null,
      PasswordHash: user.passwordHash,
      Department: user.department || null,
      Status: user.status,
      MustChangePassword: user.mustChangePassword ? 1 : 0,
      LastLoginAt: user.lastLoginAt || null,
      UpdatedAt: new Date()
    };
  }

  private async replaceRolesInTransaction(
    userId: string,
    roleCodes: string[],
    transaction: mssql.Transaction,
  ): Promise<void> {
    const uniqueCodes = Array.from(new Set(roleCodes));
    await new mssql.Request(transaction)
      .input('userId', mssql.UniqueIdentifier, userId)
      .query('DELETE FROM UserRoles WHERE UserId = @userId');

    if (uniqueCodes.length === 0) return;

    const request = new mssql.Request(transaction)
      .input('userId', mssql.UniqueIdentifier, userId);
    const parameters = uniqueCodes.map((code, index) => {
      request.input(`role${index}`, mssql.NVarChar, code);
      return `@role${index}`;
    });
    await request.query(`
      INSERT INTO UserRoles (UserId, RoleId)
      SELECT @userId, Id
      FROM Roles
      WHERE Code IN (${parameters.join(', ')})
    `);
  }
}
