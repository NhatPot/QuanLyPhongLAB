# Quy Tắc Nghiệp Vụ Đăng Ký Phòng Lab (booking-business-rules)

Kỹ năng này định nghĩa toàn bộ các quy tắc nghiệp vụ cốt lõi (Business Rules) liên quan đến việc đặt chỗ phòng Lab, đăng ký máy tính và mượn thiết bị. Đây là phần logic quan trọng nhất của hệ thống, bắt buộc phải được triển khai ở tầng Domain/Application.

---

## 1. Các Quy Tắc Nghiệp Vụ Bắt Buộc

### 1.1. Ràng buộc về Phòng Lab duy nhất
* Hệ thống chỉ quản lý **một phòng Lab duy nhất**. Do đó, giao diện và API đăng ký sử dụng không yêu cầu người dùng phải chọn phòng Lab nào. Hệ thống sẽ tự động liên kết yêu cầu với phòng Lab duy nhất có trong `LabProfile`.
* Phòng Lab phải ở trạng thái `ACTIVE` mới cho phép đăng ký mới. Nếu phòng Lab ở trạng thái `INACTIVE` (ví dụ: đang đóng cửa sửa chữa tổng thể), mọi yêu cầu đăng ký mới của Giảng viên/Sinh viên đều bị từ chối thẳng thừng, ngoại trừ quyền của Admin/Kỹ thuật viên đối với các công việc nội bộ.

### 1.2. Tính hợp lệ về Thời gian & Sức chứa
* Thời gian đăng ký sử dụng bắt buộc phải thỏa mãn: `StartTime < EndTime` và thời gian bắt đầu phải lớn hơn thời gian hiện tại (không đăng ký lùi ngày).
* Số lượng người tham gia dự kiến (`ExpectedAttendees`) không được phép vượt quá sức chứa tối đa của phòng Lab được cấu hình trong `LabProfile`.

### 1.3. Khả dụng về Máy tính & Thiết bị mượn kèm
* Số lượng máy tính đăng ký sử dụng (`RequestedComputersCount`) không được vượt quá số lượng máy tính đang hoạt động bình thường trong phòng Lab (các máy có trạng thái `ACTIVE`).
* Thiết bị mượn kèm (đăng ký qua `BookingEquipmentItems`) không được mượn vượt quá số lượng khả dụng (`AvailableQuantity`) hiện tại trong kho của thiết bị đó.
* Tuyệt đối không cho phép mượn các thiết bị/máy tính có trạng thái hỏng hóc, đang bảo trì hoặc bị khóa (`BROKEN`, `MAINTENANCE`, `LOCKED`, `LOST`).

### 1.4. Quy tắc chống Trùng lịch (Overlapping Bookings)
Một yêu cầu đăng ký mới chỉ được phê duyệt khi không bị trùng lịch với bất kỳ yêu cầu đăng ký nào khác đã được duyệt (`APPROVED`) hoặc đang diễn ra (`CHECKED_IN`).
* Hai khoảng thời gian đăng ký $A = [Start_A, End_A]$ và $B = [Start_B, End_B]$ bị coi là **trùng lịch (overlap)** khi và chỉ khi:
  
  $$\text{newStart} < \text{existingEnd} \quad \text{AND} \quad \text{newEnd} > \text{existingStart}$$

* Nếu phát hiện trùng lịch và phòng Lab đã đạt giới hạn sức chứa hoạt động hoặc vượt quá tổng số máy tính khả dụng trong khoảng thời gian trùng nhau đó, yêu cầu đăng ký mới sẽ không được chấp nhận.

### 1.5. Ràng buộc sửa đổi thông tin
* Khi yêu cầu đăng ký đã được thực hiện check-in (`CHECKED_IN`), thông tin đăng ký (thời gian, danh sách thiết bị mượn...) **không được phép sửa đổi** bởi người dùng thường, chỉ duy nhất Admin hoặc Kỹ thuật viên quản lý phòng mới có quyền điều chỉnh trong các trường hợp đặc biệt.

### 1.6. Quy trình Check-in và Check-out
* **Check-in**:
  * Chỉ cho phép thực hiện Check-in đối với các Booking có trạng thái `APPROVED`.
  * Thời gian Check-in thực tế phải nằm trong khoảng thời gian cho phép (ví dụ: từ 15 phút trước giờ bắt đầu đến trước khi kết thúc booking).
  * Chuyển trạng thái Booking sang `CHECKED_IN` và cập nhật trừ kho thiết bị (`AvailableQuantity` giảm, `BorrowedQuantity` tăng).
