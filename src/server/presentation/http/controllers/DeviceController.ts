import { Request, Response } from 'express';
import { BindUserDeviceUseCase } from '../../../application/use-cases/device/BindUserDeviceUseCase';
import { GetAllDeviceMetricsUseCase } from '../../../application/use-cases/device/GetAllDeviceMetricsUseCase';
import { RegisterDeviceUseCase } from '../../../application/use-cases/device/RegisterDeviceUseCase';
import { ReportHardwareChangeUseCase } from '../../../application/use-cases/device/ReportHardwareChangeUseCase';
import { UnbindUserDeviceUseCase } from '../../../application/use-cases/device/UnbindUserDeviceUseCase';
import { UnregisterDeviceUseCase } from '../../../application/use-cases/device/UnregisterDeviceUseCase';
import { UpdateDeviceMetricsUseCase } from '../../../application/use-cases/device/UpdateDeviceMetricsUseCase';
import { ApiResponse } from '../presenters/ApiResponse';

export class DeviceController {
  constructor(
    private registerDeviceUseCase: RegisterDeviceUseCase,
    private unregisterDeviceUseCase: UnregisterDeviceUseCase,
    private updateDeviceMetricsUseCase: UpdateDeviceMetricsUseCase,
    private reportHardwareChangeUseCase: ReportHardwareChangeUseCase,
    private getAllDeviceMetricsUseCase: GetAllDeviceMetricsUseCase,
    private bindUserDeviceUseCase: BindUserDeviceUseCase,
    private unbindUserDeviceUseCase: UnbindUserDeviceUseCase,
  ) {}

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = {
        ...req.body,
        ip_address: req.ip || req.body?.ip_address || req.body?.ipAddress,
      };

      const result = await this.registerDeviceUseCase.execute(payload);
      if (result.isFailure) {
        res.status(400).json({
          status: 'error',
          message: result.getError(),
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Đăng ký thiết bị thành công',
        ...result.getValue(),
      });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: error?.message || 'Không thể đăng ký thiết bị. Vui lòng kiểm tra lại thông tin gửi lên.',
      });
    }
  };

  public unregister = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.unregisterDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }
      res.status(200).json({
        status: 'success',
        message: 'Hủy đăng ký thiết bị thành công',
        ...result.getValue(),
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error?.message || 'Không thể hủy đăng ký thiết bị.' });
    }
  };

  public bindUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.bindUserDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }
      const data = result.getValue();
      res.status(200).json({
        status: 'success',
        message: data.message,
        bound_at: data.bound_at,
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error?.message || 'Không thể liên kết tài khoản với máy tính.' });
    }
  };

  public unbindUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.unbindUserDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        res.status(400).json({ status: 'error', message: result.getError() });
        return;
      }
      res.status(200).json({
        status: 'success',
        message: 'Đã hủy phiên sử dụng máy tính thành công',
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error?.message || 'Không thể hủy phiên sử dụng máy tính.' });
    }
  };

  public updateMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
      let apiKey: string | undefined;
      if (typeof authHeader === 'string') {
        apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
      }

      const payload = {
        ...req.body,
        apiKey,
        ip_address: req.ip || req.body?.ip_address || req.body?.ipAddress,
      };
      const result = await this.updateDeviceMetricsUseCase.execute(payload);
      const data = result.isSuccess ? result.getValue() : { received_at: new Date().toISOString() };

      res.status(200).json({
        status: 'success',
        message: 'Đã nhận dữ liệu metrics thành công',
        received_at: data.received_at,
      });
    } catch {
      res.status(200).json({
        status: 'success',
        message: 'Đã nhận dữ liệu metrics thành công',
        received_at: new Date().toISOString(),
      });
    }
  };

  public alertHardwareChange = async (req: Request, res: Response): Promise<void> => {
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
  };

  public getAllMetrics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.getAllDeviceMetricsUseCase.execute();
      const data = result.isSuccess ? result.getValue() : {};
      res.status(200).json(ApiResponse.success(data, 'Lấy dữ liệu metrics thiết bị thành công.'));
    } catch {
      res.status(200).json(ApiResponse.success({}, 'Chưa có dữ liệu metrics.'));
    }
  };
}
