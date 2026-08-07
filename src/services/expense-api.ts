import { apiClient } from './api-client';

export type ExpenseClass = 'CAPEX' | 'OPEX';
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
export type FundingSource = 'CENTER' | 'FACULTY' | 'UNIVERSITY' | 'SPONSOR' | 'OTHER';
export type ExpenseTargetType = 'LAB' | 'COMPUTER' | 'EQUIPMENT' | 'MAINTENANCE' | 'OTHER';

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  expenseClass: ExpenseClass;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
}

export interface ExpenseItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  targetType: ExpenseTargetType;
  targetId: string | null;
  note: string | null;
}

export interface ExpenseRecord {
  id: string;
  code: string;
  expenseDate: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  expenseClass: ExpenseClass;
  title: string;
  description: string | null;
  vendorName: string | null;
  invoiceNumber: string | null;
  fundingSource: FundingSource;
  status: ExpenseStatus;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: string | null;
  paymentDate: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  attachmentUrl: string | null;
  sourceType: 'MANUAL' | 'MAINTENANCE';
  sourceId: string | null;
  createdBy: string | null;
  createdByName: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  inventoryPostedAt: string | null;
  items: ExpenseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  expenseDate: string;
  categoryId: string;
  title: string;
  description?: string;
  vendorName?: string;
  invoiceNumber?: string;
  fundingSource: FundingSource;
  paymentMethod?: string;
  currency: string;
  attachmentUrl?: string;
  items: Array<{
    id?: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    targetType: Exclude<ExpenseTargetType, 'MAINTENANCE'>;
    targetId?: string;
    note?: string;
  }>;
}

export interface ExpenseSummary {
  totalSpending: number;
  capex: number;
  opex: number;
  paid: number;
  outstanding: number;
  thisMonth: number;
  count: number;
  monthly: Array<{ month: string; capex: number; opex: number }>;
  byCategory: Array<{ categoryId: string; categoryName: string; expenseClass: ExpenseClass; amount: number }>;
}

export interface ExpenseOptions {
  categories: ExpenseCategory[];
  equipments: Array<{ id: string; code: string; name: string; status: string }>;
  computers: Array<{ id: string; code: string; name: string; status: string }>;
  lab: { id: string; code: string; name: string; status: string } | null;
}

export interface ExpenseListResponse {
  data: ExpenseRecord[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export const expenseApi = {
  list: async (params: {
    page: number;
    pageSize: number;
    keyword?: string;
    status?: ExpenseStatus;
    expenseClass?: ExpenseClass;
    categoryId?: string;
    fundingSource?: FundingSource;
    fromDate?: string;
    toDate?: string;
  }): Promise<ExpenseListResponse> => {
    const response = await apiClient.get('/expenses', { params });
    return response.data;
  },
  summary: async (params?: { fromDate?: string; toDate?: string }): Promise<ExpenseSummary> => {
    const response = await apiClient.get('/expenses/summary', { params });
    return response.data.data;
  },
  options: async (): Promise<ExpenseOptions> => {
    const response = await apiClient.get('/expenses/options');
    return response.data.data;
  },
  get: async (id: string): Promise<ExpenseRecord> => {
    const response = await apiClient.get(`/expenses/${id}`);
    return response.data.data;
  },
  create: async (payload: ExpensePayload): Promise<ExpenseRecord> => {
    const response = await apiClient.post('/expenses', payload);
    return response.data.data;
  },
  update: async (id: string, payload: ExpensePayload): Promise<ExpenseRecord> => {
    const response = await apiClient.put(`/expenses/${id}`, payload);
    return response.data.data;
  },
  submit: async (id: string): Promise<ExpenseRecord> => {
    const response = await apiClient.post(`/expenses/${id}/submit`);
    return response.data.data;
  },
  approve: async (id: string): Promise<ExpenseRecord> => {
    const response = await apiClient.post(`/expenses/${id}/approve`);
    return response.data.data;
  },
  reject: async (id: string, reason: string): Promise<ExpenseRecord> => {
    const response = await apiClient.post(`/expenses/${id}/reject`, { reason });
    return response.data.data;
  },
  markPaid: async (id: string, paymentMethod: string, paymentDate: string, postInventory: boolean): Promise<ExpenseRecord> => {
    const response = await apiClient.post(`/expenses/${id}/mark-paid`, { paymentMethod, paymentDate, postInventory });
    return response.data.data;
  },
  cancel: async (id: string, reason: string): Promise<ExpenseRecord> => {
    const response = await apiClient.post(`/expenses/${id}/cancel`, { reason });
    return response.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/expenses/${id}`);
  },
  listCategories: async (includeInactive = false): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get('/expenses/categories', { params: { includeInactive } });
    return response.data.data;
  },
  createCategory: async (payload: { code: string; name: string; expenseClass: ExpenseClass; description?: string }): Promise<ExpenseCategory> => {
    const response = await apiClient.post('/expenses/categories', payload);
    return response.data.data;
  },
  updateCategory: async (id: string, payload: { name: string; expenseClass: ExpenseClass; description?: string; isActive: boolean }): Promise<ExpenseCategory> => {
    const response = await apiClient.put(`/expenses/categories/${id}`, payload);
    return response.data.data;
  },
};
