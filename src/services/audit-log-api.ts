import { apiClient } from './api-client';

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogRecord[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export const auditLogApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    keyword?: string;
    action?: string;
    entityName?: string;
  }): Promise<AuditLogListResponse> => {
    const response = await apiClient.get('/audit-logs', { params });
    return response.data;
  },
};

