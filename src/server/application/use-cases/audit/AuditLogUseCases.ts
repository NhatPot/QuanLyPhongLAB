import { AuditLogFilters, AuditLogListResult, IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';

export class ListAuditLogsUseCase {
  constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  public execute(filters: AuditLogFilters): Promise<AuditLogListResult> {
    return this.auditLogRepo.list(filters);
  }
}

