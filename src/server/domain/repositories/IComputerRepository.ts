import { Computer } from '../entities/Computer';

export interface ComputerFilter {
  keyword?: string;
  status?: string;
  position?: string;
  page?: number;
  pageSize?: number;
}

export interface IComputerRepository {
  hasActiveBooking(id: string, transaction?: any): Promise<boolean>;
  findById(id: string, transaction?: any): Promise<Computer | null>;
  findByCode(code: string): Promise<Computer | null>;
  findByMacAddress(macAddress: string): Promise<Computer | null>;
  findIncludingDeletedByMacAddress(macAddress: string): Promise<Computer | null>;
  findAnyMatching(identifier: string): Promise<Computer | null>;
  list(filter: ComputerFilter): Promise<{ data: Computer[]; total: number }>;
  listMaintenanceCandidates(cutoffDate: Date): Promise<Computer[]>;
  countActive(): Promise<number>;
  save(computer: Computer, transaction?: any): Promise<void>;
}
