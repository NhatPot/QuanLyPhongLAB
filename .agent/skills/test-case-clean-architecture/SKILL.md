# Hướng Dẫn Thiết Kế Kiểm Thử (test-case-clean-architecture)

Kỹ năng này định nghĩa cấu trúc và danh sách các kịch bản kiểm thử (Test Cases) bắt buộc nhằm đảm bảo logic nghiệp vụ của phòng Lab hoạt động chính xác trước khi đưa mã nguồn lên production.

---

## 1. Phân cấp kiểm thử (Testing Strategy)

Viết test được chia làm 4 cấp độ tương ứng với Clean Architecture, giúp cô lập lỗi nhanh chóng:

### 1.1. Domain Unit Test
* **Mục tiêu**: Kiểm tra các logic tính toán và quy tắc nghiệp vụ khép kín bên trong các Entities và Value Objects.
* **Đặc điểm**: Tốc độ chạy cực nhanh, sử dụng các đối tượng giả lập hoàn toàn bằng bộ nhớ, không kết nối DB, không gọi mạng.
* **Ví dụ**: Test phương thức `BookingRequest.canCheckIn(currentTime)` để xem thực thể có tự chặn check-in sai giờ hay không.

### 1.2. Application Use Case Test
* **Mục tiêu**: Kiểm tra luồng xử lý (workflow) của Use Case khi tương tác với các Interfaces của Repository và Services.
* **Đặc điểm**: Sử dụng các Mock Repository (ví dụ sử dụng thư viện Jest Mock hoặc các lớp giả lập Repository in-memory: `InMemoryBookingRepository`).
* **Ví dụ**: Test `CreateBookingUseCase` xem nó có gọi đúng hàm kiểm tra trùng lịch và gọi hàm `bookingRepo.save()` khi dữ liệu hợp lệ hay không.

### 1.3. Infrastructure Integration Test
* **Mục tiêu**: Kiểm tra khả năng tích hợp thực tế giữa mã nguồn và SQL Server, đảm bảo các câu lệnh SQL viết đúng cú pháp và lưu trữ đúng cấu trúc.
* **Đặc điểm**: Chạy thử nghiệm trên một cơ sở dữ liệu Test riêng biệt (hoặc sử dụng LocalDB/Docker SQL Server), thực hiện rollback dữ liệu sau mỗi lượt test.
* **Ví dụ**: Test `SqlServerBookingRepository.save()` có lưu chính xác thông tin đăng ký xuống bảng `BookingRequests` hay không.

### 1.4. API Endpoint Test (E2E/Presentation Test)
* **Mục tiêu**: Kiểm tra luồng đi từ client qua Router, Middleware (Auth, Validation) đến Controller và trả về JSON Response.
* **Đặc điểm**: Sử dụng các công cụ như `Supertest` để tạo các HTTP request giả lập gửi tới Express Application.
* **Ví dụ**: Gửi HTTP POST lên `/api/bookings` với token Sinh viên hợp lệ và kiểm tra xem nhận lại HTTP Status 201 cùng cấu trúc dữ liệu JSON chuẩn hay không.

---

## 2. Danh sách các Test Cases Nghiệp vụ Bắt buộc

Các kịch bản dưới đây bắt buộc phải được lập trình kiểm thử tự động, đặc biệt ở tầng Use Case và API:

### 2.1. Đăng ký sử dụng phòng Lab (Booking)
* **TC-01: Tạo booking hợp lệ**
  * *Điều kiện đầu vào*: Dữ liệu gửi lên không trùng lịch, số người ít hơn sức chứa, số máy và thiết bị yêu cầu nhỏ hơn số lượng khả dụng thực tế.
  * *Kết quả mong muốn*: Đăng ký thành công, trạng thái booking là `PENDING`, các thiết bị trong giỏ hàng mượn đều được ghi nhận đúng.
* **TC-02: Tạo booking trùng lịch (Overlapping)**
  * *Điều kiện đầu vào*: Có một booking đã `APPROVED` trong khoảng thời gian 08:00 - 10:00. Thực hiện tạo booking mới từ 09:00 - 11:00.
  * *Kết quả mong muốn*: Giao dịch thất bại, hệ thống báo lỗi trùng lịch `BOOKING_OVERLAPPING`.
