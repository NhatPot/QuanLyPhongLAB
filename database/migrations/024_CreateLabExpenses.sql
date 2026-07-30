-- UP
CREATE TABLE ExpenseCategories (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(255) NOT NULL,
    ExpenseClass NVARCHAR(20) NOT NULL,
    Description NVARCHAR(1000) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    IsSystem BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_ExpenseCategories_Class CHECK (ExpenseClass IN ('CAPEX', 'OPEX'))
);

CREATE TABLE Expenses (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    ExpenseDate DATE NOT NULL,
    CategoryId UNIQUEIDENTIFIER NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    VendorName NVARCHAR(255) NULL,
    InvoiceNumber NVARCHAR(100) NULL,
    FundingSource NVARCHAR(100) NOT NULL DEFAULT 'CENTER',
    Status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    PaymentStatus NVARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    PaymentMethod NVARCHAR(50) NULL,
    PaymentDate DATE NULL,
    Subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    Currency NVARCHAR(10) NOT NULL DEFAULT 'VND',
    AttachmentUrl NVARCHAR(2000) NULL,
    SourceType NVARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    SourceId UNIQUEIDENTIFIER NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    ApprovedBy UNIQUEIDENTIFIER NULL,
    ApprovedAt DATETIME2 NULL,
    RejectedAt DATETIME2 NULL,
    RejectionReason NVARCHAR(1000) NULL,
    CancelledAt DATETIME2 NULL,
    CancellationReason NVARCHAR(1000) NULL,
    InventoryPostedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DeletedAt DATETIME2 NULL,
    RowVersion ROWVERSION NOT NULL,
    CONSTRAINT FK_Expenses_Category FOREIGN KEY (CategoryId) REFERENCES ExpenseCategories(Id),
    CONSTRAINT FK_Expenses_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT FK_Expenses_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Users(Id) ON DELETE NO ACTION,
    CONSTRAINT CK_Expenses_Status CHECK (Status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED')),
    CONSTRAINT CK_Expenses_PaymentStatus CHECK (PaymentStatus IN ('UNPAID', 'PAID')),
    CONSTRAINT CK_Expenses_FundingSource CHECK (FundingSource IN ('CENTER', 'FACULTY', 'UNIVERSITY', 'SPONSOR', 'OTHER')),
    CONSTRAINT CK_Expenses_SourceType CHECK (SourceType IN ('MANUAL', 'MAINTENANCE')),
    CONSTRAINT CK_Expenses_Amounts CHECK (
        Subtotal >= 0 AND DiscountAmount >= 0 AND TaxAmount >= 0 AND TotalAmount >= 0
        AND TotalAmount = Subtotal - DiscountAmount + TaxAmount
    )
);

CREATE TABLE ExpenseItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ExpenseId UNIQUEIDENTIFIER NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    Quantity DECIMAL(18,2) NOT NULL,
    Unit NVARCHAR(50) NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    LineTotal DECIMAL(18,2) NOT NULL,
    TargetType NVARCHAR(30) NOT NULL DEFAULT 'OTHER',
    TargetId UNIQUEIDENTIFIER NULL,
    Note NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ExpenseItems_Expense FOREIGN KEY (ExpenseId) REFERENCES Expenses(Id) ON DELETE CASCADE,
    CONSTRAINT CK_ExpenseItems_TargetType CHECK (TargetType IN ('LAB', 'COMPUTER', 'EQUIPMENT', 'MAINTENANCE', 'OTHER')),
    CONSTRAINT CK_ExpenseItems_Amounts CHECK (
        Quantity > 0 AND UnitPrice >= 0 AND DiscountAmount >= 0 AND TaxAmount >= 0 AND LineTotal >= 0
        AND LineTotal = ROUND(Quantity * UnitPrice - DiscountAmount + TaxAmount, 2)
    )
);

CREATE INDEX IX_Expenses_Date_Status ON Expenses(ExpenseDate DESC, Status) WHERE DeletedAt IS NULL;
CREATE INDEX IX_Expenses_Category_Date ON Expenses(CategoryId, ExpenseDate DESC) WHERE DeletedAt IS NULL;
CREATE INDEX IX_ExpenseItems_Target ON ExpenseItems(TargetType, TargetId);
CREATE UNIQUE INDEX UX_Expenses_Source
    ON Expenses(SourceType, SourceId)
    WHERE SourceId IS NOT NULL AND DeletedAt IS NULL;

