-- UP
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_CheckInOutLogs_UsageWindow'
      AND object_id = OBJECT_ID('dbo.CheckInOutLogs')
)
BEGIN
    CREATE INDEX IX_CheckInOutLogs_UsageWindow
        ON dbo.CheckInOutLogs (CheckInTime, CheckOutTime)
        INCLUDE (BookingRequestId, ActualPeopleCount, ActualComputerCount);
END;

-- DOWN
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_CheckInOutLogs_UsageWindow'
      AND object_id = OBJECT_ID('dbo.CheckInOutLogs')
)
BEGIN
    DROP INDEX IX_CheckInOutLogs_UsageWindow ON dbo.CheckInOutLogs;
END;
