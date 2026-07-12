import { apiClient } from './api-client';

export interface LabProfileData {
  id: string;
  labCode: string;
  labName: string;
  location: string;
  capacity: number;
  description?: string;
  rules?: string;
  managerId?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export const labApi = {
  getProfile: async (): Promise<LabProfileData> => {
    const response = await apiClient.get('/lab-profile');
    return response.data.data;
  },

  updateProfile: async (data: Omit<LabProfileData, 'id' | 'labCode' | 'status' | 'createdAt' | 'updatedAt'>): Promise<LabProfileData> => {
    const response = await apiClient.put('/lab-profile', data);
    return response.data.data;
  },

  updateStatus: async (status: 'ACTIVE' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE'): Promise<void> => {
    await apiClient.patch('/lab-profile/status', { status });
  }
};
