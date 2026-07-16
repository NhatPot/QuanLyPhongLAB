-- UP
ALTER TABLE MaintenanceSchedules DROP CONSTRAINT CK_MaintenanceSchedules_TriggerSource;

ALTER TABLE MaintenanceSchedules
ADD CONSTRAINT CK_MaintenanceSchedules_TriggerSource
    CHECK (TriggerSource IN ('MANUAL', 'BROKEN_STATUS', 'MAINTENANCE_STATUS', 'PERIODIC_270'));

-- DOWN
UPDATE MaintenanceSchedules
SET TriggerSource = 'MANUAL', UpdatedAt = SYSUTCDATETIME()
WHERE TriggerSource = 'MAINTENANCE_STATUS';

ALTER TABLE MaintenanceSchedules DROP CONSTRAINT CK_MaintenanceSchedules_TriggerSource;

ALTER TABLE MaintenanceSchedules
ADD CONSTRAINT CK_MaintenanceSchedules_TriggerSource
    CHECK (TriggerSource IN ('MANUAL', 'BROKEN_STATUS', 'PERIODIC_270'));
