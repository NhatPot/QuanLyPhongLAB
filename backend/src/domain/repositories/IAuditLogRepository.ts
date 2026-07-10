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

export interface IAuditLogRepository {
  save(log: AuditLogProps, transaction?: any): Promise<void>;
}
