import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Computer } from '../../../domain/entities/Computer';
import crypto from 'crypto';

export interface RegisterDeviceInput {
  device_id: string; // The MAC address or unique ID sent by the agent
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
    private uow: IUnitOfWork
  ) {}

  public async execute(input: RegisterDeviceInput): Promise<Result<{ device_id: string; api_key: string }>> {
    try {
      // Find computer by mac address
      let computer = await this.computerRepo.findByMacAddress(input.mac_address);
      
      // If not found, find by hostname as fallback (or code)
      if (!computer) {
        computer = await this.computerRepo.findByCode(input.hostname);
      }

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        
        if (!computer) {
          // Auto-create computer as INACTIVE if it doesn't exist
          computer = Computer.create({
            code: input.hostname,
            name: input.hostname,
            cpu: input.cpu_model,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : undefined,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            macAddress: input.mac_address,
            ipAddress: input.ip_address,
            status: 'INACTIVE',
            note: 'Tự động đăng ký qua Agent.'
          });
        } else {
          // Update existing computer with latest specs
          computer.updateInformation({
            cpu: input.cpu_model,
            ram: input.total_ram_gb ? `${input.total_ram_gb}GB` : undefined,
            operatingSystem: input.os ? `${input.os} ${input.os_version || ''}`.trim() : undefined,
            macAddress: input.mac_address,
            ipAddress: input.ip_address
          });
        }

        await this.computerRepo.save(computer, transaction);
      });

      if (!computer) {
        return Result.fail('Không thể tạo hoặc lấy thông tin máy tính.');
      }

      // Generate a persistent or temporary API key
      // For this project, we can just return a fixed prefix + computer id to validate later
      const apiKey = `sk_live_${computer.id.toString()}`;
      
      return Result.ok({
        device_id: input.mac_address,
        api_key: apiKey
      });

    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi đăng ký thiết bị.');
    }
  }
}
