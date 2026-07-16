import { NextFunction, Request, Response } from 'express';
import {
  CancelMaintenanceUseCase,
  CompleteMaintenanceUseCase,
  CreateMaintenanceUseCase,
  DeleteMaintenanceUseCase,
  GetMaintenanceOptionsUseCase,
  GetMaintenanceSummaryUseCase,
  GetMaintenanceUseCase,
  ListMaintenancesUseCase,
  MaintenanceOperationContext,
  StartMaintenanceUseCase,
  UpdateMaintenanceUseCase,
} from '../../../application/use-cases/maintenance/MaintenanceManagementUseCases';
import { MaintenanceDetail } from '../../../domain/repositories/IMaintenanceScheduleRepository';
import { MaintenanceOutcome, MaintenanceSource, MaintenanceTargetType } from '../../../domain/entities/MaintenanceSchedule';
import { ApiResponse } from '../presenters/ApiResponse';
import { SyncComputerMaintenanceRemindersUseCase } from '../../../application/use-cases/maintenance/ComputerMaintenanceProposalService';

export class MaintenanceController {
  constructor(
    private readonly listUseCase: ListMaintenancesUseCase,
    private readonly summaryUseCase: GetMaintenanceSummaryUseCase,
    private readonly optionsUseCase: GetMaintenanceOptionsUseCase,
    private readonly getUseCase: GetMaintenanceUseCase,
    private readonly createUseCase: CreateMaintenanceUseCase,
    private readonly updateUseCase: UpdateMaintenanceUseCase,
    private readonly startUseCase: StartMaintenanceUseCase,
    private readonly completeUseCase: CompleteMaintenanceUseCase,
    private readonly cancelUseCase: CancelMaintenanceUseCase,
    private readonly deleteUseCase: DeleteMaintenanceUseCase,
    private readonly syncRemindersUseCase: SyncComputerMaintenanceRemindersUseCase,
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const output = await this.listUseCase.execute({
        page, pageSize,
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as any,
        targetType: req.query.targetType as any,
        technicianId: req.query.technicianId as string | undefined,
        fromDate: req.query.fromDate ? new Date(String(req.query.fromDate)) : undefined,
        toDate: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,
      });
      res.status(200).json(ApiResponse.paginated(output.data.map((item) => this.toDto(item)), {
        page, pageSize, totalItems: output.total, totalPages: Math.ceil(output.total / pageSize),
      }, 'Lấy danh sách bảo trì thành công.'));
    } catch (error) { next(error); }
  };

  public summary = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(await this.summaryUseCase.execute(), 'Lấy thống kê bảo trì thành công.')); }
    catch (error) { next(error); }
  };

  public options = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(await this.optionsUseCase.execute(), 'Lấy dữ liệu tạo lịch bảo trì thành công.')); }
    catch (error) { next(error); }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(this.toDto(await this.getUseCase.execute(req.params.id)))); }
    catch (error) { next(error); }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.createUseCase.execute({ ...this.scheduleInput(req), ...this.context(req) });
      res.status(201).json(ApiResponse.created(this.toDto(detail), 'Tạo lịch bảo trì thành công.'));
    } catch (error) { next(error); }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.updateUseCase.execute(req.params.id, { ...this.scheduleInput(req), ...this.context(req) });
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Cập nhật lịch bảo trì thành công.'));
    } catch (error) { next(error); }
  };

  public start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.startUseCase.execute(req.params.id, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã bắt đầu bảo trì.'));
    } catch (error) { next(error); }
  };

  public complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.completeUseCase.execute(req.params.id, {
        ...this.context(req), resultNote: req.body.resultNote, actualCost: req.body.actualCost,
        partsNote: req.body.partsNote, outcome: req.body.outcome as MaintenanceOutcome,
      });
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Hoàn tất bảo trì thành công.'));
    } catch (error) { next(error); }
  };

  public cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.cancelUseCase.execute(req.params.id, req.body.reason, this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã hủy lịch bảo trì.'));
    } catch (error) { next(error); }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(req.params.id, this.context(req));
      res.status(200).json(ApiResponse.success(null, 'Đã xóa lịch bảo trì.'));
    } catch (error) { next(error); }
  };

  public syncReminders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.syncRemindersUseCase.execute(this.context(req));
      res.status(200).json(ApiResponse.success(result, result.created > 0
        ? `Đã tạo ${result.created} đề xuất bảo trì mới.`
        : 'Không có máy tính mới đến hạn bảo trì.'));
    } catch (error) { next(error); }
  };

  private scheduleInput(req: Request) {
    return {
      targetType: req.body.targetType as MaintenanceTargetType,
      targetId: req.body.targetId,
      title: req.body.title,
      description: req.body.description,
      reason: req.body.reason,
      scheduledStartAt: new Date(req.body.scheduledStartAt),
      expectedEndAt: new Date(req.body.expectedEndAt),
      technicianId: req.body.technicianId || undefined,
      quantity: req.body.quantity,
      maintenanceSource: req.body.maintenanceSource as MaintenanceSource | undefined,
      estimatedCost: req.body.estimatedCost,
      partsNote: req.body.partsNote,
    };
  }

  private context(req: Request): MaintenanceOperationContext {
    return {
      actorUserId: req.user!.userId, ipAddress: req.ip, userAgent: req.get('user-agent'), correlationId: req.correlationId,
    };
  }

  private toDto(detail: MaintenanceDetail) {
    const item = detail.maintenance;
    return {
      id: item.id.toString(), code: item.code, targetType: item.targetType, targetId: item.targetId,
      targetCode: item.targetCode, targetName: item.targetName, title: item.title,
      description: item.description || null, reason: item.reason,
      scheduledStartAt: item.scheduledStartAt, expectedEndAt: item.expectedEndAt,
      startedAt: item.startedAt || null, completedAt: item.completedAt || null,
      cancelledAt: item.cancelledAt || null, status: item.status,
      technicianId: item.technicianId || null, technicianName: detail.technicianName,
      technicianUsername: detail.technicianUsername, quantity: item.quantity,
      maintenanceSource: item.maintenanceSource || null, resultNote: item.resultNote || null,
      partsNote: item.partsNote || null, estimatedCost: item.estimatedCost,
      actualCost: item.actualCost ?? null, completionOutcome: item.completionOutcome || null,
      cancellationReason: item.cancellationReason || null, createdBy: item.createdBy || null,
      triggerSource: item.triggerSource, triggeredAt: item.triggeredAt || null,
      createdByName: detail.createdByName, createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null, isOverdue: item.isOverdue(),
    };
  }
}
