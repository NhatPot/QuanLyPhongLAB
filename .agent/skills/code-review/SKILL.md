# Tiêu Chuẩn & Quy Trình Code Review (code-review)

Kỹ năng này hướng dẫn việc thực hiện đánh giá, kiểm duyệt chất lượng mã nguồn (Code Review) trước khi thực hiện hợp nhất (merge) code vào nhánh chính, nhằm đảm bảo kiến trúc Clean Architecture được duy trì tốt và các quy tắc nghiệp vụ không bị vi phạm.

---

## 1. Checklist Rà Soát Mã Nguồn (Code Review Checklist)

Khi tiến hành kiểm tra mã nguồn, người review (hoặc AI Agent) cần rà soát qua các câu hỏi then chốt sau:

### 1.1. Rà soát Kiến trúc & Hướng phụ thuộc
* **[ ] Hướng phụ thuộc (Dependency Direction) đúng chưa?**
  Kiểm tra xem các tầng ngoài có phụ thuộc vào tầng trong hay không. Đảm bảo tầng Domain không import bất kỳ file nào từ Application, Infrastructure hay Presentation.
* **[ ] Controller có chứa nghiệp vụ không?**
  Đảm bảo Controller chỉ làm nhiệm vụ parse HTTP, validate DTO đầu vào, gọi Use Case và trả về response. Mọi tính toán nghiệp vụ phải nằm trong Use Case hoặc Domain.
* **[ ] Use Case có gọi SQL hoặc ORM trực tiếp không?**
  Tuyệt đối không được viết câu truy vấn SQL thô hay gọi các hàm API của thư viện ORM cụ thể trong Use Case. Tất cả phải đi qua interface của Repository.
* **[ ] Domain có phụ thuộc framework/database không?**
  Đảm bảo Domain là các lớp Class thuần túy của JavaScript/TypeScript, không đính kèm các Decorators của ORM hay import các gói Express HTTP.

### 1.2. Rà soát Logic Nghiệp vụ & Dữ liệu
* **[ ] Các luật nghiệp vụ đặt chỗ (Booking Rules) có bị bỏ sót không?**
  Kiểm tra xem Use Case đặt chỗ đã kiểm tra trùng lịch (overlap formula), giới hạn sức chứa phòng Lab, số máy khả dụng và trạng thái ACTIVE của phòng Lab hay chưa.
* **[ ] Các giao dịch dữ liệu (Transactions) có dùng đúng chỗ không?**
  Các luồng duyệt đăng ký, check-in, check-out bắt buộc phải chạy trong transaction để tránh cập nhật số lượng kho thiết bị bị sai lệch khi xảy ra lỗi giữa chừng.
* **[ ] Phân quyền người dùng (Role Permissions) có đúng không?**
  Kiểm tra xem endpoint API đã được bọc bởi đúng `roleMiddleware` tương ứng chưa (ví dụ: tạo máy tính mới phải là ADMIN hoặc TECHNICIAN, duyệt booking không được cho phép STUDENT).
* **[ ] Có AuditLog cho thao tác quan trọng không?**
  Các thao tác làm thay đổi trạng thái dữ liệu (đổi cấu hình Lab, duyệt/từ chối booking, check-in/out, sửa trạng thái máy tính sang BROKEN) phải được lưu vết tự động vào bảng `AuditLogs`.

### 1.3. Rà soát Chất lượng Code & Xử lý lỗi
* **[ ] Có thực hiện xác thực đầu vào (Input Validation) không?**
  Đảm bảo mọi API Request đầu vào đều được xác thực định dạng, kiểu dữ liệu, giới hạn độ dài thông qua middleware validation (ví dụ dùng Zod hoặc Joi) trước khi đi vào controller.
* **[ ] Có xử lý lỗi rõ ràng không?**
  Tuyệt đối không để xảy ra trường hợp bắt lỗi chung chung `catch(e) {}` rồi im lặng hoặc quăng lỗi thô từ SQL Server ra client làm rò rỉ cấu trúc hệ thống. Mọi lỗi phải được map về dạng Business Error có định danh mã lỗi rõ ràng.
* **[ ] Có bị trùng lặp logic (Duplicate Logic) không?**
  Các logic tính toán ngày trùng, định dạng chuỗi, map dữ liệu nên được đóng gói vào các helper, domain service hoặc shared util dùng chung.

---

## 2. Định Dạng Báo Cáo Code Review

Khi thực hiện review một pull request hoặc một file code, kết quả rà soát phải được trình bày rõ ràng dưới dạng bảng theo cấu trúc sau để lập trình viên dễ dàng theo dõi và chỉnh sửa:

| Vấn đề phát hiện | Mức độ nghiêm trọng | File liên quan | Gợi ý cách sửa đổi | Có nên sửa ngay không? |
| :--- | :--- | :--- | :--- | :--- |
| *Ví dụ: Viết câu lệnh UPDATE database trực tiếp trong controller* | **Critical (Nghiêm trọng)** | `src/presentation/http/controllers/booking.controller.ts#L24-L32` | Chuyển logic cập nhật SQL này vào một Repository implementation mới và gọi qua `ApproveBookingUseCase`. | **Bắt buộc sửa ngay** |
| *Ví dụ: Thiếu ghi nhận Audit Log khi thay đổi thông số phòng Lab* | **Major (Cao)** | `src/application/usecases/update-lab-profile.usecase.ts` | Gọi `this.auditLogRepository.save(...)` sau khi lưu cấu hình hồ sơ phòng Lab thành công. | **Bắt buộc sửa ngay** |
| *Ví dụ: Đặt tên biến viết tắt khó hiểu `st` và `et`* | **Minor (Thấp)** | `src/domain/entities/booking.ts#L45` | Đổi tên biến thành `startTime` và `endTime` để cải thiện tính dễ đọc của mã nguồn. | *Có thể sửa sau (hoặc sửa ở đợt refactor)* |

---

## 3. Các mức độ nghiêm trọng quy ước
* **Critical**: Lỗi cấu trúc nghiêm trọng (vi phạm hướng phụ thuộc Clean Architecture, rò rỉ SQL trong controller) hoặc lỗi bảo mật nghiêm trọng (thiếu phân quyền). Pull Request bắt buộc bị từ chối (Block).
* **Major**: Sai lệch logic nghiệp vụ hoặc thiếu transaction ở các tác vụ quan trọng, thiếu validate input đầu vào. Cần phải sửa trước khi merge.
* **Minor**: Các lỗi nhỏ về cách đặt tên, tối ưu code chưa tới mức gây lỗi, thiếu comment hướng dẫn. Lập trình viên có thể cân nhắc sửa đổi hoặc note lại để chỉnh sửa sau.
