import { Request, Response } from 'express';
import { GetLabProfileUseCase } from '../../../application/use-cases/lab/GetLabProfileUseCase';
import { UpdateLabProfileUseCase } from '../../../application/use-cases/lab/UpdateLabProfileUseCase';
import { UpdateLabStatusUseCase } from '../../../application/use-cases/lab/UpdateLabStatusUseCase';
import { ApiResponse } from '../presenters/ApiResponse';

export class LabController {
  constructor(
    private getLabProfileUseCase: GetLabProfileUseCase,
    private updateLabProfileUseCase: UpdateLabProfileUseCase,
    private updateLabStatusUseCase: UpdateLabStatusUseCase
  ) {}

  public getProfile = async (req: Request, res: Response): Promise<void> => {
    const result = await this.getLabProfileUseCase.execute();
    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const profile = result.getValue();
    res.status(200).json(ApiResponse.success({
      id: profile.id.toString(),
      labCode: profile.labCode,
      labName: profile.labName,
      location: profile.location,
      capacity: profile.capacity,
      description: profile.description,
      rules: profile.rules,
      managerId: profile.managerId,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    }, 'Lấy thông tin phòng Lab thành công.'));
  };

  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    const { labName, location, capacity, description, rules, managerId } = req.body;
    const userId = req.user?.userId;

    const result = await this.updateLabProfileUseCase.execute({
      labName,
      location,
      capacity,
      description,
      rules,
      managerId: managerId || undefined,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const profile = result.getValue();
    res.status(200).json(ApiResponse.success({
      id: profile.id.toString(),
      labCode: profile.labCode,
      labName: profile.labName,
      location: profile.location,
      capacity: profile.capacity,
      description: profile.description,
      rules: profile.rules,
      managerId: profile.managerId,
      status: profile.status,
      updatedAt: profile.updatedAt
    }, 'Cập nhật cấu hình phòng Lab thành công.'));
  };

  public updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body;
    const userId = req.user?.userId;

    const result = await this.updateLabStatusUseCase.execute({
      status,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId
    });

    if (!result.isSuccess) {
      res.status(400).json(ApiResponse.error('BAD_REQUEST', result.getError(), null, req.correlationId));
      return;
    }

    const profile = result.getValue();
    res.status(200).json(ApiResponse.success({
      id: profile.id.toString(),
      status: profile.status,
      updatedAt: profile.updatedAt
    }, 'Đổi trạng thái phòng Lab thành công.'));
  };
}
