import { Result } from '../../../shared/result/Result';
import { IComputerRepository, ComputerFilter } from '../../../domain/repositories/IComputerRepository';
import { Computer } from '../../../domain/entities/Computer';

export interface ListComputersOutput {
  data: Computer[];
  total: number;
}

export class ListComputersUseCase {
  constructor(private computerRepo: IComputerRepository) {}

  public async execute(filter: ComputerFilter): Promise<Result<ListComputersOutput>> {
    try {
      const result = await this.computerRepo.list(filter);
      return Result.ok<ListComputersOutput>(result);
    } catch (error) {
      return Result.fail<ListComputersOutput>((error as any).message || "Đã xảy ra lỗi khi lấy danh sách máy tính.");
    }
  }
}