INSERT INTO ExpenseCategories (Code, Name, ExpenseClass, Description, IsSystem)
VALUES
    ('COMPUTER_PURCHASE', N'Mua máy tính', 'CAPEX', N'Mua mới hoặc nâng cấp máy tính cho phòng Lab', 1),
    ('EQUIPMENT_PURCHASE', N'Mua thiết bị', 'CAPEX', N'Mua thiết bị, tài sản và hạ tầng phòng Lab', 1),
    ('FURNITURE', N'Nội thất phòng Lab', 'CAPEX', N'Bàn, ghế, tủ và nội thất sử dụng lâu dài', 1),
    ('REPLACEMENT_PARTS', N'Linh kiện thay thế', 'OPEX', N'Linh kiện và phụ tùng phục vụ sửa chữa', 1),
    ('CONSUMABLES', N'Vật tư tiêu hao', 'OPEX', N'Vật tư và văn phòng phẩm dùng trong vận hành', 1),
    ('MAINTENANCE_REPAIR', N'Bảo trì, sửa chữa', 'OPEX', N'Chi phí bảo trì và sửa chữa tài sản', 1),
    ('UTILITIES', N'Điện, nước', 'OPEX', N'Chi phí điện, nước của phòng Lab', 1),
    ('INTERNET', N'Internet', 'OPEX', N'Đường truyền Internet và dịch vụ mạng', 1),
    ('SOFTWARE_LICENSE', N'Phần mềm và bản quyền', 'OPEX', N'Phần mềm, dịch vụ số và bản quyền định kỳ', 1),
    ('OUTSOURCED_SERVICE', N'Dịch vụ thuê ngoài', 'OPEX', N'Vệ sinh, tư vấn và dịch vụ thuê ngoài', 1),
    ('OTHER', N'Chi phí khác', 'OPEX', N'Các khoản chi hợp lệ chưa thuộc danh mục khác', 1);

MERGE INTO Permissions AS target
USING (VALUES
    ('EXPENSE_VIEW', N'Xem chi phí', N'Xem danh sách, chi tiết và thống kê chi phí phòng Lab'),
    ('EXPENSE_CREATE', N'Tạo phiếu chi', N'Tạo phiếu chi phí mới'),
    ('EXPENSE_UPDATE', N'Cập nhật phiếu chi', N'Chỉnh sửa phiếu chi ở trạng thái cho phép'),
    ('EXPENSE_SUBMIT', N'Gửi duyệt phiếu chi', N'Gửi phiếu chi để người quản lý duyệt'),
    ('EXPENSE_APPROVE', N'Duyệt phiếu chi', N'Duyệt hoặc từ chối phiếu chi'),
    ('EXPENSE_MARK_PAID', N'Xác nhận thanh toán', N'Xác nhận phiếu chi đã thanh toán và nhận hàng'),
    ('EXPENSE_CANCEL', N'Hủy phiếu chi', N'Hủy phiếu chi hợp lệ'),
    ('EXPENSE_DELETE', N'Xóa phiếu chi', N'Xóa mềm phiếu chi nháp hoặc bị từ chối'),
    ('EXPENSE_EXPORT', N'Xuất báo cáo chi phí', N'Xuất dữ liệu chi phí theo bộ lọc'),
    ('EXPENSE_CATEGORY_MANAGE', N'Quản lý danh mục chi phí', N'Tạo và cập nhật danh mục chi phí')
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
    (r.Code = 'ADMIN' AND p.Code LIKE 'EXPENSE_%')
    OR (r.Code = 'MANAGER' AND p.Code IN (
        'EXPENSE_VIEW', 'EXPENSE_APPROVE', 'EXPENSE_MARK_PAID', 'EXPENSE_CANCEL', 'EXPENSE_EXPORT'
    ))
    OR (r.Code = 'LAB_STAFF' AND p.Code IN (
        'EXPENSE_VIEW', 'EXPENSE_CREATE', 'EXPENSE_UPDATE', 'EXPENSE_SUBMIT', 'EXPENSE_EXPORT'
    ))
)
AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
);

-- DOWN
DELETE rp
FROM RolePermissions rp
INNER JOIN Permissions p ON p.Id = rp.PermissionId
WHERE p.Code LIKE 'EXPENSE_%';

DELETE FROM Permissions WHERE Code LIKE 'EXPENSE_%';

DROP INDEX IF EXISTS Expenses.UX_Expenses_Source;
DROP INDEX IF EXISTS ExpenseItems.IX_ExpenseItems_Target;
DROP INDEX IF EXISTS Expenses.IX_Expenses_Category_Date;
DROP INDEX IF EXISTS Expenses.IX_Expenses_Date_Status;
DROP TABLE IF EXISTS ExpenseItems;
DROP TABLE IF EXISTS Expenses;
DROP TABLE IF EXISTS ExpenseCategories;
