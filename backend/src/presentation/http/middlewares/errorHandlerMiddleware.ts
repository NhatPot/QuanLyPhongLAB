import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { ApiResponse } from '../presenters/ApiResponse';
import { container } from '../../../container/dependency-container';

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.correlationId;
  const userId = (req as any).user?.userId;

  // Log error
  container.logger.error(
    `Error on ${req.method} ${req.url} - CorrelationID: ${correlationId} - UserID: ${userId}`,
    err,
    { correlationId, method: req.method, path: req.url, userId }
  );

  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      ApiResponse.error(err.code, err.message, err.details, correlationId)
    );
    return;
  }

  if (err.name === 'ZodError' || err.constructor.name === 'ZodError') {
    res.status(400).json(
      ApiResponse.error("VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", err.errors || err.issues, correlationId)
    );
    return;
  }

  const message = process.env.NODE_ENV === 'production'
    ? 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.'
    : err.message || 'Đã xảy ra lỗi hệ thống.';

  res.status(500).json(
    ApiResponse.error("INTERNAL_SERVER_ERROR", message, null, correlationId)
  );
}
