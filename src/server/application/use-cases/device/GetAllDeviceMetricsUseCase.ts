import { IDeviceAgentRepository, DeviceMetrics } from '../../../domain/repositories/IDeviceAgentRepository';
import { Result } from '../../../shared/result/Result';

export class GetAllDeviceMetricsUseCase {
  constructor(private deviceAgentRepo: IDeviceAgentRepository) {}

  public async execute(): Promise<Result<Record<string, DeviceMetrics>>> {
    try {
      const metrics = await this.deviceAgentRepo.getAllMetrics();
      return Result.ok(metrics || {});
    } catch {
      return Result.ok({});
    }
  }
}
