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

  public async list(lendableOnly = false): Promise<EquipmentCategory[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().input('lendableOnly', mssql.Bit, lendableOnly).query('SELECT c.* FROM EquipmentCategories c WHERE @lendableOnly = 0 OR EXISTS (SELECT 1 FROM Equipments e WHERE e.CategoryId = c.Id AND e.DeletedAt IS NULL AND e.IsLendable = 1) ORDER BY c.Code ASC');
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

  public async update(category: EquipmentCategory): Promise<boolean> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .input('id', mssql.UniqueIdentifier, category.id.toString())
      .input('code', mssql.NVarChar(50), category.code)
      .input('name', mssql.NVarChar(255), category.name)
      .input('description', mssql.NVarChar(500), category.description || null)
      .query(`UPDATE EquipmentCategories SET Code = @code, Name = @name,
        Description = @description, UpdatedAt = SYSUTCDATETIME() WHERE Id = @id`);
    // Do not recreate a category deleted while its edit form was open.
    return result.rowsAffected[0] === 1;
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
