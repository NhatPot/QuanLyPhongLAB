import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IIncidentReportRepository } from '../../../domain/repositories/IIncidentReportRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IncidentReport } from '../../../domain/entities/IncidentReport';

export interface ReportHardwareChangeInput {
  device_id: string; // The UUID of the computer in our DB
  alert_type: string;
  timestamp?: string;
  changes?: Array<{ field: string; old: any; new: any }>;
  previous_hardware?: any;
  current_hardware?: any;
}

export class ReportHardwareChangeUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private incidentRepo: IIncidentReportRepository,
    private uow: IUnitOfWork
  ) {}

  public async execute(input: ReportHardwareChangeInput): Promise<Result<void>> {
    try {
      let computer = await this.computerRepo.findByMacAddress(input.device_id);
      
      if (!computer && input.device_id.length === 36) {
        computer = await this.computerRepo.findById(input.device_id);
      }

      if (!computer) {
        return Result.fail(`Không tìm thấy thiết bị có ID '${input.device_id}'.`);
      }

      // Generate a description from changes
      let description = `Hệ thống phát hiện thay đổi phần cứng trên máy tính ${computer.code}.\n`;
      if (input.changes && input.changes.length > 0) {
        description += 'Các thay đổi:\n';
        input.changes.forEach(change => {
          description += `- ${change.field}: ${JSON.stringify(change.old)} -> ${JSON.stringify(change.new)}\n`;
        });
      } else {
        description += 'Không có chi tiết thay đổi cụ thể được cung cấp.\n';
      }

      // Auto-generated incident code
      const incidentCode = `INC-HW-${Date.now().toString().slice(-6)}`;

      const incident = IncidentReport.create({
        code: incidentCode,
        // Using SYSTEM user id (assuming null or a specific UUID is acceptable, 
        // we might need a generic SYSTEM user id. For now, use the computer ID as reporter or a constant system UUID.
        // Wait, reporterId is string, we'll use "SYSTEM" or a dummy UUID.)
        reporterId: '00000000-0000-0000-0000-000000000000', // SYSTEM ID
        computerId: computer.id.toString(),
        title: `[CẢNH BÁO] Thay đổi phần cứng máy ${computer.code}`,
        description,
        severity: 'HIGH',
        status: 'OPEN'
      });

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.incidentRepo.save(incident, transaction);
        
        // Maybe also lock the computer or set status to BROKEN?
        // Let's keep it simple and just create an incident for now, as requested.
      });

      return Result.ok(undefined);
    } catch (error: any) {
      return Result.fail(error.message || 'Lỗi khi báo cáo thay đổi phần cứng.');
    }
  }
}
