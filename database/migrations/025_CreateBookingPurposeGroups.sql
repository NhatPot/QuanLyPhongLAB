-- UP
CREATE TABLE BookingPurposeGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    NormalizedKey NVARCHAR(255) NOT NULL UNIQUE,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

ALTER TABLE BookingRequests ADD PurposeGroupId UNIQUEIDENTIFIER NULL;

ALTER TABLE BookingRequests ADD CONSTRAINT FK_BookingRequests_PurposeGroup
    FOREIGN KEY (PurposeGroupId) REFERENCES BookingPurposeGroups(Id) ON DELETE SET NULL;

CREATE INDEX IX_BookingRequests_PurposeGroupId ON BookingRequests(PurposeGroupId);

-- DOWN
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_BookingRequests_PurposeGroupId'
      AND object_id = OBJECT_ID('dbo.BookingRequests')
)
BEGIN
    DROP INDEX IX_BookingRequests_PurposeGroupId ON dbo.BookingRequests;
END;

IF EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_BookingRequests_PurposeGroup'
      AND parent_object_id = OBJECT_ID('dbo.BookingRequests')
)
BEGIN
    ALTER TABLE dbo.BookingRequests DROP CONSTRAINT FK_BookingRequests_PurposeGroup;
END;

IF COL_LENGTH('dbo.BookingRequests', 'PurposeGroupId') IS NOT NULL
BEGIN
    ALTER TABLE dbo.BookingRequests DROP COLUMN PurposeGroupId;
END;

IF OBJECT_ID('dbo.BookingPurposeGroups', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.BookingPurposeGroups;
END;
