-- UP
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

-- DOWN
THROW 50000, N'Rollback needs manual review: computer assignment history must be retained.', 1;
