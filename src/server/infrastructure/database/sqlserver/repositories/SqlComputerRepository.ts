import mssql from 'mssql';
import { IComputerRepository, ComputerFilter } from '../../../../domain/repositories/IComputerRepository';
import { Computer } from '../../../../domain/entities/Computer';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { normalizeMacAddress, isValidMacAddress } from '../../../../shared/utils/deviceIdentity';
import { SqlConnectionFactory } from '../connection';

export class SqlComputerRepository implements IComputerRepository {
  public async findById(id: string, transaction?: mssql.Transaction): Promise<Computer | null> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('id', mssql.UniqueIdentifier, id)
      .query(transaction
        ? 'SELECT * FROM Computers WITH (UPDLOCK, HOLDLOCK) WHERE Id = @id AND DeletedAt IS NULL'
        : 'SELECT * FROM Computers WHERE Id = @id AND DeletedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findByCode(code: string): Promise<Computer | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('code', mssql.NVarChar, code.trim())
      .query('SELECT * FROM Computers WHERE Code = @code AND DeletedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findByMacAddress(macAddress: string): Promise<Computer | null> {
    if (!macAddress || !macAddress.trim()) return null;
    const pool = await SqlConnectionFactory.getPool();
    const rawMac = macAddress.trim();
    let normalizedMac = rawMac;
    if (isValidMacAddress(rawMac)) {
      normalizedMac = normalizeMacAddress(rawMac);
    }
    const cleanMacHex = normalizedMac.replace(/[:-]|\./g, '').toUpperCase();

    const result = await pool.request()
      .input('rawMac', mssql.NVarChar, rawMac)
      .input('normalizedMac', mssql.NVarChar, normalizedMac)
      .input('cleanMacHex', mssql.NVarChar, cleanMacHex)
      .query(`
        SELECT TOP 1 * FROM Computers 
        WHERE (
          MacAddress = @rawMac 
          OR MacAddress = @normalizedMac
          OR REPLACE(REPLACE(REPLACE(ISNULL(MacAddress, ''), ':', ''), '-', ''), '.', '') = @cleanMacHex
          OR REPLACE(REPLACE(REPLACE(ISNULL(MacAddress, ''), ':', ''), '-', ''), '.', '') = LOWER(@cleanMacHex)
        ) AND DeletedAt IS NULL
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findIncludingDeletedByMacAddress(macAddress: string): Promise<Computer | null> {
    if (!macAddress || !macAddress.trim()) return null;
    const pool = await SqlConnectionFactory.getPool();
    const rawMac = macAddress.trim();
    let normalizedMac = rawMac;
    if (isValidMacAddress(rawMac)) {
      normalizedMac = normalizeMacAddress(rawMac);
    }
    const cleanMacHex = normalizedMac.replace(/[:-]|\./g, '').toUpperCase();

    const result = await pool.request()
      .input('rawMac', mssql.NVarChar, rawMac)
      .input('normalizedMac', mssql.NVarChar, normalizedMac)
      .input('cleanMacHex', mssql.NVarChar, cleanMacHex)
      .query(`
        SELECT TOP 1 * FROM Computers 
        WHERE (
          MacAddress = @rawMac 
          OR MacAddress = @normalizedMac
          OR REPLACE(REPLACE(REPLACE(ISNULL(MacAddress, ''), ':', ''), '-', ''), '.', '') = @cleanMacHex
          OR REPLACE(REPLACE(REPLACE(ISNULL(MacAddress, ''), ':', ''), '-', ''), '.', '') = LOWER(@cleanMacHex)
        )
        ORDER BY CreatedAt DESC
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async findAnyMatching(identifier: string): Promise<Computer | null> {
    if (!identifier || !identifier.trim()) {
      return null;
    }

    const clean = identifier.trim();
    let normalized = clean;
    if (isValidMacAddress(clean)) {
      normalized = normalizeMacAddress(clean);
    }
    const cleanMacHex = normalized.replace(/[:-]|\./g, '').toUpperCase();

    try {
      const pool = await SqlConnectionFactory.getPool();
      const result = await pool.request()
        .input('clean', mssql.NVarChar, clean)
        .input('normalized', mssql.NVarChar, normalized)
        .input('cleanMacHex', mssql.NVarChar, cleanMacHex)
        .query(`
          SELECT TOP 1 * FROM Computers
          WHERE (
            Code = @clean
            OR Name = @clean
            OR Code = @normalized
            OR MacAddress = @clean
            OR MacAddress = @normalized
            OR IpAddress = @clean
            OR REPLACE(REPLACE(REPLACE(ISNULL(MacAddress, ''), ':', ''), '-', ''), '.', '') = @cleanMacHex
          ) AND DeletedAt IS NULL
          ORDER BY UpdatedAt DESC
        `);

      if (result.recordset[0]) {
        return this.toDomain(result.recordset[0]);
      }

      return null;
    } catch {
      return null;
    }
  }

  public async list(filter: ComputerFilter): Promise<{ data: Computer[]; total: number }> {
    const pool = await SqlConnectionFactory.getPool();

    try {
      await pool.request().query(`
        UPDATE cal
        SET cal.EndedAt = SYSUTCDATETIME(), cal.UpdatedAt = SYSUTCDATETIME()
        FROM ComputerActivityLogs cal
        INNER JOIN Computers c ON c.Id = cal.ComputerId
        LEFT JOIN DeviceAgents da ON da.ComputerId = c.Id
        WHERE c.Status = 'IN_USE'
          AND cal.EndedAt IS NULL
          AND (da.LastSeenAt IS NULL OR DATEDIFF(SECOND, da.LastSeenAt, SYSUTCDATETIME()) >= 30)
          AND c.DeletedAt IS NULL;

        UPDATE da
        SET da.CurrentUserId = NULL, da.CurrentUsername = NULL, da.CurrentFullName = NULL, da.BoundAt = NULL, da.UpdatedAt = SYSUTCDATETIME()
        FROM DeviceAgents da
        INNER JOIN Computers c ON c.Id = da.ComputerId
        WHERE c.Status = 'IN_USE'
          AND (da.LastSeenAt IS NULL OR DATEDIFF(SECOND, da.LastSeenAt, SYSUTCDATETIME()) >= 30)
          AND c.DeletedAt IS NULL;

        UPDATE c
        SET c.Status = 'ACTIVE', c.Note = N'Sẵn sàng sử dụng. (Tự động kết thúc phiên do quá 30 giây không nhận được metrics)', c.UpdatedAt = SYSUTCDATETIME()
        FROM Computers c
        LEFT JOIN DeviceAgents da ON da.ComputerId = c.Id
        WHERE c.Status = 'IN_USE'
          AND (da.LastSeenAt IS NULL OR DATEDIFF(SECOND, da.LastSeenAt, SYSUTCDATETIME()) >= 30)
          AND c.DeletedAt IS NULL;
      `);
    } catch {
      // Fallback: nếu bảng DeviceAgents/ComputerActivityLogs chưa tồn tại
      try {
        await pool.request().query(`
          UPDATE Computers
          SET Status = 'ACTIVE', Note = N'Sẵn sàng sử dụng.', UpdatedAt = SYSUTCDATETIME()
          WHERE Status = 'IN_USE' AND DeletedAt IS NULL
        `);
      } catch { /* ignore */ }
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 10;
    const offset = (page - 1) * pageSize;

    let queryWhere = 'DeletedAt IS NULL';
    const request = pool.request();

    if (filter.status) {
      queryWhere += ' AND Status = @status';
      request.input('status', mssql.NVarChar, filter.status);
    }

    if (filter.position) {
      queryWhere += ' AND Position = @position';
      request.input('position', mssql.NVarChar, filter.position);
    }

    if (filter.keyword) {
      queryWhere += ' AND (Code LIKE @keyword OR Name LIKE @keyword OR IpAddress LIKE @keyword OR MacAddress LIKE @keyword)';
      request.input('keyword', mssql.NVarChar, `%${filter.keyword}%`);
    }

    const countResult = await request.query(`SELECT COUNT(*) as Total FROM Computers WHERE ${queryWhere}`);
    const total = countResult.recordset[0].Total;

    request.input('offset', mssql.Int, offset);
    request.input('limit', mssql.Int, pageSize);

    const dataResult = await request.query(`
      SELECT * FROM Computers 
      WHERE ${queryWhere}
      ORDER BY Code ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const data = dataResult.recordset.map(row => this.toDomain(row));
    return { data, total };
  }

  public async countActive(): Promise<number> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .query("SELECT COUNT(*) as Total FROM Computers WHERE Status = 'ACTIVE' AND DeletedAt IS NULL");
    return result.recordset[0].Total;
  }

  public async listMaintenanceCandidates(cutoffDate: Date): Promise<Computer[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('cutoffDate', mssql.DateTime2, cutoffDate)
      .query(`
        SELECT *
        FROM Computers
        WHERE DeletedAt IS NULL
          AND (
            Status IN ('BROKEN', 'MAINTENANCE')
            OR (Status <> 'MAINTENANCE' AND COALESCE(LastMaintenanceDate, CreatedAt) <= @cutoffDate)
          )
        ORDER BY COALESCE(LastMaintenanceDate, CreatedAt), Code
      `);
    return result.recordset.map((row) => this.toDomain(row));
  }

  public async save(computer: Computer, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(computer);

    await connection
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('code', mssql.NVarChar, raw.Code)
      .input('name', mssql.NVarChar, raw.Name)
      .input('cpu', mssql.NVarChar, raw.Cpu)
      .input('ram', mssql.NVarChar, raw.Ram)
      .input('storage', mssql.NVarChar, raw.Storage)
      .input('gpu', mssql.NVarChar, raw.Gpu)
      .input('operatingSystem', mssql.NVarChar, raw.OperatingSystem)
      .input('installedSoftware', mssql.NVarChar, raw.InstalledSoftware)
      .input('ipAddress', mssql.NVarChar, raw.IpAddress)
      .input('macAddress', mssql.NVarChar, raw.MacAddress)
      .input('position', mssql.NVarChar, raw.Position)
      .input('status', mssql.NVarChar, raw.Status)
      .input('note', mssql.NVarChar, raw.Note)
      .input('lastMaintenanceDate', mssql.DateTime2, raw.LastMaintenanceDate)
      .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
      .input('deletedAt', mssql.DateTime2, raw.DeletedAt)
      .query(`
        MERGE INTO Computers AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET 
            Code = @code,
            Name = @name,
            Cpu = @cpu,
            Ram = @ram,
            Storage = @storage,
            Gpu = @gpu,
            OperatingSystem = @operatingSystem,
            InstalledSoftware = @installedSoftware,
            IpAddress = @ipAddress,
            MacAddress = @macAddress,
            Position = @position,
            Status = @status,
            Note = @note,
            LastMaintenanceDate = @lastMaintenanceDate,
            UpdatedAt = @updatedAt,
            DeletedAt = @deletedAt
        WHEN NOT MATCHED THEN
          INSERT (Id, Code, Name, Cpu, Ram, Storage, Gpu, OperatingSystem, InstalledSoftware, IpAddress, MacAddress, Position, Status, Note, LastMaintenanceDate, DeletedAt)
          VALUES (@id, @code, @name, @cpu, @ram, @storage, @gpu, @operatingSystem, @installedSoftware, @ipAddress, @macAddress, @position, @status, @note, @lastMaintenanceDate, @deletedAt);
      `);
  }

  private toDomain(raw: any): Computer {
    return Computer.create({
      code: raw.Code,
      name: raw.Name,
      cpu: raw.Cpu || undefined,
      ram: raw.Ram || undefined,
      storage: raw.Storage || undefined,
      gpu: raw.Gpu || undefined,
      operatingSystem: raw.OperatingSystem || undefined,
      installedSoftware: raw.InstalledSoftware || undefined,
      ipAddress: raw.IpAddress || undefined,
      macAddress: raw.MacAddress || undefined,
      position: raw.Position || undefined,
      status: raw.Status,
      note: raw.Note || undefined,
      lastMaintenanceDate: raw.LastMaintenanceDate || undefined,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt,
      deletedAt: raw.DeletedAt || undefined,
    }, new UniqueEntityId(raw.Id));
  }

  private toPersistence(computer: Computer): any {
    return {
      Id: computer.id.toString(),
      Code: computer.code,
      Name: computer.name,
      Cpu: computer.cpu || null,
      Ram: computer.ram || null,
      Storage: computer.storage || null,
      Gpu: computer.gpu || null,
      OperatingSystem: computer.operatingSystem || null,
      InstalledSoftware: computer.installedSoftware || null,
      IpAddress: computer.ipAddress || null,
      MacAddress: computer.macAddress || null,
      Position: computer.position || null,
      Status: computer.status,
      Note: computer.note || null,
      LastMaintenanceDate: computer.lastMaintenanceDate || null,
      UpdatedAt: new Date(),
      DeletedAt: computer.deletedAt || null
    };
  }
}
