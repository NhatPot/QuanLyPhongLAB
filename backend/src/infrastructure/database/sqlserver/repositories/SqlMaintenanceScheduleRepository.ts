import mssql from 'mssql';
import {
  MaintenanceSchedule,
  MaintenanceSource,
  MaintenanceStatus,
  MaintenanceTargetType,
  MaintenanceOutcome,
  MaintenanceTriggerSource,
} from '../../../../domain/entities/MaintenanceSchedule';
import {
  IMaintenanceScheduleRepository,
  MaintenanceDetail,
  MaintenanceListFilters,
  MaintenanceOptions,
  MaintenanceSummary,
} from '../../../../domain/repositories/IMaintenanceScheduleRepository';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

const detailSelect = `
  SELECT m.*, technician.FullName AS TechnicianName, technician.Username AS TechnicianUsername,
         creator.FullName AS CreatedByName
  FROM MaintenanceSchedules m
  LEFT JOIN Users technician ON technician.Id = m.TechnicianId
  LEFT JOIN Users creator ON creator.Id = m.CreatedBy
`;

export class SqlMaintenanceScheduleRepository implements IMaintenanceScheduleRepository {
  public async findById(id: string, transaction?: mssql.Transaction): Promise<MaintenanceSchedule | null> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM MaintenanceSchedules WHERE Id = @id AND DeletedAt IS NULL');
    return result.recordset[0] ? this.toDomain(result.recordset[0]) : null;
  }

  public async getDetailById(id: string): Promise<MaintenanceDetail | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query(`${detailSelect} WHERE m.Id = @id AND m.DeletedAt IS NULL`);
    return result.recordset[0] ? this.toDetail(result.recordset[0]) : null;
  }

  public async list(filters: MaintenanceListFilters): Promise<{ data: MaintenanceDetail[]; total: number }> {
    const pool = await SqlConnectionFactory.getPool();
    const keyword = filters.keyword?.trim() || null;
    const status = filters.status || null;
    const targetType = filters.targetType || null;
    const technicianId = filters.technicianId || null;
    const fromDate = filters.fromDate || null;
    const toDate = filters.toDate || null;
    const where = `
      m.DeletedAt IS NULL
      AND (@keyword IS NULL OR m.Code LIKE '%' + @keyword + '%' OR m.Title LIKE '%' + @keyword + '%'
           OR m.TargetCode LIKE '%' + @keyword + '%' OR m.TargetName LIKE '%' + @keyword + '%')
      AND (@status IS NULL OR m.Status = @status)
      AND (@targetType IS NULL OR m.TargetType = @targetType)
      AND (@technicianId IS NULL OR m.TechnicianId = @technicianId)
      AND (@fromDate IS NULL OR m.ExpectedEndAt >= @fromDate)
      AND (@toDate IS NULL OR m.ScheduledStartAt <= @toDate)
    `;

    const countRequest = this.bindListInputs(pool.request(), { keyword, status, targetType, technicianId, fromDate, toDate });
    const countResult = await countRequest.query(`SELECT COUNT(*) AS Total FROM MaintenanceSchedules m WHERE ${where}`);

    const page = Math.max(1, filters.page);
    const pageSize = Math.max(1, filters.pageSize);
    const offset = (page - 1) * pageSize;
    const listRequest = this.bindListInputs(pool.request(), { keyword, status, targetType, technicianId, fromDate, toDate })
      .input('offset', mssql.Int, offset)
      .input('pageSize', mssql.Int, pageSize);
    const listResult = await listRequest.query(`
      ${detailSelect}
      WHERE ${where}
      ORDER BY
        CASE m.Status WHEN 'PENDING' THEN 0 WHEN 'IN_PROGRESS' THEN 1 WHEN 'SCHEDULED' THEN 2 WHEN 'COMPLETED' THEN 3 ELSE 4 END,
        m.ScheduledStartAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      data: listResult.recordset.map((row) => this.toDetail(row)),
      total: Number(countResult.recordset[0]?.Total || 0),
    };
  }

  public async getSummary(): Promise<MaintenanceSummary> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT
        COUNT(*) AS Total,
        SUM(CASE WHEN Status = 'PENDING' THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN Status = 'SCHEDULED' THEN 1 ELSE 0 END) AS Scheduled,
        SUM(CASE WHEN Status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS InProgress,
        SUM(CASE WHEN Status = 'COMPLETED' THEN 1 ELSE 0 END) AS Completed,
        SUM(CASE WHEN Status = 'CANCELLED' THEN 1 ELSE 0 END) AS Cancelled,
        SUM(CASE WHEN Status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS') AND ExpectedEndAt < SYSUTCDATETIME() THEN 1 ELSE 0 END) AS Overdue,
        SUM(CASE WHEN Status = 'COMPLETED' THEN ISNULL(ActualCost, 0) ELSE 0 END) AS TotalActualCost
      FROM MaintenanceSchedules
      WHERE DeletedAt IS NULL
    `);
    const row = result.recordset[0] || {};
    return {
      total: Number(row.Total || 0),
      pending: Number(row.Pending || 0),
      scheduled: Number(row.Scheduled || 0),
      inProgress: Number(row.InProgress || 0),
      completed: Number(row.Completed || 0),
      cancelled: Number(row.Cancelled || 0),
      overdue: Number(row.Overdue || 0),
      totalActualCost: Number(row.TotalActualCost || 0),
    };
  }

  public async getOptions(): Promise<MaintenanceOptions> {
    const pool = await SqlConnectionFactory.getPool();
    const [labResult, computerResult, equipmentResult, technicianResult] = await Promise.all([
      pool.request().query(`SELECT TOP 1 Id, LabCode AS Code, LabName AS Name, Status FROM LabProfile WHERE SingletonKey = 1`),
      pool.request().query(`SELECT Id, Code, Name, Status FROM Computers WHERE DeletedAt IS NULL ORDER BY Code`),
      pool.request().query(`
        SELECT Id, Code, Name, Status, AvailableQuantity, BrokenQuantity, MaintenanceQuantity
        FROM Equipments WHERE DeletedAt IS NULL ORDER BY Code
      `),
      pool.request().query(`
        SELECT u.Id, u.FullName, u.Username, STRING_AGG(roleList.Code, ',') AS Roles
        FROM Users u
        INNER JOIN (
          SELECT DISTINCT ur.UserId, r.Code
          FROM UserRoles ur
          INNER JOIN Roles r ON r.Id = ur.RoleId
          WHERE r.Code IN ('ADMIN', 'LAB_STAFF', 'COLLABORATOR')
        ) roleList ON roleList.UserId = u.Id
        WHERE u.Status = 'ACTIVE'
        GROUP BY u.Id, u.FullName, u.Username
        ORDER BY u.FullName
      `),
    ]);

    const toOption = (row: any) => ({
      id: String(row.Id), code: row.Code, name: row.Name, status: row.Status,
      availableQuantity: row.AvailableQuantity === undefined ? undefined : Number(row.AvailableQuantity),
      brokenQuantity: row.BrokenQuantity === undefined ? undefined : Number(row.BrokenQuantity),
      maintenanceQuantity: row.MaintenanceQuantity === undefined ? undefined : Number(row.MaintenanceQuantity),
    });

    return {
      lab: labResult.recordset[0] ? toOption(labResult.recordset[0]) : null,
      computers: computerResult.recordset.map(toOption),
      equipments: equipmentResult.recordset.map(toOption),
      technicians: technicianResult.recordset.map((row) => ({
        id: String(row.Id), fullName: row.FullName, username: row.Username,
        roles: String(row.Roles || '').split(',').filter(Boolean),
      })),
    };
  }

  public async hasOverlap(input: {
    targetType: MaintenanceTargetType;
    targetId: string;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }): Promise<boolean> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('targetType', mssql.NVarChar, input.targetType)
      .input('targetId', mssql.UniqueIdentifier, input.targetId)
      .input('startAt', mssql.DateTime2, input.startAt)
      .input('endAt', mssql.DateTime2, input.endAt)
      .input('excludeId', mssql.UniqueIdentifier, input.excludeId || null)
      .query(`
        SELECT TOP 1 1 AS Found
        FROM MaintenanceSchedules
        WHERE DeletedAt IS NULL
          AND Status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')
          AND TargetType = @targetType
          AND TargetId = @targetId
          AND ScheduledStartAt < @endAt
          AND ExpectedEndAt > @startAt
          AND (@excludeId IS NULL OR Id <> @excludeId)
      `);
    return result.recordset.length > 0;
  }

  public async hasActiveForTarget(targetType: MaintenanceTargetType, targetId: string, transaction?: mssql.Transaction): Promise<boolean> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request
      .input('targetType', mssql.NVarChar, targetType)
      .input('targetId', mssql.UniqueIdentifier, targetId)
      .query(`
        SELECT TOP 1 1 AS Found
        FROM MaintenanceSchedules
        WHERE DeletedAt IS NULL
          AND TargetType = @targetType
          AND TargetId = @targetId
          AND Status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')
      `);
    return result.recordset.length > 0;
  }

  public async save(maintenance: MaintenanceSchedule, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(maintenance);
    await request
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('code', mssql.NVarChar, raw.Code)
      .input('targetType', mssql.NVarChar, raw.TargetType)
      .input('targetId', mssql.UniqueIdentifier, raw.TargetId)
      .input('targetCode', mssql.NVarChar, raw.TargetCode)
      .input('targetName', mssql.NVarChar, raw.TargetName)
      .input('title', mssql.NVarChar, raw.Title)
      .input('description', mssql.NVarChar, raw.Description)
      .input('reason', mssql.NVarChar, raw.Reason)
      .input('scheduledStartAt', mssql.DateTime2, raw.ScheduledStartAt)
      .input('expectedEndAt', mssql.DateTime2, raw.ExpectedEndAt)
      .input('startedAt', mssql.DateTime2, raw.StartedAt)
      .input('completedAt', mssql.DateTime2, raw.CompletedAt)
      .input('cancelledAt', mssql.DateTime2, raw.CancelledAt)
      .input('status', mssql.NVarChar, raw.Status)
      .input('technicianId', mssql.UniqueIdentifier, raw.TechnicianId)
      .input('quantity', mssql.Int, raw.Quantity)
      .input('maintenanceSource', mssql.NVarChar, raw.MaintenanceSource)
      .input('resultNote', mssql.NVarChar, raw.ResultNote)
      .input('partsNote', mssql.NVarChar, raw.PartsNote)
      .input('estimatedCost', mssql.Decimal(18, 2), raw.EstimatedCost)
      .input('actualCost', mssql.Decimal(18, 2), raw.ActualCost)
      .input('completionOutcome', mssql.NVarChar, raw.CompletionOutcome)
      .input('cancellationReason', mssql.NVarChar, raw.CancellationReason)
      .input('triggerSource', mssql.NVarChar, raw.TriggerSource)
      .input('triggeredAt', mssql.DateTime2, raw.TriggeredAt)
      .input('createdBy', mssql.UniqueIdentifier, raw.CreatedBy)
      .input('createdAt', mssql.DateTime2, raw.CreatedAt)
      .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
      .input('deletedAt', mssql.DateTime2, raw.DeletedAt)
      .query(`
        MERGE INTO MaintenanceSchedules AS target
        USING (SELECT @id AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET
          TargetType = @targetType, TargetId = @targetId, TargetCode = @targetCode, TargetName = @targetName,
          Title = @title, Description = @description, Reason = @reason,
          ScheduledStartAt = @scheduledStartAt, ExpectedEndAt = @expectedEndAt,
          StartedAt = @startedAt, CompletedAt = @completedAt, CancelledAt = @cancelledAt,
          Status = @status, TechnicianId = @technicianId, Quantity = @quantity,
          MaintenanceSource = @maintenanceSource, ResultNote = @resultNote, PartsNote = @partsNote,
          EstimatedCost = @estimatedCost, ActualCost = @actualCost, CompletionOutcome = @completionOutcome,
          CancellationReason = @cancellationReason, TriggerSource = @triggerSource, TriggeredAt = @triggeredAt,
          UpdatedAt = @updatedAt, DeletedAt = @deletedAt
        WHEN NOT MATCHED THEN INSERT (
          Id, Code, TargetType, TargetId, TargetCode, TargetName, Title, Description, Reason,
          ScheduledStartAt, ExpectedEndAt, StartedAt, CompletedAt, CancelledAt, Status, TechnicianId,
          Quantity, MaintenanceSource, ResultNote, PartsNote, EstimatedCost, ActualCost, CompletionOutcome,
          CancellationReason, TriggerSource, TriggeredAt, CreatedBy, CreatedAt, UpdatedAt, DeletedAt
        ) VALUES (
          @id, @code, @targetType, @targetId, @targetCode, @targetName, @title, @description, @reason,
          @scheduledStartAt, @expectedEndAt, @startedAt, @completedAt, @cancelledAt, @status, @technicianId,
          @quantity, @maintenanceSource, @resultNote, @partsNote, @estimatedCost, @actualCost, @completionOutcome,
          @cancellationReason, @triggerSource, @triggeredAt, @createdBy, @createdAt, @updatedAt, @deletedAt
        );
      `);
  }

  private bindListInputs(request: mssql.Request, values: {
    keyword: string | null;
    status: MaintenanceStatus | null;
    targetType: MaintenanceTargetType | null;
    technicianId: string | null;
    fromDate: Date | null;
    toDate: Date | null;
  }): mssql.Request {
    return request
      .input('keyword', mssql.NVarChar, values.keyword)
      .input('status', mssql.NVarChar, values.status)
      .input('targetType', mssql.NVarChar, values.targetType)
      .input('technicianId', mssql.UniqueIdentifier, values.technicianId)
      .input('fromDate', mssql.DateTime2, values.fromDate)
      .input('toDate', mssql.DateTime2, values.toDate);
  }

  private toDetail(row: any): MaintenanceDetail {
    return {
      maintenance: this.toDomain(row),
      technicianName: row.TechnicianName || null,
      technicianUsername: row.TechnicianUsername || null,
      createdByName: row.CreatedByName || null,
    };
  }

  private toDomain(raw: any): MaintenanceSchedule {
    return MaintenanceSchedule.create({
      code: raw.Code,
      targetType: raw.TargetType as MaintenanceTargetType,
      targetId: String(raw.TargetId),
      targetCode: raw.TargetCode,
      targetName: raw.TargetName,
      title: raw.Title,
      description: raw.Description || undefined,
      reason: raw.Reason,
      scheduledStartAt: new Date(raw.ScheduledStartAt),
      expectedEndAt: new Date(raw.ExpectedEndAt),
      startedAt: raw.StartedAt ? new Date(raw.StartedAt) : undefined,
      completedAt: raw.CompletedAt ? new Date(raw.CompletedAt) : undefined,
      cancelledAt: raw.CancelledAt ? new Date(raw.CancelledAt) : undefined,
      status: raw.Status as MaintenanceStatus,
      technicianId: raw.TechnicianId ? String(raw.TechnicianId) : undefined,
      quantity: Number(raw.Quantity),
      maintenanceSource: raw.MaintenanceSource as MaintenanceSource | undefined,
      resultNote: raw.ResultNote || undefined,
      partsNote: raw.PartsNote || undefined,
      estimatedCost: Number(raw.EstimatedCost || 0),
      actualCost: raw.ActualCost === null || raw.ActualCost === undefined ? undefined : Number(raw.ActualCost),
      completionOutcome: raw.CompletionOutcome as MaintenanceOutcome | undefined,
      cancellationReason: raw.CancellationReason || undefined,
      triggerSource: (raw.TriggerSource || 'MANUAL') as MaintenanceTriggerSource,
      triggeredAt: raw.TriggeredAt ? new Date(raw.TriggeredAt) : undefined,
      createdBy: raw.CreatedBy ? String(raw.CreatedBy) : undefined,
      createdAt: raw.CreatedAt ? new Date(raw.CreatedAt) : undefined,
      updatedAt: raw.UpdatedAt ? new Date(raw.UpdatedAt) : undefined,
      deletedAt: raw.DeletedAt ? new Date(raw.DeletedAt) : undefined,
      rowVersion: raw.RowVersion || undefined,
    }, new UniqueEntityId(String(raw.Id)));
  }

  private toPersistence(maintenance: MaintenanceSchedule) {
    return {
      Id: maintenance.id.toString(), Code: maintenance.code, TargetType: maintenance.targetType,
      TargetId: maintenance.targetId, TargetCode: maintenance.targetCode, TargetName: maintenance.targetName,
      Title: maintenance.title, Description: maintenance.description || null, Reason: maintenance.reason,
      ScheduledStartAt: maintenance.scheduledStartAt, ExpectedEndAt: maintenance.expectedEndAt,
      StartedAt: maintenance.startedAt || null, CompletedAt: maintenance.completedAt || null,
      CancelledAt: maintenance.cancelledAt || null, Status: maintenance.status,
      TechnicianId: maintenance.technicianId || null, Quantity: maintenance.quantity,
      MaintenanceSource: maintenance.maintenanceSource || null, ResultNote: maintenance.resultNote || null,
      PartsNote: maintenance.partsNote || null, EstimatedCost: maintenance.estimatedCost,
      ActualCost: maintenance.actualCost ?? null, CompletionOutcome: maintenance.completionOutcome || null,
      CancellationReason: maintenance.cancellationReason || null, CreatedBy: maintenance.createdBy || null,
      TriggerSource: maintenance.triggerSource, TriggeredAt: maintenance.triggeredAt || null,
      CreatedAt: maintenance.createdAt || new Date(), UpdatedAt: maintenance.updatedAt || new Date(),
      DeletedAt: maintenance.deletedAt || null,
    };
  }
}
