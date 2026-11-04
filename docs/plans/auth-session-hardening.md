# Củng cố phiên đăng nhập web

Trạng thái: hoàn tất triển khai và kiểm tra local · 03/11/2026.

## Phạm vi

Cookie HttpOnly cho access/refresh token; bỏ token khỏi trình duyệt JS; chống CSRF;
JWT gắn AuthSessions; kiểm tài khoản/quyền hiện hành; refresh nguyên tử; thu hồi phiên;
giới hạn đăng nhập. Giữ nguyên quy tắc mật khẩu. MFA ngoài phạm vi.

## Hiện trạng và tác động

- Web lưu access token trong localStorage và cookie không HttpOnly; API Next chấp nhận cả cookie/header.
- JWT chưa có sessionId. Logout chỉ thu hồi refresh token; access token vẫn hợp lệ.
- AuthSessions đã có đủ cột, không cần migration hoặc sửa dữ liệu thật.
- Có API Next dùng getAuthUser trực tiếp, adapter Express và middleware Express: phải cập nhật cả ba.
- API thiết bị tiếp tục dùng API key riêng. Client ngoài trình duyệt dùng chế độ bearer tường minh.

## Các bước

1. Thêm CSRF ký và ràng buộc refresh cookie, cookie helper và giới hạn đăng nhập.
2. Gắn sessionId vào JWT; kiểm phiên/tài khoản và quyền hiện hành ở mỗi API người dùng.
3. Refresh compare-and-swap; truyền transaction; logout/current/all và khóa tài khoản thu hồi phiên.
4. Cập nhật controller, routes, frontend cookie-only, Swagger và chế độ mock.
5. Test CSRF, cookie, session revocation, rotation concurrency, API guards, client retry và regression.

## Xác minh và bàn giao

Vitest với repositories giả lập; typecheck/build nếu khả thi; không dùng DB hiện tại làm dữ liệu test.
Kiểm trường hợp thiếu/sai CSRF, Origin lạ, token hết hạn, phiên bị thu hồi, tài khoản bị khóa,
quyền bị đổi, logout lỗi, refresh đồng thời và API thiết bị không bị ảnh hưởng.

## Triển khai và phục hồi

Production cần HTTPS và APP_ORIGIN đúng; reverse proxy phải ghi đè forwarding headers nếu bật TRUST_PROXY.
Phiên cũ cần đăng nhập lại hoặc refresh sang JWT có sessionId. Không thay secret hoặc mật khẩu.
Giới hạn đăng nhập in-memory chỉ bảo vệ từng process; nhiều worker cần limiter dùng kho dùng chung/proxy.
Rollback code sẽ mất kiểm tra session mới; không chạy rollback tự động. Không có migration để rollback.

## Kết quả

- Vitest: 12 files / 128 tests đạt; gồm session lifecycle, refresh cạnh tranh giả lập, JWT, CSRF, Next/Express guards, rate-limit HTTP và frontend retries.
- TypeScript và production build đạt. API local: bootstrap CSRF 200/no-store, Origin lạ 403, login thiếu CSRF 403 trước xác thực.
- Đã thêm nút đăng xuất mọi thiết bị trong Hồ sơ cá nhân; cập nhật Swagger và tài liệu `docs/auth-session-security.md`.
- Không đổi chính sách mật khẩu, secrets, schema hoặc dữ liệu database hiện tại.
- Chưa chạy browser E2E đăng nhập bằng tài khoản thật, HTTPS/proxy deployment check hoặc SQL integration trên DB test riêng. Rate limiter hiện chỉ có phạm vi từng process.
