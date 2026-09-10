import { EquipmentCategory } from '../entities/EquipmentCategory';

export interface IEquipmentCategoryRepository {
  findById(id: string): Promise<EquipmentCategory | null>;
  findByCode(code: string): Promise<EquipmentCategory | null>;
  list(lendableOnly?: boolean): Promise<EquipmentCategory[]>;
  save(category: EquipmentCategory): Promise<void>;
  update(category: EquipmentCategory): Promise<boolean>;
  delete(id: string): Promise<void>;
}
