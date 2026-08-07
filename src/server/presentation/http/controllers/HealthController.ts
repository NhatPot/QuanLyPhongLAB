import { Request, Response, NextFunction } from 'express';
import { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase';
import { ApiResponse } from '../presenters/ApiResponse';

export class HealthController {
  constructor(private getHealthUseCase: GetHealthUseCase) {}

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getHealthUseCase.execute();
      
      if (result.isSuccess) {
        res.status(200).json(
          ApiResponse.success(result.getValue(), "Service is healthy")
        );
      } else {
        res.status(500).json(
          ApiResponse.error("HEALTH_CHECK_FAILED", result.getError() || "Health check failed", null, req.correlationId)
        );
      }
    } catch (error) {
      next(error);
    }
  }
}

