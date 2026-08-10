import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, normalizeMacAddress, safeJoinIps, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
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
  ip_address?: string;
  ipAddress?: string;
  ip_addresses?: string[];
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

      const macInput = input.mac_address || input.macAddress || rawDeviceId;
      const hostname = (input.hostname || '').trim();
      const username = input.username || input.user_id || input.userId || 'Người dùng';
      const fullName = input.full_name || input.fullName || '';
      const boundAt = input.login_at || input.loginAt || new Date().toISOString();
      const ipAddress = input.ip_address || input.ipAddress || (input.ip_addresses?.length ? safeJoinIps(input.ip_addresses) : undefined);

      const deviceId = rawDeviceId ? normalizeDeviceId(rawDeviceId) : undefined;
      if (!existingAgent && deviceId) {
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
      if (!computer && rawDeviceId) {
        computer = await this.computerRepo.findByCode(rawDeviceId);
      }

      const targetDeviceId = existingAgent?.deviceId || deviceId || (computer ? computer.code : undefined);

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        if (targetDeviceId) {
          await this.deviceAgentRepo.updateBoundUser(
            targetDeviceId,
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
            ipAddress: ipAddress || computer.ipAddress,
          });
          await this.computerRepo.save(computer, transaction);
        }
      });

      const displayTarget = computer ? computer.name : (targetDeviceId || hostname || 'Thiết bị');
      return Result.ok({
        bound_at: boundAt,
        message: `Đã liên kết tài khoản ${username} với máy tính ${displayTarget}. Trạng thái đang sử dụng.`,
      });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi liên kết tài khoản với thiết bị.');
    }
  }
}
