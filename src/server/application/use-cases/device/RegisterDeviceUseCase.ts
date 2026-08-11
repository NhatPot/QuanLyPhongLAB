import { Computer } from '../../../domain/entities/Computer';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import {
  generateDeviceApiKey,
  hashDeviceApiKey,
  normalizeDeviceId,
  isValidMacAddress,
  normalizeMacAddress,
  safeJoinIps,
} from '../../../shared/utils/deviceIdentity';

export interface RegisterDeviceInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  hostname?: string;
  name?: string;
  code?: string;
  os?: string;
  os_version?: string;
  platform?: string;
  arch?: string;
  cpu_model?: string;
  cpu_cores?: number;
  gpu_model?: string;
  gpu?: string;
  gpus?: (string | { name?: string; model?: string; vram_gb?: number; vramMb?: number; vendor?: string })[];
  gpu_list?: { vendor?: string; model?: string; vramMb?: number; vram_gb?: number; name?: string }[];
  total_ram_gb?: number;
  total_disk_gb?: number;
  disk_size_gb?: number;
  storage?: string;
  disks?: (string | { device?: string; name?: string; type?: string; sizeGb?: number; size_gb?: number })[];
  disk_info?: { mount?: string; sizeGb?: number; size_gb?: number; usedGb?: number; usePercent?: number }[];
  uuid?: string;
  registered_at?: string;
  ip_address?: string;
  ipAddress?: string;
  ip_addresses?: string[];
  ipv4_addresses?: string[];
  status?: string;
  device_status?: string;
  is_in_use?: boolean;
  current_user?: string;
  user_token?: string;
  installed_apps?: any;
  installed_software?: any;
  installedSoftware?: any;
  apps?: any;
  software?: any;
  applications?: any;
}

