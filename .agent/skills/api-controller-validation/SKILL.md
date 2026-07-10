# Chuẩn Hóa API Controller & Request Validation (api-controller-validation)

Kỹ năng này hướng dẫn xây dựng tầng Presentation (cụ thể là HTTP API Controllers và Middleware) để tiếp nhận, xác thực dữ liệu đầu vào và chuyển tiếp công việc tới tầng xử lý nghiệp vụ.

---

## 1. Vai trò duy nhất của Controller

API Controller đóng vai trò là ranh giới tiếp nhận yêu cầu từ client. Nó phải tuân thủ nghiêm ngặt nguyên tắc **"Slim Controllers"** (Controller mỏng):

```typescript
// Ví dụ minh họa một Controller chuẩn
export class BookingController {
  constructor(private createBookingUseCase: CreateBookingUseCase) {}

  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Nhận dữ liệu và validate định dạng đầu vào (ví dụ đã qua Joi/Zod middleware)
      const dto: CreateBookingDTO = req.body;

      // 2. Chuyển tiếp công việc cho Use Case xử lý
      const result = await this.createBookingUseCase.execute(dto);

      // 3. Trả về response dựa trên kết quả của Use Case
      if (result.isSuccess) {
        res.status(201).json(ApiResponse.success(result.getValue()));
      } else {
        res.status(400).json(ApiResponse.error(result.getError()));
      }
    } catch (error) {
      next(error); // Chuyển cho Error Handler Middleware
    }
  }
}
```

> [!WARNING]
> Tuyệt đối không viết code kết nối database, không tự tính toán ngày tháng overlap, không kiểm tra quyền bằng cách truy vấn database thô ngay trong Controller. Tất cả các logic này thuộc về Application Use Case hoặc Domain.

---

## 2. API Routes RESTful đề xuất

Để đảm bảo tính nhất quán của hệ thống API, hãy sử dụng các endpoint sau:

### 2.1. Xác thực & Tài khoản
* `POST /api/auth/login` - Đăng nhập hệ thống (Sinh JWT Token).
* `GET /api/auth/me` - Lấy thông tin cá nhân của token hiện tại.

### 2.2. Hồ sơ Phòng Lab duy nhất
* `GET /api/lab-profile` - Xem thông tin cấu hình phòng Lab (Sức chứa, quy định...).
* `PUT /api/lab-profile` - Cập nhật cấu hình phòng Lab (Chỉ Admin).

### 2.3. Quản lý Máy tính
* `GET /api/computers` - Danh sách máy tính (Hỗ trợ lọc theo trạng thái).
* `POST /api/computers` - Thêm máy tính mới (Chỉ Kỹ thuật viên / Admin).

### 2.4. Quản lý Thiết bị tài sản
* `GET /api/equipments` - Xem danh sách vật tư thiết bị trong kho.
* `POST /api/equipments` - Nhập thêm/Thêm mới thiết bị vào kho (Chỉ Admin).

### 2.5. Nghiệp vụ Booking & Quá trình sử dụng
* `POST /api/bookings` - Tạo yêu cầu đăng ký sử dụng phòng Lab/thiết bị (Sinh viên, Giảng viên).
* `POST /api/bookings/:id/approve` - Phê duyệt yêu cầu (Admin / Kỹ thuật viên).
* `POST /api/bookings/:id/reject` - Từ chối yêu cầu kèm lý do từ chối (Admin / Kỹ thuật viên).
* `POST /api/bookings/:id/check-in` - Xác nhận vào phòng Lab, bắt đầu mượn đồ (Kỹ thuật viên thực hiện quét/xác nhận).
* `POST /api/bookings/:id/check-out` - Xác nhận ra phòng Lab và kiểm kê trả đồ (Kỹ thuật viên thực hiện).

### 2.6. Thống kê & Giám sát
* `GET /api/dashboard/overview` - Xem số liệu tổng hợp (Số máy hỏng, số lượt mượn hôm nay, trạng thái phòng...).

---

## 3. Cấu trúc Response chuẩn

Mọi API trả về cho client cần thống nhất một cấu trúc JSON duy nhất để Frontend dễ dàng xử lý lỗi và hiển thị thông báo.

### 3.1. Response thành công (Success HTTP Status 200/201)
```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {
    "id": 123,
    "status": "APPROVED"
  }
}
```

### 3.2. Response thất bại do nghiệp vụ hoặc dữ liệu gửi lên sai (Bad Request HTTP Status 400)
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAPPING",
    "message": "Phòng Lab đã có lịch đăng ký trùng với khoảng thời gian bạn chọn.",
    "details": null
  }
}
```

### 3.3. Response lỗi hệ thống không mong muốn (Internal Server Error HTTP Status 500)
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau.",
    "details": null
  }
}
```

---

## 4. Xác thực & Phân quyền (Middlewares)

Hệ thống bảo mật API thông qua hai middleware chính:

### 4.1. AuthMiddleware (`authMiddleware`)
* Trích xuất JWT Token từ header `Authorization: Bearer <token>`.
* Giải mã token, kiểm tra tính hợp lệ và thời hạn.
* Nếu hợp lệ, lưu thông tin định danh người dùng vào `req.user` và chuyển tiếp sang hàm tiếp theo.
* Nếu không hợp lệ hoặc thiếu token, trả về mã lỗi HTTP `401 Unauthorized`.

### 4.2. RoleMiddleware (`roleMiddleware([...allowedRoles])`)
* Đứng sau `authMiddleware`.
* Kiểm tra thuộc tính `req.user.role` xem có nằm trong danh sách các vai trò được phép truy cập (`allowedRoles`) hay không.
* Nếu thỏa mãn, cho phép thực thi tiếp.
* Nếu không thỏa mãn, trả về mã lỗi HTTP `403 Forbidden` (Không đủ quyền truy cập).
* Ví dụ áp dụng:
  ```typescript
  router.put('/api/lab-profile', authMiddleware, roleMiddleware(['ADMIN']), labController.updateProfile);
  ```
