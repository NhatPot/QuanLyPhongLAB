import mssql from 'mssql';
import { IncidentReport, IncidentSeverity, IncidentStatus } from '../../../../domain/entities/IncidentReport';
import {
  IIncidentReportRepository,
  IncidentDetail,
  IncidentListFilters,
  IncidentOptions,
  IncidentSummary,
  IncidentVisibility,
} from '../../../../domain/repositories/IIncidentReportRepository';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

const DETAIL_COLUMNS = `
  i.*,
  reporter.FullName AS ReporterName, reporter.Username AS ReporterUsername,
  assignee.FullName AS AssignedToName, assignee.Username AS AssignedToUsername,
  c.Code AS ComputerCode, c.Name AS ComputerName,
  e.Code AS EquipmentCode, e.Name AS EquipmentName,
  b.RequestCode AS BookingCode, b.Purpose AS BookingPurpose
`;

const DETAIL_FROM = `
  FROM IncidentReports i
  INNER JOIN Users reporter ON reporter.Id = i.ReporterId
  LEFT JOIN Users assignee ON assignee.Id = i.AssignedTo
  LEFT JOIN Computers c ON c.Id = i.ComputerId
  LEFT JOIN Equipments e ON e.Id = i.EquipmentId
  LEFT JOIN BookingRequests b ON b.Id = i.BookingRequestId
`;

