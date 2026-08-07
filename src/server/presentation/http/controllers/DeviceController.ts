import { Request, Response } from 'express';
import { GetAllDeviceMetricsUseCase } from '../../../application/use-cases/device/GetAllDeviceMetricsUseCase';
import { RegisterDeviceUseCase } from '../../../application/use-cases/device/RegisterDeviceUseCase';
import { ReportHardwareChangeUseCase } from '../../../application/use-cases/device/ReportHardwareChangeUseCase';
import { UpdateDeviceMetricsUseCase } from '../../../application/use-cases/device/UpdateDeviceMetricsUseCase';

export class DeviceController {
  constructor(
    private registerDeviceUseCase: RegisterDeviceUseCase,
    private updateDeviceMetricsUseCase: UpdateDeviceMetricsUseCase,
    private reportHardwareChangeUseCase: ReportHardwareChangeUseCase,
    private getAllDeviceMetricsUseCase: GetAllDeviceMetricsUseCase,
  ) {}

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.registerDeviceUseCase.execute({ ...req.body, ip_address: req.ip });
      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Đăng ký thiết bị thành công',
        ...result.getValue(),
      });
    } catch {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  public async updateMetrics(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.updateDeviceMetricsUseCase.execute({ ...req.body, ip_address: req.ip });
      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Đã nhận dữ liệu metrics thành công',
        ...result.getValue(),
      });
    } catch {
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

      res.status(200).json({
        status: 'alert_received',
        message: 'Báo cáo thay đổi cấu hình phần cứng đã được ghi nhận thành công',
        ...result.getValue(),
      });
    } catch {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }

  public async getAllMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getAllDeviceMetricsUseCase.execute();
      if (result.isFailure) {
        res.status(500).json({ status: 'error', message: result.getError() });
        return;
      }
      res.status(200).json({ status: 'success', data: result.getValue() });
    } catch {
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  }
}