* **Check-out**:
  * Chỉ thực hiện đối với các Booking đang ở trạng thái `CHECKED_IN`.
  * Chuyển trạng thái Booking sang `CHECKED_OUT`.
  * Trả lại thiết bị về kho (`AvailableQuantity` tăng, `BorrowedQuantity` giảm).
  * **Xử lý sự cố**: Khi Check-out, nếu có phát hiện hỏng hóc hoặc mất mát thiết bị/máy tính, hệ thống **bắt buộc** yêu cầu Kỹ thuật viên/Người kiểm tra tạo một `IncidentReport` liên kết trực tiếp với Booking đó. Khi đó, số lượng thiết bị hỏng sẽ được chuyển từ `BorrowedQuantity` sang `BrokenQuantity` thay vì trả lại `AvailableQuantity`.
  * **Trễ giờ (Overdue)**: Nếu thời gian thực tế hiện tại vượt quá `EndTime` của Booking quá thời gian quy định (ví dụ: quá 30 phút) mà chưa thực hiện Check-out, hệ thống sẽ tự động hoặc cho phép Kỹ thuật viên cập nhật trạng thái Booking sang `OVERDUE` và ghi nhận lịch sử phạt hoặc cảnh cáo người dùng.

---

## 2. Checklist cho các Use Case chính

### 2.1. CreateBookingUseCase
* [ ] Kiểm tra phòng Lab duy nhất có đang `ACTIVE` không.
* [ ] Kiểm tra `StartTime < EndTime`.
* [ ] Kiểm tra số người tham gia dự kiến có vượt quá sức chứa phòng Lab không.
* [ ] Kiểm tra số lượng máy tính yêu cầu có vượt quá số máy ACTIVE trong phòng không.
* [ ] Với mỗi thiết bị mượn kèm: Kiểm tra xem thiết bị đó có tồn tại, có đủ `AvailableQuantity` không.
* [ ] Kiểm tra trùng lịch sử dụng phòng Lab bằng công thức Overlap.
* [ ] Khởi tạo BookingRequest với trạng thái ban đầu là `PENDING`.

### 2.2. ApproveBookingUseCase
* [ ] Chỉ Admin hoặc Kỹ thuật viên được phép thực hiện.
* [ ] Xác nhận Booking hiện tại đang ở trạng thái `PENDING`.
* [ ] Kiểm tra lại một lần nữa tính khả dụng của máy tính và thiết bị tại thời điểm duyệt (tránh trường hợp thiết bị bị hỏng hoặc đã duyệt cho bên khác trước đó).
* [ ] Chuyển trạng thái sang `APPROVED`.

### 2.3. RejectBookingUseCase
* [ ] Xác nhận Booking hiện tại đang ở trạng thái `PENDING`.
* [ ] Yêu cầu bắt buộc phải truyền vào lý do từ chối (`RejectionReason`).
* [ ] Chuyển trạng thái sang `REJECTED`.

### 2.4. CancelBookingUseCase
* [ ] Người tạo booking hoặc Admin mới được phép hủy.
* [ ] Chỉ cho phép hủy khi trạng thái là `PENDING` hoặc `APPROVED` (chưa Check-in).
* [ ] Chuyển trạng thái sang `CANCELLED`. Nếu trạng thái trước đó là `APPROVED`, giải phóng các giữ chỗ thiết bị nếu có.

### 2.5. CheckInBookingUseCase
* [ ] Xác nhận trạng thái Booking là `APPROVED`.
* [ ] Kiểm tra thời gian thực tế có hợp lệ để check-in hay không.
* [ ] Thực hiện Transaction: Cập nhật trạng thái Booking sang `CHECKED_IN` + Ghi nhận CheckInTime + Ghi nhận CheckInOutLogs + Chuyển đổi số lượng thiết bị mượn từ khả dụng sang đang mượn.

### 2.6. CheckOutBookingUseCase
* [ ] Xác nhận trạng thái Booking là `CHECKED_IN` hoặc `OVERDUE`.
* [ ] Lấy danh sách thiết bị mượn thực tế.
* [ ] Nếu có báo cáo sự cố thiết bị/máy tính hỏng:
  * Tạo bản ghi `IncidentReport` tương ứng với thiết bị/máy tính đó.
  * Trong Transaction: Giảm `BorrowedQuantity`, tăng `BrokenQuantity` cho thiết bị hỏng đó.
  * Các thiết bị bình thường: Giảm `BorrowedQuantity`, tăng lại `AvailableQuantity`.
* [ ] Nếu không có sự cố: Trả toàn bộ thiết bị về kho (`AvailableQuantity` phục hồi).
* [ ] Cập nhật trạng thái Booking sang `CHECKED_OUT` + Ghi nhận CheckOutTime + Ghi nhận CheckInOutLogs.
