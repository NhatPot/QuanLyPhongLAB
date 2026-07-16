import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Computer, ComputerStatus } from '../../../domain/entities/Computer';
import { ComputerMaintenanceProposalService } from '../maintenance/ComputerMaintenanceProposalService';
import { IComputerActivityRepository } from '../../../domain/repositories/IComputerActivityRepository';

export interface CreateComputerInput {
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

export class CreateComputerUseCase {
  constructor(
    private computerRepo: IComputerRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository,
    private maintenanceProposalService: ComputerMaintenanceProposalService,
    private computerActivityRepo: IComputerActivityRepository,
  ) {}

  public async execute(input: CreateComputerInput): Promise<Result<Computer>> {
    try {
      const existing = await this.computerRepo.findByCode(input.code);
      if (existing) {
        return Result.fail<Computer>(`Mã máy tính '${input.code}' đã tồn tại.`);
      }
      if (input.status === 'MAINTENANCE') {
        return Result.fail<Computer>('Không thể tạo máy trực tiếp ở trạng thái bảo trì. Hãy lập lịch sau khi tạo máy.');
      }

      const computer = Computer.create({
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
      const occurredAt = new Date();

      await this.uow.complete(async () => {
        const transaction = this.uow.getTransaction();
        await this.computerRepo.save(computer, transaction);
        await this.computerActivityRepo.transition({
          computerId: computer.id.toString(),
          activityType: computer.status,
          occurredAt,
          performedBy: input.userId,
          note: 'Khởi tạo máy tính',
        }, transaction);

        if (computer.status === 'BROKEN') {
          await this.maintenanceProposalService.ensureProposal(computer, 'BROKEN_STATUS', {
            actorUserId: input.userId,
            ipAddress: input.ipAddressClient,
            userAgent: input.userAgent,
            correlationId: input.correlationId,
          }, transaction);
        }

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'COMPUTER_CREATED',
          entityName: 'Computers',
          entityId: computer.id.toString(),
          ipAddress: input.ipAddressClient,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any, transaction);
      });

      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi tạo máy tính.");
    }
  }
}
