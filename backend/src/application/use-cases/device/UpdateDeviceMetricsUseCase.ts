import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { DeviceMetrics, IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeMacAddress } from '../../../shared/utils/deviceIdentity';

export interface UpdateDeviceMetricsInput {
  device_id: string;
  timestamp?: string;
  status?: DeviceMetrics['status'];
  installed_apps?: DeviceMetrics['installed_apps'];
  ip_address?: string;
}

export interface UpdateDeviceMetricsOutput {
  received_at: string;
}

export class UpdateDeviceMetricsUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: UpdateDeviceMetricsInput): Promise<Result<UpdateDeviceMetricsOutput>> {
    try {
      const deviceId = normalizeMacAddress(input.device_id);
      const computer = await this.computerRepo.findByMacAddress(deviceId);
      if (!computer) {
        return Result.fail(`Không tìm thấy thiết bị có MAC '${input.device_id}'. Bạn cần đăng ký thiết bị trước.`);
      }

      const receivedAt = new Date();
      const metrics: DeviceMetrics = {
        timestamp: input.timestamp || receivedAt.toISOString(),
        status: input.status,
        installed_apps: input.installed_apps,
        ipAddress: input.ip_address,
      };
      const installedSoftware = input.installed_apps?.map((app) => app.name).join(', ');

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.deviceAgentRepo.updateMetrics(deviceId, metrics, receivedAt, transaction);

        const hasIpChange = Boolean(input.ip_address && computer.ipAddress !== input.ip_address);
        const hasSoftwareChange = installedSoftware !== undefined && computer.installedSoftware !== installedSoftware;
        if (hasIpChange || hasSoftwareChange) {
          computer.updateInformation({
            ipAddress: input.ip_address ?? computer.ipAddress,
            installedSoftware: installedSoftware ?? computer.installedSoftware,
          });
          await this.computerRepo.save(computer, transaction);
        }
      });

      return Result.ok({ received_at: receivedAt.toISOString() });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi cập nhật metrics thiết bị.');
    }
  }
}
