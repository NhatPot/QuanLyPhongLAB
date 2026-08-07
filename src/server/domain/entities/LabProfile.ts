import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type LabStatus = 'ACTIVE' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE';

export interface LabProfileProps {
  labCode: string;
  labName: string;
  location: string;
  capacity: number;
  description?: string;
  rules?: string;
  managerId?: string;
  status: LabStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LabProfile extends Entity<LabProfileProps> {
  private constructor(props: LabProfileProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: LabProfileProps, id?: UniqueEntityId): LabProfile {
    if (props.capacity <= 0) {
      throw new Error('Sức chứa phòng Lab phải lớn hơn 0.');
    }
    return new LabProfile(props, id);
  }

  public get labCode(): string { return this.props.labCode; }
  public get labName(): string { return this.props.labName; }
  public get location(): string { return this.props.location; }
  public get capacity(): number { return this.props.capacity; }
  public get description(): string | undefined { return this.props.description; }
  public get rules(): string | undefined { return this.props.rules; }
  public get managerId(): string | undefined { return this.props.managerId; }
  public get status(): LabStatus { return this.props.status; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }

  public updateInformation(info: Partial<Omit<LabProfileProps, 'status' | 'createdAt' | 'updatedAt'>>): void {
    if (info.capacity !== undefined && info.capacity <= 0) {
      throw new Error('Sức chứa phòng Lab phải lớn hơn 0.');
    }
    
    this.props.labName = info.labName ?? this.props.labName;
    this.props.location = info.location ?? this.props.location;
    this.props.capacity = info.capacity ?? this.props.capacity;
    this.props.description = info.description !== undefined ? info.description : this.props.description;
    this.props.rules = info.rules !== undefined ? info.rules : this.props.rules;
    this.props.managerId = info.managerId !== undefined ? info.managerId : this.props.managerId;
    this.props.updatedAt = new Date();
  }

  public changeStatus(newStatus: LabStatus): void {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  public canAcceptRegularBooking(): boolean {
    return this.props.status === 'ACTIVE';
  }
}
