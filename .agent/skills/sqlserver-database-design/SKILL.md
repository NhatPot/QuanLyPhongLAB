# Hướng Dẫn Thiết Kế Database SQL Server (sqlserver-database-design)

Kỹ năng này quy định cách thiết kế cơ sở dữ liệu quan hệ trên SQL Server nhằm phục vụ quản trị thông tin phòng Lab CNTT, đảm bảo tính toàn vẹn dữ liệu, hiệu năng truy vấn và sự an toàn khi xử lý các giao dịch số lượng lớn.

---

## 1. Danh sách các bảng chính trong Cơ sở dữ liệu

Hệ thống được thiết kế xoay quanh các bảng sau:

### 1.1. Hệ thống Phân quyền & Người dùng
* **`Roles`**: Lưu trữ các vai trò trong hệ thống (Admin, Teacher, Technician, Student).
* **`Users`**: Thông tin chi tiết của người dùng đăng nhập hệ thống (Mã số, Họ tên, Email, Mật khẩu băm, RoleId, Trạng thái hoạt động).

### 1.2. Phòng Lab & Thiết bị tài sản
* **`LabProfile`**: Chứa thông tin cấu hình của **phòng Lab duy nhất** (Tên phòng, Vị trí, Sức chứa máy tính tối đa, Quy định phòng Lab, Trạng thái hoạt động: ACTIVE / INACTIVE).
* **`Computers`**: Quản lý chi tiết từng máy tính vật lý trong phòng Lab (Mã máy, Tên máy, Cấu hình chi tiết CPU/RAM/VGA, Vị trí tọa độ trong phòng, Trạng thái: ACTIVE / MAINTENANCE / BROKEN / LOCKED).
* **`EquipmentCategories`**: Danh mục nhóm thiết bị (ví dụ: Projector, Micro, Cáp chuyển đổi HDMI, Kính VR...).
* **`Equipments`**: Quản lý tổng hợp số lượng vật tư thiết bị trong phòng Lab (Mã thiết bị, Tên thiết bị, CategoryId, TotalQuantity, AvailableQuantity, BorrowedQuantity, BrokenQuantity).

### 1.3. Nghiệp vụ Đăng ký & Theo dõi
* **`BookingRequests`**: Lưu trữ các yêu cầu đăng ký sử dụng phòng Lab. Các thông tin chính: UserId, Purpose, StartTime, EndTime, ExpectedAttendees (Số lượng người tham gia dự kiến), RequestedComputersCount (Số máy tính cần dùng), Status (PENDING, APPROVED, REJECTED, CANCELLED, CHECKED_IN, CHECKED_OUT, OVERDUE), RejectionReason, CheckInTime, CheckOutTime.
* **`BookingEquipmentItems`**: Bảng trung gian ghi nhận số lượng cụ thể từng loại thiết bị được mượn đi kèm theo một yêu cầu đăng ký (BookingId, EquipmentId, RequestedQuantity, Status: PENDING / BORROWED / RETURNED).
* **`CheckInOutLogs`**: Nhật ký chi tiết lịch sử ra vào phòng Lab thực tế của người dùng (UserId, BookingId, ActionType: IN / OUT, LoggedAt).

### 1.4. Sự cố, Bảo trì & Phân công lịch trực
* **`IncidentReports`**: Ghi nhận các sự cố thiết bị/máy tính do người dùng hoặc kỹ thuật viên báo cáo (ReporterId, ComputerId, EquipmentId, Description, SeverityLevel: LOW / MEDIUM / HIGH, Status: PENDING / PROCESSING / RESOLVED, ResolvedAt, ResolutionDetails).
* **`MaintenanceSchedules`**: Lịch trình bảo trì định kỳ hoặc sửa chữa đột xuất máy tính, thiết bị (ComputerId, EquipmentId, MaintenanceDate, Description, Cost, PerformedBy, Status: PLANNED / IN_PROGRESS / COMPLETED).
* **`LabDutySchedules`**: Phân công lịch trực phòng Lab cho các Kỹ thuật viên (TechnicianId, Date, Shift: MORNING / AFTERNOON, Status).

### 1.5. Giám sát hệ thống
* **`AuditLogs`**: Lưu vết toàn bộ các thao tác nhạy cảm hoặc quan trọng trên hệ thống (UserId, Action: CREATE_BOOKING, APPROVE_BOOKING..., TableName, RecordId, OldValues, NewValues, IpAddress, LoggedAt).

---

## 2. Quy tắc thiết kế bắt buộc

