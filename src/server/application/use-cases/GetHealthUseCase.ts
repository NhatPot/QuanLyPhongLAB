import { Result } from '../../shared/result/Result';

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

export class GetHealthUseCase {
  public async execute(): Promise<Result<HealthStatus>> {
    const data: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    return Result.ok(data);
  }
}
