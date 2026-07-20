import { IncidentReport, IncidentSeverity, IncidentStatus } from '../entities/IncidentReport';

export interface IncidentVisibility {
  viewerId: string;
  viewAll: boolean;
  viewOwn: boolean;
  viewAssigned: boolean;
}

export interface IncidentListFilters extends IncidentVisibility {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assetType?: 'COMPUTER' | 'EQUIPMENT' | 'BOOKING' | 'GENERAL';
  assignedTo?: string;
}

export interface IncidentDetail {
  incident: IncidentReport;
  reporterName: string | null;
  reporterUsername: string | null;
  assignedToName: string | null;
  assignedToUsername: string | null;
  computerCode: string | null;
  computerName: string | null;
  equipmentCode: string | null;
  equipmentName: string | null;
  bookingCode: string | null;
  bookingPurpose: string | null;
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

export interface IIncidentReportRepository {
  findById(id: string, transaction?: any): Promise<IncidentDetail | null>;
  list(filters: IncidentListFilters): Promise<{ data: IncidentDetail[]; total: number }>;
  getSummary(visibility: IncidentVisibility): Promise<IncidentSummary>;
  getOptions(): Promise<IncidentOptions>;
  save(incident: IncidentReport, transaction?: any): Promise<void>;
}
