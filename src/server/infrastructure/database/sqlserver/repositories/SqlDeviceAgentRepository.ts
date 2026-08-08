import mssql from 'mssql';
import {
  DeviceAgentRecord,
  DeviceMetrics,
  IDeviceAgentRepository,
  RegisterDeviceAgentInput,
} from '../../../../domain/repositories/IDeviceAgentRepository';
import { normalizeDeviceId } from '../../../../shared/utils/deviceIdentity';
import { SqlConnectionFactory } from '../connection';

export class SqlDeviceAgentRepository implements IDeviceAgentRepository {
  private static tableChecked = false;

  private async ensureTable(): Promise<void> {
    if (SqlDeviceAgentRepository.tableChecked) return;
    try {
      const pool = await SqlConnectionFactory.getPool();
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DeviceAgents')
        BEGIN
          CREATE TABLE DeviceAgents (
            ComputerId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
            DeviceId NVARCHAR(100) NOT NULL UNIQUE,
            ApiKeyHash VARCHAR(64) NOT NULL UNIQUE,
            Hostname NVARCHAR(255) NOT NULL,
            AgentUuid NVARCHAR(100) NULL,
            Platform NVARCHAR(100) NULL,
            Architecture NVARCHAR(100) NULL,
            CpuCores INT NULL,
            RegisteredAt DATETIME2 NOT NULL,
            LastSeenAt DATETIME2 NULL,
            CurrentUserId NVARCHAR(100) NULL,
            CurrentUsername NVARCHAR(255) NULL,
            CurrentFullName NVARCHAR(255) NULL,
            BoundAt DATETIME2 NULL,
            LatestMetricsJson NVARCHAR(MAX) NULL,
            CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
            UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
            CONSTRAINT FK_DeviceAgents_Computer FOREIGN KEY (ComputerId) REFERENCES Computers(Id) ON DELETE CASCADE
          );
        END
      `);
      SqlDeviceAgentRepository.tableChecked = true;
    } catch {
      // Ignore table check or CREATE TABLE errors due to DB user permissions
    }
  }

  public async findByApiKeyHash(apiKeyHash: string): Promise<DeviceAgentRecord | null> {
    await this.ensureTable();
    try {
      const pool = await SqlConnectionFactory.getPool();
      const result = await pool.request()
        .input('apiKeyHash', mssql.VarChar(64), apiKeyHash)
        .query(`
          SELECT da.*
          FROM DeviceAgents da
          INNER JOIN Computers c ON c.Id = da.ComputerId
          WHERE da.ApiKeyHash = @apiKeyHash AND c.DeletedAt IS NULL
        `);

      return result.recordset[0] ? this.toDomain(result.recordset[0]) : null;
    } catch {
      return null;
    }
  }

  public async findByDeviceId(deviceId: string): Promise<DeviceAgentRecord | null> {
    await this.ensureTable();
    try {
      const pool = await SqlConnectionFactory.getPool();
      const result = await pool.request()
        .input('deviceId', mssql.NVarChar(100), normalizeDeviceId(deviceId))
        .query(`
          SELECT da.*
          FROM DeviceAgents da
          INNER JOIN Computers c ON c.Id = da.ComputerId
          WHERE da.DeviceId = @deviceId AND c.DeletedAt IS NULL
        `);

      return result.recordset[0] ? this.toDomain(result.recordset[0]) : null;
    } catch {
      return null;
    }
  }

  public async upsertRegistration(input: RegisterDeviceAgentInput, transaction?: mssql.Transaction): Promise<void> {
    await this.ensureTable();
    try {
      const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
      const normalizedId = normalizeDeviceId(input.deviceId);
      await request
        .input('computerId', mssql.UniqueIdentifier, input.computerId)
        .input('deviceId', mssql.NVarChar(100), normalizedId)
        .input('apiKeyHash', mssql.VarChar(64), input.apiKeyHash)
        .input('hostname', mssql.NVarChar(255), (input.hostname || 'UNKNOWN-HOST').trim())
        .input('agentUuid', mssql.NVarChar(100), input.agentUuid?.trim() || null)
        .input('platform', mssql.NVarChar(100), input.platform?.trim() || null)
        .input('architecture', mssql.NVarChar(100), input.architecture?.trim() || null)
        .input('cpuCores', mssql.Int, input.cpuCores ?? null)
        .input('registeredAt', mssql.DateTime2, input.registeredAt)
        .query(`
          MERGE INTO DeviceAgents WITH (HOLDLOCK) AS target
          USING (SELECT @computerId AS ComputerId, @deviceId AS DeviceId) AS source
          ON target.ComputerId = source.ComputerId OR target.DeviceId = source.DeviceId
          WHEN MATCHED THEN UPDATE SET
            ComputerId = @computerId,
            DeviceId = @deviceId,
            ApiKeyHash = @apiKeyHash,
            Hostname = @hostname,
            AgentUuid = @agentUuid,
            Platform = @platform,
            Architecture = @architecture,
            CpuCores = @cpuCores,
            RegisteredAt = @registeredAt,
            UpdatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT (
            ComputerId, DeviceId, ApiKeyHash, Hostname, AgentUuid, Platform,
            Architecture, CpuCores, RegisteredAt
          ) VALUES (
            @computerId, @deviceId, @apiKeyHash, @hostname, @agentUuid, @platform,
            @architecture, @cpuCores, @registeredAt
          );
        `);
    } catch (err: any) {
      console.warn('Warning: Could not upsert into DeviceAgents table, operating in fallback mode:', err?.message);
    }
  }

  public async updateMetrics(
    deviceId: string,
    metrics: DeviceMetrics,
    receivedAt: Date,
    transaction?: mssql.Transaction,
  ): Promise<void> {
    await this.ensureTable();
    try {
      const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
      await request
        .input('deviceId', mssql.NVarChar(100), normalizeDeviceId(deviceId))
        .input('latestMetricsJson', mssql.NVarChar(mssql.MAX), JSON.stringify(metrics))
        .input('receivedAt', mssql.DateTime2, receivedAt)
        .query(`
          UPDATE DeviceAgents
          SET LatestMetricsJson = @latestMetricsJson,
              LastSeenAt = @receivedAt,
              UpdatedAt = @receivedAt
          WHERE DeviceId = @deviceId
        `);
    } catch {
      // Safely ignore metrics update error if table is missing
    }
  }

  public async updateBoundUser(
    deviceId: string,
    boundUser: { userId?: string; username?: string; fullName?: string; boundAt?: Date } | null,
    transaction?: mssql.Transaction,
  ): Promise<void> {
    await this.ensureTable();
    try {
      const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
      await request
        .input('deviceId', mssql.NVarChar(100), normalizeDeviceId(deviceId))
        .input('currentUserId', mssql.NVarChar(100), boundUser?.userId || null)
        .input('currentUsername', mssql.NVarChar(255), boundUser?.username || null)
        .input('currentFullName', mssql.NVarChar(255), boundUser?.fullName || null)
        .input('boundAt', mssql.DateTime2, boundUser?.boundAt || null)
        .query(`
          UPDATE DeviceAgents
          SET CurrentUserId = @currentUserId,
              CurrentUsername = @currentUsername,
              CurrentFullName = @currentFullName,
              BoundAt = @boundAt,
              UpdatedAt = SYSUTCDATETIME()
          WHERE DeviceId = @deviceId
        `);
    } catch {
      // Safely ignore bound user update if columns missing
    }
  }

  public async deleteByDeviceId(deviceId: string, transaction?: mssql.Transaction): Promise<void> {
    await this.ensureTable();
    try {
      const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
      await request
        .input('deviceId', mssql.NVarChar(100), normalizeDeviceId(deviceId))
        .query('DELETE FROM DeviceAgents WHERE DeviceId = @deviceId');
    } catch {
      // Safely ignore delete error
    }
  }

  public async getAllMetrics(): Promise<Record<string, DeviceMetrics>> {
    await this.ensureTable();
    try {
      const pool = await SqlConnectionFactory.getPool();
      const result = await pool.request().query(`
        SELECT da.DeviceId, da.LatestMetricsJson
        FROM DeviceAgents da
        INNER JOIN Computers c ON c.Id = da.ComputerId
        WHERE c.DeletedAt IS NULL AND da.LatestMetricsJson IS NOT NULL
      `);

      const metrics: Record<string, DeviceMetrics> = {};
      for (const row of result.recordset) {
        try {
          metrics[String(row.DeviceId)] = JSON.parse(String(row.LatestMetricsJson)) as DeviceMetrics;
        } catch {
          // Skip a damaged snapshot
        }
      }
      return metrics;
    } catch {
      return {};
    }
  }

  private toDomain(row: any): DeviceAgentRecord {
    let latestMetrics: DeviceMetrics | undefined;
    if (row.LatestMetricsJson) {
      try {
        latestMetrics = JSON.parse(String(row.LatestMetricsJson)) as DeviceMetrics;
      } catch {
        latestMetrics = undefined;
      }
    }

    return {
      computerId: String(row.ComputerId),
      deviceId: String(row.DeviceId),
      apiKeyHash: String(row.ApiKeyHash),
      hostname: String(row.Hostname),
      agentUuid: row.AgentUuid || undefined,
      platform: row.Platform || undefined,
      architecture: row.Architecture || undefined,
      cpuCores: row.CpuCores === null || row.CpuCores === undefined ? undefined : Number(row.CpuCores),
      registeredAt: new Date(row.RegisteredAt),
      lastSeenAt: row.LastSeenAt ? new Date(row.LastSeenAt) : undefined,
      currentUserId: row.CurrentUserId ? String(row.CurrentUserId) : undefined,
      currentUsername: row.CurrentUsername ? String(row.CurrentUsername) : undefined,
      currentFullName: row.CurrentFullName ? String(row.CurrentFullName) : undefined,
      boundAt: row.BoundAt ? new Date(row.BoundAt) : undefined,
      latestMetrics,
    };
  }
}
