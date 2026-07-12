import mssql from 'mssql';
import { IEquipmentCategoryRepository } from '../../../../domain/repositories/IEquipmentCategoryRepository';
import { EquipmentCategory } from '../../../../domain/entities/EquipmentCategory';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

export class SqlEquipmentCategoryRepository implements IEquipmentCategoryRepository {
  public async findById(id: string): Promise<EquipmentCategory | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM EquipmentCategories WHERE Id = @id');

    if (result.recordset.length === 0) {
      return null;
    }
    return this.toDomain(result.recordset[0]);
  }

  public async findByCode(code: string): Promise<EquipmentCategory | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('code', mssql.NVarChar, code.trim())
      .query('SELECT * FROM EquipmentCategories WHERE Code = @code');

    if (result.recordset.length === 0) {
      return null;
    }
    return this.toDomain(result.recordset[0]);
  }

  public async list(): Promise<EquipmentCategory[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query('SELECT * FROM EquipmentCategories ORDER BY Code ASC');
    return result.recordset.map(row => this.toDomain(row));
  }

  public async save(category: EquipmentCategory): Promise<void> {
    const pool = await SqlConnectionFactory.getPool();
    const raw = {
      Id: category.id.toString(),
      Code: category.code,
      Name: category.name,
      Description: category.description || null,
      UpdatedAt: new Date()
    };

    await pool.request()
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('code', mssql.NVarChar, raw.Code)
      .input('name', mssql.NVarChar, raw.Name)
      .input('description', mssql.NVarChar, raw.Description)
      .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
      .query(`
        MERGE INTO EquipmentCategories AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN
          UPDATE SET 
            Code = @code,
            Name = @name,
            Description = @description,
            UpdatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (Id, Code, Name, Description)
          VALUES (@id, @code, @name, @description);
      `);
  }

  public async delete(id: string): Promise<void> {
    const pool = await SqlConnectionFactory.getPool();
    await pool.request()
      .input('id', mssql.UniqueIdentifier, id)
      .query('DELETE FROM EquipmentCategories WHERE Id = @id');
  }

  private toDomain(raw: any): EquipmentCategory {
    return EquipmentCategory.create({
      code: raw.Code,
      name: raw.Name,
      description: raw.Description || undefined,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt
    }, new UniqueEntityId(raw.Id));
  }
}
