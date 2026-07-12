import { Request, Response } from 'express';
import { CreateComputerUseCase } from '../../../application/use-cases/computer/CreateComputerUseCase';
import { GetComputerUseCase } from '../../../application/use-cases/computer/GetComputerUseCase';
import { ListComputersUseCase } from '../../../application/use-cases/computer/ListComputersUseCase';
import { UpdateComputerUseCase } from '../../../application/use-cases/computer/UpdateComputerUseCase';
import { UpdateComputerStatusUseCase } from '../../../application/use-cases/computer/UpdateComputerStatusUseCase';
import { DeleteComputerUseCase } from '../../../application/use-cases/computer/DeleteComputerUseCase';
import { ApiResponse } from '../presenters/ApiResponse';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { SqlConnectionFactory } from '../../../infrastructure/database/sqlserver/connection';
import { Computer } from '../../../domain/entities/Computer';

export class ComputerController {
  constructor(
    private createComputerUseCase: CreateComputerUseCase,
    private getComputerUseCase: GetComputerUseCase,
    private listComputersUseCase: ListComputersUseCase,
    private updateComputerUseCase: UpdateComputerUseCase,
    private updateComputerStatusUseCase: UpdateComputerStatusUseCase,
    private deleteComputerUseCase: DeleteComputerUseCase,
    private computerRepo: IComputerRepository
  ) {}

  public create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const result = await this.createComputerUseCase.execute({
      ...req.body,
      userId,
      ipAddressClient: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const c = result.getValue();
    res.status(201).json(ApiResponse.created(this.toResponseDto(c), 'Tạo máy tính thành công.'));
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const result = await this.getComputerUseCase.execute(req.params.id);
    if (!result.isSuccess) {
      res.status(404).json(ApiResponse.error('NOT_FOUND', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue())));
  };

  public list = async (req: Request, res: Response): Promise<void> => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
    const keyword = req.query.keyword as string;
    const status = req.query.status as string;
    const position = req.query.position as string;

    const result = await this.listComputersUseCase.execute({ page, pageSize, keyword, status, position });
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const output = result.getValue();
    const data = output.data.map(c => this.toResponseDto(c));
    const totalPages = Math.ceil(output.total / pageSize);

    res.status(200).json(ApiResponse.paginated(data, {
      page,
      pageSize,
      totalItems: output.total,
      totalPages
    }));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const userId = req.user?.userId;

    const result = await this.updateComputerUseCase.execute({
      id,
      ...req.body,
      userId,
      ipAddressClient: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue()), 'Cập nhật máy tính thành công.'));
  };

  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const { status } = req.body;
    const userId = req.user?.userId;

    const result = await this.updateComputerStatusUseCase.execute({
      id,
      status,
      userId,
      ipAddressClient: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue()), 'Cập nhật trạng thái máy tính thành công.'));
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const userId = req.user?.userId;

    const result = await this.deleteComputerUseCase.execute({
      id,
      userId,
      ipAddressClient: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(null, 'Xóa máy tính thành công.'));
  };

  public getAvailabilitySummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const activeCount = await this.computerRepo.countActive();
      const pool = await SqlConnectionFactory.getPool();
      
      const statusCounts = await pool.request().query(`
        SELECT Status, COUNT(*) as Count 
        FROM Computers 
        WHERE DeletedAt IS NULL 
        GROUP BY Status
      `);

      const summary = {
        total: 0,
        active: activeCount,
        inUse: 0,
        broken: 0,
        maintenance: 0,
        locked: 0,
        inactive: 0
      };

      for (const row of statusCounts.recordset) {
        const count = row.Count;
        summary.total += count;
        if (row.Status === 'ACTIVE') summary.active = count;
        else if (row.Status === 'IN_USE') summary.inUse = count;
        else if (row.Status === 'BROKEN') summary.broken = count;
        else if (row.Status === 'MAINTENANCE') summary.maintenance = count;
        else if (row.Status === 'LOCKED') summary.locked = count;
        else if (row.Status === 'INACTIVE') summary.inactive = count;
      }

      res.status(200).json(ApiResponse.success(summary, 'Lấy tóm tắt trạng thái máy tính thành công.'));
    } catch (error) {
      res.status(500).json(ApiResponse.error('SERVER_ERROR', (error as any).message || 'Có lỗi xảy ra.', null, req.correlationId));
    }
  };

  private toResponseDto(c: Computer): any {
    return {
      id: c.id.toString(),
      code: c.code,
      name: c.name,
      cpu: c.cpu,
      ram: c.ram,
      storage: c.storage,
      gpu: c.gpu,
      operatingSystem: c.operatingSystem,
      installedSoftware: c.installedSoftware,
      ipAddress: c.ipAddress,
      macAddress: c.macAddress,
      position: c.position,
      status: c.status,
      note: c.note,
      lastMaintenanceDate: c.lastMaintenanceDate,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    };
  }
}
