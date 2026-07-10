import { Entity } from './Entity';
import { UniqueEntityId } from '../value-objects/UniqueEntityId';

export interface UserProps {
  fullName: string;
  email: string;
  username: string;
  passwordHash: string;
  phone?: string;
  department?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
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
  public get status(): string { return this.props.status; }
  public get mustChangePassword(): boolean { return this.props.mustChangePassword; }
  public get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }

  public updateLastLogin(date: Date): void {
    this.props.lastLoginAt = date;
    this.props.updatedAt = new Date();
  }

  public updatePassword(hash: string): void {
    this.props.passwordHash = hash;
    this.props.mustChangePassword = false;
    this.props.updatedAt = new Date();
  }
}