### 2.1. Ràng buộc dữ liệu
* **Khóa chính**: Tất cả các bảng phải sử dụng khóa chính dạng tự tăng `INT IDENTITY(1,1)` hoặc `UNIQUEIDENTIFIER` (UUID) tùy thiết kế, có chỉ định `PRIMARY KEY`.
* **Khóa ngoại**: Tất cả các quan hệ giữa các bảng phải được ràng buộc rõ ràng bằng `FOREIGN KEY` kèm theo điều kiện xóa/sửa thích hợp (ví dụ: `ON DELETE NO ACTION` để tránh mất dữ liệu liên đới vô ý).
* **Thời gian ghi nhận**: Mọi bảng dữ liệu chính phải có 2 trường để theo dõi thời gian tạo và cập nhật:
  * `CreatedAt DATETIME2 DEFAULT GETDATE() NOT NULL`
  * `UpdatedAt DATETIME2 DEFAULT GETDATE() NOT NULL` (Có trigger cập nhật tự động khi update).

### 2.2. Trạng thái (Status)
Các cột trạng thái bắt buộc phải sử dụng kiểu dữ liệu `VARCHAR` (với ràng buộc `CHECK CONSTRAINT`) hoặc `TINYINT` có mapping enum rõ ràng để tránh nhập sai trạng thái nghiệp vụ.

### 2.3. Tối ưu hóa Chỉ mục (Indexes)
Thiết lập chỉ mục (Non-Clustered Indexes) trên các trường thường xuyên lọc hoặc sắp xếp để tối ưu hiệu năng:
* `BookingRequests`: Index trên `UserId`, `Status`, và cặp ngày `(StartTime, EndTime)`.
* `Computers`: Index trên `Status`, `LabId`.
* `Equipments`: Index trên `CategoryId`.
* `IncidentReports`: Index trên `Status`, `SeverityLevel`, `ComputerId`.
* `MaintenanceSchedules`: Index trên `MaintenanceDate`.

### 2.4. Đảm bảo Transaction cho các nghiệp vụ quan trọng
Khi thực hiện các chuỗi thao tác cập nhật nhiều bảng, phải đặt trong một Database Transaction (mức cô lập `READ COMMITTED` hoặc cao hơn) để tránh lỗi dữ liệu mồ côi:
* **Duyệt đăng ký (Approve)**: Cập nhật trạng thái Booking sang `APPROVED` + Cập nhật số lượng thiết bị khả dụng trong kho.
* **Mượn/Trả thiết bị (Check-in/Check-out)**: Cập nhật trạng thái Booking + Cập nhật số lượng thực tế của thiết bị + Tạo bản ghi CheckInOutLogs.

---

## 3. Quy tắc Bảo toàn số lượng thiết bị trong Kho

Đối với bảng `Equipments`, tổng số lượng thiết bị được quản lý qua công thức bất biến:

$$\text{TotalQuantity} = \text{AvailableQuantity} + \text{BorrowedQuantity} + \text{BrokenQuantity}$$

Các quy tắc cập nhật số lượng thiết bị khi có nghiệp vụ phát sinh:
1. **Khi mua mới thiết bị**: Tăng `TotalQuantity` và `AvailableQuantity`.
2. **Khi duyệt mượn thiết bị thành công & người dùng Check-in**:
   * Giảm `AvailableQuantity` một lượng bằng số lượng mượn.
   * Tăng `BorrowedQuantity` tương ứng.
3. **Khi người dùng trả thiết bị (Check-out)**:
   * Giảm `BorrowedQuantity` bằng số lượng trả.
   * Tăng lại `AvailableQuantity` tương ứng.
4. **Khi phát hiện thiết bị hỏng (Incident Report)**:
   * Nếu thiết bị hỏng đang nằm trong kho: Giảm `AvailableQuantity`, tăng `BrokenQuantity`.
   * If thiết bị hỏng khi người dùng đang mượn (phát hiện lúc check-out): Giảm `BorrowedQuantity`, tăng `BrokenQuantity`.
5. **Khi sửa xong thiết bị hỏng**: Giảm `BrokenQuantity`, tăng lại `AvailableQuantity`.
6. **Khi thanh lý thiết bị hỏng hoàn toàn (không sửa được)**: Giảm `BrokenQuantity` và giảm `TotalQuantity`.

> [!IMPORTANT]
> Mọi hành động làm thay đổi `AvailableQuantity`, `BorrowedQuantity`, `BrokenQuantity` phải được thực thi trong một Transaction. Bất kỳ câu lệnh UPDATE nào làm cho `AvailableQuantity < 0` hoặc phá vỡ công thức bất biến trên đều phải bị ROLLBACK ngay lập tức và ném ra lỗi ngoại lệ.
