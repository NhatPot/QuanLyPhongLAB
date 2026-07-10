# 08 — Frontend shell, Login và Layout theo vai trò

## Mục tiêu

Tạo nền frontend bám ảnh giao diện nguồn, kết nối Auth API thật và điều hướng theo role.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `docs/07-auth-login-current-user.md`
- Các ảnh giao diện trong thư mục gốc.

---

## 1. Nguyên tắc UI

Bám tinh thần ảnh nguồn:

- Sidebar navy cố định.
- Logo/tên hệ thống ở đầu sidebar.
- Header trên cùng có breadcrumb, thông báo, tài khoản.
- Nội dung dùng card bo góc và khoảng trắng rõ.
- Bảng có tìm kiếm, lọc, phân trang.
- Badge trạng thái thống nhất.
- Không hard-code dữ liệu demo sau khi API tồn tại.
- Responsive từ 1280px xuống tablet/mobile.
- Có focus state và keyboard navigation.

---

## 2. Design tokens

Tạo trong Tailwind/theme:

```text
primary/navy
primary/blue
background/page
background/card
text/primary
text/muted
border/default
status/success
status/warning
status/danger
status/info
```

Không rải hex code trong component.

---

## 3. Cấu trúc frontend

```text
frontend/src/
├── app/
│   ├── query-client.ts
│   └── providers.tsx
├── components/
│   ├── ui/
│   ├── navigation/
│   ├── feedback/
│   └── data-display/
├── features/
│   └── auth/
├── layouts/
│   ├── AppLayout.tsx
│   ├── AuthLayout.tsx
│   └── RoleSidebar.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── UnauthorizedPage.tsx
│   └── NotFoundPage.tsx
├── routes/
│   ├── router.tsx
│   ├── ProtectedRoute.tsx
│   └── PermissionRoute.tsx
├── services/
│   ├── api-client.ts
│   └── auth-api.ts
└── styles/
```

---

## 4. Login page

Yêu cầu:

- Đăng nhập bằng username hoặc email.
- Password.
- Hiện/ẩn password.
- Loading state.
- Hiển thị lỗi backend thân thiện.
- Không lưu password.
- Sau login gọi `/auth/me`.
- Nếu `mustChangePassword`, chuyển tới trang đổi mật khẩu.
- Điều hướng theo role chính.

Không sử dụng ảnh người thật không có quyền. Có thể dùng minh họa phòng lab từ ảnh nguồn hoặc hình khối trừu tượng.

---

## 5. Quản lý phiên

Khuyến nghị:

- Access token giữ trong memory.
- Refresh bằng cookie HTTP-only.
- Api client tự gọi refresh một lần khi gặp 401 phù hợp.
- Không retry vô hạn.
- Logout xóa state và query cache.

---

## 6. Menu theo vai trò

### Admin

```text
Dashboard
Lịch phòng
Yêu cầu đăng ký
Máy tính
Thiết bị
Sự cố
Người dùng
Cấu hình phòng
Audit Log
```

### Teacher

```text
Tổng quan
Lịch phòng
Tạo đăng ký
Yêu cầu của tôi
Thiết bị đang mượn
Báo sự cố
```

### Collaborator

```text
Tổng quan
Lịch phòng
Máy tính
Thiết bị
Sự cố được giao
```

### Lab Staff

```text
Hôm nay
Lịch phòng
Check-in/Check-out
Bàn giao thiết bị
Sự cố
```

### Student

```text
Tổng quan
Lịch phòng
Nội quy
Báo sự cố
```

### Manager

```text
Dashboard
Lịch phòng
Báo cáo
```

Menu được lọc bằng permission, không chỉ role.

---

## 7. Route guards

- Chưa đăng nhập → `/login`.
- Đã đăng nhập nhưng thiếu quyền → `/unauthorized`.
- Route không tồn tại → `/404`.
- Frontend guard chỉ phục vụ UX; backend vẫn là nguồn bảo mật.

---

## 8. Component nền

Tạo:

```text
AppSidebar
AppHeader
PageHeader
StatCard
StatusBadge
DataTableShell
EmptyState
ErrorState
LoadingSkeleton
ConfirmDialog
Toast
```

Không xây bảng booking hoàn chỉnh ở bước này.

---

## 9. Test

- Login form validation.
- Login success redirect.
- Login failure.
- Protected route.
- Permission route.
- Logout.
- Sidebar đúng role.
- Responsive smoke test.

---

## Tiêu chí hoàn thành bước 08

- UI shell bám ảnh nguồn.
- Login kết nối API thật.
- Layout theo role.
- Không dùng dữ liệu giả cố định.
- Route guard hoạt động.
- Build/lint/test đạt.
