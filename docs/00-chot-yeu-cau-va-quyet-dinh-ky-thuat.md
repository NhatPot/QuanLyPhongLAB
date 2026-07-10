# 00 — Chốt yêu cầu và quyết định kỹ thuật

## Mục đích

Tài liệu này là **nguồn quyết định cao nhất** cho phiên bản MVP của dự án **Website Quản Lý Phòng Lab CNTT**. Repository hiện tại là repository mới, chưa có mã nguồn backend hoặc frontend.

Khi nội dung trong skill cũ, tài liệu Word, ảnh giao diện hoặc các file hướng dẫn khác không thống nhất, Antigravity phải:

1. Ưu tiên tài liệu này.
2. Không tự suy đoán để đổi thiết kế.
3. Ghi lại xung đột trong báo cáo hoàn thành.
4. Chỉ sửa quyết định khi người dùng xác nhận.

---

## 1. Phạm vi MVP

Hệ thống chỉ quản lý **một phòng lab CNTT duy nhất**.

MVP phải hoàn thành được luồng:

```text
Giảng viên đăng nhập
→ xem lịch phòng
→ kiểm tra khả dụng
→ tạo yêu cầu
→ Admin duyệt hoặc từ chối
→ Ban trực check-in
→ sử dụng phòng, máy tính và thiết bị
→ Ban trực check-out
→ hoàn tất hoặc tạo sự cố
→ Dashboard và AuditLog được cập nhật
```

MVP gồm:

- Đăng nhập và phân quyền.
- Cấu hình một phòng lab duy nhất.
- Quản lý máy tính.
- Quản lý thiết bị và số lượng tồn.
- Kiểm tra lịch/tài nguyên khả dụng.
- Tạo, xem và hủy yêu cầu đăng ký.
- Duyệt hoặc từ chối yêu cầu.
- Check-in/check-out.
- Báo cáo sự cố.
- Dashboard theo vai trò.
- Audit log.
- Kiểm thử và triển khai cơ bản.

Chưa làm trong MVP:

- Đăng ký lịch thực hành định kỳ.
- QR check-in.
- QR thiết bị.
- Tích hợp tài khoản trường.
- Gửi email thật.
- Xuất Excel/PDF nâng cao.
- Quản lý nhiều phòng lab.
- Ứng dụng di động.

---

## 2. Công nghệ được chốt

### Backend

- Node.js LTS.
- TypeScript ở chế độ `strict`.
- Express.
- SQL Server.
- Driver `mssql`.
- Zod cho request validation.
- JWT access token.
- Refresh token lưu bằng cookie HTTP-only và bảng phiên đăng nhập.
- Argon2 hoặc bcrypt để băm mật khẩu.
- Vitest hoặc Jest; chọn một và dùng thống nhất.
- Supertest cho API test.
- Pino hoặc Winston cho logging; chọn một.

### Frontend

- React.
- Vite.
- TypeScript.
- React Router.
- TanStack Query.
- Tailwind CSS.
- React Hook Form + Zod.
- FullCalendar cho lịch phòng.
- Một thư viện biểu đồ nhẹ, chỉ thêm khi tới bước Dashboard.

### Tổ chức repository

Dùng một repository với npm workspaces:

```text
QuanLyPhongLAB/
├── backend/
├── frontend/
├── database/
├── docs/
├── .agent/
├── package.json
├── docker-compose.yml
└── README.md
```

---

## 3. Kiến trúc backend

Áp dụng Clean Architecture:

```text
Presentation → Application → Domain
Infrastructure → Application/Domain
```

Quy tắc:

- Domain không import Express, SQL Server, ORM, HTTP hoặc framework.
- Application không viết SQL.
- Infrastructure mới được gọi SQL Server.
- Controller chỉ nhận request, gọi use case và trả response.
- Repository interface nằm trong Domain/Application.
- Repository SQL Server nằm trong Infrastructure.
- Mỗi nghiệp vụ ghi dữ liệu quan trọng phải ghi AuditLog.
- Transaction được mở ở Infrastructure thông qua `IUnitOfWork`.

---

## 4. Vai trò chính thức

Chỉ sử dụng các mã vai trò sau:

```text
ADMIN
TEACHER
COLLABORATOR
LAB_STAFF
STUDENT
MANAGER
```

Không sử dụng role `TECHNICIAN`. Khi tài liệu cũ ghi “Kỹ thuật viên”:

- Công việc hỗ trợ kỹ thuật → `COLLABORATOR`.
- Công việc nhận/trả phòng, check-in/check-out → `LAB_STAFF`.
- Phê duyệt yêu cầu trong MVP → `ADMIN`.

Quyết định MVP:

- `TEACHER` được tạo booking.
- `STUDENT` chưa được tạo booking mặc định.
- `ADMIN` là vai trò duy nhất được duyệt/từ chối.
- `ADMIN` và `LAB_STAFF` được check-in/check-out.
- `COLLABORATOR` cập nhật tình trạng tài sản và xử lý sự cố được giao.
- `MANAGER` chỉ xem dashboard/báo cáo.

---