* **TC-03: Tạo booking vượt quá sức chứa**
  * *Điều kiện đầu vào*: Phòng Lab cấu hình sức chứa tối đa là 40 người. Gửi yêu cầu đăng ký cho 45 người.
  * *Kết quả mong muốn*: Thất bại, trả về lỗi vượt quá sức chứa `CAPACITY_EXCEEDED`.
* **TC-04: Đăng ký vượt quá số lượng máy tính khả dụng**
  * *Điều kiện đầu vào*: Phòng Lab chỉ có 30 máy tính đang hoạt động (`ACTIVE`). Gửi yêu cầu đặt sử dụng 35 máy tính.
  * *Kết quả mong muốn*: Thất bại, trả về lỗi không đủ máy tính hoạt động `INSUFFICIENT_COMPUTERS`.

### 2.2. Yêu cầu mượn thiết bị
* **TC-05: Mượn thiết bị vượt quá số lượng khả dụng**
  * *Điều kiện đầu vào*: Kho chỉ còn 2 Micro khả dụng (`AvailableQuantity = 2`). Tạo booking yêu cầu mượn 3 Micro.
  * *Kết quả mong muốn*: Thất bại, trả về lỗi không đủ thiết bị `INSUFFICIENT_EQUIPMENT`.
* **TC-06: Duyệt booking khi thiết bị không còn đủ**
  * *Điều kiện đầu vào*: Booking A đăng ký mượn 2 thiết bị X khi đang ở trạng thái `PENDING`. Trước đó Booking B đã check-in và mượn mất hết thiết bị X trong kho khiến `AvailableQuantity = 0`. Tiến hành duyệt Booking A.
  * *Kết quả mong muốn*: Từ chối duyệt, thông báo thiết bị mượn kèm không còn đủ khả dụng thực tế tại thời điểm duyệt.

### 2.3. Quy trình Check-in và Check-out
* **TC-07: Check-in booking chưa được phê duyệt (APPROVED)**
  * *Điều kiện đầu vào*: Gửi yêu cầu check-in cho một Booking đang ở trạng thái `PENDING` hoặc `REJECTED`.
  * *Kết quả mong muốn*: Thất bại, trả về lỗi yêu cầu chưa được phê duyệt `BOOKING_NOT_APPROVED`.
* **TC-08: Check-out phát sinh sự cố hỏng hóc**
  * *Điều kiện đầu vào*: Thực hiện check-out cho booking đang sử dụng. Kỹ thuật viên báo cáo có 1 máy tính bị hỏng màn hình.
  * *Kết quả mong muốn*: Check-out thành công. Một `IncidentReport` được tự động tạo mới liên kết với máy tính đó. Trạng thái máy tính chuyển sang `BROKEN`. Số lượng thiết bị hỏng được cập nhật đúng trong database.
* **TC-09: Check-out trễ giờ (Overdue)**
  * *Điều kiện đầu vào*: Một booking có thời gian kết thúc lúc 17:00. Hiện tại là 18:00 nhưng người dùng vẫn chưa check-out. Hệ thống hoặc quản trị viên thực hiện quét trễ.
  * *Kết quả mong muốn*: Booking được chuyển sang trạng thái `OVERDUE` để ghi nhận phạt, sau đó thực hiện trả trễ thì phục hồi kho thiết bị và đổi trạng thái sang `CHECKED_OUT`.

---

## 3. Nguyên tắc kiểm thử quan trọng

> [!IMPORTANT]
> **Nghiệp vụ đi trước, giao diện đi sau**: 
> Tuyệt đối không kiểm thử nghiệp vụ chỉ bằng các thao tác click chuột trên UI (E2E UI Test) làm cốt lõi. Mọi logic nghiệp vụ bắt buộc phải được đảm bảo bằng Unit Test ở tầng Domain và Use Case Test ở tầng Application trước. UI chỉ là lớp hiển thị và không được phép chứa logic kiểm soát nghiệp vụ.
