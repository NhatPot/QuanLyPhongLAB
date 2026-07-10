# 10 — CRUD Computer

## Mục tiêu

Xây quản lý từng máy tính vật lý trong phòng lab, gồm CRUD, trạng thái, tìm kiếm, phân trang, audit và UI.

Đọc trước:

- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `docs/09-lab-profile-singleton.md`
- `.agent/skills/repository-pattern/SKILL.md`

---

## 1. Domain

Tạo:

```text
Computer
ComputerStatus
```

Thuộc tính:

- Code.
- Name.
- CPU.
- RAM.
- Storage.
- GPU.
- OperatingSystem.
- InstalledSoftware.
- IpAddress.
- MacAddress.
- Position.
- Status.
- Note.
- LastMaintenanceDate.

Hành vi:

```text
updateInformation(...)
changeStatus(...)
isAvailableForBooking()
markBroken(...)
startMaintenance(...)
finishMaintenance(...)
lock(...)
```

Máy khả dụng khi `ACTIVE`.

---

## 2. Repository

```text
IComputerRepository
findById
findByCode
list(filter, pagination)
countActive
save
softDelete
```

Query filter:

- Keyword.
- Status.
- Position.
- Page/pageSize.
- Sort.

---

## 3. Use case

```text
CreateComputerUseCase
GetComputerUseCase
ListComputersUseCase
UpdateComputerUseCase
UpdateComputerStatusUseCase
DeleteComputerUseCase
```

Permission:

- View: `COMPUTER_VIEW`.
- Create: `COMPUTER_CREATE`.
- Update: `COMPUTER_UPDATE`.
- Status: `COMPUTER_STATUS_UPDATE`.
- Delete: `COMPUTER_DELETE`.

Delete là soft delete. Không cho xóa khi có dữ liệu liên quan nếu việc xóa làm hỏng lịch sử.

---

## 4. Validation

- Code bắt buộc, unique.
- Name bắt buộc.
- IP hợp lệ khi có.
- MAC hợp lệ và normalized.
- Status thuộc enum.
- Độ dài note giới hạn.
- Không cho client tự gửi CreatedAt/UpdatedAt.

---

## 5. API

```text
GET    /api/computers
GET    /api/computers/:id
POST   /api/computers
PUT    /api/computers/:id
PATCH  /api/computers/:id/status
DELETE /api/computers/:id
GET    /api/computers/availability-summary
```

Danh sách trả phân trang.

---

## 6. Frontend

Trang Admin:

```text
/admin/computers
/admin/computers/:id
```

Chức năng:

- Bảng máy tính.
- Tìm kiếm.
- Lọc trạng thái.
- Thêm/sửa.
- Đổi trạng thái có confirm.
- Xem chi tiết.
- Badge trạng thái.
- Empty/loading/error state.

Collaborator và Lab Staff chỉ thấy thao tác đúng permission.

---

## 7. Audit

Ghi log:

```text
COMPUTER_CREATED
COMPUTER_UPDATED
COMPUTER_STATUS_CHANGED
COMPUTER_DELETED
```

Không ghi password/token hoặc dữ liệu không liên quan.

---

## 8. Test

- Tạo máy hợp lệ.
- Trùng code/MAC.
- IP/MAC sai.
- Update.
- Status change.
- Máy BROKEN không khả dụng.
- Permission.
- Pagination/filter.
- Audit.
- API và component chính.

---

## Tiêu chí hoàn thành bước 10

- CRUD hoạt động end-to-end.
- Soft delete.
- Audit đầy đủ.
- Availability summary chính xác.
- UI bám design system.
