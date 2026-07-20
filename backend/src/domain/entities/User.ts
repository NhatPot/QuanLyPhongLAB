import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export interface UserProps {
  fullName: string;
  email: string;
  username: string;
  passwordHash: string;
  phone?: string;
  department?: string;
  avatarUrl?: string;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityId) {
    super(props, id);
  }

  public static create(props: UserProps, id?: UniqueEntityId): User {
    return new User(props, id);
  }

  public get fullName(): string { return this.props.fullName; }
  public get email(): string { return this.props.email; }
  public get username(): string { return this.props.username; }
  public get passwordHash(): string { return this.props.passwordHash; }
  public get phone(): string | undefined { return this.props.phone; }
  public get department(): string | undefined { return this.props.department; }
  public get avatarUrl(): string | undefined { return this.props.avatarUrl; }
  public get status(): UserStatus { return this.props.status; }
  public get mustChangePassword(): boolean { return this.props.mustChangePassword; }
  public get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }
  public get createdAt(): Date | undefined { return this.props.createdAt; }
  public get updatedAt(): Date | undefined { return this.props.updatedAt; }

  public updateProfile(input: {
    fullName: string;
    email: string;
    username: string;
    phone?: string;
    department?: string;
  }): void {
    this.props.fullName = input.fullName;
    this.props.email = input.email;
    this.props.username = input.username;
    this.props.phone = input.phone;
    this.props.department = input.department;
    this.props.updatedAt = new Date();
  }

  public updatePersonalProfile(input: {
    fullName: string;
    email: string;
    phone?: string;
    department?: string;
    avatarUrl?: string;
  }): void {
    this.props.fullName = input.fullName;
    this.props.email = input.email;
    this.props.phone = input.phone;
    this.props.department = input.department;
    this.props.avatarUrl = input.avatarUrl;
    this.props.updatedAt = new Date();
  }

  public updateStatus(status: UserStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  public updateLastLogin(date: Date): void {
    this.props.lastLoginAt = date;
    this.props.updatedAt = new Date();
  }

  public updatePassword(hash: string): void {
    this.props.passwordHash = hash;
    this.props.mustChangePassword = false;
    this.props.updatedAt = new Date();
  }

  public resetPassword(hash: string): void {
    this.props.passwordHash = hash;
    this.props.mustChangePassword = true;
    this.props.updatedAt = new Date();
  }
}
