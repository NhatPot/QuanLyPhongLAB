import { Equipment } from "../entities/Equipment";

export function lendableQuantity(
  equipment: Equipment,
  reserved: number,
): number {
  if (
    !equipment.isLendable ||
    equipment.status !== "ACTIVE" ||
    equipment.deletedAt
  )
    return 0;
  const healthy =
    equipment.totalQuantity -
    equipment.brokenQuantity -
    equipment.maintenanceQuantity -
    equipment.lostQuantity;
  return Math.max(0, Math.min(equipment.availableQuantity, healthy - reserved));
}
