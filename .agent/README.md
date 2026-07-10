# Hướng Dẫn Sử Dụng Bộ Kỹ Năng .agent (README.md)

Thư mục `.agent` chứa toàn bộ tài liệu hướng dẫn kỹ năng chuyên biệt và các ràng buộc kiến trúc dành riêng cho hệ thống **Website Quản Lý Phòng Lab CNTT**. Bộ kỹ năng này giúp định hướng cho các AI Agent hoặc nhà phát triển tiếp cận dự án một cách nhanh nhất, đảm bảo tính nhất quán của mã nguồn và tính chính xác của các quy tắc nghiệp vụ.

---

## 1. Danh sách và vai trò của các Skill

Dưới đây là tóm tắt các kỹ năng (`skills`) được cấu hình trong dự án:

1. **[clean-architecture-nodejs](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/clean-architecture-nodejs/SKILL.md)**
   * **Vai trò**: Hướng dẫn xây dựng cấu trúc mã nguồn theo mô hình Clean Architecture trong NodeJS.
   * **Nội dung chính**: Phân bổ mã nguồn vào các thư mục `domain`, `application`, `infrastructure`, `presentation` và định hướng dòng phụ thuộc.

2. **[sqlserver-database-design](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/sqlserver-database-design/SKILL.md)**
   * **Vai trò**: Quy định về thiết kế cơ sở dữ liệu trên hệ quản trị SQL Server.
   * **Nội dung chính**: Định nghĩa cấu trúc bảng chính, ràng buộc khóa, chỉ mục (index), giao dịch (transaction) và công thức bảo toàn số lượng thiết bị khả dụng.

3. **[booking-business-rules](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/booking-business-rules/SKILL.md)**
   * **Vai trò**: Định nghĩa và kiểm soát các luật nghiệp vụ liên quan đến việc đặt chỗ phòng Lab và mượn thiết bị.
   * **Nội dung chính**: Các quy tắc chống trùng lịch (overlap), giới hạn sức chứa, điều kiện check-in/check-out và các nghiệp vụ xử lý khi có thiết bị hỏng hóc hoặc trả trễ.

4. **[repository-pattern](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/repository-pattern/SKILL.md)**
   * **Vai trò**: Quy chuẩn hóa việc tương tác dữ liệu thông qua Repository Pattern và Data Mapper.
   * **Nội dung chính**: Tách biệt giao diện truy cập dữ liệu (Interface) khỏi việc thực thi cụ thể trong SQL Server, hướng dẫn map dữ liệu dạng bảng sang thực thể nghiệp vụ (Domain Entities).

5. **[api-controller-validation](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/api-controller-validation/SKILL.md)**
   * **Vai trò**: Hướng dẫn thiết kế và validate API ở Presentation Layer.
   * **Nội dung chính**: Chuẩn hóa Router RESTful, định dạng Request/Response, middleware xác thực, phân quyền và kiểm tra tính hợp lệ đầu vào của dữ liệu.

6. **[test-case-clean-architecture](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/test-case-clean-architecture/SKILL.md)**
   * **Vai trò**: Cấu trúc hệ thống kiểm thử tự động cho toàn dự án.
   * **Nội dung chính**: Phân cấp kiểm thử (Domain, Usecase, Integration, API) và danh sách kịch bản test bắt buộc phải phủ sóng nhằm đảm bảo an toàn cho các nghiệp vụ cốt lõi.

7. **[code-review](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/code-review/SKILL.md)**
   * **Vai trò**: Tiêu chuẩn đánh giá và phê duyệt mã nguồn trước khi tích hợp vào nhánh chính.
   * **Nội dung chính**: Checklist rà soát kiến trúc, hiệu năng, bảo mật và khuôn mẫu báo cáo code review.

---

## 2. Cách Sử Dụng Bộ Hướng Dẫn

Trước khi bắt đầu thực hiện bất kỳ công việc nào, AI Agent cần:
1. Đọc kỹ file hướng dẫn quy tắc chung tại **[AGENTS.md](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/AGENTS.md)**.
2. Xác định các khía cạnh kỹ thuật cần thực thi để đọc các file `SKILL.md` tương ứng.

**Ví dụ thực tế:**
* **Khi triển khai tính năng "Đăng ký mượn thiết bị" (Booking)**: Bạn phải đọc đồng thời hai file kỹ năng:
  * [booking-business-rules](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/booking-business-rules/SKILL.md) để nắm rõ các điều kiện logic nghiệp vụ trùng lịch, số lượng khả dụng.
  * [clean-architecture-nodejs](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/clean-architecture-nodejs/SKILL.md) để biết cách đặt Entities trong Domain và Usecases trong Application.
* **Khi cần thiết kế thêm bảng hoặc tối ưu câu lệnh SQL**: Bạn phải đọc [sqlserver-database-design](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/sqlserver-database-design/SKILL.md).
* **Trước khi gửi pull request hoặc hoàn thành task**: Bạn phải tự rà soát theo checklist trong [code-review](file:///d:/Lac%20Hong/QuanLyPhongLAB/.agent/skills/code-review/SKILL.md).
