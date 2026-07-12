import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Computer, ComputerStatus } from '../../../domain/entities/Computer';

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
    private auditLogRepo: IAuditLogRepository
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

      computer.changeStatus(input.status);

      await this.uow.complete(async () => {
        await this.computerRepo.save(computer);

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
        } as any);
      });

      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi cập nhật trạng thái máy tính.");
    }
  }
}
