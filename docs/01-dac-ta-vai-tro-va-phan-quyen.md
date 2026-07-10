# 01 — Đặc tả vai trò và phân quyền

## Mục tiêu

Chốt hành vi, quyền và phạm vi dữ liệu của từng nhóm người dùng trước khi xây database, API và giao diện.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `.agent/AGENTS.md`
- `.agent/skills/api-controller-validation/SKILL.md`

---

## 1. Vai trò ADMIN

### Đối tượng

Cán bộ quản trị hệ thống hoặc người phụ trách phòng lab.

### Trang mặc định

```text
/admin/dashboard
```

### Chức năng

- Quản lý người dùng và vai trò.
- Cập nhật cấu hình phòng lab.
- Quản lý máy tính và thiết bị.
- Xem tất cả booking.
- Duyệt, từ chối, hủy booking.
- Check-in/check-out khi cần.
- Quản lý sự cố.
- Xem dashboard tổng.
- Xem AuditLog.
- Xuất báo cáo ở giai đoạn sau.

### Giới hạn

- Phải nhập lý do khi từ chối/hủy booking đã duyệt.
- Không sửa/xóa AuditLog.
- Không được bỏ qua transaction hoặc kiểm tra khả dụng.
- Hành động nhạy cảm phải ghi AuditLog.

---

## 2. Vai trò TEACHER

### Đối tượng

Giảng viên đăng ký phòng cho giảng dạy, thực hành, thi, đồ án, workshop hoặc nghiên cứu.

### Trang mặc định

```text
/teacher/dashboard
```

### Chức năng

- Xem lịch phòng.
- Kiểm tra tài nguyên khả dụng.
- Tạo booking.
- Xem booking của chính mình.
- Hủy booking của mình khi còn `PENDING`.
- Gửi yêu cầu hủy booking đã `APPROVED`.
- Xem thiết bị đang mượn của mình.
- Tạo báo cáo sự cố.
- Xem thông báo liên quan đến booking của mình.

### Không được phép

- Duyệt/từ chối booking.
- Check-in/check-out.
- Xem booking riêng tư của người khác.
- Quản lý tài khoản.
- Thay đổi máy/thiết bị.
- Xem AuditLog.

### Data scope

```text
OWN
```

---

## 3. Vai trò COLLABORATOR

### Đối tượng

Cộng tác viên hỗ trợ kỹ thuật và kiểm tra tài sản.

### Trang mặc định

```text
/collaborator/dashboard
```

### Chức năng

- Xem lịch sử dụng cần thiết cho công việc.
- Xem máy tính và thiết bị.
- Cập nhật trạng thái máy/thiết bị theo permission.
- Tạo sự cố.
- Xem và xử lý sự cố được phân công.
- Ghi chú kỹ thuật.

### Không được phép mặc định

- Duyệt booking.
- Check-in/check-out.
- Quản lý tài khoản.
- Cấu hình phòng lab.
- Thay đổi tổng số lượng thiết bị nếu không có permission điều chỉnh kho.
- Xem AuditLog.

### Data scope

```text
ASSIGNED
```

---

## 4. Vai trò LAB_STAFF

### Đối tượng

Ban trực phòng, chịu trách nhiệm vận hành theo ca.

### Trang mặc định

```text
/lab-staff/today
```

### Chức năng

- Xem booking hôm nay.
- Xem booking sắp check-in.
- Xác nhận check-in.
- Bàn giao thiết bị.
- Xác nhận check-out.
- Nhận lại thiết bị.
- Ghi nhận tình trạng phòng, máy và thiết bị.
- Tạo Incident khi có hư hỏng, thiếu hoặc mất.
- Xem booking quá giờ.
- Ghi chú bàn giao ca.

### Không được phép mặc định

- Duyệt/từ chối booking.
- Tạo/sửa role.
- Cấu hình phòng lab.
- Xóa tài sản.
- Xem AuditLog.

### Data scope

```text
TODAY_SHIFT
```

Trong MVP chưa xây lịch trực đầy đủ, scope tạm thời là booking của ngày hiện tại. Khi có `LabDutySchedules`, giới hạn thêm theo ca.

---

## 5. Vai trò STUDENT

### Đối tượng

Sinh viên sử dụng phòng thông qua giảng viên.

### Trang mặc định

```text
/student/dashboard
```

### Chức năng MVP

- Xem lịch công khai của phòng.
- Xem nội quy.
- Xem thông tin phòng lab.
- Tạo báo cáo sự cố nếu có quyền.
- Xem sự cố do mình báo.

### Không được phép MVP

- Tạo booking.
- Duyệt booking.
- Check-in/check-out.
- Quản lý tài sản.
- Xem dữ liệu cá nhân của người khác.

### Mở rộng sau MVP

Có thể cấp `BOOKING_CREATE` cho sinh viên theo từng user hoặc yêu cầu giảng viên bảo lãnh.

---

