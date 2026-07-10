-- UP
CREATE TABLE Equipments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    CategoryId UNIQUEIDENTIFIER NOT NULL,
    TotalQuantity INT NOT NULL DEFAULT 0,
    AvailableQuantity INT NOT NULL DEFAULT 0,
    ReservedQuantity INT NOT NULL DEFAULT 0,
    BorrowedQuantity INT NOT NULL DEFAULT 0,
    BrokenQuantity INT NOT NULL DEFAULT 0,
    MaintenanceQuantity INT NOT NULL DEFAULT 0,
    LostQuantity INT NOT NULL DEFAULT 0,
    Location NVARCHAR(255) NULL,
    ManagerId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    ImageUrl NVARCHAR(MAX) NULL,
    Note NVARCHAR(MAX) NULL,
    RowVersion ROWVERSION NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt DATETIME2 NULL,
    CONSTRAINT FK_Equipments_Categories FOREIGN KEY (CategoryId) REFERENCES EquipmentCategories(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Equipments_Manager FOREIGN KEY (ManagerId) REFERENCES Users(Id) ON DELETE SET NULL,
    CONSTRAINT CK_Equipments_TotalQuantity CHECK (TotalQuantity >= 0),
    CONSTRAINT CK_Equipments_AvailableQuantity CHECK (AvailableQuantity >= 0),
    CONSTRAINT CK_Equipments_ReservedQuantity CHECK (ReservedQuantity >= 0),
    CONSTRAINT CK_Equipments_BorrowedQuantity CHECK (BorrowedQuantity >= 0),
    CONSTRAINT CK_Equipments_BrokenQuantity CHECK (BrokenQuantity >= 0),
    CONSTRAINT CK_Equipments_MaintenanceQuantity CHECK (MaintenanceQuantity >= 0),
    CONSTRAINT CK_Equipments_LostQuantity CHECK (LostQuantity >= 0),
    CONSTRAINT CK_Equipments_Status CHECK (Status IN ('ACTIVE', 'LOCKED', 'INACTIVE')),
    CONSTRAINT CK_Equipments_Sum CHECK (TotalQuantity = AvailableQuantity + ReservedQuantity + BorrowedQuantity + BrokenQuantity + MaintenanceQuantity + LostQuantity)
);

CREATE INDEX IX_Equipments_Status_CategoryId ON Equipments(Status, CategoryId);

-- DOWN
DROP INDEX IF EXISTS Equipments.IX_Equipments_Status_CategoryId;
DROP TABLE IF EXISTS Equipments;
