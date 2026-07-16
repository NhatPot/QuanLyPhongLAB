import { apiClient } from './api-client';

export interface EquipmentCategoryData {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface EquipmentData {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  borrowedQuantity: number;
  brokenQuantity: number;
  maintenanceQuantity: number;
  lostQuantity: number;
  location?: string;
  managerId?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  imageUrl?: string;
  note?: string;
  rowVersion?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EquipmentFilter {
  keyword?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface EquipmentListResponse {
  data: EquipmentData[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface EquipmentTxData {
  id: string;
  equipmentId: string;
  transactionType: 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'BORROW' | 'RETURN' | 'DAMAGE_REPORT' | 'DAMAGE_RESOLVED' | 'MAINTENANCE_START' | 'MAINTENANCE_COMPLETE';
  deltaTotal: number;
  deltaAvailable: number;
  deltaReserved: number;
  deltaBorrowed: number;
  deltaBroken: number;
  deltaMaintenance: number;
  deltaLost: number;
  referenceType?: string;
  referenceId?: string;
  performedBy?: string;
  note?: string;
  createdAt?: string;
}

export const equipmentApi = {
  listCategories: async (): Promise<EquipmentCategoryData[]> => {
    const response = await apiClient.get('/equipments/categories');
    return response.data.data;
  },

  createCategory: async (data: Omit<EquipmentCategoryData, 'id'>): Promise<EquipmentCategoryData> => {
    const response = await apiClient.post('/equipments/categories', data);
    return response.data.data;
  },

  list: async (filter: EquipmentFilter): Promise<EquipmentListResponse> => {
    const response = await apiClient.get('/equipments', { params: filter });
    return response.data;
  },

  get: async (id: string): Promise<EquipmentData> => {
    const response = await apiClient.get(`/equipments/${id}`);
    return response.data.data;
  },

  create: async (data: Omit<EquipmentData, 'id' | 'totalQuantity' | 'availableQuantity' | 'reservedQuantity' | 'borrowedQuantity' | 'brokenQuantity' | 'maintenanceQuantity' | 'lostQuantity' | 'rowVersion' | 'createdAt' | 'updatedAt'>): Promise<EquipmentData> => {
    const response = await apiClient.post('/equipments', data);
    return response.data.data;
  },

  update: async (id: string, data: Omit<EquipmentData, 'id' | 'totalQuantity' | 'availableQuantity' | 'reservedQuantity' | 'borrowedQuantity' | 'brokenQuantity' | 'maintenanceQuantity' | 'lostQuantity' | 'rowVersion' | 'createdAt' | 'updatedAt'>): Promise<EquipmentData> => {
    const response = await apiClient.put(`/equipments/${id}`, data);
    return response.data.data;
  },

  adjust: async (id: string, delta: number, note?: string): Promise<EquipmentData> => {
    const response = await apiClient.post(`/equipments/${id}/adjust`, { delta, note });
    return response.data.data;
  },

  reportBroken: async (id: string, quantity: number, from: 'AVAILABLE' | 'BORROWED', note?: string): Promise<EquipmentData> => {
    const response = await apiClient.post(`/equipments/${id}/report-broken`, { quantity, from, note });
    return response.data.data;
  },

  listTransactions: async (id: string): Promise<EquipmentTxData[]> => {
    const response = await apiClient.get(`/equipments/${id}/transactions`);
    return response.data.data;
  }
};
