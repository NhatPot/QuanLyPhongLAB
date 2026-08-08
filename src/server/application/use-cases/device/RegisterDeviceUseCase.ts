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
  total_ram_gb?: number;
  total_disk_gb?: number;
  disk_size_gb?: number;
  uuid?: string;
  registered_at?: string;
  ip_address?: string;
  ipAddress?: string;
  ip_addresses?: string[];
}

export class RegisterDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: RegisterDeviceInput): Promise<Result<{ device_id: string; api_key: string }>> {
    try {
      const rawDeviceId = input.device_id || input.deviceId || input.mac_address || input.macAddress;
      const rawMac = input.mac_address || input.macAddress || input.device_id || input.deviceId;
      const hostname = (input.hostname || input.name || input.code || 'UNKNOWN-HOST').trim();

      if (!rawDeviceId && !rawMac) {
        return Result.fail('Vui lòng cung cấp device_id hoặc mac_address để đăng ký thiết bị.');
      }

      const deviceId = normalizeDeviceId(rawDeviceId || rawMac || '');
      let macAddress: string | undefined;
      if (rawMac && isValidMacAddress(rawMac)) {
        macAddress = normalizeMacAddress(rawMac);
      } else if (rawDeviceId && isValidMacAddress(rawDeviceId)) {
        macAddress = normalizeMacAddress(rawDeviceId);
      }

      const existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      let computer: Computer | null = null;
      if (existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }
      if (!computer && macAddress) {
        computer = await this.computerRepo.findIncludingDeletedByMacAddress(macAddress);
      }
      if (!computer && hostname) {
        computer = await this.computerRepo.findAnyMatching(hostname);
      }

      if (computer && computer.deletedAt) {
        computer.restore();
      }

      const apiKey = generateDeviceApiKey();
      const registeredAt = input.registered_at ? new Date(input.registered_at) : new Date();
      const ipAddress = input.ip_address || input.ipAddress || (input.ip_addresses && input.ip_addresses[0]);
      const gpuModel = input.gpu_model || input.gpu;
      const totalDisk = input.total_disk_gb || input.disk_size_gb;

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (!computer) {
          computer = Computer.create({
            code: hostname,
            name: hostname,
            cpu: input.cpu_model,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : undefined,
            storage: totalDisk ? `${totalDisk}GB` : undefined,
            gpu: gpuModel,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            macAddress,
            ipAddress,
            status: 'ACTIVE',
            note: 'Tự động đăng ký qua Agent.',
          });
        } else {
          computer.updateInformation({
            cpu: input.cpu_model || computer.cpu,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : computer.ram,
            storage: totalDisk ? `${totalDisk}GB` : computer.storage,
            gpu: gpuModel || computer.gpu,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : computer.operatingSystem,
            macAddress: macAddress || computer.macAddress,
            ipAddress: ipAddress || computer.ipAddress,
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
