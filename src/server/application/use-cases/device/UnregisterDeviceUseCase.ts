import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IIncidentReportRepository } from '../../../domain/repositories/IIncidentReportRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
import { IncidentReport } from '../../../domain/entities/IncidentReport';
import { Computer } from '../../../domain/entities/Computer';

export interface UnregisterDeviceInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  unregistered_at?: string;
  unregisteredAt?: string;
}

export interface UnregisterDeviceOutput {
  device_id: string;
  unregistered_at: string;
}

export class UnregisterDeviceUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private incidentRepo: IIncidentReportRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: UnregisterDeviceInput): Promise<Result<UnregisterDeviceOutput>> {
    try {
      let rawDeviceId = input.device_id || input.deviceId || input.mac_address || input.macAddress;
      let existingAgent = null;

      if (input.apiKey) {
        existingAgent = await this.deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(input.apiKey));
        if (existingAgent && !rawDeviceId) {
          rawDeviceId = existingAgent.deviceId;
        }
      }

      if (!rawDeviceId) {
        return Result.fail('Vui lòng cung cấp device_id, mac_address hoặc API Key.');
      }

      const macInput = input.mac_address || input.macAddress || rawDeviceId;
      const deviceId = normalizeDeviceId(rawDeviceId);
      const unregisteredAt = input.unregistered_at || input.unregisteredAt || new Date().toISOString();

      if (!existingAgent) {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = existingAgent ? await this.computerRepo.findById(existingAgent.computerId) : null;
      if (!computer && macInput) {
        computer = await this.computerRepo.findByMacAddress(macInput);
      }
      if (!computer && deviceId) {
        computer = await this.computerRepo.findByCode(deviceId);
      }
      if (!computer && rawDeviceId) {
        computer = await this.computerRepo.findAnyMatching(rawDeviceId);
      }

      const computerName = computer ? `${computer.name} (${computer.code})` : deviceId;

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();

        await this.deviceAgentRepo.deleteByDeviceId(deviceId, transaction);

        const incidentAlert = IncidentReport.create({
          code: `INC-UNREG-${Date.now().toString().slice(-6)}`,
          title: `[CẢNH BÁO HỆ THỐNG] Máy tính ${computerName} vừa hủy đăng ký`,
          description: `Máy tính ${computerName} (Device ID: ${deviceId}) đã gửi yêu cầu hủy đăng ký khỏi hệ thống vào lúc ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(unregisteredAt))}. Token xác thực đã bị thu hồi và máy tính đã được xóa khỏi hệ thống.`,
          severity: 'HIGH',
          status: 'OPEN',
          computerId: computer ? computer.id.toString() : undefined,
          reporterId: '00000000-0000-0000-0000-000000000000',
        });
        await this.incidentRepo.save(incidentAlert, transaction);

        if (computer) {
          computer.delete();
          await this.computerRepo.save(computer, transaction);
        }
      });

      return Result.ok({
        device_id: deviceId,
        unregistered_at: unregisteredAt,
      });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi hủy đăng ký thiết bị.');
    }
  }
}
