import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface BookingPurposeGroupProps {
  id?: string;
  code: string;
  name: string;
  normalizedKey: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BookingPurposeGroup extends Entity<BookingPurposeGroupProps> {
  private constructor(props: BookingPurposeGroupProps, id?: string) {
    super(props, id ? new UniqueEntityId(id) : undefined);
  }

  public static create(props: BookingPurposeGroupProps): BookingPurposeGroup {
    if (!props.code.trim()) throw new Error('Mã nhóm mục đích không được để trống.');
    if (!props.name.trim()) throw new Error('Tên nhóm mục đích không được để trống.');
    if (!props.normalizedKey.trim()) throw new Error('Khóa chuẩn hóa mục đích không được để trống.');

    return new BookingPurposeGroup({
      ...props,
      isActive: props.isActive ?? true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    }, props.id);
  }

  public get code(): string { return this.props.code; }
  public get name(): string { return this.props.name; }
  public get normalizedKey(): string { return this.props.normalizedKey; }
  public get isActive(): boolean { return this.props.isActive !== false; }
  public get createdAt(): Date { return this.props.createdAt!; }
  public get updatedAt(): Date { return this.props.updatedAt!; }
}
