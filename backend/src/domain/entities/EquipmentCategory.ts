import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface EquipmentCategoryProps {
  code: string;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EquipmentCategory extends Entity<EquipmentCategoryProps> {
  private constructor(props: EquipmentCategoryProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: EquipmentCategoryProps, id?: UniqueEntityId): EquipmentCategory {
    if (!props.code.trim()) {
      throw new Error('Mã danh mục không được để trống.');
    }
    if (!props.name.trim()) {
      throw new Error('Tên danh mục không được để trống.');
    }
    return new EquipmentCategory(props, id);
  }

  public get code(): string { return this.props.code; }
  public get name(): string { return this.props.name; }
  public get description(): string | undefined { return this.props.description; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }

  public update(name: string, description?: string): void {
    if (!name.trim()) {
      throw new Error('Tên danh mục không được để trống.');
    }
    this.props.name = name;
    this.props.description = description;
    this.props.updatedAt = new Date();
  }
}
