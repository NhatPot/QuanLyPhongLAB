import { IDeviceAgentRepository, DeviceMetrics } from '../../../domain/repositories/IDeviceAgentRepository';
import { Result } from '../../../shared/result/Result';

export class GetAllDeviceMetricsUseCase {
  constructor(private deviceAgentRepo: IDeviceAgentRepository) {}

  public async execute(): Promise<Result<Record<string, DeviceMetrics>>> {
    try {
      return Result.ok(await this.deviceAgentRepo.getAllMetrics());
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi tải dữ liệu giám sát thiết bị.');
    }
  }
}
