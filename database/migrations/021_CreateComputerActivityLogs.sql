-- UP
CREATE TABLE ComputerActivityLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ComputerId UNIQUEIDENTIFIER NOT NULL,
    ActivityType NVARCHAR(50) NOT NULL,
    StartedAt DATETIME2 NOT NULL,
    EndedAt DATETIME2 NULL,
    BookingRequestId UNIQUEIDENTIFIER NULL,
    MaintenanceScheduleId UNIQUEIDENTIFIER NULL,
    PerformedBy UNIQUEIDENTIFIER NULL,
    Note NVARCHAR(2000) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ComputerActivityLogs_Computer FOREIGN KEY (ComputerId) REFERENCES Computers(Id) ON DELETE CASCADE,
    CONSTRAINT FK_ComputerActivityLogs_Booking FOREIGN KEY (BookingRequestId) REFERENCES BookingRequests(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_ComputerActivityLogs_Maintenance FOREIGN KEY (MaintenanceScheduleId) REFERENCES MaintenanceSchedules(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_ComputerActivityLogs_PerformedBy FOREIGN KEY (PerformedBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_ComputerActivityLogs_Type CHECK (ActivityType IN ('ACTIVE', 'IN_USE', 'BROKEN', 'MAINTENANCE', 'LOCKED', 'INACTIVE')),
    CONSTRAINT CK_ComputerActivityLogs_Time CHECK (EndedAt IS NULL OR EndedAt >= StartedAt)
);

CREATE UNIQUE INDEX UX_ComputerActivityLogs_OpenActivity
    ON ComputerActivityLogs(ComputerId)
    WHERE EndedAt IS NULL;

CREATE INDEX IX_ComputerActivityLogs_TimeRange
    ON ComputerActivityLogs(StartedAt, EndedAt)
    INCLUDE (ComputerId, ActivityType, BookingRequestId, MaintenanceScheduleId);

CREATE INDEX IX_ComputerActivityLogs_Booking
    ON ComputerActivityLogs(BookingRequestId, ActivityType, EndedAt)
    WHERE BookingRequestId IS NOT NULL;

INSERT INTO ComputerActivityLogs (ComputerId, ActivityType, StartedAt, Note)
SELECT
    Id,
    Status,
    COALESCE(UpdatedAt, CreatedAt, SYSUTCDATETIME()),
    N'Mốc trạng thái ban đầu được tạo khi kích hoạt nhật ký hoạt động máy tính.'
FROM Computers
WHERE DeletedAt IS NULL;

-- DOWN
DROP INDEX IF EXISTS ComputerActivityLogs.IX_ComputerActivityLogs_Booking;
DROP INDEX IF EXISTS ComputerActivityLogs.IX_ComputerActivityLogs_TimeRange;
DROP INDEX IF EXISTS ComputerActivityLogs.UX_ComputerActivityLogs_OpenActivity;
DROP TABLE IF EXISTS ComputerActivityLogs;
