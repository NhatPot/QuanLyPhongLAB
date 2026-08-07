import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Computer, ComputerStatus } from '../../../domain/entities/Computer';
import { ComputerMaintenanceProposalService } from '../maintenance/ComputerMaintenanceProposalService';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';

export interface UpdateComputerInput {
  id: string;
  code: string;
  name: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  operatingSystem?: string;
  installedSoftware?: string;
  ipAddress?: string;
  macAddress?: string;
  position?: string;
  status: ComputerStatus;
  note?: string;
  userId?: string;
  ipAddressClient?: string;
  userAgent?: string;
  correlationId?: string;
}

export class UpdateComputerUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private maintenanceProposalService: ComputerMaintenanceProposalService,
    private computerActivityRepo: IComputerActivityRepository,
  ) {}

  public async execute(input: UpdateComputerInput): Promise<Result<Computer>> {
    try {
      const computer = await this.computerRepo.findById(input.id);
      if (!computer) {
        return Result.fail<Computer>("Không tìm thấy máy tính cần cập nhật.");
      }

      if (computer.code !== input.code) {
        const existing = await this.computerRepo.findByCode(input.code);
        if (existing) {
          return Result.fail<Computer>(`Mã máy tính '${input.code}' đã tồn tại.`);
        }
      }

      const oldState = {
        code: computer.code,
        name: computer.name,
        status: computer.status,
        ipAddress: computer.ipAddress,
        macAddress: computer.macAddress
      };

      if (computer.status !== input.status && (computer.status === 'MAINTENANCE' || input.status === 'MAINTENANCE')) {
        return Result.fail<Computer>('Trạng thái bảo trì chỉ được thay đổi từ lịch bảo trì.');
      }

      computer.updateInformation({
        code: input.code,
        name: input.name,
        cpu: input.cpu,
        ram: input.ram,
        storage: input.storage,
        gpu: input.gpu,
        operatingSystem: input.operatingSystem,
        installedSoftware: input.installedSoftware,
        ipAddress: input.ipAddress,
        macAddress: input.macAddress,
        position: input.position,
        status: input.status,
        note: input.note
      });

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.computerRepo.save(computer, transaction);

        if (oldState.status !== computer.status) {
          await this.computerActivityRepo.transition({
            computerId: computer.id.toString(),
            activityType: computer.status,
            occurredAt: computer.updatedAt || new Date(),
            performedBy: input.userId,
            note: `Cập nhật trạng thái từ ${oldState.status} sang ${computer.status}`,
          }, transaction);
        }

        if (oldState.status !== 'BROKEN' && computer.status === 'BROKEN') {
          await this.maintenanceProposalService.ensureProposal(computer, 'BROKEN_STATUS', {
            actorUserId: input.userId,
            ipAddress: input.ipAddressClient,
            userAgent: input.userAgent,
            correlationId: input.correlationId,
          }, transaction);
        }

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'COMPUTER_UPDATED',
          entityName: 'Computers',
          entityId: computer.id.toString(),
          ipAddress: input.ipAddressClient,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            old: oldState,
            new: {
              code: computer.code,
              name: computer.name,
              status: computer.status,
              ipAddress: computer.ipAddress,
              macAddress: computer.macAddress
            }
          })
        } as any, transaction);
      });

      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi cập nhật máy tính.");
    }
  }
}
