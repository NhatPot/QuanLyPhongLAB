# 04 — Database migration Core + RBAC

## Mục tiêu

Tạo schema SQL Server cho nền tảng, phân quyền, phòng lab, tài sản, booking, check-in/out, sự cố và audit log.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `.agent/skills/sqlserver-database-design/SKILL.md`
- `.agent/skills/repository-pattern/SKILL.md`

---

## 1. Công cụ migration

Chọn một phương án và ghi rõ trong README:

- Migration SQL thuần do ứng dụng chạy; hoặc
- Thư viện migration tương thích SQL Server.

Không dùng ORM model trong Domain.

Migration phải:

- Có thứ tự.
- Có `up` và `down`.
- Chạy được trên database trống.
- Không tự động xóa dữ liệu production.
- Dùng transaction khi công cụ hỗ trợ.

---

## 2. Danh sách migration

```text
001_CreateRoles
002_CreatePermissions
003_CreateRolePermissions
004_CreateUsers
005_CreateUserRoles
006_CreateAuthSessions
007_CreateLabProfile
008_CreateComputers
009_CreateEquipmentCategories
010_CreateEquipments
011_CreateEquipmentInventoryTransactions
012_CreateBookingRequests
013_CreateBookingEquipmentItems
014_CreateCheckInOutLogs
015_CreateIncidentReports
016_CreateAuditLogs
```

---

## 3. Bảng RBAC

### Roles

- `Id UNIQUEIDENTIFIER`.
- `Code NVARCHAR(50)` unique.
- `Name NVARCHAR(255)`.
- `Description`.
- `CreatedAt`, `UpdatedAt`.

### Permissions

- `Id`.
- `Code` unique.
- `Name`.
- `Description`.
- `CreatedAt`, `UpdatedAt`.

### RolePermissions

Khóa chính kép:

```text
RoleId
PermissionId
```

### Users

- `Id`.
- `FullName`.
- `Email` unique, normalized.
- `Username` unique, normalized.
- `Phone`.
- `PasswordHash`.
- `Department`.
- `Status`: `ACTIVE`, `LOCKED`, `INACTIVE`.
- `MustChangePassword`.
- `LastLoginAt`.
- `CreatedAt`, `UpdatedAt`, `DeletedAt`.

### UserRoles

Khóa chính kép:

```text
UserId
RoleId
```

MVP có thể gán một role chính, nhưng schema cho phép nhiều role.

### AuthSessions

- `Id`.
- `UserId`.
- `RefreshTokenHash`.
- `ExpiresAt`.
- `RevokedAt`.
- `CreatedAt`.
- `IpAddress`.
- `UserAgent`.

Không lưu refresh token dạng rõ.

---

## 4. LabProfile singleton

Các cột:

- `Id`.
- `SingletonKey TINYINT NOT NULL DEFAULT 1`.
- `LabCode`.
- `LabName`.
- `Location`.
- `Capacity`.
- `Description`.
- `Rules`.
- `ManagerId`.
- `Status`.
- `CreatedAt`, `UpdatedAt`.

Ràng buộc:

```text
CHECK SingletonKey = 1
UNIQUE SingletonKey
CHECK Capacity > 0
```

Nhờ vậy database chỉ có tối đa một bản ghi.

---

## 5. Computers

Các cột theo đặc tả:

- `Id`, `Code`, `Name`.
- `Cpu`, `Ram`, `Storage`, `Gpu`.
- `OperatingSystem`.
- `InstalledSoftware`.
- `IpAddress`, `MacAddress`.
- `Position`.
- `Status`.
- `Note`.
- `LastMaintenanceDate`.
- `CreatedAt`, `UpdatedAt`, `DeletedAt`.

Ràng buộc:

- `Code` unique.
- `MacAddress` unique khi không null.
- Check status.
- Không hard delete nếu đã liên kết incident/booking.

---

## 6. Equipments

### EquipmentCategories

- `Id`, `Code`, `Name`, `Description`.
- `Code` unique.

### Equipments

- `Id`, `Code`, `Name`, `CategoryId`.
- `TotalQuantity`.
- `AvailableQuantity`.
- `ReservedQuantity`.
- `BorrowedQuantity`.
- `BrokenQuantity`.
- `MaintenanceQuantity`.
- `LostQuantity`.
- `Location`.
- `ManagerId`.
- `Status`.
- `ImageUrl`.
- `Note`.
- `RowVersion ROWVERSION`.
- `CreatedAt`, `UpdatedAt`, `DeletedAt`.

