import mssql from 'mssql';
import { IAuditLogRepository, AuditLogProps } from '../../../../domain/repositories/IAuditLogRepository';
import { SqlConnectionFactory } from '../connection';

export class SqlAuditLogRepository implements IAuditLogRepository {
  public async save(log: AuditLogProps, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();

    await connection
      .input('userId', mssql.UniqueIdentifier, log.userId || null)
      .input('action', mssql.NVarChar, log.action)
      .input('entityName', mssql.NVarChar, log.entityName)
      .input('entityId', mssql.UniqueIdentifier, log.entityId || null)
      .input('oldValue', mssql.NVarChar, log.oldValueJson || null)
      .input('newValue', mssql.NVarChar, log.newValueJson || null)
      .input('ipAddress', mssql.NVarChar, log.ipAddress || null)
      .input('userAgent', mssql.NVarChar, log.userAgent || null)
      .input('correlationId', mssql.NVarChar, log.correlationId || null)
      .query(`
        INSERT INTO AuditLogs (UserId, Action, EntityName, EntityId, OldValueJson, NewValueJson, IpAddress, UserAgent, CorrelationId)
        VALUES (@userId, @action, @entityName, @entityId, @oldValue, @newValue, @ipAddress, @userAgent, @correlationId)
      `);
  }
}
