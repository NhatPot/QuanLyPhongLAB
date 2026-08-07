import mssql from 'mssql';
import { IAuthSessionRepository, AuthSessionProps } from '../../../../domain/repositories/IAuthSessionRepository';
import { SqlConnectionFactory } from '../connection';
import { v4 as uuidv4 } from 'uuid';

export class SqlAuthSessionRepository implements IAuthSessionRepository {
  public async findById(id: string): Promise<AuthSessionProps | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM AuthSessions WHERE Id = @id AND RevokedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toEntityProps(result.recordset[0]);
  }

  public async findByHash(hash: string): Promise<AuthSessionProps | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('hash', mssql.NVarChar, hash)
      .query('SELECT * FROM AuthSessions WHERE RefreshTokenHash = @hash AND RevokedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toEntityProps(result.recordset[0]);
  }

  public async save(session: AuthSessionProps, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const id = session.id || uuidv4();

    await connection
      .input('id', mssql.UniqueIdentifier, id)
      .input('userId', mssql.UniqueIdentifier, session.userId)
      .input('hash', mssql.NVarChar, session.refreshTokenHash)
      .input('expiresAt', mssql.DateTime2, session.expiresAt)
      .input('revokedAt', mssql.DateTime2, session.revokedAt || null)
      .input('ipAddress', mssql.NVarChar, session.ipAddress || null)
      .input('userAgent', mssql.NVarChar, session.userAgent || null)
      .query(`
        MERGE INTO AuthSessions AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET 
            RefreshTokenHash = @hash,
            ExpiresAt = @expiresAt,
            RevokedAt = @revokedAt,
            IpAddress = @ipAddress,
            UserAgent = @userAgent
        WHEN NOT MATCHED THEN
          INSERT (Id, UserId, RefreshTokenHash, ExpiresAt, RevokedAt, IpAddress, UserAgent)
          VALUES (@id, @userId, @hash, @expiresAt, @revokedAt, @ipAddress, @userAgent);
      `);
    
    session.id = id;
  }

  public async revokeByUserId(userId: string, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await connection
      .input('userId', mssql.UniqueIdentifier, userId)
      .query('UPDATE AuthSessions SET RevokedAt = SYSUTCDATETIME() WHERE UserId = @userId AND RevokedAt IS NULL');
  }

  public async revokeAllExcept(userId: string, activeSessionId: string, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await connection
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('activeId', mssql.UniqueIdentifier, activeSessionId)
      .query('UPDATE AuthSessions SET RevokedAt = SYSUTCDATETIME() WHERE UserId = @userId AND Id <> @activeId AND RevokedAt IS NULL');
  }

  private toEntityProps(raw: any): AuthSessionProps {
    return {
      id: raw.Id,
      userId: raw.UserId,
      refreshTokenHash: raw.RefreshTokenHash,
      expiresAt: raw.ExpiresAt,
      revokedAt: raw.RevokedAt || null,
      createdAt: raw.CreatedAt,
      ipAddress: raw.IpAddress || undefined,
      userAgent: raw.UserAgent || undefined
    };
  }
}
