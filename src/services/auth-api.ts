import { apiClient } from './api-client';

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  csrfToken: string;
  mustChangePassword: boolean;
}

export interface RefreshResponse {
  csrfToken: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: string | null;
  department: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  requiresAccountSetup?: boolean;
  emailVerified?: boolean;
  ssoLinked?: boolean;
  usesSso?: boolean;
}

export interface UpdateProfilePayload {
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  avatarUrl?: string | null;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data.data;
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data.data;
  },
  
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
  },
  
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    const response = await apiClient.put('/auth/me', payload);
    return response.data.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  }
};
