import { Computer } from '../../../domain/entities/Computer';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import {
  generateDeviceApiKey,
  hashDeviceApiKey,
  normalizeMacAddress,
} from '../../../shared/utils/deviceIdentity';

export interface RegisterDeviceInput {
  device_id: string;
  hostname: string;
  os?: string;
  os_version?: string;
  platform?: string;
  arch?: string;
  cpu_model?: string;
  cpu_cores?: number;
  total_ram_gb?: number;
  mac_address: string;
  uuid?: string;
  registered_at?: string;
  ip_address?: string;
}

export class RegisterDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: RegisterDeviceInput): Promise<Result<{ device_id: string; api_key: string }>> {
    try {
      const deviceId = normalizeMacAddress(input.device_id);
      const macAddress = normalizeMacAddress(input.mac_address);
      if (deviceId !== macAddress) {
        return Result.fail('device_id và mac_address phải cùng xác định một thiết bị.');
      }

      let computer = await this.computerRepo.findByMacAddress(macAddress);
      if (!computer) {
        computer = await this.computerRepo.findByCode(input.hostname);
      }

      const apiKey = generateDeviceApiKey();
      const registeredAt = input.registered_at ? new Date(input.registered_at) : new Date();

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (!computer) {
          computer = Computer.create({
            code: input.hostname.trim(),
            name: input.hostname.trim(),
            cpu: input.cpu_model,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : undefined,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            macAddress,
            ipAddress: input.ip_address,
            status: 'INACTIVE',
            note: 'Tự động đăng ký qua Agent.',
          });
        } else {
          computer.updateInformation({
            cpu: input.cpu_model,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : undefined,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            macAddress,
            ipAddress: input.ip_address,
          });
        }

        await this.computerRepo.save(computer, transaction);
        await this.deviceAgentRepo.upsertRegistration({
          computerId: computer.id.toString(),
          deviceId,
          apiKeyHash: hashDeviceApiKey(apiKey),
          hostname: input.hostname,
          agentUuid: input.uuid,
          platform: input.platform,
          architecture: input.arch,
          cpuCores: input.cpu_cores,
          registeredAt,
        }, transaction);
      });

      return Result.ok({ device_id: input.device_id.trim(), api_key: apiKey });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi đăng ký thiết bị.');
    }
  }
}
