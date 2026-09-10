import mssql from 'mssql';
import { IBookingRequestRepository } from '../../../../domain/repositories/IBookingRequestRepository';
import { BookingRequest, BookingType, BookingStatus } from '../../../../domain/entities/BookingRequest';
import { SqlConnectionFactory } from '../connection';

export class SqlBookingRequestRepository implements IBookingRequestRepository {
  public async lockAvailability(transaction: mssql.Transaction): Promise<void> {
    await new mssql.Request(transaction).query(`
      DECLARE @lockResult INT;
      EXEC @lockResult = sys.sp_getapplock @Resource = N'LabBookingApproval', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      IF @lockResult < 0 THROW 50001, N'Đang có lượt duyệt khác. Vui lòng thử lại.', 1;
    `);
  }
  public async findById(id: string, transaction?: mssql.Transaction): Promise<BookingRequest | null> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM BookingRequests WHERE Id = @id');

    if (result.recordset.length === 0) return null;
    return this.toDomain(result.recordset[0]);
  }

  public async findByRequestCode(code: string): Promise<BookingRequest | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('code', mssql.NVarChar, code)
      .query('SELECT * FROM BookingRequests WHERE RequestCode = @code');

    if (result.recordset.length === 0) return null;
    return this.toDomain(result.recordset[0]);
  }

  public async save(booking: BookingRequest, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(booking);

    await request
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('requestCode', mssql.NVarChar, raw.RequestCode)
      .input('requesterId', mssql.UniqueIdentifier, raw.RequesterId)
      .input('bookingType', mssql.NVarChar, raw.BookingType)
      .input('purpose', mssql.NVarChar, raw.Purpose)
      .input('purposeGroupId', mssql.UniqueIdentifier, raw.PurposeGroupId)
      .input('startTime', mssql.DateTime2, raw.StartTime)
      .input('endTime', mssql.DateTime2, raw.EndTime)
      .input('expectedReturnTime', mssql.DateTime2, raw.ExpectedReturnTime)
      .input('numberOfPeople', mssql.Int, raw.NumberOfPeople)
      .input('numberOfComputers', mssql.Int, raw.NumberOfComputers)
      .input('status', mssql.NVarChar, raw.Status)
      .input('approvedBy', mssql.UniqueIdentifier, raw.ApprovedBy)
      .input('approvedAt', mssql.DateTime2, raw.ApprovedAt)
      .input('rejectedReason', mssql.NVarChar, raw.RejectedReason)
      .input('cancelledBy', mssql.UniqueIdentifier, raw.CancelledBy)
      .input('cancelledAt', mssql.DateTime2, raw.CancelledAt)
      .input('cancellationReason', mssql.NVarChar, raw.CancellationReason)
      .input('isOverdue', mssql.Bit, raw.IsOverdue)
      .input('hasIncident', mssql.Bit, raw.HasIncident)
      .input('note', mssql.NVarChar, raw.Note)
      .query(`
        MERGE INTO BookingRequests AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET 
            RequestCode = @requestCode,
            RequesterId = @requesterId,
            BookingType = @bookingType,
            Purpose = @purpose,
            PurposeGroupId = @purposeGroupId,
            StartTime = @startTime,
            EndTime = @endTime,
            ExpectedReturnTime = @expectedReturnTime,
            NumberOfPeople = @numberOfPeople,
            NumberOfComputers = @numberOfComputers,
            Status = @status,
            ApprovedBy = @approvedBy,
            ApprovedAt = @approvedAt,
            RejectedReason = @rejectedReason,
            CancelledBy = @cancelledBy,
            CancelledAt = @cancelledAt,
            CancellationReason = @cancellationReason,
            IsOverdue = @isOverdue,
            HasIncident = @hasIncident,
            Note = @note,
            UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (Id, RequestCode, RequesterId, BookingType, Purpose, PurposeGroupId, StartTime, EndTime, ExpectedReturnTime, NumberOfPeople, NumberOfComputers, Status, ApprovedBy, ApprovedAt, RejectedReason, CancelledBy, CancelledAt, CancellationReason, IsOverdue, HasIncident, Note, CreatedAt, UpdatedAt)
          VALUES (@id, @requestCode, @requesterId, @bookingType, @purpose, @purposeGroupId, @startTime, @endTime, @expectedReturnTime, @numberOfPeople, @numberOfComputers, @status, @approvedBy, @approvedAt, @rejectedReason, @cancelledBy, @cancelledAt, @cancellationReason, @isOverdue, @hasIncident, @note, SYSUTCDATETIME(), SYSUTCDATETIME());
      `);
  }

  public async findPending(): Promise<BookingRequest[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query("SELECT * FROM BookingRequests WHERE Status = 'PENDING' ORDER BY CreatedAt DESC");
    return result.recordset.map(row => this.toDomain(row));
  }

  public async findByRequester(requesterId: string): Promise<BookingRequest[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('requesterId', mssql.UniqueIdentifier, requesterId)
      .query('SELECT * FROM BookingRequests WHERE RequesterId = @requesterId ORDER BY StartTime DESC');
    return result.recordset.map(row => this.toDomain(row));
  }

  public async findApprovedByDateRange(startDate: Date, endDate: Date): Promise<BookingRequest[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('start', mssql.DateTime2, startDate)
      .input('end', mssql.DateTime2, endDate)
      .query(`
        SELECT * FROM BookingRequests 
        WHERE Status IN ('APPROVED', 'CHECKED_IN', 'COMPLETED')
        AND StartTime < @end AND EndTime > @start
      `);
    return result.recordset.map(row => this.toDomain(row));
  }

  public async list(filter?: any): Promise<BookingRequest[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query('SELECT * FROM BookingRequests ORDER BY CreatedAt DESC');
    return result.recordset.map(row => this.toDomain(row));
  }

  private toDomain(raw: any): BookingRequest {
    return BookingRequest.create({
      id: raw.Id,
      requestCode: raw.RequestCode,
      requesterId: raw.RequesterId,
      bookingType: raw.BookingType as BookingType,
      purpose: raw.Purpose,
      purposeGroupId: raw.PurposeGroupId ? String(raw.PurposeGroupId) : null,
      startTime: raw.StartTime,
      endTime: raw.EndTime,
      expectedReturnTime: raw.ExpectedReturnTime,
      numberOfPeople: raw.NumberOfPeople,
      numberOfComputers: raw.NumberOfComputers,
      status: raw.Status as BookingStatus,
      approvedBy: raw.ApprovedBy,
      approvedAt: raw.ApprovedAt,
      rejectedReason: raw.RejectedReason,
      cancelledBy: raw.CancelledBy,
      cancelledAt: raw.CancelledAt,
      cancellationReason: raw.CancellationReason,
      isOverdue: raw.IsOverdue,
      hasIncident: raw.HasIncident,
      note: raw.Note,
      rowVersion: raw.RowVersion,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt
    });
  }

  private toPersistence(booking: BookingRequest): any {
    return {
      Id: booking.id.toString(),
      RequestCode: booking.requestCode,
      RequesterId: booking.requesterId,
      BookingType: booking.bookingType,
      Purpose: booking.purpose,
      PurposeGroupId: booking.purposeGroupId,
      StartTime: booking.startTime,
      EndTime: booking.endTime,
      ExpectedReturnTime: booking.expectedReturnTime,
      NumberOfPeople: booking.numberOfPeople,
      NumberOfComputers: booking.numberOfComputers,
      Status: booking.status,
      ApprovedBy: booking.approvedBy,
      ApprovedAt: booking.approvedAt,
      RejectedReason: booking.rejectedReason,
      CancelledBy: booking.cancelledBy,
      CancelledAt: booking.cancelledAt,
      CancellationReason: booking.cancellationReason,
      IsOverdue: booking.isOverdue,
      HasIncident: booking.hasIncident,
      Note: booking.note
    };
  }
}
