import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type MaintenanceTargetType = 'LAB' | 'COMPUTER' | 'EQUIPMENT';
export type MaintenanceStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceSource = 'AVAILABLE' | 'BROKEN';
export type MaintenanceOutcome = 'AVAILABLE' | 'BROKEN';
export type MaintenanceTriggerSource = 'MANUAL' | 'BROKEN_STATUS' | 'MAINTENANCE_STATUS' | 'PERIODIC_270';

export interface MaintenanceScheduleProps {
  code: string;
  targetType: MaintenanceTargetType;
  targetId: string;
  targetCode: string;
  targetName: string;
  title: string;
  description?: string;
  reason: string;
  scheduledStartAt: Date;
  expectedEndAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  status: MaintenanceStatus;
  technicianId?: string;
  quantity: number;
  maintenanceSource?: MaintenanceSource;
  resultNote?: string;
  partsNote?: string;
  estimatedCost: number;
  actualCost?: number;
  completionOutcome?: MaintenanceOutcome;
  cancellationReason?: string;
  triggerSource: MaintenanceTriggerSource;
  triggeredAt?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  rowVersion?: Buffer;
}

export interface UpdateMaintenanceScheduleInput {
  targetType: MaintenanceTargetType;
  targetId: string;
  targetCode: string;
  targetName: string;
  title: string;
  description?: string;
  reason: string;
  scheduledStartAt: Date;
  expectedEndAt: Date;
  technicianId?: string;
  quantity: number;
  maintenanceSource?: MaintenanceSource;
  estimatedCost: number;
  partsNote?: string;
}

export class MaintenanceSchedule extends Entity<MaintenanceScheduleProps> {
  private constructor(props: MaintenanceScheduleProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: MaintenanceScheduleProps, id?: UniqueEntityId): MaintenanceSchedule {
    MaintenanceSchedule.validate(props);
    return new MaintenanceSchedule(props, id);
  }

  public get code(): string { return this.props.code; }
  public get targetType(): MaintenanceTargetType { return this.props.targetType; }
  public get targetId(): string { return this.props.targetId; }
  public get targetCode(): string { return this.props.targetCode; }
  public get targetName(): string { return this.props.targetName; }
  public get title(): string { return this.props.title; }
  public get description(): string | undefined { return this.props.description; }
  public get reason(): string { return this.props.reason; }
  public get scheduledStartAt(): Date { return this.props.scheduledStartAt; }
  public get expectedEndAt(): Date { return this.props.expectedEndAt; }
  public get startedAt(): Date | undefined { return this.props.startedAt; }
  public get completedAt(): Date | undefined { return this.props.completedAt; }
  public get cancelledAt(): Date | undefined { return this.props.cancelledAt; }
  public get status(): MaintenanceStatus { return this.props.status; }
  public get technicianId(): string | undefined { return this.props.technicianId; }
  public get quantity(): number { return this.props.quantity; }
  public get maintenanceSource(): MaintenanceSource | undefined { return this.props.maintenanceSource; }
  public get resultNote(): string | undefined { return this.props.resultNote; }
  public get partsNote(): string | undefined { return this.props.partsNote; }
  public get estimatedCost(): number { return this.props.estimatedCost; }
  public get actualCost(): number | undefined { return this.props.actualCost; }
  public get completionOutcome(): MaintenanceOutcome | undefined { return this.props.completionOutcome; }
  public get cancellationReason(): string | undefined { return this.props.cancellationReason; }
  public get triggerSource(): MaintenanceTriggerSource { return this.props.triggerSource; }
  public get triggeredAt(): Date | undefined { return this.props.triggeredAt; }
  public get createdBy(): string | undefined { return this.props.createdBy; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }
  public get deletedAt(): Date | undefined { return this.props.deletedAt; }
  public get rowVersion(): Buffer | undefined { return this.props.rowVersion; }

  public updateSchedule(input: UpdateMaintenanceScheduleInput): void {
    if (!['PENDING', 'SCHEDULED'].includes(this.props.status)) {
      throw new Error('Chỉ được chỉnh sửa lịch bảo trì chưa bắt đầu.');
    }

    const candidate: MaintenanceScheduleProps = {
      ...this.props,
      ...input,
      updatedAt: new Date(),
    };
    MaintenanceSchedule.validate(candidate);
    Object.assign(this.props, candidate);
    this.props.status = 'SCHEDULED';
  }

