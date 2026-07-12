import mssql from 'mssql';
import { ILabProfileRepository } from '../../../../domain/repositories/ILabProfileRepository';
import { LabProfile } from '../../../../domain/entities/LabProfile';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

export class SqlLabProfileRepository implements ILabProfileRepository {
  public async get(): Promise<LabProfile | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request()
      .query('SELECT * FROM LabProfile WHERE SingletonKey = 1');

    if (result.recordset.length === 0) {
      return null;
    }

    return this.toDomain(result.recordset[0]);
  }

  public async save(profile: LabProfile, transaction?: mssql.Transaction): Promise<void> {
    const connection = transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
    const raw = this.toPersistence(profile);

    await connection
      .input('id', mssql.UniqueIdentifier, raw.Id)
      .input('singletonKey', mssql.TinyInt, raw.SingletonKey)
      .input('labCode', mssql.NVarChar, raw.LabCode)
      .input('labName', mssql.NVarChar, raw.LabName)
      .input('location', mssql.NVarChar, raw.Location)
      .input('capacity', mssql.Int, raw.Capacity)
      .input('description', mssql.NVarChar, raw.Description)
      .input('rules', mssql.NVarChar, raw.Rules)
      .input('managerId', mssql.UniqueIdentifier, raw.ManagerId)
      .input('status', mssql.NVarChar, raw.Status)
      .input('updatedAt', mssql.DateTime2, raw.UpdatedAt)
      .query(`
        MERGE INTO LabProfile AS target
        USING (SELECT @singletonKey AS SingletonKey) AS source
        ON target.SingletonKey = source.SingletonKey
        WHEN MATCHED THEN
          UPDATE SET 
            Id = @id,
            LabCode = @labCode,
            LabName = @labName,
            Location = @location,
            Capacity = @capacity,
            Description = @description,
            Rules = @rules,
            ManagerId = @managerId,
            Status = @status,
            UpdatedAt = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (Id, SingletonKey, LabCode, LabName, Location, Capacity, Description, Rules, ManagerId, Status)
          VALUES (@id, @singletonKey, @labCode, @labName, @location, @capacity, @description, @rules, @managerId, @status);
      `);
  }

  private toDomain(raw: any): LabProfile {
    return LabProfile.create({
      labCode: raw.LabCode,
      labName: raw.LabName,
      location: raw.Location || '',
      capacity: raw.Capacity,
      description: raw.Description || undefined,
      rules: raw.Rules || undefined,
      managerId: raw.ManagerId || undefined,
      status: raw.Status,
      createdAt: raw.CreatedAt,
      updatedAt: raw.UpdatedAt,
    }, new UniqueEntityId(raw.Id));
  }

  private toPersistence(profile: LabProfile): any {
    return {
      Id: profile.id.toString(),
      SingletonKey: 1,
      LabCode: profile.labCode,
      LabName: profile.labName,
      Location: profile.location || null,
      Capacity: profile.capacity,
      Description: profile.description || null,
      Rules: profile.rules || null,
      ManagerId: profile.managerId || null,
      Status: profile.status,
      UpdatedAt: new Date()
    };
  }
}
