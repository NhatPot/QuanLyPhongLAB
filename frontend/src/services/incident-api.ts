import { apiClient } from './api-client';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IncidentAssetType = 'COMPUTER' | 'EQUIPMENT' | 'BOOKING' | 'GENERAL';

export interface IncidentRecord {
  id: string;
  code: string;
  reporterId: string;
  reporterName: string | null;
  reporterUsername: string | null;
  computerId: string | null;
  equipmentId: string | null;
  bookingRequestId: string | null;
  assetType: IncidentAssetType;
  assetCode: string | null;
  assetName: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  imageUrl: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToUsername: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resultNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentListResponse {
  data: IncidentRecord[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface IncidentSummary {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  criticalOpen: number;
  brokenComputers: number;
  equipmentTypesWithIssues: number;
  totalAssetAlerts: number;
}

export interface IncidentOptions {
  computers: Array<{ id: string; code: string; name: string; status: string }>;
  equipments: Array<{ id: string; code: string; name: string; brokenQuantity: number; lostQuantity: number }>;
  bookings: Array<{ id: string; code: string; purpose: string; status: string }>;
  assignees: Array<{ id: string; fullName: string; username: string }>;
}

export interface IncidentPayload {
  title: string;
  description: string;
  severity: IncidentSeverity;
  computerId?: string;
  equipmentId?: string;
  bookingRequestId?: string;
  imageUrl?: string;
}

export const incidentApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    assetType?: IncidentAssetType;
    assignedTo?: string;
  }): Promise<IncidentListResponse> => {
    const response = await apiClient.get('/incidents', { params });
    return response.data;
  },
  summary: async (): Promise<IncidentSummary> => {
    const response = await apiClient.get('/incidents/summary');
    return response.data.data;
  },
  options: async (): Promise<IncidentOptions> => {
    const response = await apiClient.get('/incidents/options');
    return response.data.data;
  },
  get: async (id: string): Promise<IncidentRecord> => {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data.data;
  },
  create: async (payload: IncidentPayload): Promise<IncidentRecord> => {
    const response = await apiClient.post('/incidents', payload);
    return response.data.data;
  },
  update: async (id: string, payload: IncidentPayload): Promise<IncidentRecord> => {
    const response = await apiClient.put(`/incidents/${id}`, payload);
    return response.data.data;
  },
  assign: async (id: string, assignedTo: string): Promise<IncidentRecord> => {
    const response = await apiClient.post(`/incidents/${id}/assign`, { assignedTo });
    return response.data.data;
  },
  start: async (id: string): Promise<IncidentRecord> => {
    const response = await apiClient.post(`/incidents/${id}/start`);
    return response.data.data;
  },
  resolve: async (id: string, resultNote: string): Promise<IncidentRecord> => {
    const response = await apiClient.post(`/incidents/${id}/resolve`, { resultNote });
    return response.data.data;
  },
  close: async (id: string, resultNote?: string): Promise<IncidentRecord> => {
    const response = await apiClient.post(`/incidents/${id}/close`, { resultNote });
    return response.data.data;
  },
};
