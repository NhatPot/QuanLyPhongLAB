export interface PermissionRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  group: string;
}

export interface RoleRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionCodes: string[];
}

export interface IRolePermissionRepository {
  listRoles(): Promise<RoleRecord[]>;
  getRoleByCode(code: string): Promise<RoleRecord | null>;
  listPermissions(): Promise<PermissionRecord[]>;
  findExistingPermissionCodes(codes: string[]): Promise<string[]>;
  replacePermissions(roleCode: string, permissionCodes: string[], transaction?: any): Promise<void>;
}

