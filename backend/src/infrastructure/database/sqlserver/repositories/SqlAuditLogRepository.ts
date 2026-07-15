import mssql from 'mssql';
import {
  AuditLogFilters,
  AuditLogListResult,
  AuditLogProps,
  AuditLogRecord,
  IAuditLogRepository,
} from '../../../../domain/repositories/IAuditLogRepository';
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

  public async list(filters: AuditLogFilters): Promise<AuditLogListResult> {
    const pool = await SqlConnectionFactory.getPool();
    const offset = (filters.page - 1) * filters.pageSize;
    const keyword = filters.keyword?.trim() || null;
    const action = filters.action?.trim() || null;
    const entityName = filters.entityName?.trim() || null;
    const userId = filters.userId || null;
    const fromDate = filters.fromDate || null;
    const toDate = filters.toDate || null;
    const whereClause = `
      (@keyword IS NULL OR al.Action LIKE '%' + @keyword + '%' OR al.EntityName LIKE '%' + @keyword + '%'
        OR al.CorrelationId LIKE '%' + @keyword + '%' OR u.FullName LIKE '%' + @keyword + '%' OR u.Username LIKE '%' + @keyword + '%')
      AND (@action IS NULL OR al.Action = @action)
      AND (@entityName IS NULL OR al.EntityName = @entityName)
      AND (@userId IS NULL OR al.UserId = @userId)
      AND (@fromDate IS NULL OR al.CreatedAt >= @fromDate)
      AND (@toDate IS NULL OR al.CreatedAt < @toDate)
    `;

    const countRequest = pool.request()
      .input('keyword', mssql.NVarChar, keyword)
      .input('action', mssql.NVarChar, action)
      .input('entityName', mssql.NVarChar, entityName)
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('fromDate', mssql.DateTime2, fromDate)
      .input('toDate', mssql.DateTime2, toDate);
    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS Total
      FROM AuditLogs al
      LEFT JOIN Users u ON u.Id = al.UserId
      WHERE ${whereClause}
    `);

    const dataRequest = pool.request()
      .input('keyword', mssql.NVarChar, keyword)
      .input('action', mssql.NVarChar, action)
      .input('entityName', mssql.NVarChar, entityName)
      .input('userId', mssql.UniqueIdentifier, userId)
      .input('fromDate', mssql.DateTime2, fromDate)
      .input('toDate', mssql.DateTime2, toDate)
      .input('offset', mssql.Int, offset)
      .input('pageSize', mssql.Int, filters.pageSize);
    const dataResult = await dataRequest.query(`
      SELECT
        al.Id,
        al.UserId,
        u.FullName AS ActorName,
        u.Username AS ActorUsername,
        al.Action,
        al.EntityName,
        al.EntityId,
        al.OldValueJson,
        al.NewValueJson,
        al.IpAddress,
        al.UserAgent,
        al.CorrelationId,
        al.CreatedAt
      FROM AuditLogs al
      LEFT JOIN Users u ON u.Id = al.UserId
      WHERE ${whereClause}
      ORDER BY al.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      data: dataResult.recordset.map((row) => this.toRecord(row)),
      total: Number(countResult.recordset[0]?.Total || 0),
    };
  }

  private toRecord(row: any): AuditLogRecord {
    return {
      id: String(row.Id),
      userId: row.UserId ? String(row.UserId) : null,
      actorName: row.ActorName ? String(row.ActorName) : null,
      actorUsername: row.ActorUsername ? String(row.ActorUsername) : null,
      action: String(row.Action),
      entityName: String(row.EntityName),
      entityId: row.EntityId ? String(row.EntityId) : null,
      oldValueJson: row.OldValueJson ? String(row.OldValueJson) : null,
      newValueJson: row.NewValueJson ? String(row.NewValueJson) : null,
      ipAddress: row.IpAddress ? String(row.IpAddress) : null,
      userAgent: row.UserAgent ? String(row.UserAgent) : null,
      correlationId: row.CorrelationId ? String(row.CorrelationId) : null,
      createdAt: new Date(row.CreatedAt),
    };
  }
}
