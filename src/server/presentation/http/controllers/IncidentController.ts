import { NextFunction, Request, Response } from 'express';
import {
  AssignIncidentUseCase,
  CloseIncidentUseCase,
  CreateIncidentUseCase,
  GetIncidentOptionsUseCase,
  GetIncidentSummaryUseCase,
  GetIncidentUseCase,
  IncidentOperationContext,
  ListIncidentsUseCase,
  ResolveIncidentUseCase,
  StartIncidentUseCase,
  UpdateIncidentUseCase,
} from '../../../application/use-cases/incident/IncidentManagementUseCases';
import { IncidentSeverity, IncidentStatus } from '../../../domain/entities/IncidentReport';
import { IncidentDetail } from '../../../domain/repositories/IIncidentReportRepository';
import { ApiResponse } from '../presenters/ApiResponse';

export class IncidentController {
  constructor(
    private readonly listUseCase: ListIncidentsUseCase,
    private readonly summaryUseCase: GetIncidentSummaryUseCase,
    private readonly optionsUseCase: GetIncidentOptionsUseCase,
    private readonly getUseCase: GetIncidentUseCase,
    private readonly createUseCase: CreateIncidentUseCase,
    private readonly updateUseCase: UpdateIncidentUseCase,
    private readonly assignUseCase: AssignIncidentUseCase,
    private readonly startUseCase: StartIncidentUseCase,
    private readonly resolveUseCase: ResolveIncidentUseCase,
    private readonly closeUseCase: CloseIncidentUseCase,
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const output = await this.listUseCase.execute({
        page, pageSize,
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as IncidentStatus | undefined,
        severity: req.query.severity as IncidentSeverity | undefined,
        assetType: req.query.assetType as any,
        assignedTo: req.query.assignedTo as string | undefined,
      }, this.context(req));
      res.status(200).json(ApiResponse.paginated(output.data.map((item) => this.toDto(item)), {
        page, pageSize, totalItems: output.total, totalPages: Math.ceil(output.total / pageSize),
      }, 'Lấy danh sách sự cố thành công.'));
    } catch (error) { next(error); }
  };

  public summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(await this.summaryUseCase.execute(this.context(req)))); }
    catch (error) { next(error); }
  };

  public options = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(await this.optionsUseCase.execute())); }
    catch (error) { next(error); }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(this.toDto(await this.getUseCase.execute(req.params.id as string, this.context(req))))); }
    catch (error) { next(error); }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.createUseCase.execute(this.content(req), this.context(req));
      res.status(201).json(ApiResponse.created(this.toDto(detail), 'Đã tạo phiếu sự cố.'));
    } catch (error) { next(error); }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.updateUseCase.execute(req.params.id as string, this.content(req), this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã cập nhật sự cố.'));
    } catch (error) { next(error); }
  };

  public assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.assignUseCase.execute(req.params.id as string, req.body.assignedTo, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã phân công người xử lý.'));
    } catch (error) { next(error); }
  };

  public start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.startUseCase.execute(req.params.id as string, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã bắt đầu xử lý sự cố.'));
    } catch (error) { next(error); }
  };

  public resolve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.resolveUseCase.execute(req.params.id as string, req.body.resultNote, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã xác nhận xử lý xong sự cố.'));
    } catch (error) { next(error); }
  };

  public close = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.closeUseCase.execute(req.params.id as string, req.body.resultNote, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã đóng hồ sơ sự cố.'));
    } catch (error) { next(error); }
  };

  private content(req: Request) {
    return {
      title: req.body.title, description: req.body.description, severity: req.body.severity as IncidentSeverity,
      computerId: req.body.computerId || undefined, equipmentId: req.body.equipmentId || undefined,
      bookingRequestId: req.body.bookingRequestId || undefined, imageUrl: req.body.imageUrl || undefined,
    };
  }

  private context(req: Request): IncidentOperationContext {
    return {
      actorUserId: req.user!.userId, roles: req.user!.roles, permissions: req.user!.permissions,
      ipAddress: req.ip, userAgent: req.get('user-agent'), correlationId: req.correlationId,
    };
  }

  private toDto(detail: IncidentDetail) {
    const item = detail.incident;
    const assetType = item.computerId ? 'COMPUTER' : item.equipmentId ? 'EQUIPMENT' : item.bookingRequestId ? 'BOOKING' : 'GENERAL';
    const assetCode = detail.computerCode || detail.equipmentCode || detail.bookingCode;
    const assetName = detail.computerName || detail.equipmentName || detail.bookingPurpose;
    return {
      id: item.id.toString(), code: item.code, reporterId: item.reporterId,
      reporterName: detail.reporterName, reporterUsername: detail.reporterUsername,
      computerId: item.computerId || null, equipmentId: item.equipmentId || null,
      bookingRequestId: item.bookingRequestId || null, assetType, assetCode, assetName,
      title: item.title, description: item.description, severity: item.severity, status: item.status,
      imageUrl: item.imageUrl || null, assignedTo: item.assignedTo || null,
      assignedToName: detail.assignedToName, assignedToUsername: detail.assignedToUsername,
      resolvedAt: item.resolvedAt || null, closedAt: item.closedAt || null,
      resultNote: item.resultNote || null, createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }
}