## 6. Vai trò MANAGER

### Đối tượng

Trưởng khoa hoặc người quản lý chỉ cần xem báo cáo.

### Trang mặc định

```text
/manager/dashboard
```

### Chức năng

- Xem dashboard tổng hợp.
- Xem lịch phòng.
- Xem thống kê sử dụng.
- Xem thống kê tài sản và sự cố.
- Xuất báo cáo khi tính năng được triển khai.

### Không được phép

- Tạo/duyệt booking.
- Check-in/check-out.
- Thay đổi cấu hình.
- Quản lý user/tài sản.
- Xem mật khẩu hoặc dữ liệu nhạy cảm.
- Xem AuditLog chi tiết nếu chưa được cấp riêng.

### Data scope

```text
READ_ONLY
```

---

## 7. Danh sách permission

### Người dùng và phân quyền

```text
USER_VIEW
USER_CREATE
USER_UPDATE
USER_STATUS_UPDATE
ROLE_VIEW
ROLE_ASSIGN
PERMISSION_VIEW
```

### Phòng lab

```text
LAB_PROFILE_VIEW
LAB_PROFILE_UPDATE
LAB_STATUS_UPDATE
LAB_CALENDAR_VIEW
```

### Máy tính

```text
COMPUTER_VIEW
COMPUTER_CREATE
COMPUTER_UPDATE
COMPUTER_STATUS_UPDATE
COMPUTER_DELETE
```

### Thiết bị

```text
EQUIPMENT_VIEW
EQUIPMENT_CREATE
EQUIPMENT_UPDATE
EQUIPMENT_STATUS_UPDATE
EQUIPMENT_QUANTITY_ADJUST
EQUIPMENT_HANDOVER
EQUIPMENT_RECEIVE
EQUIPMENT_DELETE
```

### Booking

```text
BOOKING_CREATE
BOOKING_VIEW_OWN
BOOKING_VIEW_ALL
BOOKING_CANCEL_OWN
BOOKING_CANCEL_ANY
BOOKING_APPROVE
BOOKING_REJECT
BOOKING_CHECK_IN
BOOKING_CHECK_OUT
```

### Sự cố

```text
INCIDENT_CREATE
INCIDENT_VIEW_OWN
INCIDENT_VIEW_ASSIGNED
INCIDENT_VIEW_ALL
INCIDENT_ASSIGN
INCIDENT_UPDATE
INCIDENT_RESOLVE
INCIDENT_CLOSE
```

### Dashboard và hệ thống

```text
DASHBOARD_VIEW_PERSONAL
DASHBOARD_VIEW_OPERATION
DASHBOARD_VIEW_ADMIN
REPORT_VIEW
REPORT_EXPORT
AUDIT_LOG_VIEW
```

---

## 8. Ma trận quyền MVP

| Nhóm quyền | ADMIN | TEACHER | COLLABORATOR | LAB_STAFF | STUDENT | MANAGER |
|---|---:|---:|---:|---:|---:|---:|
| Xem phòng/lịch | Có | Có | Có | Có | Có | Có |
| Cập nhật phòng | Có | Không | Không | Không | Không | Không |
| Quản lý user | Có | Không | Không | Không | Không | Không |
| Xem máy/thiết bị | Có | Có giới hạn | Có | Có | Không | Chỉ xem tổng hợp |
| CRUD máy/thiết bị | Có | Không | Cập nhật trạng thái | Bàn giao/nhận | Không | Không |
| Tạo booking | Có | Có | Không | Không | Không | Không |
| Xem booking | Tất cả | Của mình | Theo công việc | Hôm nay | Lịch công khai | Chỉ đọc |
| Duyệt/từ chối | Có | Không | Không | Không | Không | Không |
| Check-in/out | Có | Không | Không | Có | Không | Không |
| Tạo sự cố | Có | Có | Có | Có | Có | Không |
| Xử lý sự cố | Có | Không | Được giao | Được giao | Không | Chỉ xem tổng hợp |
| Dashboard tổng | Có | Không | Không | Vận hành | Không | Có |
| Audit log | Có | Không | Không | Không | Không | Không |

---

## 9. Yêu cầu triển khai

Antigravity phải:

1. Tạo seed permission đúng danh sách.
2. Không kiểm tra quyền bằng chuỗi role rải rác trong controller.
3. Dùng `permissionMiddleware`.
4. Application vẫn phải kiểm tra quyền/scope cho nghiệp vụ nhạy cảm.
5. Backend không tin quyền do frontend gửi lên.
6. Menu frontend được sinh từ role/permission của user.
7. Mọi test quyền phải gồm cả `401`, `403` và data scope.

---

## Tiêu chí hoàn thành bước 01

- Tất cả role có mô tả rõ.
- Không còn role `TECHNICIAN`.
- Có danh sách permission chính thức.
- Có ma trận quyền.
- Có data scope.
- Các tài liệu sau dùng đúng các mã này.
