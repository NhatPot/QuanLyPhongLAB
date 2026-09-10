-- Run this whole file in SSMS on the approved database with your database administrator account.
-- Adds machine reservations and retained identity snapshots; keeps existing data.
USE [ItLabManagerDb];
GO
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.BookingComputerItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.BookingComputerItems (
    BookingRequestId UNIQUEIDENTIFIER NOT NULL,
    ComputerId UNIQUEIDENTIFIER NOT NULL,
    ComputerCode NVARCHAR(50) NOT NULL,
    ComputerName NVARCHAR(255) NOT NULL,
    RequesterId UNIQUEIDENTIFIER NOT NULL,
    RequesterName NVARCHAR(255) NOT NULL,
    RequesterUsername NVARCHAR(255) NOT NULL,
    RequesterEmail NVARCHAR(255) NOT NULL,
    CreatedBy UNIQUEIDENTIFIER NOT NULL,
    ReceivedAt DATETIME2 NULL,
    ReturnedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BookingComputerItems_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BookingComputerItems PRIMARY KEY (BookingRequestId, ComputerId),
    CONSTRAINT FK_BookingComputerItems_Booking FOREIGN KEY (BookingRequestId) REFERENCES dbo.BookingRequests(Id),
    CONSTRAINT FK_BookingComputerItems_Computer FOREIGN KEY (ComputerId) REFERENCES dbo.Computers(Id),
    CONSTRAINT CK_BookingComputerItems_Return CHECK (ReturnedAt IS NULL OR (ReceivedAt IS NOT NULL AND ReturnedAt >= ReceivedAt))
  );
  CREATE INDEX IX_BookingComputerItems_Computer ON dbo.BookingComputerItems(ComputerId, BookingRequestId);
END;
  GRANT SELECT, INSERT, UPDATE ON OBJECT::dbo.BookingComputerItems TO [itlabmanager];
  IF NOT EXISTS (SELECT 1 FROM dbo._MigrationHistory WHERE MigrationName = '030_BookingComputers.sql')
    INSERT INTO dbo._MigrationHistory (MigrationName) VALUES ('030_BookingComputers.sql');
  COMMIT;
  PRINT N'Da bat dang ky tung may va lich su ban giao.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK;
  THROW;
END CATCH;

