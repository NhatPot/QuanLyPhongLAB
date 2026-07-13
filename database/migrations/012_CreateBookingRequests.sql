-- UP
CREATE TABLE BookingRequests (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RequestCode NVARCHAR(50) NOT NULL UNIQUE,
    RequesterId UNIQUEIDENTIFIER NOT NULL,
    BookingType NVARCHAR(50) NOT NULL,
    Purpose NVARCHAR(500) NOT NULL,
    StartTime DATETIME2 NOT NULL,
    EndTime DATETIME2 NOT NULL,
    ExpectedReturnTime DATETIME2 NULL,
    NumberOfPeople INT NOT NULL DEFAULT 1,
    NumberOfComputers INT NOT NULL DEFAULT 0,
    Status NVARCHAR(50) NOT NULL DEFAULT 'PENDING',
    ApprovedBy UNIQUEIDENTIFIER NULL,
    ApprovedAt DATETIME2 NULL,
    RejectedReason NVARCHAR(MAX) NULL,
    CancelledBy UNIQUEIDENTIFIER NULL,
    CancelledAt DATETIME2 NULL,
    CancellationReason NVARCHAR(MAX) NULL,
    IsOverdue BIT NOT NULL DEFAULT 0,
    HasIncident BIT NOT NULL DEFAULT 0,
    Note NVARCHAR(MAX) NULL,
    RowVersion ROWVERSION NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BookingRequests_Requester FOREIGN KEY (RequesterId) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_BookingRequests_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_BookingRequests_CancelledBy FOREIGN KEY (CancelledBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_BookingRequests_Time CHECK (StartTime < EndTime),
    CONSTRAINT CK_BookingRequests_People CHECK (NumberOfPeople > 0),
    CONSTRAINT CK_BookingRequests_Computers CHECK (NumberOfComputers >= 0),
    CONSTRAINT CK_BookingRequests_Status CHECK (Status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED')),
    CONSTRAINT CK_BookingRequests_Type CHECK (BookingType IN ('FULL_LAB', 'COMPUTERS_ONLY', 'EQUIPMENT_ONLY'))
);

CREATE INDEX IX_BookingRequests_Status_Time ON BookingRequests(Status, StartTime, EndTime);
CREATE INDEX IX_BookingRequests_RequesterId_CreatedAt ON BookingRequests(RequesterId, CreatedAt DESC);

-- DOWN
DROP INDEX IF EXISTS BookingRequests.IX_BookingRequests_Status_Time;
DROP INDEX IF EXISTS BookingRequests.IX_BookingRequests_RequesterId_CreatedAt;
DROP TABLE IF EXISTS BookingRequests;
