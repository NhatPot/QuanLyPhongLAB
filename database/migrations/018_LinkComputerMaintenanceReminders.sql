-- UP
ALTER TABLE MaintenanceSchedules DROP CONSTRAINT CK_MaintenanceSchedules_Status;

ALTER TABLE MaintenanceSchedules
ADD TriggerSource NVARCHAR(50) NOT NULL
    CONSTRAINT DF_MaintenanceSchedules_TriggerSource DEFAULT 'MANUAL';

ALTER TABLE MaintenanceSchedules
ADD TriggeredAt DATETIME2 NULL;

ALTER TABLE MaintenanceSchedules
ADD CONSTRAINT CK_MaintenanceSchedules_Status
    CHECK (Status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));

EXEC(N'
  ALTER TABLE MaintenanceSchedules
  ADD CONSTRAINT CK_MaintenanceSchedules_TriggerSource
      CHECK (TriggerSource IN (''MANUAL'', ''BROKEN_STATUS'', ''PERIODIC_270''));
');

EXEC(N'
  CREATE INDEX IX_MaintenanceSchedules_TriggerSource_Status
      ON MaintenanceSchedules(TriggerSource, Status, TriggeredAt)
      WHERE DeletedAt IS NULL;
');

-- DOWN
DROP INDEX IF EXISTS MaintenanceSchedules.IX_MaintenanceSchedules_TriggerSource_Status;

UPDATE MaintenanceSchedules
SET Status = 'CANCELLED',
    CancellationReason = COALESCE(CancellationReason, N'Hủy đề xuất khi hoàn tác migration liên kết bảo trì'),
    CancelledAt = COALESCE(CancelledAt, SYSUTCDATETIME()),
    UpdatedAt = SYSUTCDATETIME()
WHERE Status = 'PENDING';

ALTER TABLE MaintenanceSchedules DROP CONSTRAINT CK_MaintenanceSchedules_Status;
ALTER TABLE MaintenanceSchedules DROP CONSTRAINT CK_MaintenanceSchedules_TriggerSource;
ALTER TABLE MaintenanceSchedules DROP CONSTRAINT DF_MaintenanceSchedules_TriggerSource;
ALTER TABLE MaintenanceSchedules DROP COLUMN TriggeredAt;
ALTER TABLE MaintenanceSchedules DROP COLUMN TriggerSource;

ALTER TABLE MaintenanceSchedules
ADD CONSTRAINT CK_MaintenanceSchedules_Status
    CHECK (Status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
