import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface EquipmentInventoryTransactionProps {
  equipmentId: string;
  transactionType: 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'BORROW' | 'RETURN' | 'DAMAGE_REPORT' | 'DAMAGE_RESOLVED' | 'MAINTENANCE_START' | 'MAINTENANCE_COMPLETE';
  deltaTotal: number;
  deltaAvailable: number;
  deltaReserved: number;
  deltaBorrowed: number;
  deltaBroken: number;
  deltaMaintenance: number;
  deltaLost: number;
  referenceType?: string;
  referenceId?: string;
  performedBy?: string;
  note?: string;
  createdAt?: Date;
}

export class EquipmentInventoryTransaction extends Entity<EquipmentInventoryTransactionProps> {
  private constructor(props: EquipmentInventoryTransactionProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: EquipmentInventoryTransactionProps, id?: UniqueEntityId): EquipmentInventoryTransaction {
    if (!props.equipmentId) {
      throw new Error('EquipmentId không được để trống.');
    }
    if (!props.transactionType) {
      throw new Error('TransactionType không được để trống.');
    }

    return new EquipmentInventoryTransaction({
      ...props,
      deltaTotal: props.deltaTotal ?? 0,
      deltaAvailable: props.deltaAvailable ?? 0,
      deltaReserved: props.deltaReserved ?? 0,
      deltaBorrowed: props.deltaBorrowed ?? 0,
      deltaBroken: props.deltaBroken ?? 0,
      deltaMaintenance: props.deltaMaintenance ?? 0,
      deltaLost: props.deltaLost ?? 0
    }, id);
  }

  public get equipmentId(): string { return this.props.equipmentId; }
  public get transactionType(): string { return this.props.transactionType; }
  public get deltaTotal(): number { return this.props.deltaTotal; }
  public get deltaAvailable(): number { return this.props.deltaAvailable; }
  public get deltaReserved(): number { return this.props.deltaReserved; }
  public get deltaBorrowed(): number { return this.props.deltaBorrowed; }
  public get deltaBroken(): number { return this.props.deltaBroken; }
  public get deltaMaintenance(): number { return this.props.deltaMaintenance; }
  public get deltaLost(): number { return this.props.deltaLost; }
  public get referenceType(): string | undefined { return this.props.referenceType; }
  public get referenceId(): string | undefined { return this.props.referenceId; }
  public get performedBy(): string | undefined { return this.props.performedBy; }
  public get note(): string | undefined { return this.props.note; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
}
