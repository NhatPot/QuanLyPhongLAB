export interface UserRolePermissions {
  roles: string[];
  permissions: string[];
}

export interface IRolePermissionQuery {
  getRolePermissionsByUserId(userId: string): Promise<UserRolePermissions>;
}
