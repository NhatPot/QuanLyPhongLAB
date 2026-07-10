# 11 — CRUD Equipment và quản lý tồn kho

## Mục tiêu

Xây danh mục thiết bị, thiết bị tổng hợp, điều chỉnh số lượng an toàn và lịch sử biến động kho.

Đọc trước:

- `docs/04-database-migration-core-rbac.md`
- `docs/10-crud-computer.md`
- `.agent/skills/sqlserver-database-design/SKILL.md`

---

## 1. Domain

Tạo:

```text
EquipmentCategory
Equipment
EquipmentStatus
EquipmentInventoryTransaction
```

Bất biến:

```text
Total =
Available + Reserved + Borrowed +
Broken + Maintenance + Lost
```

Hành vi:

```text
updateInformation(...)
changeStatus(...)
adjustInventory(...)
reserve(quantity)
releaseReservation(quantity)
handover(quantity)
returnGood(quantity)
returnBroken(quantity)
markLost(quantity)
sendToMaintenance(quantity)
completeMaintenance(quantity)
```

Mọi hành vi phải chặn số âm và phá bất biến.

---

## 2. Repository và Unit of Work

```text
IEquipmentCategoryRepository
IEquipmentRepository
IEquipmentInventoryTransactionRepository
IUnitOfWork
```

Mọi thay đổi số lượng:

- Trong transaction.
- Có inventory transaction.
- Kiểm tra `RowVersion`.
- Không update số lượng bằng dữ liệu client gửi trực tiếp.

---

## 3. Use case

```text
CreateEquipmentCategoryUseCase
ListEquipmentCategoriesUseCase
CreateEquipmentUseCase
GetEquipmentUseCase
ListEquipmentsUseCase
UpdateEquipmentUseCase
UpdateEquipmentStatusUseCase
AdjustEquipmentQuantityUseCase
DeleteEquipmentUseCase
GetEquipmentInventoryHistoryUseCase
```

Permission:

- View: `EQUIPMENT_VIEW`.
- Create: `EQUIPMENT_CREATE`.
- Update: `EQUIPMENT_UPDATE`.
- Status: `EQUIPMENT_STATUS_UPDATE`.
- Quantity: `EQUIPMENT_QUANTITY_ADJUST`.
- Delete: `EQUIPMENT_DELETE`.

---

## 4. Điều chỉnh kho

Input điều chỉnh phải là hành động, không phải set trực tiếp tất cả cột:

```json
{
  "type": "PURCHASE",
  "quantity": 5,
  "note": "Nhập mới"
}
```

Các loại tối thiểu:

```text
PURCHASE
MANUAL_CORRECTION
MARK_BROKEN
SEND_TO_MAINTENANCE
COMPLETE_MAINTENANCE
MARK_LOST
DISPOSE
```

Mỗi loại có quy tắc delta rõ ràng.

---

## 5. API

```text
GET    /api/equipment-categories
POST   /api/equipment-categories
PUT    /api/equipment-categories/:id

GET    /api/equipments
GET    /api/equipments/:id
POST   /api/equipments
PUT    /api/equipments/:id
PATCH  /api/equipments/:id/status
POST   /api/equipments/:id/adjust-inventory
GET    /api/equipments/:id/inventory-history
DELETE /api/equipments/:id
```

---

## 6. Frontend

Trang:

```text
/admin/equipments
/admin/equipments/:id
```

Chức năng:

- Danh sách.
- Danh mục.
- Tìm kiếm/lọc.
- Thẻ số lượng theo trạng thái.
- Form thêm/sửa.
- Dialog điều chỉnh tồn.
- Lịch sử biến động.
- Không cho nhập số âm.
- Hiện cảnh báo khi thiết bị bị khóa.

---

## 7. Audit

```text
EQUIPMENT_CREATED
EQUIPMENT_UPDATED
EQUIPMENT_STATUS_CHANGED
EQUIPMENT_INVENTORY_ADJUSTED
EQUIPMENT_DELETED
```

Inventory transaction là lịch sử nghiệp vụ; AuditLog là lịch sử thao tác quản trị. Cần cả hai.

---

## 8. Test

- Bất biến số lượng.
- Quantity âm.
- Purchase.
- Broken/maintenance/lost.
- Concurrent update bằng RowVersion.
- Transaction rollback.
- Permission.
- History.
- API/UI.

---

## Tiêu chí hoàn thành bước 11

- Tồn kho không thể âm.
- Có ReservedQuantity.
- Có lịch sử biến động.
- Transaction và concurrency hoạt động.
- CRUD/UI hoàn chỉnh.
