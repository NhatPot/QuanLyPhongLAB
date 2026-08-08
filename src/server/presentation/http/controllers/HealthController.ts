import { Request, Response, NextFunction } from 'express';
import { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase';
import { ApiResponse } from '../presenters/ApiResponse';

export class HealthController {
  constructor(private getHealthUseCase: GetHealthUseCase) {}

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getHealthUseCase.execute();
      
      if (result.isSuccess) {
        res.status(200).json({
          status: 'ok',
          message: 'FIT PC Monitor Server Alive',
          data: result.getValue(),
        });
      } else {
        res.status(500).json({
          status: 'error',
          message: result.getError() || 'Health check failed',
        });
      }
    } catch (error) {
      next(error);
    }
  }
}

