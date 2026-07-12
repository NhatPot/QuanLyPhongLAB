import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface EquipmentProps {
  code: string;
  name: string;
  categoryId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  borrowedQuantity: number;
  brokenQuantity: number;
  maintenanceQuantity: number;
  lostQuantity: number;
  location?: string;
  managerId?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  imageUrl?: string;
  note?: string;
  rowVersion?: Buffer;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Equipment extends Entity<EquipmentProps> {
  private constructor(props: EquipmentProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: EquipmentProps, id?: UniqueEntityId): Equipment {
    if (!props.code.trim()) {
      throw new Error('Mã thiết bị không được để trống.');
    }
    if (!props.name.trim()) {
      throw new Error('Tên thiết bị không được để trống.');
    }
    if (!props.categoryId) {
      throw new Error('Danh mục thiết bị không được để trống.');
    }

    props.totalQuantity = props.totalQuantity ?? 0;
    props.availableQuantity = props.availableQuantity ?? 0;
    props.reservedQuantity = props.reservedQuantity ?? 0;
    props.borrowedQuantity = props.borrowedQuantity ?? 0;
    props.brokenQuantity = props.brokenQuantity ?? 0;
    props.maintenanceQuantity = props.maintenanceQuantity ?? 0;
    props.lostQuantity = props.lostQuantity ?? 0;

    const eq = new Equipment(props, id);
    eq.validateQuantities();
    return eq;
  }

  public get code(): string { return this.props.code; }
  public get name(): string { return this.props.name; }
  public get categoryId(): string { return this.props.categoryId; }
  public get totalQuantity(): number { return this.props.totalQuantity; }
  public get availableQuantity(): number { return this.props.availableQuantity; }
  public get reservedQuantity(): number { return this.props.reservedQuantity; }
  public get borrowedQuantity(): number { return this.props.borrowedQuantity; }
  public get brokenQuantity(): number { return this.props.brokenQuantity; }
  public get maintenanceQuantity(): number { return this.props.maintenanceQuantity; }
  public get lostQuantity(): number { return this.props.lostQuantity; }
  public get location(): string | undefined { return this.props.location; }
  public get managerId(): string | undefined { return this.props.managerId; }
  public get status(): 'ACTIVE' | 'LOCKED' | 'INACTIVE' { return this.props.status; }
  public get imageUrl(): string | undefined { return this.props.imageUrl; }
  public get note(): string | undefined { return this.props.note; }
  public get rowVersion(): Buffer | undefined { return this.props.rowVersion; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }
  public get deletedAt(): Date | undefined { return this.props.deletedAt; }

  private validateQuantities(): void {
    if (
      this.props.totalQuantity < 0 ||
      this.props.availableQuantity < 0 ||
      this.props.reservedQuantity < 0 ||
      this.props.borrowedQuantity < 0 ||
      this.props.brokenQuantity < 0 ||
      this.props.maintenanceQuantity < 0 ||
      this.props.lostQuantity < 0
    ) {
      throw new Error('Số lượng thiết bị không được âm.');
    }

    const sum = 
      this.props.availableQuantity +
      this.props.reservedQuantity +
      this.props.borrowedQuantity +
      this.props.brokenQuantity +
      this.props.maintenanceQuantity +
      this.props.lostQuantity;

    if (this.props.totalQuantity !== sum) {
      throw new Error(`Ràng buộc tổng số lượng thất bại: Tổng (${this.props.totalQuantity}) phải bằng tổng các trạng thái (${sum}).`);
    }
  }

  public updateInformation(info: Partial<Omit<EquipmentProps, 'createdAt' | 'updatedAt' | 'deletedAt' | 'rowVersion' | 'totalQuantity' | 'availableQuantity' | 'reservedQuantity' | 'borrowedQuantity' | 'brokenQuantity' | 'maintenanceQuantity' | 'lostQuantity'>>): void {
    if (info.code !== undefined && !info.code.trim()) {
      throw new Error('Mã thiết bị không được để trống.');
    }
    if (info.name !== undefined && !info.name.trim()) {
      throw new Error('Tên thiết bị không được để trống.');
    }
    if (info.categoryId !== undefined && !info.categoryId) {
      throw new Error('Danh mục thiết bị không được để trống.');
    }

    this.props.code = info.code ?? this.props.code;
    this.props.name = info.name ?? this.props.name;
    this.props.categoryId = info.categoryId ?? this.props.categoryId;
    this.props.location = info.location !== undefined ? info.location : this.props.location;
    this.props.managerId = info.managerId !== undefined ? info.managerId : this.props.managerId;
    this.props.status = info.status ?? this.props.status;
    this.props.imageUrl = info.imageUrl !== undefined ? info.imageUrl : this.props.imageUrl;
    this.props.note = info.note !== undefined ? info.note : this.props.note;
    this.props.updatedAt = new Date();
  }

  public adjustInventory(delta: number): void {
    if (delta > 0) {
      this.props.totalQuantity += delta;
      this.props.availableQuantity += delta;
    } else if (delta < 0) {
      const absDelta = Math.abs(delta);
      if (this.props.availableQuantity < absDelta) {
        throw new Error('Số lượng khả dụng không đủ để giảm kho.');
      }
      this.props.totalQuantity -= absDelta;
      this.props.availableQuantity -= absDelta;
    }
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public reserve(quantity: number): void {
    if (quantity <= 0) throw new Error('Số lượng yêu cầu đặt giữ phải lớn hơn 0.');
    if (this.props.availableQuantity < quantity) {
      throw new Error('Số lượng thiết bị khả dụng không đủ.');
    }
    this.props.availableQuantity -= quantity;
    this.props.reservedQuantity += quantity;
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public releaseReservation(quantity: number): void {
    if (quantity <= 0) throw new Error('Số lượng yêu cầu giải phóng phải lớn hơn 0.');
    if (this.props.reservedQuantity < quantity) {
      throw new Error('Số lượng thiết bị đặt giữ không đủ.');
    }
    this.props.reservedQuantity -= quantity;
    this.props.availableQuantity += quantity;
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public borrow(quantity: number): void {
    if (quantity <= 0) throw new Error('Số lượng mượn phải lớn hơn 0.');
    if (this.props.reservedQuantity < quantity) {
      throw new Error('Số lượng thiết bị đặt giữ không đủ để thực hiện cho mượn.');
    }
    this.props.reservedQuantity -= quantity;
    this.props.borrowedQuantity += quantity;
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public returnBorrowed(quantity: number): void {
    if (quantity <= 0) throw new Error('Số lượng trả phải lớn hơn 0.');
    if (this.props.borrowedQuantity < quantity) {
      throw new Error('Số lượng đang mượn ít hơn số lượng muốn trả.');
    }
    this.props.borrowedQuantity -= quantity;
    this.props.availableQuantity += quantity;
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public reportBroken(quantity: number, from: 'AVAILABLE' | 'BORROWED'): void {
    if (quantity <= 0) throw new Error('Số lượng báo hỏng phải lớn hơn 0.');
    if (from === 'AVAILABLE') {
      if (this.props.availableQuantity < quantity) {
        throw new Error('Số lượng khả dụng không đủ để báo hỏng.');
      }
      this.props.availableQuantity -= quantity;
    } else {
      if (this.props.borrowedQuantity < quantity) {
        throw new Error('Số lượng đang mượn không đủ để báo hỏng.');
      }
      this.props.borrowedQuantity -= quantity;
    }
    this.props.brokenQuantity += quantity;
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public resolveBroken(quantity: number, to: 'AVAILABLE' | 'MAINTENANCE' | 'LOST'): void {
    if (quantity <= 0) throw new Error('Số lượng xử lý phải lớn hơn 0.');
    if (this.props.brokenQuantity < quantity) {
      throw new Error('Số lượng hỏng không đủ để xử lý.');
    }
    this.props.brokenQuantity -= quantity;
    if (to === 'AVAILABLE') {
      this.props.availableQuantity += quantity;
    } else if (to === 'MAINTENANCE') {
      this.props.maintenanceQuantity += quantity;
    } else {
      this.props.lostQuantity += quantity;
    }
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public completeMaintenance(quantity: number, isBroken = false): void {
    if (quantity <= 0) throw new Error('Số lượng hoàn thành bảo trì phải lớn hơn 0.');
    if (this.props.maintenanceQuantity < quantity) {
      throw new Error('Số lượng đang bảo trì không đủ.');
    }
    this.props.maintenanceQuantity -= quantity;
    if (isBroken) {
      this.props.brokenQuantity += quantity;
    } else {
      this.props.availableQuantity += quantity;
    }
    this.validateQuantities();
    this.props.updatedAt = new Date();
  }

  public delete(): void {
    if (this.props.borrowedQuantity > 0 || this.props.reservedQuantity > 0) {
      throw new Error('Không thể xóa thiết bị đang được mượn hoặc được đặt trước.');
    }
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }
}
