import mssql from 'mssql';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
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
      Phone: user.props.phone || null,
      PasswordHash: user.passwordHash,
      Department: user.props.department || null,
      Status: user.status,
      MustChangePassword: user.mustChangePassword ? 1 : 0,
      LastLoginAt: user.lastLoginAt || null,
      UpdatedAt: new Date()
    };
  }
}
