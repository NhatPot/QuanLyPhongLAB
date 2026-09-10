import { Request, Response } from 'express';
import { CreateEquipmentCategoryUseCase } from '../../../application/use-cases/equipment-category/CreateEquipmentCategoryUseCase';
import { ListEquipmentCategoriesUseCase } from '../../../application/use-cases/equipment-category/ListEquipmentCategoriesUseCase';
import { CreateEquipmentUseCase } from '../../../application/use-cases/equipment/CreateEquipmentUseCase';
import { GetEquipmentUseCase } from '../../../application/use-cases/equipment/GetEquipmentUseCase';
import { ListEquipmentUseCase } from '../../../application/use-cases/equipment/ListEquipmentUseCase';
import { UpdateEquipmentUseCase } from '../../../application/use-cases/equipment/UpdateEquipmentUseCase';
import { AdjustInventoryUseCase } from '../../../application/use-cases/equipment/AdjustInventoryUseCase';
import { ReportBrokenEquipmentUseCase } from '../../../application/use-cases/equipment/ReportBrokenEquipmentUseCase';
import { DeleteEquipmentUseCase } from '../../../application/use-cases/equipment/DeleteEquipmentUseCase';
import { DeleteEquipmentCategoryUseCase } from '../../../application/use-cases/equipment-category/DeleteEquipmentCategoryUseCase';
import { IEquipmentInventoryTransactionRepository } from '../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { ApiResponse } from '../presenters/ApiResponse';
import { Equipment } from '../../../domain/entities/Equipment';
import { canManageLabAssets } from '../../../../lib/lending-policy';
import { UpdateEquipmentCategoryUseCase } from '../../../application/use-cases/equipment-category/UpdateEquipmentCategoryUseCase';

export class EquipmentController {
  constructor(
    private createCategoryUseCase: CreateEquipmentCategoryUseCase,
    private listCategoriesUseCase: ListEquipmentCategoriesUseCase,
    private createEquipmentUseCase: CreateEquipmentUseCase,
    private getEquipmentUseCase: GetEquipmentUseCase,
    private listEquipmentUseCase: ListEquipmentUseCase,
    private updateEquipmentUseCase: UpdateEquipmentUseCase,
    private adjustInventoryUseCase: AdjustInventoryUseCase,
    private reportBrokenEquipmentUseCase: ReportBrokenEquipmentUseCase,
    private deleteEquipmentUseCase: DeleteEquipmentUseCase,
    private transactionRepo: IEquipmentInventoryTransactionRepository,
    private deleteCategoryUseCase: DeleteEquipmentCategoryUseCase,
    private updateCategoryUseCase: UpdateEquipmentCategoryUseCase
  ) {}

