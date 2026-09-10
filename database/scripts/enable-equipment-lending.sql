-- Run this entire file in SSMS using an account with ALTER permission on
-- dbo.Equipments and permission to insert RolePermissions/_MigrationHistory.
-- No assets, users, existing role grants or booking history are deleted.
USE [ItLabManagerDb];
GO
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  IF COL_LENGTH('dbo.Equipments', 'IsLendable') IS NULL
    ALTER TABLE dbo.Equipments ADD IsLendable BIT NOT NULL
      CONSTRAINT DF_Equipments_IsLendable DEFAULT (0) WITH VALUES;

  INSERT INTO dbo.RolePermissions (RoleId, PermissionId)
  SELECT r.Id, p.Id FROM dbo.Roles r CROSS JOIN dbo.Permissions p
  WHERE r.Code IN ('STUDENT', 'TEACHER', 'COLLABORATOR', 'LAB_STAFF', 'MANAGER', 'ADMIN')
    AND p.Code IN ('BOOKING_CREATE', 'BOOKING_VIEW_OWN', 'BOOKING_CANCEL_OWN')
    AND NOT EXISTS (SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id);

  IF NOT EXISTS (SELECT 1 FROM dbo._MigrationHistory WHERE MigrationName = '029_EquipmentLending.sql')
    INSERT INTO dbo._MigrationHistory (MigrationName) VALUES ('029_EquipmentLending.sql');
  COMMIT;
  PRINT N'Da bat che do cho muon. Dang xuat va dang nhap lai de cap nhat quyen.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  THROW;
END CATCH;
