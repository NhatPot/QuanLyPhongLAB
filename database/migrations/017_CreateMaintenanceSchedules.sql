-- UP
CREATE TABLE MaintenanceSchedules (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    TargetType NVARCHAR(50) NOT NULL,
    TargetId UNIQUEIDENTIFIER NOT NULL,
    TargetCode NVARCHAR(50) NOT NULL,
    TargetName NVARCHAR(255) NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Reason NVARCHAR(MAX) NOT NULL,
    ScheduledStartAt DATETIME2 NOT NULL,
    ExpectedEndAt DATETIME2 NOT NULL,
    StartedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    CancelledAt DATETIME2 NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    TechnicianId UNIQUEIDENTIFIER NULL,
    Quantity INT NOT NULL DEFAULT 1,
    MaintenanceSource NVARCHAR(50) NULL,
    ResultNote NVARCHAR(MAX) NULL,
    PartsNote NVARCHAR(MAX) NULL,
    EstimatedCost DECIMAL(18,2) NOT NULL DEFAULT 0,
    ActualCost DECIMAL(18,2) NULL,
    CompletionOutcome NVARCHAR(50) NULL,
    CancellationReason NVARCHAR(MAX) NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt DATETIME2 NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT FK_MaintenanceSchedules_Technician FOREIGN KEY (TechnicianId) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_MaintenanceSchedules_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_MaintenanceSchedules_TargetType CHECK (TargetType IN ('LAB', 'COMPUTER', 'EQUIPMENT')),
    CONSTRAINT CK_MaintenanceSchedules_Status CHECK (Status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT CK_MaintenanceSchedules_Time CHECK (ScheduledStartAt < ExpectedEndAt),
    CONSTRAINT CK_MaintenanceSchedules_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_MaintenanceSchedules_Cost CHECK (EstimatedCost >= 0 AND (ActualCost IS NULL OR ActualCost >= 0)),
    CONSTRAINT CK_MaintenanceSchedules_Source CHECK (MaintenanceSource IS NULL OR MaintenanceSource IN ('AVAILABLE', 'BROKEN')),
    CONSTRAINT CK_MaintenanceSchedules_Outcome CHECK (CompletionOutcome IS NULL OR CompletionOutcome IN ('AVAILABLE', 'BROKEN'))
);

CREATE INDEX IX_MaintenanceSchedules_Status_Start
    ON MaintenanceSchedules(Status, ScheduledStartAt, ExpectedEndAt)
    WHERE DeletedAt IS NULL;

CREATE INDEX IX_MaintenanceSchedules_Target
    ON MaintenanceSchedules(TargetType, TargetId, Status)
    WHERE DeletedAt IS NULL;

CREATE INDEX IX_MaintenanceSchedules_Technician
    ON MaintenanceSchedules(TechnicianId, Status)
    WHERE DeletedAt IS NULL;

MERGE INTO Permissions AS target
USING (VALUES
    ('MAINTENANCE_VIEW', N'Xem lịch bảo trì', N'Xem danh sách, chi tiết và thống kê bảo trì'),
    ('MAINTENANCE_CREATE', N'Tạo lịch bảo trì', N'Lập lịch bảo trì tài sản'),
    ('MAINTENANCE_UPDATE', N'Cập nhật lịch bảo trì', N'Chỉnh sửa lịch bảo trì chưa bắt đầu'),
    ('MAINTENANCE_START', N'Bắt đầu bảo trì', N'Chuyển lịch và tài sản sang trạng thái bảo trì'),
    ('MAINTENANCE_COMPLETE', N'Hoàn tất bảo trì', N'Ghi nhận kết quả và hoàn tất bảo trì'),
    ('MAINTENANCE_CANCEL', N'Hủy lịch bảo trì', N'Hủy lịch bảo trì chưa bắt đầu'),
    ('MAINTENANCE_DELETE', N'Xóa lịch bảo trì', N'Xóa mềm lịch bảo trì hợp lệ')
) AS source(Code, Name, Description)
ON target.Code = source.Code
WHEN MATCHED THEN
    UPDATE SET Name = source.Name, Description = source.Description, UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (Code, Name, Description) VALUES (source.Code, source.Name, source.Description);

INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT r.Id, p.Id
FROM Roles r
CROSS JOIN Permissions p
WHERE (
    (r.Code = 'ADMIN' AND p.Code LIKE 'MAINTENANCE_%')
    OR (r.Code = 'LAB_STAFF' AND p.Code IN (
        'MAINTENANCE_VIEW', 'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE',
        'MAINTENANCE_START', 'MAINTENANCE_COMPLETE', 'MAINTENANCE_CANCEL'
    ))
    OR (r.Code = 'COLLABORATOR' AND p.Code IN (
        'MAINTENANCE_VIEW', 'MAINTENANCE_START', 'MAINTENANCE_COMPLETE'
    ))
    OR (r.Code = 'MANAGER' AND p.Code = 'MAINTENANCE_VIEW')
)
AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
);

-- DOWN
DELETE rp
FROM RolePermissions rp
INNER JOIN Permissions p ON p.Id = rp.PermissionId
WHERE p.Code LIKE 'MAINTENANCE_%';

DELETE FROM Permissions WHERE Code LIKE 'MAINTENANCE_%';

DROP INDEX IF EXISTS MaintenanceSchedules.IX_MaintenanceSchedules_Technician;
DROP INDEX IF EXISTS MaintenanceSchedules.IX_MaintenanceSchedules_Target;
DROP INDEX IF EXISTS MaintenanceSchedules.IX_MaintenanceSchedules_Status_Start;
DROP TABLE IF EXISTS MaintenanceSchedules;