  public createCategory = async (req: Request, res: Response): Promise<void> => {
    const result = await this.createCategoryUseCase.execute(req.body);
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }
    const cat = result.getValue();
    res.status(201).json(ApiResponse.created({
      id: cat.id.toString(),
      code: cat.code,
      name: cat.name,
      description: cat.description
    }, 'Tạo danh mục thiết bị thành công.'));
  };

  public updateCategory = async (req: Request, res: Response): Promise<void> => {
    const result = await this.updateCategoryUseCase.execute(req.params.id as string, req.body);
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }
    const category = result.getValue();
    res.status(200).json(ApiResponse.success({ id: category.id.toString(), code: category.code, name: category.name, description: category.description }, 'Đã cập nhật danh mục.'));
  };

  public listCategories = async (req: Request, res: Response): Promise<void> => {
    const result = await this.listCategoriesUseCase.execute(!canManageLabAssets(req.user?.roles));
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }
    const list = result.getValue().map(cat => ({
      id: cat.id.toString(),
      code: cat.code,
      name: cat.name,
      description: canManageLabAssets(req.user?.roles) ? cat.description : undefined
    }));
    res.status(200).json(ApiResponse.success(list));
  };

  public deleteCategory = async (req: Request, res: Response): Promise<void> => {
    const result = await this.deleteCategoryUseCase.execute(req.params.id as string);
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }
    res.status(200).json(ApiResponse.success(null, 'Xóa danh mục thiết bị thành công.'));
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const result = await this.createEquipmentUseCase.execute({
      ...req.body,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(201).json(ApiResponse.created(this.toResponseDto(result.getValue()), 'Tạo thiết bị thành công.'));
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const result = await this.getEquipmentUseCase.execute(req.params.id as string, !canManageLabAssets(req.user?.roles));
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
    const categoryId = req.query.categoryId as string;
    const status = req.query.status as string;

    const result = await this.listEquipmentUseCase.execute({ page, pageSize, keyword, categoryId, status, lendableOnly: !canManageLabAssets(req.user?.roles) || req.query.lendableOnly === 'true' });
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const output = result.getValue();
    const data = output.data.map(e => this.toResponseDto(e));
    const totalPages = Math.ceil(output.total / pageSize);

    res.status(200).json(ApiResponse.paginated(data, {
      page,
      pageSize,
      totalItems: output.total,
      totalPages
    }));
  };

  public update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const result = await this.updateEquipmentUseCase.execute({
      id,
      ...req.body,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue()), 'Cập nhật thiết bị thành công.'));
  };

  public adjustInventory = async (req: Request, res: Response): Promise<void> => {
    const equipmentId = req.params.id as string;
    const { delta, note } = req.body;
    const userId = req.user?.userId;

    const result = await this.adjustInventoryUseCase.execute({
      equipmentId,
      delta,
      note,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue()), 'Điều chỉnh số lượng kho thành công.'));
  };

  public reportBroken = async (req: Request, res: Response): Promise<void> => {
    const equipmentId = req.params.id as string;
    const { quantity, from, note } = req.body;
    const userId = req.user?.userId;

    const result = await this.reportBrokenEquipmentUseCase.execute({
      equipmentId,
      quantity,
      from,
      note,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(this.toResponseDto(result.getValue()), 'Báo hỏng thiết bị thành công.'));
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const result = await this.deleteEquipmentUseCase.execute({
      id: req.params.id as string,
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    res.status(200).json(ApiResponse.success(null, 'Xóa thiết bị thành công.'));
  };

  public listTransactions = async (req: Request, res: Response): Promise<void> => {
    if (!canManageLabAssets(req.user?.roles)) {
      res.status(403).json(ApiResponse.error('FORBIDDEN', 'Chỉ nhân sự quản lý Lab được xem lịch sử kho.', null, req.correlationId));
      return;
    }
    const equipmentId = req.params.id as string;
    try {
      const txs = await this.transactionRepo.listByEquipmentId(equipmentId);
      const data = txs.map(tx => ({
        id: tx.id.toString(),
        equipmentId: tx.equipmentId,
        transactionType: tx.transactionType,
        deltaTotal: tx.deltaTotal,
        deltaAvailable: tx.deltaAvailable,
        deltaReserved: tx.deltaReserved,
        deltaBorrowed: tx.deltaBorrowed,
        deltaBroken: tx.deltaBroken,
        deltaMaintenance: tx.deltaMaintenance,
        deltaLost: tx.deltaLost,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        performedBy: tx.performedBy,
        note: tx.note,
        createdAt: tx.createdAt
      }));
      res.status(200).json(ApiResponse.success(data));
    } catch (error) {
      res.status(500).json(ApiResponse.error('SERVER_ERROR', (error as any).message || 'Có lỗi xảy ra.', null, req.correlationId));
    }
  };

  private toResponseDto(e: Equipment): any {
    return {
      isLendable: e.isLendable,
      id: e.id.toString(),
      code: e.code,
      name: e.name,
      categoryId: e.categoryId,
      totalQuantity: e.totalQuantity,
      availableQuantity: e.availableQuantity,
      reservedQuantity: e.reservedQuantity,
      borrowedQuantity: e.borrowedQuantity,
      brokenQuantity: e.brokenQuantity,
      maintenanceQuantity: e.maintenanceQuantity,
      lostQuantity: e.lostQuantity,
      location: e.location,
      managerId: e.managerId,
      status: e.status,
      imageUrl: e.imageUrl,
      note: e.note,
      rowVersion: e.rowVersion ? e.rowVersion.toString('hex') : null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt
    };
  }
}
