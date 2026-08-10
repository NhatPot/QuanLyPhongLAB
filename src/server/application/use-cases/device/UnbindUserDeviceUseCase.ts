import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, isValidMacAddress, normalizeMacAddress, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
import { Computer } from '../../../domain/entities/Computer';

export interface UnbindUserDeviceInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  user_id?: string;
  userId?: string;
  username?: string;
  logout_at?: string;
  logoutAt?: string;
}

export class UnbindUserDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: UnbindUserDeviceInput): Promise<Result<{ unbound_at: string; message: string }>> {
    try {
      let rawDeviceId = input.device_id || input.deviceId || input.mac_address || input.macAddress;
      let existingAgent = null;

      if (input.apiKey) {
        existingAgent = await this.deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(input.apiKey));
        if (existingAgent && !rawDeviceId) {
          rawDeviceId = existingAgent.deviceId;
        }
      }

      const unboundAt = input.logout_at || input.logoutAt || new Date().toISOString();

      const deviceId = rawDeviceId ? normalizeDeviceId(rawDeviceId) : undefined;
      if (!existingAgent && deviceId) {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = null;
      if (rawDeviceId && isValidMacAddress(rawDeviceId)) {
        computer = await this.computerRepo.findByMacAddress(normalizeMacAddress(rawDeviceId));
      }
      if (!computer && existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }
      if (!computer && rawDeviceId) {
        computer = await this.computerRepo.findByCode(rawDeviceId);
      }

      const targetDeviceId = existingAgent?.deviceId || deviceId || (computer ? computer.code : undefined);

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (targetDeviceId) {
          await this.deviceAgentRepo.updateBoundUser(targetDeviceId, null, transaction);
        }

        if (computer) {
          computer.updateInformation({
            status: 'ACTIVE',
            note: `Đã đăng xuất phiên dùng lúc ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(unboundAt))}.`.trim(),
          });
          await this.computerRepo.save(computer, transaction);
        }
      });

      return Result.ok({
        unbound_at: unboundAt,
        message: 'Đã hủy phiên sử dụng máy tính thành công',
      });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi hủy liên kết phiên máy tính.');
    }
  }
}
