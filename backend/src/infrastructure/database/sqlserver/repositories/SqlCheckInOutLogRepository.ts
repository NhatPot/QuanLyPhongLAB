import mssql from 'mssql';
import {
  CheckInInput,
  CheckInOutLog,
  CheckOutInput,
  ICheckInOutLogRepository,
  LabUsageSession,
} from '../../../../domain/repositories/ICheckInOutLogRepository';
import { SqlConnectionFactory } from '../connection';

export class SqlCheckInOutLogRepository implements ICheckInOutLogRepository {
  public async checkIn(input: CheckInInput, transaction?: mssql.Transaction): Promise<CheckInOutLog> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('bookingRequestId', mssql.UniqueIdentifier, input.bookingRequestId)
      .input('checkedInBy', mssql.UniqueIdentifier, input.checkedInBy)
      .input('actualPeopleCount', mssql.Int, input.actualPeopleCount)
      .input('actualComputerCount', mssql.Int, input.actualComputerCount)
      .input('initialCondition', mssql.NVarChar, input.initialCondition || null)
      .input('note', mssql.NVarChar, input.note || null)
      .query(`
        IF EXISTS (SELECT 1 FROM CheckInOutLogs WHERE BookingRequestId = @bookingRequestId AND CheckInTime IS NOT NULL)
        BEGIN
          THROW 50001, N'Booking này đã được check-in.', 1;
        END;

        INSERT INTO CheckInOutLogs (
          BookingRequestId, CheckInTime, CheckedInBy, ActualPeopleCount,
          ActualComputerCount, InitialCondition, Note, CreatedAt, UpdatedAt
        )
        VALUES (
          @bookingRequestId, SYSUTCDATETIME(), @checkedInBy, @actualPeopleCount,
          @actualComputerCount, @initialCondition, @note, SYSUTCDATETIME(), SYSUTCDATETIME()
        );

        SELECT * FROM CheckInOutLogs WHERE BookingRequestId = @bookingRequestId;
      `);
    return this.toLog(result.recordset[0]);
  }

  public async checkOut(input: CheckOutInput, transaction?: mssql.Transaction): Promise<CheckInOutLog> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('bookingRequestId', mssql.UniqueIdentifier, input.bookingRequestId)
      .input('checkedOutBy', mssql.UniqueIdentifier, input.checkedOutBy)
      .input('returnCondition', mssql.NVarChar, input.returnCondition || null)
      .input('note', mssql.NVarChar, input.note || null)
      .query(`
        UPDATE CheckInOutLogs
        SET
          CheckOutTime = SYSUTCDATETIME(),
          CheckedOutBy = @checkedOutBy,
          ReturnCondition = COALESCE(@returnCondition, ReturnCondition),
          Note = COALESCE(@note, Note),
          UpdatedAt = SYSUTCDATETIME()
        WHERE BookingRequestId = @bookingRequestId
          AND CheckInTime IS NOT NULL
          AND CheckOutTime IS NULL;

        IF @@ROWCOUNT = 0
        BEGIN
          THROW 50002, N'Không tìm thấy phiên check-in đang hoạt động cho booking này.', 1;
        END;

        SELECT * FROM CheckInOutLogs WHERE BookingRequestId = @bookingRequestId;
      `);
    return this.toLog(result.recordset[0]);
  }

  public async findUsageSessions(start: Date, end: Date): Promise<LabUsageSession[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('start', mssql.DateTime2, start)
      .input('end', mssql.DateTime2, end)
      .query(`
        SELECT
          logs.BookingRequestId,
          logs.CheckInTime,
          logs.CheckOutTime,
          logs.CheckedInBy,
          logs.CheckedOutBy,
          logs.ActualPeopleCount,
          logs.ActualComputerCount,
          logs.InitialCondition,
          logs.ReturnCondition,
          logs.Note,
          booking.RequestCode,
          booking.Purpose,
          booking.BookingType,
          booking.NumberOfPeople AS RequestedPeopleCount,
          booking.NumberOfComputers AS RequestedComputerCount
        FROM CheckInOutLogs logs
        INNER JOIN BookingRequests booking ON booking.Id = logs.BookingRequestId
        WHERE logs.CheckInTime IS NOT NULL
          AND logs.CheckInTime < @end
          AND COALESCE(logs.CheckOutTime, SYSUTCDATETIME()) > @start
        ORDER BY logs.CheckInTime ASC;
      `);
    return result.recordset.map((row) => this.toUsageSession(row));
  }

  private toLog(row: any): CheckInOutLog {
    return {
      bookingRequestId: String(row.BookingRequestId),
      checkInTime: row.CheckInTime ? new Date(row.CheckInTime) : null,
      checkOutTime: row.CheckOutTime ? new Date(row.CheckOutTime) : null,
      checkedInBy: row.CheckedInBy ? String(row.CheckedInBy) : null,
      checkedOutBy: row.CheckedOutBy ? String(row.CheckedOutBy) : null,
      actualPeopleCount: row.ActualPeopleCount === null || row.ActualPeopleCount === undefined ? null : Number(row.ActualPeopleCount),
      actualComputerCount: row.ActualComputerCount === null || row.ActualComputerCount === undefined ? null : Number(row.ActualComputerCount),
      initialCondition: row.InitialCondition || null,
      returnCondition: row.ReturnCondition || null,
      note: row.Note || null,
    };
  }

  private toUsageSession(row: any): LabUsageSession {
    return {
      ...this.toLog(row),
      requestCode: String(row.RequestCode),
      purpose: String(row.Purpose),
      bookingType: String(row.BookingType),
      requestedPeopleCount: Number(row.RequestedPeopleCount || 0),
      requestedComputerCount: Number(row.RequestedComputerCount || 0),
    };
  }
}
