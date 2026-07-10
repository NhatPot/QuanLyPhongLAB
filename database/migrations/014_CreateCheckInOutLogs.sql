-- UP
CREATE TABLE CheckInOutLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    BookingRequestId UNIQUEIDENTIFIER NOT NULL UNIQUE,
    CheckInTime DATETIME2 NULL,
    CheckOutTime DATETIME2 NULL,
    CheckedInBy UNIQUEIDENTIFIER NULL,
    CheckedOutBy UNIQUEIDENTIFIER NULL,
    ActualPeopleCount INT NULL,
    ActualComputerCount INT NULL,
    InitialCondition NVARCHAR(MAX) NULL,
    ReturnCondition NVARCHAR(MAX) NULL,
    Note NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_CheckInOutLogs_Booking FOREIGN KEY (BookingRequestId) REFERENCES BookingRequests(Id) ON DELETE CASCADE,
    CONSTRAINT FK_CheckInOutLogs_CheckedInBy FOREIGN KEY (CheckedInBy) REFERENCES Users(Id) ON DELETE SET NULL,
    CONSTRAINT FK_CheckInOutLogs_CheckedOutBy FOREIGN KEY (CheckedOutBy) REFERENCES Users(Id) ON DELETE SET NULL,
    CONSTRAINT CK_CheckInOutLogs_People CHECK (ActualPeopleCount IS NULL OR ActualPeopleCount >= 0),
    CONSTRAINT CK_CheckInOutLogs_Computers CHECK (ActualComputerCount IS NULL OR ActualComputerCount >= 0)
);

-- DOWN
DROP TABLE IF EXISTS CheckInOutLogs;
