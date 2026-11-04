-- Generated from migrations/031_SelfServiceAuth.sql; UP ONLY.
-- Select the intended development database in SSMS before executing.
-- Run as a database owner/migration principal; do not grant these privileges to the application.
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;
IF OBJECT_ID('dbo._MigrationHistory','U') IS NULL THROW 51002, 'Expected existing migration history.', 1;
IF NOT EXISTS(SELECT 1 FROM dbo._MigrationHistory WHERE MigrationName=N'031_SelfServiceAuth.sql')
BEGIN
ALTER TABLE Users ALTER COLUMN PasswordHash NVARCHAR(MAX) NULL;
ALTER TABLE Users ADD EmailVerifiedAt DATETIME2 NULL;

CREATE TABLE UserExternalIdentities (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    Provider NVARCHAR(30) NOT NULL,
    Subject NVARCHAR(255) NOT NULL,
    EmailAtLink NVARCHAR(255) NOT NULL,
    LinkedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ExternalIdentity_Subject UNIQUE (Provider, Subject),
    CONSTRAINT UQ_ExternalIdentity_User UNIQUE (UserId, Provider)
);
CREATE TABLE AuthChallenges (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL,
    Purpose NVARCHAR(30) NOT NULL,
    StateJson NVARCHAR(MAX) NOT NULL CHECK (ISJSON(StateJson)=1),
    ExpiresAt DATETIME2 NOT NULL
);
CREATE INDEX IX_AuthChallenges_EmailPurpose ON AuthChallenges(Email, Purpose);
CREATE INDEX IX_AuthChallenges_Expiry ON AuthChallenges(ExpiresAt);
CREATE TABLE AuthRateEvents (
    Id BIGINT IDENTITY PRIMARY KEY,
    KeyHash CHAR(64) NOT NULL,
    OccurredAt DATETIME2 NOT NULL
);
CREATE INDEX IX_AuthRateEvents_KeyTime ON AuthRateEvents(KeyHash, OccurredAt);
CREATE TABLE AuthEmailOutbox (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ChallengeId UNIQUEIDENTIFIER NULL REFERENCES AuthChallenges(Id),
    Ciphertext NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    Attempts INT NOT NULL DEFAULT 0,
    ExpiresAt DATETIME2 NOT NULL,
    RetryAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_AuthEmailOutbox_Work ON AuthEmailOutbox(Status, RetryAt);
CREATE TABLE AccountRegistrations (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL UNIQUE REFERENCES Users(Id),
    Status NVARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW',
    SubmittedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReviewedBy UNIQUEIDENTIFIER NULL REFERENCES Users(Id),
    ReviewedAt DATETIME2 NULL,
    ReviewNote NVARCHAR(1000) NULL
);
INSERT INTO Permissions (Id, Code, Name, Description)
SELECT NEWID(), 'ACCOUNT_REGISTRATION_REVIEW', N'Duyệt đăng ký giảng viên', N'Duyệt hoặc từ chối đăng ký giảng viên'
WHERE NOT EXISTS (SELECT 1 FROM Permissions WHERE Code='ACCOUNT_REGISTRATION_REVIEW');
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT r.Id, p.Id FROM Roles r CROSS JOIN Permissions p
WHERE r.Code='ADMIN' AND p.Code='ACCOUNT_REGISTRATION_REVIEW'
AND NOT EXISTS (SELECT 1 FROM RolePermissions rp WHERE rp.RoleId=r.Id AND rp.PermissionId=p.Id);


INSERT INTO dbo._MigrationHistory(MigrationName) VALUES(N'031_SelfServiceAuth.sql');
END;
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
THROW;
END CATCH;
