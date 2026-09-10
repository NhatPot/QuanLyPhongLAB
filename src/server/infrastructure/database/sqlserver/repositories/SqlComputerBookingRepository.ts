import mssql from "mssql";
import {
  IComputerBookingRepository,
  BookingComputerItem,
  BookableComputer,
  ComputerBookingHistory,
} from "../../../../domain/repositories/IComputerBookingRepository";
import { SqlConnectionFactory } from "../connection";

export class SqlComputerBookingRepository implements IComputerBookingRepository {
  async listAvailability(
    start: Date,
    end: Date,
    excludeBookingId?: string,
    transaction?: mssql.Transaction,
  ): Promise<BookableComputer[]> {
    const request = transaction
      ? new mssql.Request(transaction)
      : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input("start", mssql.DateTime2, start)
      .input("end", mssql.DateTime2, end)
      .input("exclude", mssql.UniqueIdentifier, excludeBookingId || null)
      .query(`
      SELECT c.Id, c.Code, c.Name, c.Position, c.Status,
        CAST(CASE WHEN c.Status = 'ACTIVE' AND NOT EXISTS (
          SELECT 1 FROM dbo.BookingRequests b
          WHERE b.Id <> COALESCE(@exclude, '00000000-0000-0000-0000-000000000000')
            AND b.Status IN ('APPROVED', 'CHECKED_IN')
            AND b.StartTime < @end AND (b.EndTime > @start OR b.Status = 'CHECKED_IN')
            AND (b.BookingType = 'FULL_LAB' OR EXISTS (
              SELECT 1 FROM dbo.BookingComputerItems i WHERE i.BookingRequestId = b.Id AND i.ComputerId = c.Id
            ))
        ) THEN 1 ELSE 0 END AS bit) AS Available
      FROM dbo.Computers c WHERE c.DeletedAt IS NULL ORDER BY c.Code;
    `);
    return result.recordset.map((r) => ({
      id: String(r.Id),
      code: r.Code,
      name: r.Name,
      position: r.Position,
      status: r.Status,
      available: Boolean(r.Available),
    }));
  }

  async findByBooking(
    bookingId: string,
    transaction?: mssql.Transaction,
  ): Promise<BookingComputerItem[]> {
    const request = transaction
      ? new mssql.Request(transaction)
      : (await SqlConnectionFactory.getPool()).request();
    const r = await request
      .input("bookingId", mssql.UniqueIdentifier, bookingId)
      .query(
        "SELECT * FROM dbo.BookingComputerItems WHERE BookingRequestId = @bookingId ORDER BY ComputerCode",
      );
    return r.recordset.map(toItem);
  }

  async saveSelection(
    bookingId: string,
    computerIds: string[],
    requesterId: string,
    createdBy: string,
    transaction: mssql.Transaction,
  ): Promise<void> {
    for (const computerId of computerIds) {
      const r = await new mssql.Request(transaction)
        .input("bookingId", mssql.UniqueIdentifier, bookingId)
        .input("computerId", mssql.UniqueIdentifier, computerId)
        .input("requesterId", mssql.UniqueIdentifier, requesterId)
        .input("createdBy", mssql.UniqueIdentifier, createdBy)
        .query(`INSERT INTO dbo.BookingComputerItems
          (BookingRequestId, ComputerId, ComputerCode, ComputerName, RequesterId, RequesterName, RequesterUsername, RequesterEmail, CreatedBy)
          SELECT @bookingId, c.Id, c.Code, c.Name, u.Id, u.FullName, u.Username, u.Email, @createdBy
          FROM dbo.Computers c CROSS JOIN dbo.Users u
          WHERE c.Id = @computerId AND c.DeletedAt IS NULL AND u.Id = @requesterId;`);
      if (r.rowsAffected[0] !== 1)
        throw new Error("Không thể lưu thông tin máy và người đăng ký.");
    }
  }

  async recordReceipt(
    bookingId: string,
    at: Date,
    transaction: mssql.Transaction,
  ): Promise<void> {
    await new mssql.Request(transaction)
      .input("id", mssql.UniqueIdentifier, bookingId)
      .input("at", mssql.DateTime2, at)
      .query(
        "UPDATE dbo.BookingComputerItems SET ReceivedAt = @at WHERE BookingRequestId = @id AND ReceivedAt IS NULL",
      );
  }

  async recordReturn(
    bookingId: string,
    at: Date,
    transaction: mssql.Transaction,
  ): Promise<void> {
    await new mssql.Request(transaction)
      .input("id", mssql.UniqueIdentifier, bookingId)
      .input("at", mssql.DateTime2, at)
      .query(
        "UPDATE dbo.BookingComputerItems SET ReturnedAt = @at WHERE BookingRequestId = @id AND ReceivedAt IS NOT NULL AND ReturnedAt IS NULL",
      );
  }

  async history(
    computerId: string,
    page: number,
  ): Promise<{ data: ComputerBookingHistory[]; total: number }> {
    const r = await (
      await SqlConnectionFactory.getPool()
    )
      .request()
      .input("id", mssql.UniqueIdentifier, computerId)
      .input("offset", mssql.Int, (page - 1) * 20)
      .query(`SELECT COUNT(*) AS Total FROM dbo.BookingComputerItems WHERE ComputerId = @id;
        SELECT i.*, b.RequestCode, b.Status, b.StartTime, b.EndTime, b.Purpose,
          l.InitialCondition, l.ReturnCondition, ci.FullName AS CheckedInByName, co.FullName AS CheckedOutByName
        FROM dbo.BookingComputerItems i JOIN dbo.BookingRequests b ON b.Id = i.BookingRequestId
        OUTER APPLY (SELECT TOP 1 * FROM dbo.CheckInOutLogs WHERE BookingRequestId = b.Id ORDER BY CheckInTime DESC) l
        LEFT JOIN dbo.Users ci ON ci.Id = l.CheckedInBy
        LEFT JOIN dbo.Users co ON co.Id = l.CheckedOutBy
        WHERE i.ComputerId = @id ORDER BY b.StartTime DESC, i.BookingRequestId
        OFFSET @offset ROWS FETCH NEXT 20 ROWS ONLY;`);
    const sets = r.recordsets as mssql.IRecordSet<any>[];
    return {
      total: sets[0][0].Total,
      data: sets[1].map((row) => ({
        ...toItem(row),
        bookingId: String(row.BookingRequestId),
        requestCode: row.RequestCode,
        status: row.Status,
        startTime: row.StartTime,
        endTime: row.EndTime,
        purpose: row.Purpose,
        initialCondition: row.InitialCondition,
        returnCondition: row.ReturnCondition,
        checkedInByName: row.CheckedInByName,
        checkedOutByName: row.CheckedOutByName,
      })),
    };
  }
}

function toItem(row: any): BookingComputerItem {
  return {
    computerId: String(row.ComputerId),
    computerCode: row.ComputerCode,
    computerName: row.ComputerName,
    requesterId: String(row.RequesterId),
    requesterName: row.RequesterName,
    requesterUsername: row.RequesterUsername,
    requesterEmail: row.RequesterEmail,
    receivedAt: row.ReceivedAt || null,
    returnedAt: row.ReturnedAt || null,
  };
}
