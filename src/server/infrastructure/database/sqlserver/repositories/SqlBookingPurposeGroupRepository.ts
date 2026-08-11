import mssql from 'mssql';
import { BookingPurposeGroup } from '../../../../domain/entities/BookingPurposeGroup';
import {
  BookingPurposeSuggestion,
  IBookingPurposeGroupRepository,
} from '../../../../domain/repositories/IBookingPurposeGroupRepository';
import { SqlConnectionFactory } from '../connection';

export class SqlBookingPurposeGroupRepository implements IBookingPurposeGroupRepository {
  public async findById(id: string): Promise<BookingPurposeGroup | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM BookingPurposeGroups WHERE Id = @id AND IsActive = 1');
    return result.recordset.length ? this.toDomain(result.recordset[0]) : null;
  }

  public async list(): Promise<BookingPurposeGroup[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT *
      FROM BookingPurposeGroups
      WHERE IsActive = 1
      ORDER BY Name ASC
    `);
    return result.recordset.map((row) => this.toDomain(row));
  }

  public async listSuggestions(): Promise<BookingPurposeSuggestion[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT
        CONVERT(NVARCHAR(36), groups.Id) AS Id,
        groups.Name,
        COUNT(bookings.Id) AS UsageCount,
        'GROUP' AS Source
      FROM BookingPurposeGroups groups
      LEFT JOIN BookingRequests bookings ON bookings.PurposeGroupId = groups.Id
      WHERE groups.IsActive = 1
      GROUP BY groups.Id, groups.Name

      UNION ALL

      SELECT
        CAST(NULL AS NVARCHAR(36)) AS Id,
        bookings.Purpose AS Name,
        COUNT(*) AS UsageCount,
        'LEGACY' AS Source
      FROM BookingRequests bookings
      WHERE bookings.PurposeGroupId IS NULL
        AND NULLIF(LTRIM(RTRIM(bookings.Purpose)), '') IS NOT NULL
      GROUP BY bookings.Purpose

      ORDER BY UsageCount DESC, Name ASC;
    `);
    return result.recordset.map((row) => ({
      id: row.Id ? String(row.Id) : null,
      name: String(row.Name),
      usageCount: Number(row.UsageCount || 0),
      source: row.Source === 'GROUP' ? 'GROUP' : 'LEGACY',
    }));
  }

  public async save(group: BookingPurposeGroup, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction
      ? new mssql.Request(transaction)
      : (await SqlConnectionFactory.getPool()).request();
    await request
      .input('id', mssql.UniqueIdentifier, group.id.toString())
      .input('code', mssql.NVarChar, group.code)
      .input('name', mssql.NVarChar, group.name)
      .input('normalizedKey', mssql.NVarChar, group.normalizedKey)
      .input('isActive', mssql.Bit, group.isActive)
      .input('updatedAt', mssql.DateTime2, group.updatedAt)
      .query(`
        MERGE INTO BookingPurposeGroups AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET Code = @code, Name = @name, NormalizedKey = @normalizedKey,
                     IsActive = @isActive, UpdatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (Id, Code, Name, NormalizedKey, IsActive, CreatedAt, UpdatedAt)
          VALUES (@id, @code, @name, @normalizedKey, @isActive, SYSUTCDATETIME(), @updatedAt);
      `);
  }

  public async softDelete(id: string): Promise<void> {
    const pool = await SqlConnectionFactory.getPool();
    await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query(`
        UPDATE BookingPurposeGroups SET IsActive = 0, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id;
        UPDATE BookingRequests SET PurposeGroupId = NULL WHERE PurposeGroupId = @id;
      `);
  }

  private toDomain(raw: any): BookingPurposeGroup {
    return BookingPurposeGroup.create({
      id: String(raw.Id),
      code: String(raw.Code),
      name: String(raw.Name),
      normalizedKey: String(raw.NormalizedKey),
      isActive: Boolean(raw.IsActive),
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt,
    });
  }
}
