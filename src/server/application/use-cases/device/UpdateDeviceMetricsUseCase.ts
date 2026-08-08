import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { DeviceMetrics, IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, isValidMacAddress, normalizeMacAddress, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
import { Computer } from '../../../domain/entities/Computer';

export interface UpdateDeviceMetricsInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  timestamp?: string;
  status?: DeviceMetrics['status'];
  installed_apps?: DeviceMetrics['installed_apps'];
  ip_address?: string;
  ipAddress?: string;
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
      const receivedAt = new Date();
      let rawDeviceId = input.device_id || input.deviceId || input.mac_address || input.macAddress;
      let existingAgent = null;

      if (input.apiKey) {
        existingAgent = await this.deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(input.apiKey));
        if (existingAgent && !rawDeviceId) {
          rawDeviceId = existingAgent.deviceId;
        }
      }

      if (!rawDeviceId) {
        rawDeviceId = 'UNKNOWN-DEVICE';
      }

      const deviceId = normalizeDeviceId(rawDeviceId);
      if (!existingAgent && deviceId !== 'UNKNOWN-DEVICE') {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = null;
      if (existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }

      if (!computer && deviceId !== 'UNKNOWN-DEVICE') {
        let macAddress: string | undefined;
        if (isValidMacAddress(rawDeviceId)) {
          macAddress = normalizeMacAddress(rawDeviceId);
        }
        if (macAddress) {
          computer = await this.computerRepo.findByMacAddress(macAddress);
        }
        if (!computer) {
          computer = await this.computerRepo.findByCode(deviceId);
        }
      }

      const ipAddress = input.ip_address || input.ipAddress;
      const metrics: DeviceMetrics = {
        timestamp: input.timestamp || receivedAt.toISOString(),
        status: input.status,
        installed_apps: input.installed_apps,
        ipAddress,
      };
      const installedSoftware = input.installed_apps?.map((app) => app.name).join(', ');

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        if (deviceId !== 'UNKNOWN-DEVICE') {
          try {
            await this.deviceAgentRepo.updateMetrics(deviceId, metrics, receivedAt, transaction);
          } catch {
            // Ignore metrics update error
          }
        }

        if (computer) {
          const boundUsername = existingAgent?.currentUsername;
          const boundFullName = existingAgent?.currentFullName;
          let targetStatus = computer.status;
          let targetNote = computer.note;

          if (boundUsername) {
            targetStatus = 'IN_USE';
            const userText = boundFullName ? `${boundUsername} (${boundFullName})` : boundUsername;
            targetNote = `Đang được sử dụng bởi ${userText}.`;
          }

          const hasStatusChange = targetStatus !== computer.status;
          const hasIpChange = Boolean(ipAddress && computer.ipAddress !== ipAddress);
          const hasSoftwareChange = installedSoftware !== undefined && computer.installedSoftware !== installedSoftware;

          if (hasStatusChange || hasIpChange || hasSoftwareChange) {
            computer.updateInformation({
              status: targetStatus,
              note: targetNote ?? computer.note,
              ipAddress: ipAddress ?? computer.ipAddress,
              installedSoftware: installedSoftware ?? computer.installedSoftware,
            });
            await this.computerRepo.save(computer, transaction);
          }
        }
      });

      return Result.ok({ received_at: receivedAt.toISOString() });
    } catch {
      return Result.ok({ received_at: new Date().toISOString() });
    }
  }
}