export class SqlIncidentReportRepository implements IIncidentReportRepository {
  public async findById(id: string, transaction?: mssql.Transaction): Promise<IncidentDetail | null> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const result = await request.input('id', mssql.UniqueIdentifier, id).query(`SELECT ${DETAIL_COLUMNS} ${DETAIL_FROM} WHERE i.Id = @id`);
    return result.recordset[0] ? this.toDetail(result.recordset[0]) : null;
  }

  public async list(filters: IncidentListFilters): Promise<{ data: IncidentDetail[]; total: number }> {
    const pool = await SqlConnectionFactory.getPool();
    const request = this.bindVisibility(pool.request(), filters)
      .input('keyword', mssql.NVarChar, filters.keyword?.trim() || null)
      .input('status', mssql.NVarChar, filters.status || null)
      .input('severity', mssql.NVarChar, filters.severity || null)
      .input('assetType', mssql.NVarChar, filters.assetType || null)
      .input('assignedFilter', mssql.UniqueIdentifier, filters.assignedTo || null)
      .input('offset', mssql.Int, (filters.page - 1) * filters.pageSize)
      .input('pageSize', mssql.Int, filters.pageSize);

    const result = await request.query(`
      SELECT ${DETAIL_COLUMNS}, COUNT_BIG(*) OVER() AS TotalCount
      ${DETAIL_FROM}
      WHERE ${this.visibilityPredicate()}
        AND (@keyword IS NULL OR i.Code LIKE '%' + @keyword + '%' OR i.Title LIKE '%' + @keyword + '%'
          OR i.Description LIKE '%' + @keyword + '%' OR c.Code LIKE '%' + @keyword + '%'
          OR c.Name LIKE '%' + @keyword + '%' OR e.Code LIKE '%' + @keyword + '%' OR e.Name LIKE '%' + @keyword + '%')
        AND (@status IS NULL OR i.Status = @status)
        AND (@severity IS NULL OR i.Severity = @severity)
        AND (@assignedFilter IS NULL OR i.AssignedTo = @assignedFilter)
        AND (@assetType IS NULL
          OR (@assetType = 'COMPUTER' AND i.ComputerId IS NOT NULL)
          OR (@assetType = 'EQUIPMENT' AND i.EquipmentId IS NOT NULL)
          OR (@assetType = 'BOOKING' AND i.BookingRequestId IS NOT NULL)
          OR (@assetType = 'GENERAL' AND i.ComputerId IS NULL AND i.EquipmentId IS NULL AND i.BookingRequestId IS NULL))
      ORDER BY
        CASE i.Status WHEN 'OPEN' THEN 1 WHEN 'ASSIGNED' THEN 2 WHEN 'IN_PROGRESS' THEN 3 WHEN 'RESOLVED' THEN 4 ELSE 5 END,
        CASE i.Severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
        i.CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return {
      data: result.recordset.map((row) => this.toDetail(row)),
      total: Number(result.recordset[0]?.TotalCount || 0),
    };
  }

  public async getSummary(visibility: IncidentVisibility): Promise<IncidentSummary> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await this.bindVisibility(pool.request(), visibility).query(`
      SELECT
        COUNT(*) AS Total,
        SUM(CASE WHEN i.Status = 'OPEN' THEN 1 ELSE 0 END) AS [Open],
        SUM(CASE WHEN i.Status = 'ASSIGNED' THEN 1 ELSE 0 END) AS Assigned,
        SUM(CASE WHEN i.Status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS InProgress,
        SUM(CASE WHEN i.Status = 'RESOLVED' THEN 1 ELSE 0 END) AS Resolved,
        SUM(CASE WHEN i.Status = 'CLOSED' THEN 1 ELSE 0 END) AS Closed,
        SUM(CASE WHEN i.Severity = 'CRITICAL' AND i.Status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS CriticalOpen
      FROM IncidentReports i
      WHERE ${this.visibilityPredicate()};

      SELECT COUNT(*) AS BrokenComputers
      FROM Computers WHERE DeletedAt IS NULL AND Status = 'BROKEN';

      SELECT COUNT(*) AS EquipmentTypesWithIssues,
        COALESCE(SUM(BrokenQuantity + LostQuantity), 0) AS EquipmentAlerts
      FROM Equipments WHERE DeletedAt IS NULL AND (BrokenQuantity > 0 OR LostQuantity > 0);
    `);
    const recordsets = result.recordsets as mssql.IRecordSet<any>[];
    const incident = recordsets[0]?.[0] || {};
    const computer = recordsets[1]?.[0] || {};
    const equipment = recordsets[2]?.[0] || {};
    const brokenComputers = Number(computer.BrokenComputers || 0);
    return {
      total: Number(incident.Total || 0),
      open: Number(incident.Open || 0),
      assigned: Number(incident.Assigned || 0),
      inProgress: Number(incident.InProgress || 0),
      resolved: Number(incident.Resolved || 0),
      closed: Number(incident.Closed || 0),
      criticalOpen: Number(incident.CriticalOpen || 0),
      brokenComputers,
      equipmentTypesWithIssues: Number(equipment.EquipmentTypesWithIssues || 0),
      totalAssetAlerts: brokenComputers + Number(equipment.EquipmentAlerts || 0),
    };
  }

  public async getOptions(lendableOnly = false): Promise<IncidentOptions> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query(`
      SELECT Id, Code, Name, Status FROM Computers WHERE DeletedAt IS NULL ORDER BY Code;
      SELECT Id, Code, Name, BrokenQuantity, LostQuantity FROM Equipments WHERE DeletedAt IS NULL ${lendableOnly ? 'AND IsLendable = 1' : ''} ORDER BY Code;
      SELECT TOP 100 Id, RequestCode AS Code, Purpose, Status FROM BookingRequests ORDER BY CreatedAt DESC;
      SELECT DISTINCT u.Id, u.FullName, u.Username
      FROM Users u
      INNER JOIN UserRoles ur ON ur.UserId = u.Id
      INNER JOIN Roles r ON r.Id = ur.RoleId
      LEFT JOIN RolePermissions rp ON rp.RoleId = r.Id
      LEFT JOIN Permissions p ON p.Id = rp.PermissionId
      WHERE u.DeletedAt IS NULL AND u.Status = 'ACTIVE'
        AND (r.Code = 'ADMIN' OR p.Code IN ('INCIDENT_VIEW_ASSIGNED', 'INCIDENT_UPDATE', 'INCIDENT_RESOLVE'))
      ORDER BY u.FullName;
    `);
    const recordsets = result.recordsets as mssql.IRecordSet<any>[];
    return {
      computers: (recordsets[0] || []).map((row: any) => ({ id: String(row.Id), code: row.Code, name: row.Name, status: row.Status })),
      equipments: (recordsets[1] || []).map((row: any) => ({ id: String(row.Id), code: row.Code, name: row.Name, brokenQuantity: Number(row.BrokenQuantity || 0), lostQuantity: Number(row.LostQuantity || 0) })),
      bookings: (recordsets[2] || []).map((row: any) => ({ id: String(row.Id), code: row.Code, purpose: row.Purpose, status: row.Status })),
      assignees: (recordsets[3] || []).map((row: any) => ({ id: String(row.Id), fullName: row.FullName, username: row.Username })),
    };
  }

  public async save(incident: IncidentReport, transaction?: mssql.Transaction): Promise<void> {
    const request = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    await request
      .input('id', mssql.UniqueIdentifier, incident.id.toString())
      .input('code', mssql.NVarChar, incident.code)
      .input('reporterId', mssql.UniqueIdentifier, incident.reporterId)
      .input('computerId', mssql.UniqueIdentifier, incident.computerId || null)
      .input('equipmentId', mssql.UniqueIdentifier, incident.equipmentId || null)
      .input('bookingRequestId', mssql.UniqueIdentifier, incident.bookingRequestId || null)
      .input('title', mssql.NVarChar, incident.title)
      .input('description', mssql.NVarChar, incident.description)
      .input('severity', mssql.NVarChar, incident.severity)
      .input('status', mssql.NVarChar, incident.status)
      .input('imageUrl', mssql.NVarChar, incident.imageUrl || null)
      .input('assignedTo', mssql.UniqueIdentifier, incident.assignedTo || null)
      .input('resolvedAt', mssql.DateTime2, incident.resolvedAt || null)
      .input('closedAt', mssql.DateTime2, incident.closedAt || null)
      .input('resultNote', mssql.NVarChar, incident.resultNote || null)
      .input('createdAt', mssql.DateTime2, incident.createdAt)
      .input('updatedAt', mssql.DateTime2, incident.updatedAt)
      .query(`
        MERGE INTO IncidentReports AS target
        USING (SELECT @id AS Id) AS source ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET
          ComputerId = @computerId, EquipmentId = @equipmentId, BookingRequestId = @bookingRequestId,
          Title = @title, Description = @description, Severity = @severity, Status = @status,
          ImageUrl = @imageUrl, AssignedTo = @assignedTo, ResolvedAt = @resolvedAt,
          ClosedAt = @closedAt, ResultNote = @resultNote, UpdatedAt = @updatedAt
        WHEN NOT MATCHED THEN INSERT (
          Id, Code, ReporterId, ComputerId, EquipmentId, BookingRequestId, Title, Description,
          Severity, Status, ImageUrl, AssignedTo, ResolvedAt, ClosedAt, ResultNote, CreatedAt, UpdatedAt
        ) VALUES (
          @id, @code, @reporterId, @computerId, @equipmentId, @bookingRequestId, @title, @description,
          @severity, @status, @imageUrl, @assignedTo, @resolvedAt, @closedAt, @resultNote, @createdAt, @updatedAt
        );
      `);
  }

  private bindVisibility(request: mssql.Request, visibility: IncidentVisibility): mssql.Request {
    return request
      .input('viewerId', mssql.UniqueIdentifier, visibility.viewerId)
      .input('viewAll', mssql.Bit, visibility.viewAll)
      .input('viewOwn', mssql.Bit, visibility.viewOwn)
      .input('viewAssigned', mssql.Bit, visibility.viewAssigned);
  }

  private visibilityPredicate(): string {
    return `(@viewAll = 1 OR (@viewOwn = 1 AND i.ReporterId = @viewerId) OR (@viewAssigned = 1 AND i.AssignedTo = @viewerId))`;
  }

  private toDetail(row: any): IncidentDetail {
    return {
      incident: IncidentReport.create({
        code: row.Code, reporterId: String(row.ReporterId),
        computerId: row.ComputerId ? String(row.ComputerId) : undefined,
        equipmentId: row.EquipmentId ? String(row.EquipmentId) : undefined,
        bookingRequestId: row.BookingRequestId ? String(row.BookingRequestId) : undefined,
        title: row.Title, description: row.Description,
        severity: row.Severity as IncidentSeverity, status: row.Status as IncidentStatus,
        imageUrl: row.ImageUrl || undefined, assignedTo: row.AssignedTo ? String(row.AssignedTo) : undefined,
        resolvedAt: row.ResolvedAt ? new Date(row.ResolvedAt) : undefined,
        closedAt: row.ClosedAt ? new Date(row.ClosedAt) : undefined,
        resultNote: row.ResultNote || undefined,
        createdAt: new Date(row.CreatedAt), updatedAt: new Date(row.UpdatedAt),
      }, new UniqueEntityId(String(row.Id))),
      reporterName: row.ReporterName || null,
      reporterUsername: row.ReporterUsername || null,
      assignedToName: row.AssignedToName || null,
      assignedToUsername: row.AssignedToUsername || null,
      computerCode: row.ComputerCode || null,
      computerName: row.ComputerName || null,
      equipmentCode: row.EquipmentCode || null,
      equipmentName: row.EquipmentName || null,
      bookingCode: row.BookingCode || null,
      bookingPurpose: row.BookingPurpose || null,
    };
  }
}
