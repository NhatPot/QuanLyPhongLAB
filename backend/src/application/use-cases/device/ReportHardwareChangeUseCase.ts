import crypto from 'crypto';
import { IncidentReport } from '../../../domain/entities/IncidentReport';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IIncidentReportRepository } from '../../../domain/repositories/IIncidentReportRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { Result } from '../../../shared/result/Result';
import { normalizeMacAddress } from '../../../shared/utils/deviceIdentity';

const SYSTEM_DEVICE_REPORTER_ID = '00000000-0000-0000-0000-000000000000';

export interface ReportHardwareChangeInput {
  device_id: string;
  alert_type: 'HARDWARE_CHANGED';
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
    private incidentRepo: IIncidentReportRepository,
    private uow: IUnitOfWork,
  ) {}

  public async execute(input: ReportHardwareChangeInput): Promise<Result<ReportHardwareChangeOutput>> {
    try {
      const deviceId = normalizeMacAddress(input.device_id);
      const computer = await this.computerRepo.findByMacAddress(deviceId);
      if (!computer) {
        return Result.fail(`Không tìm thấy thiết bị có MAC '${input.device_id}'.`);
      }

      let description = `Hệ thống phát hiện thay đổi phần cứng trên máy tính ${computer.code}.\n`;
      if (input.changes?.length) {
        description += 'Các thay đổi:\n';
        for (const change of input.changes) {
          description += `- ${change.field}: ${JSON.stringify(change.old)} -> ${JSON.stringify(change.new)}\n`;
        }
      } else {
        description += 'Không có chi tiết thay đổi cụ thể được cung cấp.\n';
      }

      const incidentCode = `INC-HW-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const incident = IncidentReport.create({
        code: incidentCode,
        reporterId: SYSTEM_DEVICE_REPORTER_ID,
        computerId: computer.id.toString(),
        title: `[CẢNH BÁO] Thay đổi phần cứng máy ${computer.code}`,
        description,
        severity: 'HIGH',
        status: 'OPEN',
      });

      await this.uow.complete(async () => {
        await this.incidentRepo.save(incident, this.uow.getTransaction());
      });

      return Result.ok({ alert_time: input.timestamp || new Date().toISOString() });
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi báo cáo thay đổi phần cứng.');
    }
  }
}
