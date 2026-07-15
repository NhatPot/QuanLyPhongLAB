import { apiClient } from './api-client';

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export interface UserApiRecord {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: string | null;
  department: string | null;
  status: UserStatus;
  roles: string[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserListResponse {
  data: UserApiRecord[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface UserSummary {
  total: number;
  active: number;
  locked: number;
  inactive: number;
}

export interface UserProfilePayload {
  fullName: string;
  email: string;
  username: string;
  phone?: string;
  department?: string;
}

export interface CreateUserPayload extends UserProfilePayload {
  status: UserStatus;
  roleCodes: string[];
  temporaryPassword: string;
}

export const userApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: UserStatus;
    roleCode?: string;
  }): Promise<UserListResponse> => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  summary: async (): Promise<UserSummary> => {
    const response = await apiClient.get('/users/summary');
    return response.data.data;
  },

  get: async (id: string): Promise<UserApiRecord> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data.data;
  },

  create: async (payload: CreateUserPayload): Promise<UserApiRecord> => {
    const response = await apiClient.post('/users', payload);
    return response.data.data;
  },

  update: async (id: string, payload: UserProfilePayload): Promise<UserApiRecord> => {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data.data;
  },

  updateStatus: async (id: string, status: UserStatus): Promise<UserApiRecord> => {
    const response = await apiClient.patch(`/users/${id}/status`, { status });
    return response.data.data;
  },

  assignRoles: async (id: string, roleCodes: string[]): Promise<UserApiRecord> => {
    const response = await apiClient.put(`/users/${id}/roles`, { roleCodes });
    return response.data.data;
  },

  resetPassword: async (id: string, temporaryPassword: string): Promise<UserApiRecord> => {
    const response = await apiClient.post(`/users/${id}/reset-password`, { temporaryPassword });
    return response.data.data;
  },
};

