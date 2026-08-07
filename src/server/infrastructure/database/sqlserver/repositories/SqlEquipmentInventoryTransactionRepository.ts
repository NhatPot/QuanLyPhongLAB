import mssql from 'mssql';
import { IEquipmentInventoryTransactionRepository } from '../../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { EquipmentInventoryTransaction } from '../../../../domain/entities/EquipmentInventoryTransaction';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

export class SqlEquipmentInventoryTransactionRepository implements IEquipmentInventoryTransactionRepository {
  public async save(transaction: EquipmentInventoryTransaction, transactionConnection?: mssql.Transaction): Promise<void> {
    const connection = transactionConnection ? new mssql.Request(transactionConnection) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(transaction);

    await connection
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('equipmentId', mssql.UniqueIdentifier, raw.EquipmentId)
      .input('transactionType', mssql.NVarChar, raw.TransactionType)
      .input('deltaTotal', mssql.Int, raw.DeltaTotal)
      .input('deltaAvailable', mssql.Int, raw.DeltaAvailable)
      .input('deltaReserved', mssql.Int, raw.DeltaReserved)
      .input('deltaBorrowed', mssql.Int, raw.DeltaBorrowed)
      .input('deltaBroken', mssql.Int, raw.DeltaBroken)
      .input('deltaMaintenance', mssql.Int, raw.DeltaMaintenance)
      .input('deltaLost', mssql.Int, raw.DeltaLost)
      .input('referenceType', mssql.NVarChar, raw.ReferenceType)
      .input('referenceId', mssql.UniqueIdentifier, raw.ReferenceId)
      .input('performedBy', mssql.UniqueIdentifier, raw.PerformedBy)
      .input('note', mssql.NVarChar, raw.Note)
      .query(`
        INSERT INTO EquipmentInventoryTransactions (
          Id, EquipmentId, TransactionType, DeltaTotal, DeltaAvailable, DeltaReserved, DeltaBorrowed, DeltaBroken, DeltaMaintenance, DeltaLost, ReferenceType, ReferenceId, PerformedBy, Note
        ) VALUES (
          @id, @equipmentId, @transactionType, @deltaTotal, @deltaAvailable, @deltaReserved, @deltaBorrowed, @deltaBroken, @deltaMaintenance, @deltaLost, @referenceType, @referenceId, @performedBy, @note
        )
      `);
  }

  public async listByEquipmentId(equipmentId: string): Promise<EquipmentInventoryTransaction[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('equipmentId', mssql.UniqueIdentifier, equipmentId)
      .query('SELECT * FROM EquipmentInventoryTransactions WHERE EquipmentId = @equipmentId ORDER BY CreatedAt DESC');
    return result.recordset.map(row => this.toDomain(row));
  }

  private toDomain(raw: any): EquipmentInventoryTransaction {
    return EquipmentInventoryTransaction.create({
      equipmentId: raw.EquipmentId,
      transactionType: raw.TransactionType,
      deltaTotal: raw.DeltaTotal,
      deltaAvailable: raw.DeltaAvailable,
      deltaReserved: raw.DeltaReserved,
      deltaBorrowed: raw.DeltaBorrowed,
      deltaBroken: raw.DeltaBroken,
      deltaMaintenance: raw.DeltaMaintenance,
      deltaLost: raw.DeltaLost,
      referenceType: raw.ReferenceType || undefined,
      referenceId: raw.ReferenceId || undefined,
      performedBy: raw.PerformedBy || undefined,
      note: raw.Note || undefined,
      createdAt: raw.CreatedAt
    }, new UniqueEntityId(raw.Id));
  }

  private toPersistence(tx: EquipmentInventoryTransaction): any {
    return {
      Id: tx.id.toString(),
      EquipmentId: tx.equipmentId,
      TransactionType: tx.transactionType,
      DeltaTotal: tx.deltaTotal,
      DeltaAvailable: tx.deltaAvailable,
      DeltaReserved: tx.deltaReserved,
      DeltaBorrowed: tx.deltaBorrowed,
      DeltaBroken: tx.deltaBroken,
      DeltaMaintenance: tx.deltaMaintenance,
      DeltaLost: tx.deltaLost,
      ReferenceType: tx.referenceType || null,
      ReferenceId: tx.referenceId || null,
      PerformedBy: tx.performedBy || null,
      Note: tx.note || null
    };
  }
}
