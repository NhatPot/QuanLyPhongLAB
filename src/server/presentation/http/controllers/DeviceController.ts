import { Request, Response } from 'express';
import { BindUserDeviceUseCase } from '../../../application/use-cases/device/BindUserDeviceUseCase';
import { GetAllDeviceMetricsUseCase } from '../../../application/use-cases/device/GetAllDeviceMetricsUseCase';
import { RegisterDeviceUseCase } from '../../../application/use-cases/device/RegisterDeviceUseCase';
import { ReportHardwareChangeUseCase } from '../../../application/use-cases/device/ReportHardwareChangeUseCase';
import { UnbindUserDeviceUseCase } from '../../../application/use-cases/device/UnbindUserDeviceUseCase';
import { UnregisterDeviceUseCase } from '../../../application/use-cases/device/UnregisterDeviceUseCase';
import { UpdateDeviceMetricsUseCase } from '../../../application/use-cases/device/UpdateDeviceMetricsUseCase';
import { ApiResponse } from '../presenters/ApiResponse';
import { DeviceApiLogger } from '../../../utils/device-api-logger';
import { safeJoinIps } from '../../../shared/utils/deviceIdentity';

const extractIpFromReq = (req: Request): string | undefined => {
  const body = req.body || {};
  const bodyIp =
    body.ip_address ||
    body.ipAddress ||
    (Array.isArray(body.ipv4_addresses) && body.ipv4_addresses.length > 0 ? safeJoinIps(body.ipv4_addresses) : undefined) ||
    (Array.isArray(body.ip_addresses) && body.ip_addresses.length > 0 ? safeJoinIps(body.ip_addresses) : undefined) ||
    (Array.isArray(body.status?.network?.ip_addresses) && body.status.network.ip_addresses.length > 0 ? safeJoinIps(body.status.network.ip_addresses) : undefined);

  if (typeof bodyIp === 'string' && bodyIp.trim()) {
    return bodyIp.trim();
  }

  if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1' && req.ip !== '::ffff:127.0.0.1') {
    return req.ip;
  }

  return undefined;
};

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
    let responseData: any;
    let statusCode = 200;
    try {
      const payload = {
        ...req.body,
        ip_address: extractIpFromReq(req),
      };

      const result = await this.registerDeviceUseCase.execute(payload);
      if (result.isFailure) {
        statusCode = 400;
        responseData = { status: 'error', message: result.getError() };
        res.status(statusCode).json(responseData);
      } else {
        statusCode = 200;
        responseData = { status: 'success', message: 'Đăng ký thiết bị thành công', ...result.getValue() };
        res.status(statusCode).json(responseData);
      }
    } catch (error: any) {
      statusCode = 400;
      responseData = { status: 'error', message: error?.message || 'Không thể đăng ký thiết bị.' };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/register',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public unregister = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    let statusCode = 200;
    try {
      const result = await this.unregisterDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        statusCode = 400;
        responseData = { status: 'error', message: result.getError() };
        res.status(statusCode).json(responseData);
      } else {
        statusCode = 200;
        responseData = { status: 'success', message: 'Hủy đăng ký thiết bị thành công', ...result.getValue() };
        res.status(statusCode).json(responseData);
      }
    } catch (error: any) {
      statusCode = 400;
      responseData = { status: 'error', message: error?.message || 'Không thể hủy đăng ký thiết bị.' };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/unregister',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public bindUser = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    let statusCode = 200;
    try {
      const result = await this.bindUserDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        statusCode = 400;
        responseData = { status: 'error', message: result.getError() };
        res.status(statusCode).json(responseData);
      } else {
        const data = result.getValue();
        statusCode = 200;
        responseData = { status: 'success', message: data.message, bound_at: data.bound_at };
        res.status(statusCode).json(responseData);
      }
    } catch (error: any) {
      statusCode = 400;
      responseData = { status: 'error', message: error?.message || 'Không thể liên kết tài khoản với máy tính.' };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/bind-user',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public unbindUser = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    let statusCode = 200;
    try {
      const result = await this.unbindUserDeviceUseCase.execute(req.body);
      if (result.isFailure) {
        statusCode = 400;
        responseData = { status: 'error', message: result.getError() };
        res.status(statusCode).json(responseData);
      } else {
        statusCode = 200;
        responseData = { status: 'success', message: 'Đã hủy phiên sử dụng máy tính thành công' };
        res.status(statusCode).json(responseData);
      }
    } catch (error: any) {
      statusCode = 400;
      responseData = { status: 'error', message: error?.message || 'Không thể hủy phiên sử dụng máy tính.' };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/unbind-user',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public updateMetrics = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    let statusCode = 200;
    try {
      const authHeader = req.headers['authorization'] || req.headers['x-api-key'];
      let apiKey: string | undefined;
      if (typeof authHeader === 'string') {
        apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
      }

      const payload = {
        ...req.body,
        apiKey,
        ip_address: extractIpFromReq(req),
      };
      const result = await this.updateDeviceMetricsUseCase.execute(payload);
      const data = result.isSuccess ? result.getValue() : { received_at: new Date().toISOString() };

      statusCode = 200;
      responseData = { status: 'success', message: 'Đã nhận dữ liệu metrics thành công', received_at: data.received_at };
      res.status(statusCode).json(responseData);
    } catch {
      statusCode = 200;
      responseData = { status: 'success', message: 'Đã nhận dữ liệu metrics thành công', received_at: new Date().toISOString() };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/metrics',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public alertHardwareChange = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    let statusCode = 200;
    try {
      const result = await this.reportHardwareChangeUseCase.execute(req.body);
      if (result.isFailure) {
        statusCode = 400;
        responseData = { status: 'error', message: result.getError() };
        res.status(statusCode).json(responseData);
      } else {
        statusCode = 200;
        responseData = { status: 'alert_received', message: 'Báo cáo thay đổi cấu hình phần cứng đã được ghi nhận thành công', ...result.getValue() };
        res.status(statusCode).json(responseData);
      }
    } catch {
      statusCode = 500;
      responseData = { status: 'error', message: 'Internal Server Error' };
      res.status(statusCode).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'POST',
        endpoint: '/api/devices/alert-hardware-change',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: req.body,
        statusCode,
        response: responseData,
      });
    }
  };

  public getAllMetrics = async (req: Request, res: Response): Promise<void> => {
    let responseData: any;
    try {
      const result = await this.getAllDeviceMetricsUseCase.execute();
      const data = result.isSuccess ? result.getValue() : {};
      responseData = ApiResponse.success(data, 'Lấy dữ liệu metrics thiết bị thành công.');
      res.status(200).json(responseData);
    } catch {
      responseData = ApiResponse.success({}, 'Chưa có dữ liệu metrics.');
      res.status(200).json(responseData);
    } finally {
      DeviceApiLogger.log({
        method: 'GET',
        endpoint: '/api/devices/metrics',
        ip: extractIpFromReq(req),
        userAgent: req.get('user-agent'),
        requestBody: null,
        statusCode: 200,
        response: responseData,
      });
    }
  };
}
