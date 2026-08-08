import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';
import { isValidMacAddress, normalizeMacAddress } from '../../shared/utils/deviceIdentity';

export type ComputerStatus = 'ACTIVE' | 'IN_USE' | 'BROKEN' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE';

export interface ComputerProps {
  code: string;
  name: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  operatingSystem?: string;
  installedSoftware?: string;
  ipAddress?: string;
  macAddress?: string;
  position?: string;
  status: ComputerStatus;
  note?: string;
  lastMaintenanceDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export class Computer extends Entity<ComputerProps> {
  private constructor(props: ComputerProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: ComputerProps, id?: UniqueEntityId): Computer {
    if (!props.code.trim()) {
      throw new Error('Mã máy tính không được để trống.');
    }
    if (!props.name.trim()) {
      throw new Error('Tên máy tính không được để trống.');
    }
    if (props.ipAddress && !Computer.isValidIp(props.ipAddress)) {
      throw new Error('Địa chỉ IP không đúng định dạng.');
    }
    if (props.macAddress && !Computer.isValidMac(props.macAddress)) {
      throw new Error('Địa chỉ MAC không đúng định dạng.');
    }
    
    if (props.macAddress) {
      props.macAddress = normalizeMacAddress(props.macAddress);
    }

    return new Computer(props, id);
  }

  public get code(): string { return this.props.code; }
  public get name(): string { return this.props.name; }
  public get cpu(): string | undefined { return this.props.cpu; }
  public get ram(): string | undefined { return this.props.ram; }
  public get storage(): string | undefined { return this.props.storage; }
  public get gpu(): string | undefined { return this.props.gpu; }
  public get operatingSystem(): string | undefined { return this.props.operatingSystem; }
  public get installedSoftware(): string | undefined { return this.props.installedSoftware; }
  public get ipAddress(): string | undefined { return this.props.ipAddress; }
  public get macAddress(): string | undefined { return this.props.macAddress; }
  public get position(): string | undefined { return this.props.position; }
  public get status(): ComputerStatus { return this.props.status; }
  public get note(): string | undefined { return this.props.note; }
  public get lastMaintenanceDate(): Date | undefined { return this.props.lastMaintenanceDate; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }
  public get deletedAt(): Date | undefined { return this.props.deletedAt; }

  public updateInformation(info: Partial<Omit<ComputerProps, 'createdAt' | 'updatedAt' | 'deletedAt'>>): void {
    if (info.code !== undefined && !info.code.trim()) {
      throw new Error('Mã máy tính không được để trống.');
    }
    if (info.name !== undefined && !info.name.trim()) {
      throw new Error('Tên máy tính không được để trống.');
    }
    if (info.ipAddress !== undefined && info.ipAddress && !Computer.isValidIp(info.ipAddress)) {
      throw new Error('Địa chỉ IP không đúng định dạng.');
    }
    if (info.macAddress !== undefined && info.macAddress && !Computer.isValidMac(info.macAddress)) {
      throw new Error('Địa chỉ MAC không đúng định dạng.');
    }

    this.props.code = info.code ?? this.props.code;
    this.props.name = info.name ?? this.props.name;
    this.props.cpu = info.cpu !== undefined ? info.cpu : this.props.cpu;
    this.props.ram = info.ram !== undefined ? info.ram : this.props.ram;
    this.props.storage = info.storage !== undefined ? info.storage : this.props.storage;
    this.props.gpu = info.gpu !== undefined ? info.gpu : this.props.gpu;
    this.props.operatingSystem = info.operatingSystem !== undefined ? info.operatingSystem : this.props.operatingSystem;
    this.props.installedSoftware = info.installedSoftware !== undefined ? info.installedSoftware : this.props.installedSoftware;
    this.props.ipAddress = info.ipAddress !== undefined ? info.ipAddress : this.props.ipAddress;
    this.props.macAddress = info.macAddress !== undefined
      ? (info.macAddress ? normalizeMacAddress(info.macAddress) : undefined)
      : this.props.macAddress;
    this.props.position = info.position !== undefined ? info.position : this.props.position;
    this.props.status = info.status ?? this.props.status;
    this.props.note = info.note !== undefined ? info.note : this.props.note;
    this.props.lastMaintenanceDate = info.lastMaintenanceDate !== undefined ? info.lastMaintenanceDate : this.props.lastMaintenanceDate;
    this.props.updatedAt = new Date();
  }

  public changeStatus(newStatus: ComputerStatus): void {
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  public completeMaintenance(isStillBroken: boolean, completedAt = new Date()): void {
    if (this.props.status !== 'MAINTENANCE') {
      throw new Error('Máy tính không ở trạng thái bảo trì.');
    }
    this.props.status = isStillBroken ? 'BROKEN' : 'ACTIVE';
    this.props.lastMaintenanceDate = completedAt;
    this.props.updatedAt = completedAt;
  }

  public delete(): void {
    this.props.deletedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public restore(): void {
    this.props.deletedAt = undefined;
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
  }

  public isAvailableForBooking(): boolean {
    return this.props.status === 'ACTIVE';
  }

  private static isValidIp(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    if (ip === '::1' || ip === '127.0.0.1') return true;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private static isValidMac(mac: string): boolean {
    return isValidMacAddress(mac);
  }
}
