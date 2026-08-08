import crypto from 'crypto';
import { IncidentReport } from '../../../domain/entities/IncidentReport';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IIncidentReportRepository } from '../../../domain/repositories/IIncidentReportRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeDeviceId, hashDeviceApiKey } from '../../../shared/utils/deviceIdentity';
import { Computer } from '../../../domain/entities/Computer';

const SYSTEM_DEVICE_REPORTER_ID = '00000000-0000-0000-0000-000000000000';

export interface ReportHardwareChangeInput {
  device_id?: string;
  deviceId?: string;
  mac_address?: string;
  macAddress?: string;
  apiKey?: string;
  alert_type?: string;
  timestamp?: string;
  changes?: Array<{ field: string; old: unknown; new: unknown }>;
  previous_hardware?: unknown;
  current_hardware?: unknown;
}

export interface ReportHardwareChangeOutput {
  alert_time: string;
}

export class ReportHardwareChangeUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private deviceAgentRepo: IDeviceAgentRepository,
    private incidentRepo: IIncidentReportRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: ReportHardwareChangeInput): Promise<Result<ReportHardwareChangeOutput>> {
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
      const deviceId = rawDeviceId ? normalizeDeviceId(rawDeviceId) : 'UNKNOWN-DEVICE';
      if (!existingAgent && deviceId !== 'UNKNOWN-DEVICE') {
        existingAgent = await this.deviceAgentRepo.findByDeviceId(deviceId);
      }

      let computer: Computer | null = null;
      if (existingAgent) {
        computer = await this.computerRepo.findById(existingAgent.computerId);
      }
      if (!computer && macInput) {
        computer = await this.computerRepo.findByMacAddress(macInput);
      }
      if (!computer && deviceId !== 'UNKNOWN-DEVICE') {
        computer = await this.computerRepo.findByCode(deviceId);
      }
      if (!computer && rawDeviceId) {
        computer = await this.computerRepo.findAnyMatching(rawDeviceId);
      }

      const computerName = computer ? `${computer.name} (${computer.code})` : deviceId;
      let description = `Hệ thống phát hiện thay đổi phần cứng trên máy tính ${computerName}.\n`;
      if (input.changes?.length) {
        description += 'Các thay đổi:\n';
        for (const change of input.changes) {
          description += `- ${change.field}: ${JSON.stringify(change.old)} -> ${JSON.stringify(change.new)}\n`;
        }
      } else {
        description += 'Phần cứng có sự thay đổi cấu hình so với ghi nhận ban đầu.\n';
      }

      const incidentCode = `INC-HW-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const incident = IncidentReport.create({
        code: incidentCode,
        reporterId: SYSTEM_DEVICE_REPORTER_ID,
        computerId: computer ? computer.id.toString() : undefined,
        title: `[CẢNH BÁO] Thay đổi phần cứng máy ${computerName}`,
        description,
        severity: 'HIGH',
        status: 'OPEN',
      });

      await this.uow.complete(async () => {
        await this.incidentRepo.save(incident, this.uow.getTransaction());
      });

      return Result.ok({ alert_time: input.timestamp || new Date().toISOString() });
    } catch {
      return Result.ok({ alert_time: new Date().toISOString() });
    }
  }
}
