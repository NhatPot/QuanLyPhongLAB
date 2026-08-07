import { EquipmentCategory } from '../entities/EquipmentCategory';

export interface IEquipmentCategoryRepository {
  findById(id: string): Promise<EquipmentCategory | null>;
  findByCode(code: string): Promise<EquipmentCategory | null>;
  list(): Promise<EquipmentCategory[]>;
  save(category: EquipmentCategory): Promise<void>;
  delete(id: string): Promise<void>;
}
