import mssql from 'mssql';
import { IEquipmentRepository, EquipmentFilter } from '../../../../domain/repositories/IEquipmentRepository';
import { Equipment } from '../../../../domain/entities/Equipment';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

export class SqlEquipmentRepository implements IEquipmentRepository {
  public async findById(id: string): Promise<Equipment | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM Equipments WHERE Id = @id AND DeletedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }
    return this.toDomain(result.recordset[0]);
  }

  public async findByCode(code: string): Promise<Equipment | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('code', mssql.NVarChar, code.trim())
      .query('SELECT * FROM Equipments WHERE Code = @code AND DeletedAt IS NULL');

    if (result.recordset.length === 0) {
      return null;
    }
    return this.toDomain(result.recordset[0]);
  }

  public async list(filter: EquipmentFilter): Promise<{ data: Equipment[]; total: number }> {
    const pool = await SqlConnectionFactory.getPool();
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 10;
    const offset = (page - 1) * pageSize;

    let queryWhere = 'DeletedAt IS NULL';
    const request = pool.request();

    if (filter.status) {
      queryWhere += ' AND Status = @status';
      request.input('status', mssql.NVarChar, filter.status);
    }

    if (filter.categoryId) {
      queryWhere += ' AND CategoryId = @categoryId';
      request.input('categoryId', mssql.UniqueIdentifier, filter.categoryId);
    }

    if (filter.keyword) {
      queryWhere += ' AND (Code LIKE @keyword OR Name LIKE @keyword OR Location LIKE @keyword)';
      request.input('keyword', mssql.NVarChar, `%${filter.keyword}%`);
    }

    const countResult = await request.query(`SELECT COUNT(*) as Total FROM Equipments WHERE ${queryWhere}`);
    const total = countResult.recordset[0].Total;

    request.input('offset', mssql.Int, offset);
    request.input('limit', mssql.Int, pageSize);

    const dataResult = await request.query(`
      SELECT * FROM Equipments 
      WHERE ${queryWhere}
      ORDER BY Code ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const data = dataResult.recordset.map(row => this.toDomain(row));
    return { data, total };
  }

  public async save(equipment: Equipment, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(equipment);

    if (equipment.rowVersion) {
      const result = await connection
        .input('id', mssql.UniqueIdentifier, raw.Id)
        .input('code', mssql.NVarChar, raw.Code)
        .input('name', mssql.NVarChar, raw.Name)
        .input('categoryId', mssql.UniqueIdentifier, raw.CategoryId)
        .input('totalQuantity', mssql.Int, raw.TotalQuantity)
        .input('availableQuantity', mssql.Int, raw.AvailableQuantity)
        .input('reservedQuantity', mssql.Int, raw.ReservedQuantity)
        .input('borrowedQuantity', mssql.Int, raw.BorrowedQuantity)
        .input('brokenQuantity', mssql.Int, raw.BrokenQuantity)
        .input('maintenanceQuantity', mssql.Int, raw.MaintenanceQuantity)
        .input('lostQuantity', mssql.Int, raw.LostQuantity)
        .input('location', mssql.NVarChar, raw.Location)
        .input('managerId', mssql.UniqueIdentifier, raw.ManagerId)
        .input('status', mssql.NVarChar, raw.Status)
        .input('imageUrl', mssql.NVarChar, raw.ImageUrl)
        .input('note', mssql.NVarChar, raw.Note)
        .input('rowVersion', mssql.VarBinary, raw.RowVersion)
        .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
        .input('deletedAt', mssql.DateTime2, raw.DeletedAt)
        .query(`
          UPDATE Equipments SET 
            Code = @code,
            Name = @name,
            CategoryId = @categoryId,
            TotalQuantity = @totalQuantity,
            AvailableQuantity = @availableQuantity,
            ReservedQuantity = @reservedQuantity,
            BorrowedQuantity = @borrowedQuantity,
            BrokenQuantity = @brokenQuantity,
            MaintenanceQuantity = @maintenanceQuantity,
            LostQuantity = @lostQuantity,
            Location = @location,
            ManagerId = @managerId,
            Status = @status,
            ImageUrl = @imageUrl,
            Note = @note,
            UpdatedAt = @updatedAt,
            DeletedAt = @deletedAt
          WHERE Id = @id AND RowVersion = @rowVersion
        `);

      if (result.rowsAffected[0] === 0) {
        throw new Error('Dữ liệu đã bị thay đổi bởi người dùng khác (Khóa lạc quan thất bại).');
      }
    } else {
      await connection
        .input('id', mssql.UniqueIdentifier, raw.Id)
        .input('code', mssql.NVarChar, raw.Code)
        .input('name', mssql.NVarChar, raw.Name)
        .input('categoryId', mssql.UniqueIdentifier, raw.CategoryId)
        .input('totalQuantity', mssql.Int, raw.TotalQuantity)
        .input('availableQuantity', mssql.Int, raw.AvailableQuantity)
        .input('reservedQuantity', mssql.Int, raw.ReservedQuantity)
        .input('borrowedQuantity', mssql.Int, raw.BorrowedQuantity)
        .input('brokenQuantity', mssql.Int, raw.BrokenQuantity)
        .input('maintenanceQuantity', mssql.Int, raw.MaintenanceQuantity)
        .input('lostQuantity', mssql.Int, raw.LostQuantity)
        .input('location', mssql.NVarChar, raw.Location)
        .input('managerId', mssql.UniqueIdentifier, raw.ManagerId)
        .input('status', mssql.NVarChar, raw.Status)
        .input('imageUrl', mssql.NVarChar, raw.ImageUrl)
        .input('note', mssql.NVarChar, raw.Note)
        .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
        .input('deletedAt', mssql.DateTime2, raw.DeletedAt)
        .query(`
          MERGE INTO Equipments AS target
          USING (SELECT @id AS Id) AS source
          ON target.Id = source.Id
          WHEN MATCHED THEN
            UPDATE SET 
              Code = @code,
              Name = @name,
              CategoryId = @categoryId,
              TotalQuantity = @totalQuantity,
              AvailableQuantity = @availableQuantity,
              ReservedQuantity = @reservedQuantity,
              BorrowedQuantity = @borrowedQuantity,
              BrokenQuantity = @brokenQuantity,
              MaintenanceQuantity = @maintenanceQuantity,
              LostQuantity = @lostQuantity,
              Location = @location,
              ManagerId = @managerId,
              Status = @status,
              ImageUrl = @imageUrl,
              Note = @note,
              UpdatedAt = @updatedAt,
              DeletedAt = @deletedAt
          WHEN NOT MATCHED THEN
            INSERT (Id, Code, Name, CategoryId, TotalQuantity, AvailableQuantity, ReservedQuantity, BorrowedQuantity, BrokenQuantity, MaintenanceQuantity, LostQuantity, Location, ManagerId, Status, ImageUrl, Note, DeletedAt)
            VALUES (@id, @code, @name, @categoryId, @totalQuantity, @availableQuantity, @reservedQuantity, @borrowedQuantity, @brokenQuantity, @maintenanceQuantity, @lostQuantity, @location, @managerId, @status, @imageUrl, @note, @deletedAt);
        `);
    }
  }

  private toDomain(raw: any): Equipment {
    return Equipment.create({
      code: raw.Code,
      name: raw.Name,
      categoryId: raw.CategoryId,
      totalQuantity: raw.TotalQuantity,
      availableQuantity: raw.AvailableQuantity,
      reservedQuantity: raw.ReservedQuantity,
      borrowedQuantity: raw.BorrowedQuantity,
      brokenQuantity: raw.BrokenQuantity,
      maintenanceQuantity: raw.MaintenanceQuantity,
      lostQuantity: raw.LostQuantity,
      location: raw.Location || undefined,
      managerId: raw.ManagerId || undefined,
      status: raw.Status,
      imageUrl: raw.ImageUrl || undefined,
      note: raw.Note || undefined,
      rowVersion: raw.RowVersion,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt,
      deletedAt: raw.DeletedAt || undefined,
    }, new UniqueEntityId(raw.Id));
  }

  private toPersistence(equipment: Equipment): any {
    return {
      Id: equipment.id.toString(),
      Code: equipment.code,
      Name: equipment.name,
      CategoryId: equipment.categoryId,
      TotalQuantity: equipment.totalQuantity,
      AvailableQuantity: equipment.availableQuantity,
      ReservedQuantity: equipment.reservedQuantity,
      BorrowedQuantity: equipment.borrowedQuantity,
      BrokenQuantity: equipment.brokenQuantity,
      MaintenanceQuantity: equipment.maintenanceQuantity,
      LostQuantity: equipment.lostQuantity,
      Location: equipment.location || null,
      ManagerId: equipment.managerId || null,
      Status: equipment.status,
      ImageUrl: equipment.imageUrl || null,
      Note: equipment.note || null,
      RowVersion: equipment.rowVersion || null,
      UpdatedAt: new Date(),
      DeletedAt: equipment.deletedAt || null
    };
  }
}
