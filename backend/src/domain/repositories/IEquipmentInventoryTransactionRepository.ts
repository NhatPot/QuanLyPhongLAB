import { EquipmentInventoryTransaction } from '../entities/EquipmentInventoryTransaction';

export interface IEquipmentInventoryTransactionRepository {
  save(transaction: EquipmentInventoryTransaction, transactionConnection?: any): Promise<void>;
  listByEquipmentId(equipmentId: string): Promise<EquipmentInventoryTransaction[]>;
}
