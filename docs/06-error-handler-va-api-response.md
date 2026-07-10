# 06 — Error Handler và API Response chuẩn

## Mục tiêu

Chuẩn hóa lỗi, response, validation, logging và correlation ID trước khi xây Auth và CRUD.

Đọc trước:

- `.agent/skills/api-controller-validation/SKILL.md`
- `.agent/skills/code-review/SKILL.md`
- `docs/03-tao-khung-clean-architecture.md`

---

## 1. Response thành công

```json
{
  "success": true,
  "message": "Thao tác thành công",
  "data": {},
  "meta": null
}
```

Danh sách có phân trang:

```json
{
  "success": true,
  "message": "Lấy dữ liệu thành công",
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 100,
    "totalPages": 5
  }
}
```

---

## 2. Response lỗi

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAPPING",
    "message": "Khung giờ đã có lịch sử dụng.",
    "details": null,
    "correlationId": "..."
  }
}
```

Không trả:

- Stack trace.
- SQL query.
- Tên server/database.
- Password/token.
- Nội dung exception thô.

---

## 3. Error class

Tạo:

```text
AppError
ValidationError
UnauthorizedError
ForbiddenError
NotFoundError
ConflictError
BusinessRuleError
InfrastructureError
```

Thuộc tính:

```text
code
message
httpStatus
details
isOperational
```

Domain error không biết HTTP status. Mapping sang HTTP nằm ở Presentation.

---

## 4. HTTP mapping

```text
Validation       → 400
Unauthorized     → 401
Forbidden        → 403
NotFound         → 404
Conflict         → 409
Business rule    → 422 hoặc 409 tùy loại
Unexpected       → 500
```

Dùng thống nhất.

---

## 5. Mã lỗi nền tảng

```text
VALIDATION_ERROR
UNAUTHORIZED
TOKEN_EXPIRED
FORBIDDEN
RESOURCE_NOT_FOUND
DUPLICATE_RESOURCE
INTERNAL_SERVER_ERROR
DATABASE_UNAVAILABLE
```

Mã nghiệp vụ sẽ được bổ sung theo module.

---

## 6. Middleware

Tạo:

```text
correlationIdMiddleware
requestLoggerMiddleware
notFoundMiddleware
errorHandlerMiddleware
validateRequestMiddleware
```

Thứ tự:

```text
correlation
→ request logging
→ JSON parser
→ routes
→ 404
→ error handler
```

---

## 7. Validation

Zod schema đặt trong Presentation.

Validate:

- `params`.
- `query`.
- `body`.

Sau validation, controller nhận dữ liệu đã parse. Không truyền `req.body` chưa kiểm tra vào use case.

---

## 8. Logging

Log phải có:

```text
timestamp
level
message
correlationId
method
path
statusCode
duration
userId nếu có
```

Không log:

- Password.
- Access token.
- Refresh token.
- PasswordHash.
- Body chứa bí mật.

---

## 9. API presenter

Tạo helper/presenter:

```text
ApiResponse.success
ApiResponse.created
ApiResponse.paginated
ApiResponse.error
```

Không để controller tự tạo nhiều format JSON khác nhau.

---

## 10. Test

- 404 trả đúng format.
- Zod validation trả 400.
- AppError map đúng status.
- Unexpected error trả 500 nhưng không lộ stack.
- Correlation ID xuất hiện ở response lỗi và log.
- Controller mỏng.

---

## Tiêu chí hoàn thành bước 06

- Mọi API dùng một format.
- Lỗi không lộ nội bộ.
- Có validation middleware.
- Có logging và correlation ID.
- Health endpoint được cập nhật theo response chuẩn.
