import { apiClient } from './api-client';

export type MaintenanceTargetType = 'LAB' | 'COMPUTER' | 'EQUIPMENT';
export type MaintenanceStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceSource = 'AVAILABLE' | 'BROKEN';
export type MaintenanceOutcome = 'AVAILABLE' | 'BROKEN';
export type MaintenanceTriggerSource = 'MANUAL' | 'BROKEN_STATUS' | 'MAINTENANCE_STATUS' | 'PERIODIC_270';

export interface MaintenanceRecord {
  id: string;
  code: string;
  targetType: MaintenanceTargetType;
  targetId: string;
  targetCode: string;
  targetName: string;
  title: string;
  description: string | null;
  reason: string;
  scheduledStartAt: string;
  expectedEndAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  status: MaintenanceStatus;
  technicianId: string | null;
  technicianName: string | null;
  technicianUsername: string | null;
  quantity: number;
  maintenanceSource: MaintenanceSource | null;
  resultNote: string | null;
  partsNote: string | null;
  estimatedCost: number;
  actualCost: number | null;
  completionOutcome: MaintenanceOutcome | null;
  cancellationReason: string | null;
  triggerSource: MaintenanceTriggerSource;
  triggeredAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isOverdue: boolean;
}

export interface MaintenanceListResponse {
  data: MaintenanceRecord[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface MaintenanceSummary {
  total: number;
  pending: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  overdue: number;
  totalActualCost: number;
}

export interface MaintenanceOptionItem {
  id: string;
  code: string;
  name: string;
  status: string;
  availableQuantity?: number;
  brokenQuantity?: number;
  maintenanceQuantity?: number;
}

export interface MaintenanceOptions {
  lab: MaintenanceOptionItem | null;
  computers: MaintenanceOptionItem[];
  equipments: MaintenanceOptionItem[];
  technicians: Array<{ id: string; fullName: string; username: string; roles: string[] }>;
}

export interface MaintenancePayload {
  targetType: MaintenanceTargetType;
  targetId: string;
  title: string;
  description?: string;
  reason: string;
  scheduledStartAt: string;
  expectedEndAt: string;
  technicianId?: string;
  quantity: number;
  maintenanceSource?: MaintenanceSource;
  estimatedCost: number;
  partsNote?: string;
}

export const maintenanceApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: MaintenanceStatus;
    targetType?: MaintenanceTargetType;
    technicianId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<MaintenanceListResponse> => {
    const response = await apiClient.get('/maintenances', { params });
    return response.data;
  },
  summary: async (): Promise<MaintenanceSummary> => {
    const response = await apiClient.get('/maintenances/summary');
    return response.data.data;
  },
  options: async (): Promise<MaintenanceOptions> => {
    const response = await apiClient.get('/maintenances/options');
    return response.data.data;
  },
  get: async (id: string): Promise<MaintenanceRecord> => {
    const response = await apiClient.get(`/maintenances/${id}`);
    return response.data.data;
  },
  create: async (payload: MaintenancePayload): Promise<MaintenanceRecord> => {
    const response = await apiClient.post('/maintenances', payload);
    return response.data.data;
  },
  update: async (id: string, payload: MaintenancePayload): Promise<MaintenanceRecord> => {
    const response = await apiClient.put(`/maintenances/${id}`, payload);
    return response.data.data;
  },
  start: async (id: string): Promise<MaintenanceRecord> => {
    const response = await apiClient.post(`/maintenances/${id}/start`);
    return response.data.data;
  },
  complete: async (id: string, payload: {
    resultNote: string;
    actualCost: number;
    partsNote?: string;
    outcome: MaintenanceOutcome;
  }): Promise<MaintenanceRecord> => {
    const response = await apiClient.post(`/maintenances/${id}/complete`, payload);
    return response.data.data;
  },
  cancel: async (id: string, reason: string): Promise<MaintenanceRecord> => {
    const response = await apiClient.post(`/maintenances/${id}/cancel`, { reason });
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/maintenances/${id}`);
  },
  syncReminders: async (): Promise<{ created: number; intervalDays: number }> => {
    const response = await apiClient.post('/maintenances/sync-reminders');
    return response.data.data;
  },
};
