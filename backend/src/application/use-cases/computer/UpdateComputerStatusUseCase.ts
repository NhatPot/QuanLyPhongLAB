import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Computer, ComputerStatus } from '../../../domain/entities/Computer';
import { ComputerMaintenanceProposalService } from '../maintenance/ComputerMaintenanceProposalService';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';

export interface UpdateComputerStatusInput {
  id: string;
  status: ComputerStatus;
  userId?: string;
  ipAddressClient?: string;
  userAgent?: string;
  correlationId?: string;
}

export class UpdateComputerStatusUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private maintenanceProposalService: ComputerMaintenanceProposalService,
    private computerActivityRepo: IComputerActivityRepository,
  ) {}

  public async execute(input: UpdateComputerStatusInput): Promise<Result<Computer>> {
    try {
      const computer = await this.computerRepo.findById(input.id);
      if (!computer) {
        return Result.fail<Computer>("Không tìm thấy máy tính.");
      }

      const oldStatus = computer.status;
      if (oldStatus === input.status) {
        return Result.ok<Computer>(computer);
      }

      if (oldStatus === 'MAINTENANCE' || input.status === 'MAINTENANCE') {
        return Result.fail<Computer>('Trạng thái bảo trì chỉ được thay đổi từ lịch bảo trì.');
      }

      computer.changeStatus(input.status);

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition({
          computerId: computer.id.toString(),
          activityType: input.status,
          occurredAt: computer.updatedAt || new Date(),
          performedBy: input.userId,
          note: `Cập nhật trạng thái từ ${oldStatus} sang ${input.status}`,
        }, transaction);

        if (input.status === 'BROKEN') {
          await this.maintenanceProposalService.ensureProposal(computer, 'BROKEN_STATUS', {
            actorUserId: input.userId,
            ipAddress: input.ipAddressClient,
            userAgent: input.userAgent,
            correlationId: input.correlationId,
          }, transaction);
        }

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'COMPUTER_STATUS_CHANGED',
          entityName: 'Computers',
          entityId: computer.id.toString(),
          ipAddress: input.ipAddressClient,
          userAgent: input.userAgent,
          correlationId: input.correlationId,
          note: JSON.stringify({
            old: oldStatus,
            new: input.status
          })
        } as any, transaction);
      });

      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi cập nhật trạng thái máy tính.");
    }
  }
}
