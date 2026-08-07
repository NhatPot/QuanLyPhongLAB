export interface AuditLogProps {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  oldValueJson?: string | null;
  newValueJson?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
}

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValueJson: string | null;
  newValueJson: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  createdAt: Date;
}

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  action?: string;
  entityName?: string;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AuditLogListResult {
  data: AuditLogRecord[];
  total: number;
}

export interface IAuditLogRepository {
  save(log: AuditLogProps, transaction?: any): Promise<void>;
  list(filters: AuditLogFilters): Promise<AuditLogListResult>;
}
