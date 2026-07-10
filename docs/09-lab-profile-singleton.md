# 09 — Lab Profile Singleton

## Mục tiêu

Xây module cấu hình một phòng lab duy nhất, gồm backend, API, permission, audit và giao diện.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `docs/07-auth-login-current-user.md`
- `.agent/skills/repository-pattern/SKILL.md`

---

## 1. Domain

Tạo:

```text
LabProfile
LabStatus
```

Thuộc tính:

- LabCode.
- LabName.
- Location.
- Capacity.
- Description.
- Rules.
- ManagerId.
- Status.

Hành vi:

```text
updateInformation(...)
changeStatus(...)
canAcceptRegularBooking()
```

Rule:

- Capacity > 0.
- `ACTIVE`: nhận booking thường.
- `MAINTENANCE`: không nhận booking thường.
- `LOCKED`: chỉ Admin tạo lịch đặc biệt khi use case cho phép.
- `INACTIVE`: không sử dụng.
- Không tạo entity lab thứ hai.

---

## 2. Repository

```text
ILabProfileRepository
get(): Promise<LabProfile | null>
save(profile): Promise<void>
```

SQL implementation phải dùng singleton constraint.

---

## 3. Use case

```text
GetLabProfileUseCase
UpdateLabProfileUseCase
UpdateLabStatusUseCase
```

Permission:

- Get: `LAB_PROFILE_VIEW`.
- Update: `LAB_PROFILE_UPDATE`.
- Status: `LAB_STATUS_UPDATE`.

Update và status phải ghi AuditLog với old/new JSON.

---

## 4. API

```text
GET   /api/lab-profile
PUT   /api/lab-profile
PATCH /api/lab-profile/status
```

Không tạo:

```text
POST /api/labs
DELETE /api/labs/:id
```

---

## 5. Frontend

Trang:

```text
/admin/lab-profile
```

Hiển thị:

- Mã phòng.
- Tên phòng.
- Vị trí.
- Sức chứa.
- Người phụ trách.
- Trạng thái.
- Nội quy.
- Mô tả.

Admin có form sửa. Role khác chỉ có trang xem phù hợp.

Dùng badge màu trạng thái.

---

## 6. Test

- Get singleton.
- Không tạo bản ghi thứ hai.
- Update capacity hợp lệ/không hợp lệ.
- User thiếu quyền.
- Status transitions.
- AuditLog được ghi.
- Frontend form validation.

---

## Tiêu chí hoàn thành bước 09

- Một LabProfile duy nhất.
- API và UI hoạt động.
- Permission đúng.
- Audit đầy đủ.
- Booking module có thể dùng `canAcceptRegularBooking()`.
