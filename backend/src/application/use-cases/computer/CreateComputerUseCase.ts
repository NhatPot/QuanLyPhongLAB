import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { Computer, ComputerStatus } from '../../../domain/entities/Computer';

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
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: CreateComputerInput): Promise<Result<Computer>> {
    try {
      const existing = await this.computerRepo.findByCode(input.code);
      if (existing) {
        return Result.fail<Computer>(`Mã máy tính '${input.code}' đã tồn tại.`);
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

      await this.uow.complete(async () => {
        await this.computerRepo.save(computer);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'COMPUTER_CREATED',
          entityName: 'Computers',
          entityId: computer.id.toString(),
          ipAddress: input.ipAddressClient,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any);
      });

      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi tạo máy tính.");
    }
  }
}
