import { Result } from '../../../shared/result/Result';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { Computer } from '../../../domain/entities/Computer';

export class GetComputerUseCase {
  constructor(private computerRepo: IComputerRepository) {}

  public async execute(id: string): Promise<Result<Computer>> {
    try {
      const computer = await this.computerRepo.findById(id);
      if (!computer) {
        return Result.fail<Computer>("Không tìm thấy máy tính.");
      }
      return Result.ok<Computer>(computer);
    } catch (error) {
      return Result.fail<Computer>((error as any).message || "Đã xảy ra lỗi khi lấy thông tin máy tính.");
    }
  }
}
