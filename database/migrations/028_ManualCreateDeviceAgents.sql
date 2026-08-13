-- UP
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DeviceAgents')
BEGIN
    CREATE TABLE DeviceAgents (
        ComputerId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        DeviceId NVARCHAR(100) NOT NULL UNIQUE,
        ApiKeyHash VARCHAR(64) NOT NULL UNIQUE,
        Hostname NVARCHAR(255) NOT NULL,
        AgentUuid NVARCHAR(100) NULL,
        Platform NVARCHAR(100) NULL,
        Architecture NVARCHAR(100) NULL,
        CpuCores INT NULL,
        RegisteredAt DATETIME2 NOT NULL,
        LastSeenAt DATETIME2 NULL,
        CurrentUserId NVARCHAR(100) NULL,
        CurrentUsername NVARCHAR(255) NULL,
        CurrentFullName NVARCHAR(255) NULL,
        BoundAt DATETIME2 NULL,
        LatestMetricsJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_DeviceAgents_Computer FOREIGN KEY (ComputerId) REFERENCES Computers(Id) ON DELETE CASCADE,
        CONSTRAINT CK_DeviceAgents_CpuCores CHECK (CpuCores IS NULL OR CpuCores > 0)
    );

    CREATE INDEX IX_DeviceAgents_LastSeenAt ON DeviceAgents(LastSeenAt);
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DeviceAgents') AND name = 'CurrentUsername')
    BEGIN
        ALTER TABLE DeviceAgents ADD CurrentUserId NVARCHAR(100) NULL, CurrentUsername NVARCHAR(255) NULL, CurrentFullName NVARCHAR(255) NULL, BoundAt DATETIME2 NULL;
    END
END;

-- DOWN
-- No-op for safety
