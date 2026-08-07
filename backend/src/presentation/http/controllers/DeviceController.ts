import { Request, Response } from 'express';
import { RegisterDeviceUseCase } from '../../application/use-cases/device/RegisterDeviceUseCase';
import { UpdateDeviceMetricsUseCase } from '../../application/use-cases/device/UpdateDeviceMetricsUseCase';
import { ReportHardwareChangeUseCase } from '../../application/use-cases/device/ReportHardwareChangeUseCase';

export class DeviceController {
  constructor(
    private registerDeviceUseCase: RegisterDeviceUseCase,
    private updateDeviceMetricsUseCase: UpdateDeviceMetricsUseCase,
    private reportHardwareChangeUseCase: ReportHardwareChangeUseCase
  ) {}

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.registerDeviceUseCase.execute({
        ...req.body,
        ip_address: req.ip
      });

      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }

      res.status(200).json({ status: 'success', data: result.getValue() });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  public async updateMetrics(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.updateDeviceMetricsUseCase.execute({
        ...req.body,
        ip_address: req.ip
      });

      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }

      res.status(200).json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  public async alertHardwareChange(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.reportHardwareChangeUseCase.execute(req.body);

      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }

      res.status(200).json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  public async getAllMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { DeviceMetricsCache } = await import('../../../infrastructure/cache/DeviceMetricsCache');
      const metrics = DeviceMetricsCache.getInstance().getAllMetrics();
      res.status(200).json({ status: 'success', data: metrics });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }
}
