# 07 — Authentication: Login, Current User và Authorization

## Mục tiêu

Xây Auth hoàn chỉnh cho MVP, gồm đăng nhập, phiên refresh token, logout, current user và permission middleware.

Đọc trước:

- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `docs/05-seed-roles-permissions-admin.md`
- `docs/06-error-handler-va-api-response.md`

---

## 1. Use case

```text
LoginUseCase
RefreshSessionUseCase
LogoutUseCase
GetCurrentUserUseCase
ChangePasswordUseCase
```

---

## 2. Ports

```text
IPasswordHasher
IAccessTokenService
IRefreshTokenService
IAuthSessionRepository
IUserRepository
IRolePermissionQuery
IClock
IUnitOfWork
IAuditLogRepository
```

Infrastructure implement bằng JWT, password hash và SQL Server.

---

## 3. Login

Endpoint:

```text
POST /api/auth/login
```

Input:

```json
{
  "identifier": "admin hoặc admin@example.edu.vn",
  "password": "..."
}
```

Luồng:

1. Normalize identifier.
2. Tìm user theo username hoặc email.
3. Kiểm tra status.
4. Verify password.
5. Lấy role và permission.
6. Tạo access token ngắn hạn.
7. Tạo refresh token ngẫu nhiên.
8. Lưu hash refresh token vào `AuthSessions`.
9. Set cookie HTTP-only, Secure ở production, SameSite phù hợp.
10. Cập nhật `LastLoginAt`.
11. Ghi audit login success/failure có kiểm soát.

Không phân biệt lỗi “user không tồn tại” và “sai mật khẩu” ở response.

---

## 4. Current user

Endpoint:

```text
GET /api/auth/me
```

Response không chứa dữ liệu bí mật:

```json
{
  "id": "...",
  "fullName": "...",
  "email": "...",
  "username": "...",
  "roles": ["ADMIN"],
  "permissions": ["..."],
  "mustChangePassword": true
}
```

---

## 5. Refresh và logout

```text
POST /api/auth/refresh
POST /api/auth/logout
```

Refresh:

- Đọc cookie.
- Hash token và tìm session.
- Kiểm tra hết hạn/revoked.
- Rotate refresh token.
- Revoke session cũ hoặc cập nhật an toàn.

Logout:

- Revoke session.
- Xóa cookie.
- Idempotent.

---

## 6. Change password

```text
POST /api/auth/change-password
```

Yêu cầu:

- Xác thực mật khẩu hiện tại.
- Chính sách độ dài hợp lý.
- Không log password.
- Revoke các session khác sau khi đổi.
- `MustChangePassword = 0`.
- Ghi AuditLog.

---

## 7. Middleware

### authMiddleware

- Đọc Bearer access token.
- Verify signature/expiry.
- Gắn `req.user` tối thiểu: userId, roles, permissions.
- Trả 401 nếu thiếu/sai/hết hạn.

### requirePermissions

Ví dụ:

```text
requirePermissions("LAB_PROFILE_UPDATE")
```

Có thể hỗ trợ `allOf` và `anyOf`, nhưng API phải rõ ràng.

Không dùng role string trực tiếp rải rác trong route nếu permission đã tồn tại.

---

## 8. Bảo mật

- Secret từ environment.
- Access token ngắn hạn.
- Refresh token không lưu localStorage.
- Rate limit login.
- Chống brute force cơ bản.
- CORS whitelist.
- Helmet.
- Không trả token trong query string.
- Không log credential.
- So sánh password an toàn.

---

## 9. Test

- Login đúng.
- Login sai password.
- User locked.
- Access token hết hạn.
- Refresh hợp lệ.
- Refresh token revoked.
- Logout.
- Permission đủ/thiếu.
- `/auth/me`.
- Change password.
- PasswordHash không bao giờ xuất hiện.

---

## Tiêu chí hoàn thành bước 07

- Admin seed đăng nhập được.
- Refresh/logout hoạt động.
- 401/403 rõ ràng.
- Middleware dùng permission.
- Frontend có thể lấy current user.
- Test bảo mật cơ bản đạt.
