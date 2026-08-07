import { apiClient } from './api-client';

export type ComputerStatus = 'ACTIVE' | 'IN_USE' | 'BROKEN' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE';

export interface ComputerData {
  id: string;
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
  lastMaintenanceDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComputerFilter {
  keyword?: string;
  status?: string;
  position?: string;
  page?: number;
  pageSize?: number;
}

export interface ComputerListResponse {
  data: ComputerData[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ComputerSummary {
  total: number;
  active: number;
  inUse: number;
  broken: number;
  maintenance: number;
  locked: number;
  inactive: number;
}

export interface DeviceMetrics {
  timestamp: string;
  status?: {
    cpu?: { usage?: number; temperature?: number; cores?: number[] };
    ram?: { used?: number; total?: number; free?: number; usagePercent?: number };
    disk?: { used?: number; total?: number; usagePercent?: number; partitions?: any[] };
    network?: { rxBytes?: number; txBytes?: number; rxSec?: number; txSec?: number };
  };
  installed_apps?: Array<{ name: string; version?: string; publisher?: string }>;
  ipAddress?: string;
}

export const computerApi = {
  list: async (filter: ComputerFilter): Promise<ComputerListResponse> => {
    const response = await apiClient.get('/computers', { params: filter });
    return response.data;
  },

  get: async (id: string): Promise<ComputerData> => {
    const response = await apiClient.get(`/computers/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<ComputerData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComputerData> => {
    const response = await apiClient.post('/computers', data);
    return response.data.data;
  },

  update: async (id: string, data: Omit<ComputerData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComputerData> => {
    const response = await apiClient.put(`/computers/${id}`, data);
    return response.data.data;
  },

  updateStatus: async (id: string, status: ComputerStatus): Promise<ComputerData> => {
    const response = await apiClient.patch(`/computers/${id}/status`, { status });
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/computers/${id}`);
  },

  getSummary: async (): Promise<ComputerSummary> => {
    const response = await apiClient.get('/computers/availability-summary');
    return response.data.data;
  },

  getDeviceMetrics: async (): Promise<Record<string, DeviceMetrics>> => {
    const response = await apiClient.get('/devices/metrics');
    return response.data.data;
  }
};
