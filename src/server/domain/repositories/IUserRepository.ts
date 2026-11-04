import { User, UserStatus } from '../entities/User';

export interface UserWithRoles {
  user: User;
  roles: string[];
}

export interface UserListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: UserStatus;
  roleCode?: string;
}

export interface UserListResult {
  data: UserWithRoles[];
  total: number;
}

export interface UserSummary {
  total: number;
  active: number;
  locked: number;
  inactive: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdWithRoles(id: string): Promise<UserWithRoles | null>;
  findByUsernameOrEmail(identifier: string): Promise<User | null>;
  list(filters: UserListFilters): Promise<UserListResult>;
  getSummary(): Promise<UserSummary>;
  isEmailOrUsernameTaken(email: string, username: string, excludeUserId?: string): Promise<boolean>;
  findExistingRoleCodes(roleCodes: string[]): Promise<string[]>;
  getRoleCodesByUserId(userId: string): Promise<string[]>;
  replaceRoles(userId: string, roleCodes: string[], transaction?: any): Promise<void>;
  countActiveUsersByRole(roleCode: string, transaction?: any): Promise<number>;
  save(user: User, transaction?: any): Promise<void>;
  touchLastLogin?(userId: string, at: Date, expectedPasswordHash: string | null, transaction?: any): Promise<boolean>;
}
