import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';

export interface DeleteComputerInput {
  id: string;
  userId?: string;
  ipAddressClient?: string;
  userAgent?: string;
  correlationId?: string;
}

export class DeleteComputerUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private computerActivityRepo: IComputerActivityRepository,
  ) {}

  public async execute(input: DeleteComputerInput): Promise<Result<void>> {
    try {
      const computer = await this.computerRepo.findById(input.id);
      if (!computer) {
        return Result.fail<void>("Không tìm thấy máy tính cần xóa.");
      }

      if (computer.status === 'IN_USE') {
        return Result.fail<void>("Không thể xóa máy tính đang được sử dụng.");
      }

      computer.delete();

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.closeCurrent(computer.id.toString(), computer.updatedAt || new Date(), transaction);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'COMPUTER_DELETED',
          entityName: 'Computers',
          entityId: computer.id.toString(),
          ipAddress: input.ipAddressClient,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any, transaction);
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail<void>((error as any).message || "Đã xảy ra lỗi khi xóa máy tính.");
    }
  }
}
