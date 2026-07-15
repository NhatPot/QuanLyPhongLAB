import { NextFunction, Request, Response } from 'express';
import { ListAuditLogsUseCase } from '../../../application/use-cases/audit/AuditLogUseCases';
import { AuditLogRecord } from '../../../domain/repositories/IAuditLogRepository';
import { ApiResponse } from '../presenters/ApiResponse';

export class AuditLogController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const output = await this.listAuditLogsUseCase.execute({
        page,
        pageSize,
        keyword: req.query.keyword as string | undefined,
        action: req.query.action as string | undefined,
        entityName: req.query.entityName as string | undefined,
        userId: req.query.userId as string | undefined,
        fromDate: req.query.fromDate ? new Date(String(req.query.fromDate)) : undefined,
        toDate: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,
      });

      res.status(200).json(ApiResponse.paginated(
        output.data.map((record) => this.toResponseDto(record)),
        {
          page,
          pageSize,
          totalItems: output.total,
          totalPages: Math.ceil(output.total / pageSize),
        },
        'Lấy nhật ký hệ thống thành công.',
      ));
    } catch (error) {
      next(error);
    }
  };

  private toResponseDto(record: AuditLogRecord) {
    return {
      id: record.id,
      userId: record.userId,
      actorName: record.actorName,
      actorUsername: record.actorUsername,
      action: record.action,
      entityName: record.entityName,
      entityId: record.entityId,
      oldValue: parseJson(record.oldValueJson),
      newValue: parseJson(record.newValueJson),
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      correlationId: record.correlationId,
      createdAt: record.createdAt,
    };
  }
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

