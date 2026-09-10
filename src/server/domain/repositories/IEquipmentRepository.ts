import { Equipment } from '../entities/Equipment';

export interface EquipmentFilter {
  lendableOnly?: boolean;
  keyword?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface IEquipmentRepository {
  findById(id: string, transaction?: any): Promise<Equipment | null>;
  findByCode(code: string): Promise<Equipment | null>;
  list(filter: EquipmentFilter): Promise<{ data: Equipment[]; total: number }>;
  save(equipment: Equipment, transaction?: any): Promise<void>;
}
