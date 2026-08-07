import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { DeviceMetricsCache } from '../../../infrastructure/cache/DeviceMetricsCache';

export interface UpdateDeviceMetricsInput {
  device_id: string; // The UUID of the computer in our DB
  timestamp?: string;
  status?: {
    cpu?: { usage?: number; temperature?: number; cores?: number[] };
    ram?: { used?: number; total?: number; free?: number; usagePercent?: number };
    disk?: { used?: number; total?: number; usagePercent?: number; partitions?: any[] };
    network?: { rxBytes?: number; txBytes?: number; rxSec?: number; txSec?: number };
  };
  installed_apps?: Array<{ name: string; version?: string; publisher?: string }>;
  ip_address?: string; // Captured from request connection
}

export class UpdateDeviceMetricsUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private uow: IUnitOfWork
  ) {}

  public async execute(input: UpdateDeviceMetricsInput): Promise<Result<void>> {
    try {
      // Since the agent uses MAC address as device_id
      let computer = await this.computerRepo.findByMacAddress(input.device_id);
      
      // Fallback in case it's actually a UUID
      if (!computer && input.device_id.length === 36) {
        computer = await this.computerRepo.findById(input.device_id);
      }

      if (!computer) {
        return Result.fail(`Không tìm thấy thiết bị có ID hoặc MAC '${input.device_id}'. Bạn cần đăng ký thiết bị trước.`);
      }

      // Update transient metrics in memory cache
      DeviceMetricsCache.getInstance().setMetrics(input.device_id, {
        timestamp: input.timestamp || new Date().toISOString(),
        status: input.status,
        installed_apps: input.installed_apps,
        ipAddress: input.ip_address
      });

      // Update static information in database (IP address, apps list if changed, etc)
      // We will stringify installed_apps as a comma-separated list or JSON.
      let installedSoftwareStr = computer.installedSoftware;
      if (input.installed_apps) {
        // Just save names to keep it simple, or JSON.stringify(input.installed_apps)
        installedSoftwareStr = input.installed_apps.map(app => app.name).join(', ');
      }

      let hasChanges = false;
      if (input.ip_address && computer.ipAddress !== input.ip_address) {
        hasChanges = true;
      }
      if (installedSoftwareStr && computer.installedSoftware !== installedSoftwareStr) {
        hasChanges = true;
      }

      if (hasChanges) {
        await this.uow.complete(async () => {
          const transaction = this.uow.getTransaction();
          computer.updateInformation({
            ipAddress: input.ip_address || computer.ipAddress,
            installedSoftware: installedSoftwareStr || computer.installedSoftware
          });
          await this.computerRepo.save(computer, transaction);
        });
      }

      return Result.ok(undefined);
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi cập nhật metrics thiết bị.');
    }
  }
}
