import {
  MaintenanceSchedule,
  MaintenanceStatus,
  MaintenanceTargetType,
} from '../entities/MaintenanceSchedule';

export interface MaintenanceListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: MaintenanceStatus;
  targetType?: MaintenanceTargetType;
  technicianId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface MaintenanceDetail {
  maintenance: MaintenanceSchedule;
  technicianName: string | null;
  technicianUsername: string | null;
  createdByName: string | null;
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

export interface MaintenanceTechnicianOption {
  id: string;
  fullName: string;
  username: string;
  roles: string[];
}

export interface MaintenanceOptions {
  lab: MaintenanceOptionItem | null;
  computers: MaintenanceOptionItem[];
  equipments: MaintenanceOptionItem[];
  technicians: MaintenanceTechnicianOption[];
}

export interface IMaintenanceScheduleRepository {
  findById(id: string, transaction?: any): Promise<MaintenanceSchedule | null>;
  getDetailById(id: string): Promise<MaintenanceDetail | null>;
  list(filters: MaintenanceListFilters): Promise<{ data: MaintenanceDetail[]; total: number }>;
  getSummary(): Promise<MaintenanceSummary>;
  getOptions(): Promise<MaintenanceOptions>;
  hasOverlap(input: {
    targetType: MaintenanceTargetType;
    targetId: string;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }): Promise<boolean>;
  hasActiveForTarget(targetType: MaintenanceTargetType, targetId: string, transaction?: any): Promise<boolean>;
  save(maintenance: MaintenanceSchedule, transaction?: any): Promise<void>;
}
