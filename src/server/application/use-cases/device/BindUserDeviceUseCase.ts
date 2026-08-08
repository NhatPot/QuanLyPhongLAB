import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, isValidMacAddress, normalizeMacAddress, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
import { Computer } from '../../../domain/entities/Computer';

export interface BindUserDeviceInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  user_id?: string;
  userId?: string;
  username?: string;
  full_name?: string;
  fullName?: string;
  login_at?: string;
  loginAt?: string;
  hostname?: string;
}

export class BindUserDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: BindUserDeviceInput): Promise<Result<{ bound_at: string; message: string }>> {
    try {
      let rawDeviceId = input.device_id || input.deviceId || input.mac_address || input.macAddress;
      let existingAgent = null;

      if (input.apiKey) {
        existingAgent = await this.deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(input.apiKey));
        if (existingAgent && !rawDeviceId) {
          rawDeviceId = existingAgent.deviceId;
        }
      }

      const hostname = (input.hostname || '').trim();
      const username = input.username || input.user_id || input.userId || 'Người dùng';
      const fullName = input.full_name || input.fullName || '';
      const boundAt = input.login_at || input.loginAt || new Date().toISOString();

      const deviceId = rawDeviceId ? normalizeDeviceId(rawDeviceId) : undefined;
      if (!existingAgent && deviceId) {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = null;
      if (existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }

      if (!computer && rawDeviceId) {
        let macAddress: string | undefined;
        if (isValidMacAddress(rawDeviceId)) {
          macAddress = normalizeMacAddress(rawDeviceId);
        }
        if (macAddress) {
          computer = await this.computerRepo.findByMacAddress(macAddress);
        }
      }
      if (!computer && hostname) {
        computer = await this.computerRepo.findByCode(hostname);
      }

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (deviceId) {
          await this.deviceAgentRepo.updateBoundUser(
            deviceId,
            {
              userId: input.user_id || input.userId,
              username,
              fullName,
              boundAt: new Date(boundAt),
            },
            transaction,
          );
        }

        if (computer) {
          const userText = fullName ? `${username} (${fullName})` : username;
          computer.updateInformation({
            status: 'IN_USE',
            note: `Đang được sử dụng bởi ${userText}. Liên kết lúc ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(boundAt))}.`.trim(),
          });
          await this.computerRepo.save(computer, transaction);
        }
      });

      const displayTarget = computer ? computer.name : (deviceId || hostname || 'Thiết bị');
      return Result.ok({
        bound_at: boundAt,
        message: `Đã liên kết tài khoản ${username} với máy tính ${displayTarget}`,
      });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi liên kết tài khoản với thiết bị.');
    }
  }
}
