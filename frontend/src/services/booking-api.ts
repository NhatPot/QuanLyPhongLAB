import { apiClient } from './api-client';

export type BookingStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CHECKED_IN' | 'COMPLETED';
export type BookingType = 'FULL_LAB' | 'COMPUTERS_ONLY' | 'EQUIPMENT_ONLY';

export interface BookingRequester {
  id: string;
  fullName: string;
  username: string;
  email: string;
  department: string | null;
}

export interface BookingData {
  id: string;
  requestCode: string;
  requesterId?: string;
  requester?: BookingRequester | null;
  bookingType: BookingType;
  purpose: string;
  startTime: string;
  endTime: string;
  expectedReturnTime?: string | null;
  numberOfPeople: number;
  numberOfComputers: number;
  status: BookingStatus;
  isOverdue?: boolean;
  hasIncident?: boolean;
  note?: string | null;
  createdAt?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  actualPeopleCount?: number | null;
  actualComputerCount?: number | null;
  selectedComputerIds?: string[];
  equipmentItems?: Array<{ id: string; equipmentId: string; requestedQuantity: number; reservedQuantity: number; borrowedQuantity: number }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: BookingType;
  status: BookingStatus;
  requesterId?: string;
  requester?: BookingRequester | null;
  numberOfPeople?: number;
  numberOfComputers?: number;
}

export interface CreateBookingPayload {
  requesterId?: string;
  bookingType: BookingType;
  purpose: string;
  startTime: string;
  endTime: string;
  expectedReturnTime?: string | null;
  numberOfPeople: number;
  numberOfComputers: number;
  equipments: Array<{ equipmentId: string; quantity: number }>;
  note?: string;
}

export interface CheckInPayload {
  actualPeopleCount?: number;
  actualComputerCount?: number;
  computerIds?: string[];
  initialCondition?: string;
  note?: string;
}

export interface CheckOutPayload {
  returnCondition?: string;
  note?: string;
}

export interface LabUsageDaily {
  date: string;
  usageHours: number;
  computerHours: number;
  checkInCount: number;
  checkOutCount: number;
}

export interface LabUsageSession {
  bookingId: string;
  requestCode: string;
  purpose: string;
  bookingType: BookingType;
  checkInTime: string;
  checkOutTime: string | null;
  actualPeopleCount: number;
  actualComputerCount: number;
  usageHours: number;
  computerHours: number;
  computerHoursSource: 'MACHINE_LOGS' | 'ESTIMATED_COUNT';
  computerCodes: string[];
  isActive: boolean;
}

export interface ComputerActivityRecord {
  id: string;
  computerId: string;
  computerCode: string;
  computerName: string;
  activityType: 'ACTIVE' | 'IN_USE' | 'BROKEN' | 'MAINTENANCE' | 'LOCKED' | 'INACTIVE';
  startedAt: string;
  endedAt: string | null;
  bookingRequestId: string | null;
  bookingRequestCode: string | null;
  bookingPurpose: string | null;
  requesterName: string | null;
  maintenanceScheduleId: string | null;
  maintenanceCode: string | null;
  performedBy: string | null;
  performedByName: string | null;
  note: string | null;
  durationHours: number;
  isActive: boolean;
}

export interface ComputerUsageSummary {
  computerId: string;
  computerCode: string;
  computerName: string;
  usageSessionCount: number;
  usageHours: number;
  readyHours: number;
  maintenanceHours: number;
  brokenHours: number;
  lockedHours: number;
  inactiveHours: number;
  currentActivityType: ComputerActivityRecord['activityType'] | null;
  currentActivityStartedAt: string | null;
  currentBookingCode: string | null;
  currentPurpose: string | null;
  currentRequesterName: string | null;
}

export interface LabUsageStatistics {
  month: string;
  rangeStart: string;
  rangeEnd: string;
  totalUsageHours: number;
  totalComputerHours: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  activeSessions: number;
  daily: LabUsageDaily[];
  sessions: LabUsageSession[];
  computerSummaries: ComputerUsageSummary[];
  computerActivities: ComputerActivityRecord[];
}

export const bookingApi = {
  requesterOptions: async (keyword?: string): Promise<BookingRequester[]> => {
    const response = await apiClient.get('/bookings/requester-options', { params: { keyword: keyword || undefined } });
    return response.data.data;
  },
  calendar: async (start: Date, end: Date): Promise<CalendarEvent[]> => {
    const response = await apiClient.get('/bookings/calendar', { params: { start: start.toISOString(), end: end.toISOString() } });
    return response.data;
  },
  myBookings: async (): Promise<BookingData[]> => {
    const response = await apiClient.get('/bookings/my-bookings');
    return response.data;
  },
  pending: async (): Promise<BookingData[]> => {
    const response = await apiClient.get('/bookings/admin/pending');
    return response.data;
  },
  usageStatistics: async (month: string): Promise<LabUsageStatistics> => {
    const response = await apiClient.get('/bookings/usage-statistics', { params: { month } });
    return response.data.data;
  },
  create: async (payload: CreateBookingPayload) => {
    const response = await apiClient.post('/bookings', payload);
    return response.data;
  },
  approve: async (id: string) => {
    const response = await apiClient.post(`/bookings/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, reason: string) => {
    const response = await apiClient.post(`/bookings/${id}/reject`, { reason });
    return response.data;
  },
  checkIn: async (id: string, payload: CheckInPayload = {}) => {
    const response = await apiClient.post(`/bookings/${id}/check-in`, payload);
    return response.data;
  },
  checkOut: async (id: string, payload: CheckOutPayload = {}) => {
    const response = await apiClient.post(`/bookings/${id}/check-out`, payload);
    return response.data;
  },
  cancel: async (id: string, reason?: string) => {
    const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },
};
