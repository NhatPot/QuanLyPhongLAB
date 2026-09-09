import mssql from "mssql";
import { planEquipmentImport } from "../../../../lib/equipment-import";
import { Equipment } from "../../../domain/entities/Equipment";
import { SqlConnectionFactory } from "../../../infrastructure/database/sqlserver/connection";
import { SqlEquipmentRepository } from "../../../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository";
import { SqlAuditLogRepository } from "../../../infrastructure/database/sqlserver/repositories/SqlAuditLogRepository";

export async function importEquipments(
  rows: unknown[],
  commit: boolean,
  userId: string,
) {
  const transaction = new mssql.Transaction(
    await SqlConnectionFactory.getPool(),
  );
  await transaction.begin(mssql.ISOLATION_LEVEL.SERIALIZABLE);
  let finished = false;
  transaction.on("rollback", () => {
    finished = true;
  });
  try {
    const categories = await new mssql.Request(transaction).query(
      "SELECT Id AS id, Code AS code, Name AS name FROM dbo.EquipmentCategories WITH (HOLDLOCK)",
    );
    // Include deleted codes: the database's unique constraint still reserves them.
    // Range locks serialize concurrent imports and protect automatic code allocation.
    const codes = await new mssql.Request(transaction).query(
      "SELECT Code AS code FROM dbo.Equipments WITH (UPDLOCK, HOLDLOCK)",
    );
    const preview = planEquipmentImport(
      rows,
      categories.recordset,
      codes.recordset.map((r) => String(r.code)),
    );
    if (!commit || preview.errors.length) {
      await transaction.rollback();
      finished = true;
      return preview;
    }
    const repository = new SqlEquipmentRepository();
    const ids: string[] = [];
    for (const row of preview.rows) {
      const equipment = Equipment.create({
        code: row.code,
        name: row.name,
        categoryId: row.categoryId,
        totalQuantity: row.quantity,
        availableQuantity: row.quantity,
        reservedQuantity: 0,
        borrowedQuantity: 0,
        brokenQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        status: row.status,
        location: row.location || undefined,
        note: row.note || undefined,
      });
      await repository.save(equipment, transaction);
      ids.push(equipment.id.toString());
    }
    await new SqlAuditLogRepository().save(
      {
        userId,
        action: "EQUIPMENT_IMPORTED",
        entityName: "Equipment",
        newValueJson: JSON.stringify({ count: ids.length, ids }),
      },
      transaction,
    );
    await transaction.commit();
    finished = true;
    return { ...preview, imported: ids.length };
  } finally {
    if (!finished) await transaction.rollback().catch(() => undefined);
  }
}
