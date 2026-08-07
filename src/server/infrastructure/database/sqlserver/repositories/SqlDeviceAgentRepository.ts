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
  public async findByApiKeyHash(apiKeyHash: string): Promise<DeviceAgentRecord | null> {
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
  }

  public async findByDeviceId(deviceId: string): Promise<DeviceAgentRecord | null> {
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
  }

  public async upsertRegistration(input: RegisterDeviceAgentInput, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await request
      .input('computerId', mssql.UniqueIdentifier, input.computerId)
      .input('deviceId', mssql.NVarChar(100), normalizeDeviceId(input.deviceId))
      .input('apiKeyHash', mssql.VarChar(64), input.apiKeyHash)
      .input('hostname', mssql.NVarChar(255), input.hostname.trim())
      .input('agentUuid', mssql.NVarChar(100), input.agentUuid?.trim() || null)
      .input('platform', mssql.NVarChar(100), input.platform?.trim() || null)
      .input('architecture', mssql.NVarChar(100), input.architecture?.trim() || null)
      .input('cpuCores', mssql.Int, input.cpuCores ?? null)
      .input('registeredAt', mssql.DateTime2, input.registeredAt)
      .query(`
        MERGE INTO DeviceAgents WITH (HOLDLOCK) AS target
        USING (SELECT @computerId AS ComputerId) AS source
        ON target.ComputerId = source.ComputerId
        WHEN MATCHED THEN UPDATE SET
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
  }

  public async updateMetrics(
    deviceId: string,
    metrics: DeviceMetrics,
    receivedAt: Date,
    transaction?: mssql.Transaction,
  ): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
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

    if ((result.rowsAffected[0] || 0) === 0) {
      throw new Error('Thiết bị chưa được đăng ký hoặc API key không còn hiệu lực.');
    }
  }

  public async getAllMetrics(): Promise<Record<string, DeviceMetrics>> {
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
      latestMetrics,
    };
  }
}
