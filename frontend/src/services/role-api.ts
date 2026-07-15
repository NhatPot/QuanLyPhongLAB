import { apiClient } from './api-client';

export interface RoleApiRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionCodes: string[];
}

export interface PermissionApiRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  group: string;
}

export interface RoleCatalogResponse {
  roles: RoleApiRecord[];
  permissions: PermissionApiRecord[];
}

export const roleApi = {
  list: async (): Promise<RoleApiRecord[]> => {
    const response = await apiClient.get('/roles');
    return response.data.data;
  },

  catalog: async (): Promise<RoleCatalogResponse> => {
    const response = await apiClient.get('/roles/catalog');
    return response.data.data;
  },

  get: async (code: string): Promise<RoleApiRecord> => {
    const response = await apiClient.get(`/roles/${code}`);
    return response.data.data;
  },

  updatePermissions: async (code: string, permissionCodes: string[]): Promise<RoleApiRecord> => {
    const response = await apiClient.put(`/roles/${code}/permissions`, { permissionCodes });
    return response.data.data;
  },
};

