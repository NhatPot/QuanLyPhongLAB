import { Request, Response, NextFunction } from 'express';
import { GetHealthUseCase } from '../../../application/use-cases/GetHealthUseCase';
import { DeviceApiLogger } from '../../../utils/device-api-logger';

export class HealthController {
  constructor(private getHealthUseCase: GetHealthUseCase) {}

  public getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const responseData = {
      status: 'ok',
      message: 'FIT PC Monitor Server Alive',
    };
    try {
      res.status(200).json(responseData);
    } catch (error) {
      next(error);
    } finally {
      DeviceApiLogger.log({
        method: 'GET',
        endpoint: '/api/health',
        ip: req.ip,
        userAgent: req.get('user-agent'),
        requestBody: null,
        statusCode: 200,
        response: responseData,
      });
    }
  }
}