export class RegisterDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: RegisterDeviceInput): Promise<Result<{ device_id: string; api_key: string }>> {
    try {
      const rawUuid = input.uuid || input.device_id || input.deviceId || input.mac_address || input.macAddress;
      const rawMac = input.mac_address || input.macAddress;
      const hostname = (input.hostname || input.name || input.code || 'UNKNOWN-HOST').trim();

      if (!rawUuid && !rawMac) {
        return Result.fail('Vui lòng cung cấp uuid hoặc device_id để đăng ký thiết bị.');
      }

      const deviceId = normalizeDeviceId(rawUuid || rawMac || '');
      let macAddress: string | undefined = deviceId;
      if (rawMac && isValidMacAddress(rawMac)) {
        macAddress = normalizeMacAddress(rawMac);
      } else if (rawUuid) {
        macAddress = normalizeDeviceId(rawUuid);
      }

      const existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      let computer: Computer | null = null;
      if (existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }
      if (!computer && macAddress) {
        computer = await this.computerRepo.findIncludingDeletedByMacAddress(macAddress);
      }
      if (!computer && deviceId) {
        computer = await this.computerRepo.findIncludingDeletedByMacAddress(deviceId);
      }
      if (!computer && hostname && hostname !== 'UNKNOWN-HOST') {
        const candidate = await this.computerRepo.findAnyMatching(hostname);
        if (candidate) {
          if (!candidate.macAddress || !macAddress || candidate.macAddress === macAddress || candidate.macAddress === deviceId) {
            computer = candidate;
          }
        }
      }

      if (computer && computer.deletedAt) {
        computer.restore();
      }

      const apiKey = generateDeviceApiKey();
      const registeredAt = input.registered_at ? new Date(input.registered_at) : new Date();

      // Resolution for IP
      const ipAddress =
        input.ip_address ||
        input.ipAddress ||
        (Array.isArray(input.ipv4_addresses) && input.ipv4_addresses.length > 0 ? safeJoinIps(input.ipv4_addresses) : undefined) ||
        (Array.isArray(input.ip_addresses) && input.ip_addresses.length > 0 ? safeJoinIps(input.ip_addresses) : undefined);

      // Resolution for GPU
      let gpuModel = input.gpu_model || input.gpu;
      const gpuItems: string[] = [];

      if (Array.isArray(input.gpu_list) && input.gpu_list.length > 0) {
        input.gpu_list.forEach((g) => {
          const name = g.model || g.name || [g.vendor, 'GPU'].filter(Boolean).join(' ');
          if (name) {
            let vramText = '';
            if (g.vramMb && g.vramMb > 0) {
              const gb = g.vramMb >= 1024 ? `${(g.vramMb / 1024).toFixed(g.vramMb % 1024 === 0 ? 0 : 1)}GB` : `${g.vramMb}MB`;
              vramText = ` (${gb})`;
            } else if (g.vram_gb && g.vram_gb > 0) {
              vramText = ` (${g.vram_gb}GB)`;
            }
            gpuItems.push(`${name}${vramText}`);
          }
        });
      } else if (Array.isArray(input.gpus) && input.gpus.length > 0) {
        input.gpus.forEach((g) => {
          if (typeof g === 'string' && g.trim()) {
            gpuItems.push(g.trim());
          } else if (typeof g === 'object' && g) {
            const name = g.model || g.name;
            if (name) {
              const vramText = g.vram_gb ? ` (${g.vram_gb}GB)` : g.vramMb ? ` (${(g.vramMb / 1024).toFixed(0)}GB)` : '';
              gpuItems.push(`${name}${vramText}`);
            }
          }
        });
      }

      if (gpuItems.length > 0) {
        gpuModel = gpuItems.join(' + ');
      }

      // Resolution for Storage / Disks
      let storageText = input.storage;
      const diskItems: string[] = [];

      if (Array.isArray(input.disks) && input.disks.length > 0) {
        input.disks.forEach((d) => {
          if (typeof d === 'string' && d.trim()) {
            diskItems.push(d.trim());
          } else if (typeof d === 'object' && d) {
            const size = d.sizeGb ?? d.size_gb;
            const sizeStr = size ? `${size % 1 === 0 ? size : size.toFixed(1)}GB` : '';
            const typeStr = d.type || '';
            const nameStr = d.name ? `(${d.name})` : '';
            const label = [sizeStr, typeStr, nameStr].filter(Boolean).join(' ').trim();
            if (label) diskItems.push(label);
          }
        });
      } else if (Array.isArray(input.disk_info) && input.disk_info.length > 0) {
        input.disk_info.forEach((d) => {
          const size = d.sizeGb ?? d.size_gb;
          if (size) {
            const mountStr = d.mount ? `Ổ ${d.mount}` : '';
            const sizeStr = `${size % 1 === 0 ? size : size.toFixed(1)}GB`;
            diskItems.push([mountStr, sizeStr].filter(Boolean).join(' '));
          }
        });
      }

      if (diskItems.length > 0) {
        storageText = diskItems.join(' + ');
      }
      if (!storageText) {
        const totalDisk = input.total_disk_gb || input.disk_size_gb;
        if (totalDisk) storageText = `${totalDisk % 1 === 0 ? totalDisk : totalDisk.toFixed(1)}GB`;
      }

      // Resolution for RAM
      let ramText: string | undefined;
      if (input.total_ram_gb && input.total_ram_gb > 0) {
        const formattedRam = input.total_ram_gb % 1 === 0 ? input.total_ram_gb : input.total_ram_gb.toFixed(1);
        ramText = `${formattedRam}GB`;
      }

      // Resolution for Installed Apps / Software from any variant in payload
      const rawAppsPayload =
        input.installed_apps ??
        input.installed_software ??
        input.installedSoftware ??
        input.apps ??
        input.software ??
        input.applications;

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

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (!computer) {
          let computerCode = hostname;
          const existingCodeComp = await this.computerRepo.findByCode(computerCode);
          if (existingCodeComp && (!macAddress || existingCodeComp.macAddress !== macAddress)) {
            const suffix = macAddress ? macAddress.replace(/:/g, '') : Date.now().toString().slice(-4);
            computerCode = `${hostname}-${suffix}`;
          }

          computer = Computer.create({
            code: computerCode,
            name: hostname !== 'UNKNOWN-HOST' ? hostname : (macAddress ? `Máy ${macAddress}` : computerCode),
            cpu: input.cpu_model,
            ram: ramText,
            storage: storageText,
            gpu: gpuModel,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            installedSoftware,
            macAddress,
            ipAddress,
            status: input.status === 'IN_USE' ? 'IN_USE' : 'ACTIVE',
            note: input.status === 'IN_USE' && input.current_user ? `Đang được sử dụng bởi ${input.current_user}.` : 'Tự động đăng ký qua Agent.',
          });
        } else {
          const newStatus = input.status === 'IN_USE' ? 'IN_USE' : computer.status;
          const newNote = input.status === 'IN_USE' && input.current_user ? `Đang được sử dụng bởi ${input.current_user}.` : computer.note;
          
          computer.updateInformation({
            cpu: input.cpu_model || computer.cpu,
            ram: ramText || computer.ram,
            storage: storageText || computer.storage,
            gpu: gpuModel || computer.gpu,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : computer.operatingSystem,
            installedSoftware: isAppsProvided ? installedSoftware : computer.installedSoftware,
            macAddress: macAddress || computer.macAddress,
            ipAddress: ipAddress || computer.ipAddress,
            status: newStatus,
            note: newNote,
          });
        }

        await this.computerRepo.save(computer, transaction);
        await this.deviceAgentRepo.upsertRegistration({
          computerId: computer.id.toString(),
          deviceId,
          apiKeyHash: hashDeviceApiKey(apiKey),
          hostname,
          agentUuid: input.uuid,
          platform: input.platform,
          architecture: input.arch,
          cpuCores: input.cpu_cores,
          registeredAt,
        }, transaction);
      });

      return Result.ok({ device_id: deviceId, api_key: apiKey });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi đăng ký thiết bị.');
    }
  }
}
