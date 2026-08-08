import { Request, Response, NextFunction } from 'express';
import { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase';

export class HealthController {
  constructor(private getHealthUseCase: GetHealthUseCase) {}

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        status: 'ok',
        message: 'FIT PC Monitor Server Alive',
      });
    } catch (error) {
      next(error);
    }
  }
}
