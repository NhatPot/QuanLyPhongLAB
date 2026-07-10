# 16 — Incident Management

## Mục tiêu

Xây luồng tạo, phân công, xử lý và đóng sự cố liên quan đến phòng, máy, thiết bị hoặc booking.

Đọc trước:

- `docs/15-checkin-checkout.md`
- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`

---

## 1. Domain

Tạo:

```text
IncidentReport
IncidentStatus
IncidentSeverity
```

Hành vi:

```text
assignTo(userId)
start()
resolve(resultNote)
close()
reopen()  // chỉ thêm nếu thực sự cần
```

Transition:

```text
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
OPEN → IN_PROGRESS
ASSIGNED → RESOLVED
```

Không cho close khi chưa resolved, trừ Admin với lý do đặc biệt và AuditLog.

---

## 2. Liên kết

Incident có thể liên quan:

- Booking.
- Computer.
- Equipment.
- Phòng lab chung.

Ít nhất phải có title/description rõ. Khi tạo từ check-out, liên kết booking là bắt buộc.

---

## 3. Use case

```text
CreateIncidentUseCase
GetIncidentUseCase
ListIncidentsUseCase
AssignIncidentUseCase
StartIncidentUseCase
ResolveIncidentUseCase
CloseIncidentUseCase
GetMyReportedIncidentsUseCase
GetAssignedIncidentsUseCase
```

---

## 4. Permission và scope

- Mọi role phù hợp có `INCIDENT_CREATE`.
- Teacher/Student xem sự cố của mình.
- Collaborator/Lab Staff xem sự cố được giao.
- Admin xem tất cả và assign/close.
- Manager chỉ xem số liệu tổng hợp, không nhất thiết xem chi tiết nhạy cảm.

---

## 5. Tác động tài sản

Khi incident tạo từ hư hỏng:

- Computer có thể chuyển `BROKEN`.
- Equipment count được cập nhật ở transaction check-out hoặc use case điều chỉnh riêng.
- Incident resolve không tự động đưa thiết bị về Available; phải qua maintenance/inventory action phù hợp.

---

## 6. Ảnh minh chứng

MVP có thể hỗ trợ một ảnh hoặc nhiều ảnh tùy khả năng.

Yêu cầu:

- Không lưu file trực tiếp trong database.
- Dùng abstraction `IFileStorageService`.
- Validate MIME, kích thước và extension.
- Tên file ngẫu nhiên.
- Không cho upload executable.
- Nếu chưa triển khai storage thật, dùng local storage chỉ cho dev và ghi rõ.

---

## 7. API

```text
POST /api/incidents
GET  /api/incidents
GET  /api/incidents/:id
GET  /api/incidents/my-reports
GET  /api/incidents/assigned-to-me
POST /api/incidents/:id/assign
POST /api/incidents/:id/start
POST /api/incidents/:id/resolve
POST /api/incidents/:id/close
```

---

## 8. Frontend

Trang:

```text
/incidents
/incidents/:id
/incidents/new
```

- Filter status/severity/type.
- Badge.
- Timeline hoạt động.
- Form assign/resolve.
- Ảnh minh chứng.
- Data scope theo role.
- Empty/loading/error state.

---

## 9. Audit

```text
INCIDENT_CREATED
INCIDENT_ASSIGNED
INCIDENT_STARTED
INCIDENT_RESOLVED
INCIDENT_CLOSED
```

---

## 10. Test

- Tạo sự cố thủ công.
- Tạo từ check-out.
- Transition sai.
- Scope own/assigned/all.
- Upload validation.
- Computer status update.
- Audit.
- API/UI.

---

## Tiêu chí hoàn thành bước 16

- Workflow sự cố hoàn chỉnh.
- Scope đúng.
- Tài sản liên quan nhất quán.
- Upload an toàn nếu triển khai.
- Dashboard có dữ liệu nguồn.