## 5. Trạng thái nghiệp vụ được chốt

### LabProfile

```text
ACTIVE
MAINTENANCE
LOCKED
INACTIVE
```

### Computer

```text
ACTIVE
IN_USE
BROKEN
MAINTENANCE
LOCKED
INACTIVE
```

### Equipment

Trạng thái của bản ghi thiết bị là trạng thái cho **toàn bộ loại thiết bị**:

```text
ACTIVE
LOCKED
INACTIVE
```

Tình trạng số lượng được quản lý bằng các cột:

```text
TotalQuantity
AvailableQuantity
ReservedQuantity
BorrowedQuantity
BrokenQuantity
MaintenanceQuantity
LostQuantity
```

Bất biến:

```text
TotalQuantity =
AvailableQuantity +
ReservedQuantity +
BorrowedQuantity +
BrokenQuantity +
MaintenanceQuantity +
LostQuantity
```

### Booking

```text
DRAFT
PENDING
APPROVED
REJECTED
CANCELLED
CHECKED_IN
COMPLETED
```

Không dùng `OVERDUE` hoặc `INCIDENT` làm trạng thái duy nhất vì một booking có thể vừa hoàn tất, vừa trả trễ, vừa có sự cố. Dùng:

```text
IsOverdue
HasIncident
```

Check-out thành công chuyển trực tiếp từ `CHECKED_IN` sang `COMPLETED` và ghi `CheckOutTime` trong log.

### Incident

```text
OPEN
ASSIGNED
IN_PROGRESS
RESOLVED
CLOSED
```

Mức độ:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

## 6. Loại booking trong MVP

```text
FULL_LAB
COMPUTERS_ONLY
EQUIPMENT_ONLY
```

`RECURRING_CLASS` để sau MVP.

Quy tắc overlap:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

Booking gây xung đột khi chồng thời gian với booking `APPROVED` hoặc `CHECKED_IN`, tùy loại tài nguyên:

- `FULL_LAB` chặn tất cả booking sử dụng phòng cùng thời gian.
- `COMPUTERS_ONLY` không được nằm trong thời gian đã có `FULL_LAB`.
- Các booking `COMPUTERS_ONLY` có thể cùng tồn tại nếu tổng số máy yêu cầu không vượt số máy hoạt động.
- `EQUIPMENT_ONLY` có thể không dùng phòng; vẫn kiểm tra tồn thiết bị theo thời gian mượn.

---

## 7. Quy ước dữ liệu

- ID dùng `UNIQUEIDENTIFIER`.
- Thời gian trong database dùng UTC (`SYSUTCDATETIME()`).
- API trả ISO 8601.
- Frontend hiển thị múi giờ `Asia/Ho_Chi_Minh`.
- Tên bảng dùng PascalCase.
- Tên cột dùng PascalCase.
- Enum lưu bằng `NVARCHAR` và có check constraint.
- Không hard delete dữ liệu nghiệp vụ đã phát sinh lịch sử.
- Dùng `Status`, `DeletedAt` hoặc `IsDeleted` tùy bảng và được mô tả trong migration.
- Mọi bảng chính có `CreatedAt`, `UpdatedAt`.
- Dữ liệu bí mật chỉ lấy từ biến môi trường.

---

## 8. Giao diện nguồn

Các ảnh trong thư mục gốc là nguồn tham khảo UI. Đặc điểm cần giữ:

- Sidebar xanh navy cố định bên trái.
- Header gọn phía trên.
- Nền nội dung sáng.
- Thẻ thống kê bo góc.
- Badge màu theo trạng thái.
- Bảng dữ liệu có tìm kiếm, lọc, phân trang.
- Dashboard khác nhau theo role.
- Không sao chép cứng nội dung demo trong ảnh.
- Ưu tiên responsive, accessibility và dữ liệu thật từ API.

Màu trạng thái đề xuất:

```text
PENDING     → vàng
APPROVED    → xanh dương
CHECKED_IN  → xanh lá
COMPLETED   → xám
REJECTED    → đỏ
CANCELLED   → xám đậm
MAINTENANCE → cam
BROKEN      → đỏ
ACTIVE      → xanh lá
```

---

## 9. Quy tắc làm việc cho Antigravity

Trước mỗi task:

1. Đọc `.agent/AGENTS.md`.
2. Đọc skill liên quan.
3. Đọc tài liệu bước hiện tại và các bước trước.
4. Kiểm tra repository thực tế.
5. Không tự chuyển sang bước tiếp theo.

Sau mỗi task:

1. Liệt kê file đã tạo/sửa.
2. Liệt kê lệnh đã chạy.
3. Chạy format, lint, type-check, test và build trong phạm vi có thể.
4. Ghi rõ lỗi còn lại.
5. Ghi rõ giả định.
6. Không tuyên bố hoàn thành khi tiêu chí chấp nhận chưa đạt.

---

## Tiêu chí hoàn thành bước 00

- Các quyết định trên được chấp nhận làm chuẩn.
- Không còn dùng thuật ngữ `TECHNICIAN`.
- Tài liệu sau tuân thủ role, status và stack được chốt tại đây.