Ràng buộc:

```text
tất cả số lượng >= 0
TotalQuantity =
AvailableQuantity + ReservedQuantity + BorrowedQuantity +
BrokenQuantity + MaintenanceQuantity + LostQuantity
```

`RowVersion` dùng để chống ghi đè cạnh tranh.

### EquipmentInventoryTransactions

Lưu lịch sử biến động:

- `Id`.
- `EquipmentId`.
- `TransactionType`.
- Các delta số lượng.
- `ReferenceType`.
- `ReferenceId`.
- `PerformedBy`.
- `Note`.
- `CreatedAt`.

---

## 7. BookingRequests

Các cột:

- `Id`.
- `RequestCode` unique.
- `RequesterId`.
- `BookingType`.
- `Purpose`.
- `StartTime`.
- `EndTime`.
- `ExpectedReturnTime`.
- `NumberOfPeople`.
- `NumberOfComputers`.
- `Status`.
- `ApprovedBy`, `ApprovedAt`.
- `RejectedReason`.
- `CancelledBy`, `CancelledAt`, `CancellationReason`.
- `IsOverdue`.
- `HasIncident`.
- `Note`.
- `RowVersion`.
- `CreatedAt`, `UpdatedAt`.

Ràng buộc:

```text
StartTime < EndTime
NumberOfPeople > 0
NumberOfComputers >= 0
```

### BookingEquipmentItems

- `Id`.
- `BookingRequestId`.
- `EquipmentId`.
- `RequestedQuantity`.
- `ReservedQuantity`.
- `BorrowedQuantity`.
- `ReturnedGoodQuantity`.
- `ReturnedBrokenQuantity`.
- `LostQuantity`.
- `HandoverCondition`.
- `ReturnCondition`.
- `Note`.

Unique:

```text
BookingRequestId + EquipmentId
```

---

## 8. CheckInOutLogs

- `Id`.
- `BookingRequestId`.
- `CheckInTime`.
- `CheckOutTime`.
- `CheckedInBy`.
- `CheckedOutBy`.
- `ActualPeopleCount`.
- `ActualComputerCount`.
- `InitialCondition`.
- `ReturnCondition`.
- `Note`.
- `CreatedAt`, `UpdatedAt`.

Mỗi booking chỉ có một log trong MVP:

```text
UNIQUE BookingRequestId
```

---

## 9. IncidentReports

- `Id`, `Code`.
- `ReporterId`.
- `ComputerId` nullable.
- `EquipmentId` nullable.
- `BookingRequestId` nullable.
- `Title`, `Description`.
- `Severity`, `Status`.
- `ImageUrl`.
- `AssignedTo`.
- `ResolvedAt`, `ClosedAt`.
- `ResultNote`.
- `CreatedAt`, `UpdatedAt`.

Ít nhất một đối tượng liên quan hoặc mô tả phòng chung phải hợp lệ ở Application.

---

## 10. AuditLogs

- `Id`.
- `UserId`.
- `Action`.
- `EntityName`.
- `EntityId`.
- `OldValueJson`.
- `NewValueJson`.
- `IpAddress`.
- `UserAgent`.
- `CorrelationId`.
- `CreatedAt`.

AuditLogs là append-only. Không tạo endpoint update/delete.

---

## 11. Index bắt buộc

- `Users(EmailNormalized)`.
- `Users(UsernameNormalized)`.
- `BookingRequests(Status, StartTime, EndTime)`.
- `BookingRequests(RequesterId, CreatedAt DESC)`.
- `Computers(Status)`.
- `Equipments(Status, CategoryId)`.
- `IncidentReports(Status, Severity)`.
- `AuditLogs(EntityName, EntityId, CreatedAt DESC)`.
- `AuthSessions(UserId, ExpiresAt)`.

---

## 12. Kiểm thử migration

- Chạy toàn bộ migration lên database test trống.
- Chạy down theo thứ tự ngược.
- Kiểm tra singleton LabProfile.
- Kiểm tra check constraint thiết bị.
- Kiểm tra unique email/username/code.
- Kiểm tra foreign key.
- Kiểm tra index tồn tại.

---

## Tiêu chí hoàn thành bước 04

- Schema tạo thành công.
- Không dùng `TECHNICIAN`.
- Có RBAC và session.
- Có ReservedQuantity.
- Có transaction log kho.
- Có index và constraint.
- Có tài liệu ERD dạng Mermaid hoặc file `.md`.