  public start(startedAt = new Date()): void {
    if (this.props.status !== 'SCHEDULED') {
      throw new Error('Chỉ lịch đã lên kế hoạch mới có thể bắt đầu.');
    }
    this.props.status = 'IN_PROGRESS';
    this.props.startedAt = startedAt;
    this.props.updatedAt = startedAt;
  }

  public complete(input: {
    resultNote: string;
    actualCost: number;
    partsNote?: string;
    outcome: MaintenanceOutcome;
    completedAt?: Date;
  }): void {
    if (this.props.status !== 'IN_PROGRESS') {
      throw new Error('Chỉ lịch đang thực hiện mới có thể hoàn tất.');
    }
    if (!input.resultNote.trim()) throw new Error('Kết quả bảo trì không được để trống.');
    if (input.actualCost < 0) throw new Error('Chi phí thực tế không được âm.');

    const completedAt = input.completedAt || new Date();
    this.props.status = 'COMPLETED';
    this.props.resultNote = input.resultNote.trim();
    this.props.actualCost = input.actualCost;
    this.props.partsNote = input.partsNote?.trim() || this.props.partsNote;
    this.props.completionOutcome = input.outcome;
    this.props.completedAt = completedAt;
    this.props.updatedAt = completedAt;
  }

  public cancel(reason: string, cancelledAt = new Date()): void {
    if (!['PENDING', 'SCHEDULED'].includes(this.props.status)) {
      throw new Error('Chỉ lịch chưa bắt đầu mới có thể hủy.');
    }
    if (!reason.trim()) throw new Error('Lý do hủy không được để trống.');
    this.props.status = 'CANCELLED';
    this.props.cancellationReason = reason.trim();
    this.props.cancelledAt = cancelledAt;
    this.props.updatedAt = cancelledAt;
  }

  public markDeleted(deletedAt = new Date()): void {
    if (!['PENDING', 'SCHEDULED', 'CANCELLED'].includes(this.props.status)) {
      throw new Error('Không thể xóa lịch đang thực hiện hoặc đã hoàn tất.');
    }
    this.props.deletedAt = deletedAt;
    this.props.updatedAt = deletedAt;
  }

  public isOverdue(referenceDate = new Date()): boolean {
    return ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(this.props.status) && this.props.expectedEndAt < referenceDate;
  }

  private static validate(props: MaintenanceScheduleProps): void {
    if (!props.code.trim()) throw new Error('Mã bảo trì không được để trống.');
    if (!props.targetId) throw new Error('Đối tượng bảo trì không được để trống.');
    if (!props.targetCode.trim() || !props.targetName.trim()) throw new Error('Thông tin đối tượng bảo trì không hợp lệ.');
    if (!props.title.trim()) throw new Error('Tiêu đề bảo trì không được để trống.');
    if (!props.reason.trim()) throw new Error('Lý do bảo trì không được để trống.');
    if (props.scheduledStartAt >= props.expectedEndAt) throw new Error('Thời gian kết thúc dự kiến phải sau thời gian bắt đầu.');
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) throw new Error('Số lượng bảo trì phải là số nguyên lớn hơn 0.');
    if (props.estimatedCost < 0 || (props.actualCost !== undefined && props.actualCost < 0)) throw new Error('Chi phí bảo trì không được âm.');
    if (props.targetType !== 'EQUIPMENT' && props.quantity !== 1) throw new Error('Phòng Lab và máy tính chỉ được bảo trì theo từng tài sản.');
    if (props.targetType === 'EQUIPMENT' && !props.maintenanceSource) throw new Error('Cần chọn nguồn số lượng thiết bị đưa vào bảo trì.');
    if (props.targetType !== 'EQUIPMENT' && props.maintenanceSource) throw new Error('Nguồn số lượng chỉ áp dụng cho thiết bị.');
    if (!['MANUAL', 'BROKEN_STATUS', 'MAINTENANCE_STATUS', 'PERIODIC_270'].includes(props.triggerSource)) throw new Error('Nguồn tạo bảo trì không hợp lệ.');
  }
}
