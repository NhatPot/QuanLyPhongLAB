import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface IncidentReportProps {
  code: string;
  reporterId: string;
  computerId?: string;
  equipmentId?: string;
  bookingRequestId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  imageUrl?: string;
  assignedTo?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  resultNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class IncidentReport extends Entity<IncidentReportProps> {
  private constructor(props: IncidentReportProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: IncidentReportProps, id?: UniqueEntityId): IncidentReport {
    if (!props.code.trim()) throw new Error('Mã sự cố không được để trống.');
    if (!props.reporterId) throw new Error('Người báo cáo không hợp lệ.');
    if (!props.title.trim()) throw new Error('Tiêu đề sự cố không được để trống.');
    if (!props.description.trim()) throw new Error('Mô tả sự cố không được để trống.');
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(props.severity)) throw new Error('Mức độ sự cố không hợp lệ.');
    if (!['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(props.status)) throw new Error('Trạng thái sự cố không hợp lệ.');
    return new IncidentReport({
      ...props,
      code: props.code.trim().toUpperCase(),
      title: props.title.trim(),
      description: props.description.trim(),
      imageUrl: cleanOptional(props.imageUrl),
      resultNote: cleanOptional(props.resultNote),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    }, id);
  }

  public get code(): string { return this.props.code; }
  public get reporterId(): string { return this.props.reporterId; }
  public get computerId(): string | undefined { return this.props.computerId; }
  public get equipmentId(): string | undefined { return this.props.equipmentId; }
  public get bookingRequestId(): string | undefined { return this.props.bookingRequestId; }
  public get title(): string { return this.props.title; }
  public get description(): string { return this.props.description; }
  public get severity(): IncidentSeverity { return this.props.severity; }
  public get status(): IncidentStatus { return this.props.status; }
  public get imageUrl(): string | undefined { return this.props.imageUrl; }
  public get assignedTo(): string | undefined { return this.props.assignedTo; }
  public get resolvedAt(): Date | undefined { return this.props.resolvedAt; }
  public get closedAt(): Date | undefined { return this.props.closedAt; }
  public get resultNote(): string | undefined { return this.props.resultNote; }
  public get createdAt(): Date { return this.props.createdAt!; }
  public get updatedAt(): Date { return this.props.updatedAt!; }

  public updateDetails(input: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    computerId?: string;
    equipmentId?: string;
    bookingRequestId?: string;
    imageUrl?: string;
  }): void {
    if (this.status === 'RESOLVED' || this.status === 'CLOSED') {
      throw new Error('Không thể sửa nội dung sự cố đã xử lý hoặc đã đóng.');
    }
    if (!input.title.trim() || !input.description.trim()) throw new Error('Tiêu đề và mô tả sự cố không được để trống.');
    this.props.title = input.title.trim();
    this.props.description = input.description.trim();
    this.props.severity = input.severity;
    this.props.computerId = input.computerId;
    this.props.equipmentId = input.equipmentId;
    this.props.bookingRequestId = input.bookingRequestId;
    this.props.imageUrl = cleanOptional(input.imageUrl);
    this.touch();
  }

  public assign(userId: string): void {
    if (this.status === 'RESOLVED' || this.status === 'CLOSED') throw new Error('Không thể phân công sự cố đã xử lý hoặc đã đóng.');
    this.props.assignedTo = userId;
    if (this.status !== 'IN_PROGRESS') this.props.status = 'ASSIGNED';
    this.touch();
  }

  public start(actorUserId: string): void {
    if (this.status !== 'OPEN' && this.status !== 'ASSIGNED') throw new Error('Chỉ sự cố mới hoặc đã phân công mới có thể bắt đầu xử lý.');
    this.props.assignedTo = this.props.assignedTo || actorUserId;
    this.props.status = 'IN_PROGRESS';
    this.touch();
  }

  public resolve(resultNote: string, resolvedAt = new Date()): void {
    if (this.status !== 'IN_PROGRESS') throw new Error('Sự cố phải đang được xử lý trước khi xác nhận hoàn tất.');
    if (!resultNote.trim()) throw new Error('Cần nhập kết quả xử lý sự cố.');
    this.props.status = 'RESOLVED';
    this.props.resultNote = resultNote.trim();
    this.props.resolvedAt = resolvedAt;
    this.touch(resolvedAt);
  }

  public close(resultNote?: string, closedAt = new Date()): void {
    if (this.status !== 'RESOLVED') throw new Error('Chỉ sự cố đã xử lý mới có thể đóng hồ sơ.');
    this.props.status = 'CLOSED';
    this.props.resultNote = cleanOptional(resultNote) || this.props.resultNote;
    this.props.closedAt = closedAt;
    this.touch(closedAt);
  }

  private touch(at = new Date()): void { this.props.updatedAt = at; }
}

function cleanOptional(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}
