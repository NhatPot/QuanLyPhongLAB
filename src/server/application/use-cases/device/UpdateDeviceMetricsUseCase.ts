import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { DeviceMetrics, IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, isValidMacAddress, normalizeMacAddress, hashDeviceApiKey, safeJoinIps } from '../../../shared/utils/deviceIdentity';
import { Computer } from '../../../domain/entities/Computer';

export interface UpdateDeviceMetricsInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  timestamp?: string;
  user_token?: string;
  status?: DeviceMetrics['status'];
  ip_address?: string;
  ipAddress?: string;
  ip_addresses?: string[];
  ipv4_addresses?: string[];
  hostname?: string;
  installed_apps?: any;
  installed_software?: any;
  installedSoftware?: any;
  apps?: any;
  software?: any;
  applications?: any;
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

      const macInput = input.mac_address || input.macAddress || rawDeviceId;
      const ipAddress =
        input.ip_address ||
        input.ipAddress ||
        (Array.isArray(input.ipv4_addresses) && input.ipv4_addresses.length > 0 ? safeJoinIps(input.ipv4_addresses) : undefined) ||
        (Array.isArray(input.ip_addresses) && input.ip_addresses.length > 0 ? safeJoinIps(input.ip_addresses) : undefined) ||
        ((input.status as any)?.network?.ip_addresses?.length > 0 ? safeJoinIps((input.status as any).network.ip_addresses) : undefined);
      const hostname = input.hostname;
      const deviceId = rawDeviceId ? normalizeDeviceId(rawDeviceId) : 'UNKNOWN-DEVICE';

      if (!existingAgent && deviceId !== 'UNKNOWN-DEVICE') {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = null;
      if (macInput) {
        computer = await this.computerRepo.findByMacAddress(macInput);
      }
      if (!computer && existingAgent) {
        const agentComp = await this.computerRepo.findById(existingAgent.computerId);
        if (agentComp && (!macInput || !agentComp.macAddress || agentComp.macAddress === macInput)) {
          computer = agentComp;
        }
      }
      if (!computer && deviceId !== 'UNKNOWN-DEVICE') {
        computer = await this.computerRepo.findByCode(deviceId);
      }

      // Resolution for installed apps / software
      const rawAppsPayload =
        input.installed_apps ??
        input.installed_software ??
        input.installedSoftware ??
        input.apps ??
        input.software ??
        input.applications ??
        (input.status as any)?.installed_apps ??
        (input.status as any)?.installedSoftware ??
        (input.status as any)?.apps;

      let installedSoftware: string | undefined = undefined;
      const isAppsProvided = rawAppsPayload !== undefined && rawAppsPayload !== null;

      if (isAppsProvided) {
        if (typeof rawAppsPayload === 'string') {
          installedSoftware = rawAppsPayload.trim();
        } else if (Array.isArray(rawAppsPayload)) {
          installedSoftware = rawAppsPayload
            .map((app: any) => {
              if (typeof app === 'string') return app.trim();
              if (app && typeof app === 'object') {
                const name = (
                  app.name ||
                  app.displayName ||
                  app.display_name ||
                  app.appName ||
                  app.app_name ||
                  app.title ||
                  app.software ||
                  ''
                ).trim();
                const version = (app.version || app.ver || '').trim();
                if (name && version) return `${name} (v${version})`;
                return name;
              }
              return '';
            })
            .filter(Boolean)
            .join(', ');
        }
      }

      const metrics: DeviceMetrics = {
        timestamp: input.timestamp || receivedAt.toISOString(),
        status: input.status,
        installed_apps: Array.isArray(rawAppsPayload) ? rawAppsPayload : undefined,
        ipAddress,
      };

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
          const boundUsername = existingAgent?.currentUsername || (input.status as any)?.current_user;
          const boundFullName = existingAgent?.currentFullName;

          let targetStatus = (input.status as any)?.device_status || computer.status;
          let targetNote = computer.note;

          if (targetStatus === 'IN_USE' && boundUsername) {
            const userText = boundFullName ? `${boundUsername} (${boundFullName})` : boundUsername;
            targetNote = `Đang được sử dụng bởi ${userText}.`;
          } else if (targetStatus === 'IN_USE' && !computer.note?.includes('Đang được sử dụng bởi')) {
            targetNote = 'Đang được sử dụng.';
          } else if ((targetStatus === 'ACTIVE' || targetStatus === 'MAINTENANCE') && computer.status === 'IN_USE' && !computer.note?.includes('Đang được sử dụng bởi')) {
             targetStatus = 'ACTIVE';
             targetNote = 'Sẵn sàng sử dụng.';
          } else if (computer.status === 'IN_USE' && targetStatus !== 'IN_USE') {
             targetStatus = 'ACTIVE';
             targetNote = 'Sẵn sàng sử dụng.';
          }

          const hasStatusChange = targetStatus !== computer.status;
          const hasNoteChange = targetNote !== computer.note;
          const hasIpChange = Boolean(ipAddress && computer.ipAddress !== ipAddress);
          const hasAppsChange = Boolean(isAppsProvided && installedSoftware && installedSoftware !== computer.installedSoftware);

          if (hasStatusChange || hasNoteChange || hasIpChange || hasAppsChange) {
            computer.updateInformation({
              status: targetStatus,
              note: targetNote,
              ipAddress: ipAddress ?? computer.ipAddress,
              installedSoftware: isAppsProvided ? installedSoftware : computer.installedSoftware,
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
