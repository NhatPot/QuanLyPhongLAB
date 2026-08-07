-- UP
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
    LatestMetricsJson NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_DeviceAgents_Computer FOREIGN KEY (ComputerId) REFERENCES Computers(Id) ON DELETE CASCADE,
    CONSTRAINT CK_DeviceAgents_CpuCores CHECK (CpuCores IS NULL OR CpuCores > 0)
);

CREATE INDEX IX_DeviceAgents_LastSeenAt ON DeviceAgents(LastSeenAt);

IF NOT EXISTS (SELECT 1 FROM Users WHERE Id = '00000000-0000-0000-0000-000000000000')
BEGIN
    INSERT INTO Users (
        Id, FullName, Email, EmailNormalized, Username, UsernameNormalized,
        PasswordHash, Status, MustChangePassword, DeletedAt
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        N'Tác vụ hệ thống',
        N'device-agent-system@itlab.local',
        N'device-agent-system@itlab.local',
        N'device-agent-system',
        N'device-agent-system',
        N'NO_INTERACTIVE_LOGIN',
        N'INACTIVE',
        0,
        SYSUTCDATETIME()
    );
END;

-- DOWN
DROP INDEX IF EXISTS DeviceAgents.IX_DeviceAgents_LastSeenAt;
DROP TABLE IF EXISTS DeviceAgents;

DELETE FROM Users
WHERE Id = '00000000-0000-0000-0000-000000000000'
  AND NOT EXISTS (
      SELECT 1 FROM IncidentReports
      WHERE ReporterId = '00000000-0000-0000-0000-000000000000'
  );
