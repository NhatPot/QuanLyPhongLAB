import mssql from 'mssql';
import { IBookingEquipmentItemRepository } from '../../../../domain/repositories/IBookingEquipmentItemRepository';
import { BookingEquipmentItem } from '../../../../domain/entities/BookingEquipmentItem';
import { SqlConnectionFactory } from '../connection';

export class SqlBookingEquipmentItemRepository implements IBookingEquipmentItemRepository {
  public async findByBookingId(bookingId: string): Promise<BookingEquipmentItem[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('bookingId', mssql.UniqueIdentifier, bookingId)
      .query('SELECT * FROM BookingEquipmentItems WHERE BookingRequestId = @bookingId');

    return result.recordset.map(row => this.toDomain(row));
  }

  public async saveMany(items: BookingEquipmentItem[]): Promise<void> {
    if (items.length === 0) return;
    
    const pool = await SqlConnectionFactory.getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new mssql.Request(transaction);

      for (let i = 0; i < items.length; i++) {
        const raw = this.toPersistence(items[i]);
        request.input(`id_${i}`, mssql.UniqueIdentifier, raw.Id);
        request.input(`bookingId_${i}`, mssql.UniqueIdentifier, raw.BookingRequestId);
        request.input(`eqId_${i}`, mssql.UniqueIdentifier, raw.EquipmentId);
        request.input(`reqQty_${i}`, mssql.Int, raw.RequestedQuantity);
        request.input(`resQty_${i}`, mssql.Int, raw.ReservedQuantity);
        request.input(`borQty_${i}`, mssql.Int, raw.BorrowedQuantity);
        request.input(`retGQty_${i}`, mssql.Int, raw.ReturnedGoodQuantity);
        request.input(`retBQty_${i}`, mssql.Int, raw.ReturnedBrokenQuantity);
        request.input(`lostQty_${i}`, mssql.Int, raw.LostQuantity);
        request.input(`hCond_${i}`, mssql.NVarChar, raw.HandoverCondition);
        request.input(`rCond_${i}`, mssql.NVarChar, raw.ReturnCondition);
        request.input(`note_${i}`, mssql.NVarChar, raw.Note);

        await request.query(`
          MERGE INTO BookingEquipmentItems AS target
          USING (SELECT @id_${i} AS Id) AS source
          ON target.Id = source.Id
          WHEN MATCHED THEN
            UPDATE SET 
              RequestedQuantity = @reqQty_${i},
              ReservedQuantity = @resQty_${i},
              BorrowedQuantity = @borQty_${i},
              ReturnedGoodQuantity = @retGQty_${i},
              ReturnedBrokenQuantity = @retBQty_${i},
              LostQuantity = @lostQty_${i},
              HandoverCondition = @hCond_${i},
              ReturnCondition = @rCond_${i},
              Note = @note_${i}
          WHEN NOT MATCHED THEN
            INSERT (Id, BookingRequestId, EquipmentId, RequestedQuantity, ReservedQuantity, BorrowedQuantity, ReturnedGoodQuantity, ReturnedBrokenQuantity, LostQuantity, HandoverCondition, ReturnCondition, Note)
            VALUES (@id_${i}, @bookingId_${i}, @eqId_${i}, @reqQty_${i}, @resQty_${i}, @borQty_${i}, @retGQty_${i}, @retBQty_${i}, @lostQty_${i}, @hCond_${i}, @rCond_${i}, @note_${i});
        `);
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async deleteByBookingId(bookingId: string): Promise<void> {
    const pool = await SqlConnectionFactory.getPool();
    await pool.request()
      .input('bookingId', mssql.UniqueIdentifier, bookingId)
      .query('DELETE FROM BookingEquipmentItems WHERE BookingRequestId = @bookingId');
  }

  private toDomain(raw: any): BookingEquipmentItem {
    return BookingEquipmentItem.create({
      id: raw.Id,
      bookingRequestId: raw.BookingRequestId,
      equipmentId: raw.EquipmentId,
      requestedQuantity: raw.RequestedQuantity,
      reservedQuantity: raw.ReservedQuantity,
      borrowedQuantity: raw.BorrowedQuantity,
      returnedGoodQuantity: raw.ReturnedGoodQuantity,
      returnedBrokenQuantity: raw.ReturnedBrokenQuantity,
      lostQuantity: raw.LostQuantity,
      handoverCondition: raw.HandoverCondition,
      returnCondition: raw.ReturnCondition,
      note: raw.Note
    });
  }

  private toPersistence(item: BookingEquipmentItem): any {
    return {
      Id: item.id,
      BookingRequestId: item.bookingRequestId,
      EquipmentId: item.equipmentId,
      RequestedQuantity: item.requestedQuantity,
      ReservedQuantity: item.reservedQuantity,
      BorrowedQuantity: item.borrowedQuantity,
      ReturnedGoodQuantity: item.returnedGoodQuantity,
      ReturnedBrokenQuantity: item.returnedBrokenQuantity,
      LostQuantity: item.lostQuantity,
      HandoverCondition: item.handoverCondition,
      ReturnCondition: item.returnCondition,
      Note: item.note
    };
  }
}
