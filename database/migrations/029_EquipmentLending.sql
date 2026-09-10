-- UP
IF COL_LENGTH('dbo.Equipments', 'IsLendable') IS NULL
  ALTER TABLE dbo.Equipments ADD IsLendable BIT NOT NULL CONSTRAINT DF_Equipments_IsLendable DEFAULT (0) WITH VALUES;

-- Only grant self-service booking, never approval, handover or asset management.
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT r.Id, p.Id FROM Roles r CROSS JOIN Permissions p
WHERE r.Code IN ('STUDENT', 'TEACHER', 'COLLABORATOR', 'LAB_STAFF', 'MANAGER', 'ADMIN')
AND p.Code IN ('BOOKING_CREATE', 'BOOKING_VIEW_OWN', 'BOOKING_CANCEL_OWN')
AND NOT EXISTS (SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id);

-- DOWN
-- No destructive automatic rollback: retain classification and existing grants.
THROW 50000, N'Retain IsLendable and role grants; review manually before rollback.', 1;
