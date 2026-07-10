# 05 — Seed Roles, Permissions và tài khoản Admin

## Mục tiêu

Tạo dữ liệu nền idempotent cho RBAC, LabProfile và tài khoản quản trị ban đầu.

Đọc trước:

- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `docs/04-database-migration-core-rbac.md`

---

## 1. Seed role

Tạo đúng sáu role:

```text
ADMIN
TEACHER
COLLABORATOR
LAB_STAFF
STUDENT
MANAGER
```

Seed phải upsert theo `Code`, không tạo bản ghi trùng khi chạy lại.

---

## 2. Seed permission

Seed toàn bộ permission trong tài liệu 01.

Yêu cầu:

- Mã permission unique.
- Tên và mô tả tiếng Việt rõ ràng.
- Không xóa permission đang được gán nếu chạy lại seed.
- Có version hoặc log thay đổi seed.

---

## 3. Gán quyền mặc định

### ADMIN

Toàn bộ permission.

### TEACHER

```text
LAB_PROFILE_VIEW
LAB_CALENDAR_VIEW
COMPUTER_VIEW
EQUIPMENT_VIEW
BOOKING_CREATE
BOOKING_VIEW_OWN
BOOKING_CANCEL_OWN
INCIDENT_CREATE
INCIDENT_VIEW_OWN
DASHBOARD_VIEW_PERSONAL
```

### COLLABORATOR

```text
LAB_PROFILE_VIEW
LAB_CALENDAR_VIEW
COMPUTER_VIEW
COMPUTER_STATUS_UPDATE
EQUIPMENT_VIEW
EQUIPMENT_STATUS_UPDATE
INCIDENT_CREATE
INCIDENT_VIEW_ASSIGNED
INCIDENT_UPDATE
INCIDENT_RESOLVE
DASHBOARD_VIEW_OPERATION
```

### LAB_STAFF

```text
LAB_PROFILE_VIEW
LAB_CALENDAR_VIEW
COMPUTER_VIEW
EQUIPMENT_VIEW
EQUIPMENT_HANDOVER
EQUIPMENT_RECEIVE
BOOKING_VIEW_ALL
BOOKING_CHECK_IN
BOOKING_CHECK_OUT
INCIDENT_CREATE
INCIDENT_VIEW_ASSIGNED
INCIDENT_UPDATE
DASHBOARD_VIEW_OPERATION
```

### STUDENT

```text
LAB_PROFILE_VIEW
LAB_CALENDAR_VIEW
INCIDENT_CREATE
INCIDENT_VIEW_OWN
DASHBOARD_VIEW_PERSONAL
```

Không gán `BOOKING_CREATE` trong MVP.

### MANAGER

```text
LAB_PROFILE_VIEW
LAB_CALENDAR_VIEW
DASHBOARD_VIEW_ADMIN
REPORT_VIEW
REPORT_EXPORT
```

Read-only.

---

## 4. Seed Admin

Biến môi trường:

```text
SEED_ADMIN_EMAIL
SEED_ADMIN_USERNAME
SEED_ADMIN_PASSWORD
SEED_ADMIN_FULL_NAME
```

Yêu cầu:

- Không có giá trị mặc định nguy hiểm.
- Nếu thiếu biến bắt buộc, seed phải dừng với thông báo rõ.
- Hash password trước khi lưu.
- `MustChangePassword = 1`.
- Gán role `ADMIN`.
- Không in password ra log.
- Chạy lại không đổi password trừ khi có flag rõ ràng.

---

## 5. Seed LabProfile

Tạo một bản ghi mặc định nếu chưa có:

```text
LabCode: IT-LAB
LabName: Phòng Lab Công nghệ thông tin
Location: Khoa Công nghệ thông tin
Capacity: 40
Status: ACTIVE
```

Không ghi đè cấu hình người dùng đã sửa khi chạy lại seed.

---

## 6. Script và lệnh

Tạo script:

```text
npm run db:migrate
npm run db:seed
npm run db:reset:test
```

`db:reset:test` chỉ được hoạt động khi environment là test.

---

## 7. Test bắt buộc

- Chạy seed hai lần không tạo trùng.
- Admin có đủ permission.
- Teacher không có quyền approve.
- Student không có booking create.
- Manager không có quyền ghi.
- Password được hash.
- LabProfile chỉ có một bản ghi.

---

## Tiêu chí hoàn thành bước 05

- Seed idempotent.
- Role/permission đúng ma trận.
- Admin được tạo an toàn.
- Không log bí mật.
- Có tài liệu cách chạy seed.
