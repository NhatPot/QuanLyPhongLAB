# Hướng Dẫn Dành Cho AI Agent (AGENTS.md)

Chào mừng bạn đến với dự án **Website Quản Lý Phòng Lab CNTT**. Tệp tài liệu này định nghĩa các nguyên tắc phát triển và quy tắc bắt buộc mà mọi AI Agent phải tuân thủ nghiêm ngặt khi làm việc trên kho lưu trữ (repository) này.

---

## 1. Mô tả dự án

Dự án này là hệ thống **Website Quản Lý một Phòng Lab CNTT duy nhất** (không quản lý nhiều phòng Lab, chỉ tập trung tối ưu hóa quy trình cho một phòng Lab duy nhất của Khoa/Trường).

Các nghiệp vụ cốt lõi bao gồm:
* Đăng nhập và phân quyền (Admin, Giảng viên, Kỹ thuật viên, Sinh viên...).
* Cấu hình thông tin phòng Lab duy nhất (Sức chứa, Quy định, Giờ mở cửa...).
* Quản lý tài sản (Máy tính, Thiết bị ngoại vi).
* Đăng ký sử dụng phòng Lab, đăng ký số lượng máy tính, đăng ký mượn thiết bị đi kèm.
* Phê duyệt hoặc từ chối các yêu cầu đăng ký sử dụng/mượn.
* Quản lý check-in / check-out của người dùng khi vào/ra phòng Lab.
* Báo cáo sự cố (hỏng hóc máy tính, thiết bị) và lịch bảo trì thiết bị.
* Dashboard thống kê và Audit Log lưu vết hoạt động hệ thống.

---

## 2. Quy tắc bắt buộc khi làm việc trong Repo

Khi thực hiện bất kỳ nhiệm vụ nào trong dự án, bạn phải tuân thủ các quy tắc sau:

### 2.1. Luôn ưu tiên kiến trúc Clean Architecture
Kiến trúc của Backend được chia làm 4 tầng chính với dòng phụ thuộc một chiều hướng vào trong (Tất cả các tầng ngoài đều phụ thuộc vào tầng trong, tầng trong cùng không phụ thuộc vào bất kỳ công nghệ hay framework nào bên ngoài):
* **Domain Layer** (Tầng cốt lõi): Chứa các thực thể (Entities), Value Objects, Domain Services và các luật nghiệp vụ cốt lõi (Business Rules). Tầng này **TUYỆT ĐỐI KHÔNG** được phép phụ thuộc vào bất kỳ thư viện ngoài nào như Express, SQL Server, ORM (Prisma/Sequelize/TypeORM), HTTP client hay bất kỳ framework nào.
* **Application Layer**: Chứa các Use Case (Workflow xử lý nghiệp vụ). Tầng này chỉ gọi các Repository Interface hoặc Ports được định nghĩa sẵn, không gọi trực tiếp các triển khai cụ thể (Implementation).
* **Infrastructure Layer**: Chịu trách nhiệm cấu hình kết nối database SQL Server, cài đặt các Repository Implementation, tích hợp dịch vụ bên thứ ba (Auth, Email, File Storage, Logger...).
* **Presentation Layer**: Chịu trách nhiệm giao tiếp với người dùng và hệ thống ngoài, bao gồm các API Controllers, Routes, Middleware, Request Validation (nhận Express Request, validate dữ liệu đầu vào và chuyển đổi sang dạng DTO cho Use Case).

### 2.2. Không viết logic nghiệp vụ trong Controller
* Presentation Layer (Controller) chỉ làm nhiệm vụ nhận request, validate định dạng dữ liệu đầu vào, gọi Use Case tương ứng và định dạng kết quả trả về (JSON Response). 
* Không viết bất kỳ câu lệnh SQL, truy vấn database hay logic tính toán nghiệp vụ nào tại Controller hay Router.

### 2.3. Bắt buộc đọc Kỹ năng tương ứng (Skills)
Trước khi làm việc ở bất kỳ module nào, bạn phải đọc tệp `SKILL.md` tương ứng trong thư mục `.agent/skills/`. Việc đọc skill giúp bạn nắm rõ các business rules và cách cài đặt mẫu của module đó:
* Làm cấu trúc thư mục & luồng dữ liệu -> Đọc [clean-architecture-nodejs](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/clean-architecture-nodejs/SKILL.md)
* Thiết kế database & viết script SQL Server -> Đọc [sqlserver-database-design](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/sqlserver-database-design/SKILL.md)
* Xử lý nghiệp vụ đăng ký/mượn thiết bị -> Đọc [booking-business-rules](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/booking-business-rules/SKILL.md)
* Triển khai Repository Pattern & Data Mapper -> Đọc [repository-pattern](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/repository-pattern/SKILL.md)
* Xây dựng API endpoint và Validate DTO -> Đọc [api-controller-validation](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/api-controller-validation/SKILL.md)
* Viết kịch bản kiểm thử (Test Cases) -> Đọc [test-case-clean-architecture](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/test-case-clean-architecture/SKILL.md)
* Kiểm tra và đánh giá code trước khi commit -> Đọc [code-review](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/code-review/SKILL.md)

### 2.4. Ứng phó khi nghiệp vụ không rõ ràng
* Khi phát hiện thông tin nghiệp vụ chưa rõ ràng hoặc thiếu thông số thiết kế, bạn **không được tự ý đoán bừa** để code.
* Bạn phải liệt kê các phương án giả định khả thi nhất, ghi rõ ưu/nhược điểm từng phương án, và đặt câu hỏi trực tiếp cho User để thống nhất thiết kế trước khi bắt tay vào triển khai.

### 2.5. Giới hạn phạm vi thay đổi file
* Chỉ chỉnh sửa các file thuộc phạm vi task được giao.
* Không tự ý xóa, sửa hoặc cấu trúc lại các tệp tin ngoài phạm vi mô tả của task mà không có sự đồng ý rõ ràng của User.
