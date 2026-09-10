import mssql from 'mssql';
import {
  ComputerActivityRecord,
  ComputerActivityTransitionInput,
  IComputerActivityRepository,
} from '../../../../domain/repositories/IComputerActivityRepository';
import { SqlConnectionFactory } from '../connection';

const detailSelect = `
  SELECT
    activity.Id,
    activity.ComputerId,
    computer.Code AS ComputerCode,
    computer.Name AS ComputerName,
    activity.ActivityType,
    activity.StartedAt,
    activity.EndedAt,
    activity.BookingRequestId,
    booking.RequestCode AS BookingRequestCode,
    booking.Purpose AS BookingPurpose,
    requester.FullName AS RequesterName,
    activity.MaintenanceScheduleId,
    maintenance.Code AS MaintenanceCode,
    activity.PerformedBy,
    actor.FullName AS PerformedByName,
    activity.Note
  FROM ComputerActivityLogs activity
  INNER JOIN Computers computer ON computer.Id = activity.ComputerId
  LEFT JOIN BookingRequests booking ON booking.Id = activity.BookingRequestId
  LEFT JOIN Users requester ON requester.Id = booking.RequesterId
  LEFT JOIN MaintenanceSchedules maintenance ON maintenance.Id = activity.MaintenanceScheduleId
  LEFT JOIN Users actor ON actor.Id = activity.PerformedBy
`;

export class SqlComputerActivityRepository implements IComputerActivityRepository {
  public async closeUsageByBooking(bookingId: string, occurredAt: Date, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await request.input('bookingId', mssql.UniqueIdentifier, bookingId).input('at', mssql.DateTime2, occurredAt)
      .query("UPDATE ComputerActivityLogs SET EndedAt = @at, UpdatedAt = SYSUTCDATETIME() WHERE BookingRequestId = @bookingId AND ActivityType = 'IN_USE' AND EndedAt IS NULL");
  }
  public async transition(input: ComputerActivityTransitionInput, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await request
      .input('computerId', mssql.UniqueIdentifier, input.computerId)
      .input('activityType', mssql.NVarChar, input.activityType)
      .input('occurredAt', mssql.DateTime2, input.occurredAt)
      .input('bookingRequestId', mssql.UniqueIdentifier, input.bookingRequestId || null)
      .input('maintenanceScheduleId', mssql.UniqueIdentifier, input.maintenanceScheduleId || null)
      .input('performedBy', mssql.UniqueIdentifier, input.performedBy || null)
      .input('note', mssql.NVarChar, input.note || null)
      .query(`
        UPDATE ComputerActivityLogs
        SET EndedAt = @occurredAt, UpdatedAt = SYSUTCDATETIME()
        WHERE ComputerId = @computerId AND EndedAt IS NULL;

        INSERT INTO ComputerActivityLogs (
          ComputerId, ActivityType, StartedAt, BookingRequestId,
          MaintenanceScheduleId, PerformedBy, Note
        )
        VALUES (
          @computerId, @activityType, @occurredAt, @bookingRequestId,
          @maintenanceScheduleId, @performedBy, @note
        );
      `);
  }

  public async closeCurrent(computerId: string, occurredAt: Date, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await request
      .input('computerId', mssql.UniqueIdentifier, computerId)
      .input('occurredAt', mssql.DateTime2, occurredAt)
      .query(`
        UPDATE ComputerActivityLogs
        SET EndedAt = @occurredAt, UpdatedAt = SYSUTCDATETIME()
        WHERE ComputerId = @computerId AND EndedAt IS NULL;
      `);
  }

  public async findActiveUsageByBooking(bookingRequestId: string): Promise<ComputerActivityRecord[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('bookingRequestId', mssql.UniqueIdentifier, bookingRequestId)
      .query(`${detailSelect}
        WHERE activity.BookingRequestId = @bookingRequestId
          AND activity.ActivityType = 'IN_USE'
          AND activity.EndedAt IS NULL
        ORDER BY computer.Code;
      `);
    return result.recordset.map(toRecord);
  }

  public async findActivities(start: Date, end: Date): Promise<ComputerActivityRecord[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('start', mssql.DateTime2, start)
      .input('end', mssql.DateTime2, end)
      .query(`${detailSelect}
        WHERE activity.StartedAt < @end
          AND COALESCE(activity.EndedAt, SYSUTCDATETIME()) > @start
        ORDER BY activity.StartedAt, computer.Code;
      `);
    return result.recordset.map(toRecord);
  }

  public async findCurrentActivities(): Promise<ComputerActivityRecord[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`${detailSelect}
      WHERE activity.EndedAt IS NULL
      ORDER BY computer.Code;
    `);
    return result.recordset.map(toRecord);
  }
}

function toRecord(row: any): ComputerActivityRecord {
  return {
    id: String(row.Id),
    computerId: String(row.ComputerId),
    computerCode: String(row.ComputerCode),
    computerName: String(row.ComputerName),
    activityType: row.ActivityType,
    startedAt: new Date(row.StartedAt),
    endedAt: row.EndedAt ? new Date(row.EndedAt) : null,
    bookingRequestId: row.BookingRequestId ? String(row.BookingRequestId) : null,
    bookingRequestCode: row.BookingRequestCode ? String(row.BookingRequestCode) : null,
    bookingPurpose: row.BookingPurpose ? String(row.BookingPurpose) : null,
    requesterName: row.RequesterName ? String(row.RequesterName) : null,
    maintenanceScheduleId: row.MaintenanceScheduleId ? String(row.MaintenanceScheduleId) : null,
    maintenanceCode: row.MaintenanceCode ? String(row.MaintenanceCode) : null,
    performedBy: row.PerformedBy ? String(row.PerformedBy) : null,
    performedByName: row.PerformedByName ? String(row.PerformedByName) : null,
    note: row.Note ? String(row.Note) : null,
  };
}
