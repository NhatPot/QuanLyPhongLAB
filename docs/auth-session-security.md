# Đăng nhập web và quản lý phiên

Cập nhật 04/11/2026. Khi bật FIT LHU SSO, xác thực người dùng thường do SSO quản lý; tài khoản admin vẫn có lối đăng nhập local.

## Web

- `POST /api/auth/login` tạo JWT access 15 phút và refresh token ngẫu nhiên. Cả hai nằm trong cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` ở production.
- JSON đăng nhập/làm mới chỉ trả thông tin người dùng và `csrfToken`, không trả access/refresh token cho web. Frontend không đọc hoặc lưu token đăng nhập trong localStorage/sessionStorage; các bản cũ được dọn khi mở ứng dụng.
- JWT có `sessionId` trỏ tới `AuthSessions`. Mọi API người dùng kiểm chữ ký, phiên chưa thu hồi/chưa hết hạn, tài khoản ACTIVE và quyền hiện tại trong DB. JWT cũ không có mã phiên không được truy cập API.
- `POST /api/auth/refresh` thay refresh hash bằng một câu UPDATE có điều kiện hash cũ, phiên chưa thu hồi và chưa hết hạn. Hai request không thể cùng đổi từ một hash cũ. Thời hạn phiên tuyệt đối là 7 ngày từ lúc đăng nhập, không kéo dài qua mỗi lần refresh.
- Client gộp các lần refresh đồng thời trong cùng tab, thử lại mỗi request tối đa một lần. Nhiều tab cùng refresh có thể có một request bị từ chối; client không xóa cookie của phiên mới khi một refresh thất bại.

## CSRF

Trước thao tác ghi, frontend lấy `GET /api/auth/csrf` (không cache), giữ token CSRF trong bộ nhớ và gửi `X-CSRF-Token`. Token ký bằng HMAC và ràng buộc refresh cookie; server đối chiếu cả cookie/header, chữ ký và Origin. Login cũng được bảo vệ, kể cả chưa đăng nhập.

Sau login/refresh, server cấp CSRF mới. Nếu một tab khác thay cookie, API trả `403 CSRF_INVALID` trước controller; client lấy CSRF mới và thử lại một lần. Swagger dùng cùng cookie và CSRF, không trích token đăng nhập ra JavaScript.

## Đăng xuất và thu hồi

- `POST /api/auth/logout`: thu hồi phiên hiện tại rồi xóa cookie. Nếu DB lỗi, không báo đăng xuất thành công giả.
- `POST /api/auth/logout-all`: cần đăng nhập + CSRF; thu hồi mọi phiên của chính tài khoản, gồm phiên hiện tại.
- Khóa/ngừng tài khoản hoặc admin reset mật khẩu thu hồi mọi phiên. Mở khóa không phục hồi phiên cũ.
- Người dùng tự đổi mật khẩu giữ phiên hiện tại hợp lệ và thu hồi các phiên khác; không đổi điều kiện nhập mật khẩu.
- Quyền/role được đọc lại khi gọi API, không tin quyền đã cũ trong JWT.

## Native/API client và thiết bị

API thiết bị vẫn dùng giao thức/API key riêng. CSRF không yêu cầu với client thiết bị không có Origin, Fetch Metadata hoặc cookie đăng nhập. Không thay đổi logic enrollment/telemetry trong đợt này.

Client ngoài trình duyệt cần đăng nhập tài khoản bằng token phải chủ động gửi `X-Auth-Mode: bearer`, không gửi cookie, Origin hoặc Sec-Fetch-*.

1. POST `/api/auth/login` với identifier/password → JSON có accessToken/refreshToken; không đặt cookie.
2. Các API tài khoản dùng `Authorization: Bearer <accessToken>`; vẫn kiểm session DB và quyền.
3. POST `/api/auth/refresh` cùng `X-Auth-Mode: bearer` và body `{ "refreshToken": "..." }` → token mới, bỏ token cũ.
4. POST `/api/auth/logout` cùng bearer access token hợp lệ hoặc refresh token trong body; logout-all bằng access token.

Client web không dùng chế độ này; server không phát token JSON cho request trình duyệt chỉ vì gửi header lựa chọn chế độ.

## Cấu hình triển khai

- Web và API nên cùng nguồn (`NEXT_PUBLIC_API_URL=/api`). Production cần HTTPS ở proxy/web server và `NODE_ENV=production` để cookie Secure hoạt động.
- Đặt `APP_ORIGIN` là nguồn công khai chính xác, ví dụ `https://lab.example.edu.vn`, không có đường dẫn. Server không tin Origin ngoài cấu hình. Nếu không cấu hình, fallback là nguồn request hiện tại; không dùng fallback cho topology proxy không rõ Host.
- `CSRF_SECRET` tùy chọn; nếu thiếu dùng `JWT_SECRET`. Không đưa khóa thật vào tài liệu hoặc bundle frontend.
- `TRUST_PROXY=false` mặc định: adapter Next không tin X-Forwarded-For của client. Chỉ bật khi reverse proxy tin cậy ghi đè header này và backend không truy cập trực tiếp từ ngoài.
- Giới hạn đăng nhập: tối đa 10 lần/cặp định danh-IP, 20 lần/định danh, 50 lần/IP trong 15 phút; trả 429 và Retry-After. Mã giới hạn đang ở bộ nhớ mỗi process, dung lượng có chặn trên. Nhiều worker/instance hoặc restart cần rate limit ở proxy/kho dùng chung để có giới hạn toàn hệ thống. Khi không có IP tin cậy, các request dùng chung bucket IP, nên cần cấu hình proxy phù hợp để tránh giới hạn gộp người dùng.

Đợt củng cố phiên gốc không có migration. Migration 031 của đăng ký/Google đã áp dụng trên DB phát triển theo bằng chứng trong kế hoạch; tích hợp SSO dùng lại schema này, không thêm migration. Phiên/token cũ có thể cần đăng nhập lại.

## FIT LHU SSO

- `FIT_SSO_ENABLED=true`: người dùng thường đăng nhập qua issuer `https://auth.fitlhu.com`; mật khẩu/Google/OTP/recovery do SSO quản lý. Đăng nhập mật khẩu Lab chỉ còn cho ADMIN, kể cả gọi API trực tiếp. Google cũ chỉ dùng làm bằng chứng liên kết khi đã xác minh SSO; không tự gộp tài khoản theo email.
- Authorization Code dùng PKCE S256, state và nonce. Dữ liệu nhạy cảm của flow lưu mã hóa AES-256-GCM bằng `FIT_SSO_FLOW_KEY` riêng trong SQL; cookie HttpOnly ràng buộc trình duyệt. Callback chỉ nhận origin đã cấu hình, tiêu thụ flow một lần và kiểm chữ ký RS256/JWKS, issuer, audience, expiry, nonce, `email_verified`.
- Identity lưu theo provider và hash của `(issuer, sub)`. Liên kết tài khoản cũ cần mật khẩu Lab hoặc đúng identity Google đã liên kết; giới hạn thử sai lưu SQL. Giữ userId, quyền, trạng thái và dữ liệu. Giảng viên mới vẫn chờ duyệt tại Lab; claim role SSO không tự cấp quyền Lab.
- Lab cấp cookie phiên của mình, không trả token OIDC qua JSON hoặc lưu trong trình duyệt. Phiên SSO hết hạn chậm nhất theo ID token hoặc 10 phút; refresh Lab không kéo dài thời hạn này. Khi hết hạn, người dùng tiếp tục qua SSO. Không yêu cầu `offline_access`; chưa có back-channel logout hay kiểm tra thu hồi tức thì từ SSO.
- Hồ sơ SSO bắt buộc họ tên, ngành/phòng ban và số điện thoại, không tạo thêm mật khẩu Lab. API nghiệp vụ chặn hồ sơ chưa đủ bằng `ACCOUNT_SETUP_REQUIRED`; server tính lại từ DB.
- Đăng xuất qua UI thu hồi phiên Lab trước, rồi dùng redirect nội bộ một lần tới provider logout. `id_token_hint` giữ ở server, chỉ xuất hiện trong chuyển hướng tới provider. Nếu provider không khả dụng, vẫn đăng xuất Lab; phiên SSO bên provider có thể còn hiệu lực. Logout-all của Lab chỉ thu hồi các phiên Lab.
- Khi triển khai proxy, giữ đúng origin công khai và không ghi query callback vào access log vì có authorization code. Next dev đã bỏ log incoming request của callback; proxy/VPS cần cấu hình riêng. Không đưa secret vào biến `NEXT_PUBLIC_*`.
- Bằng chứng local, giới hạn kiểm thử và cấu hình production nằm tại [§27 kế hoạch](plans/google-email-registration.md#27-triển-khai-fit-lhu-sso-local-và-bàn-giao-production--04112026).

## Kiểm thử

Các test cookie/CSRF, controller/adapter Next, vòng đời phiên và frontend retry dùng dependency giả lập, không ghi DB thật. Cơ chế compare-and-swap được kiểm ở use case; kiểm concurrency/isolation SQL thực cần DB test riêng trước phát hành production. Typecheck và kiểm thử hồi quy là các gate bổ sung, không thay kiểm HTTPS/proxy/cookie trên môi trường triển khai.

## Mở rộng Google, OTP và recovery

- [Kế hoạch và bằng chứng triển khai](plans/google-email-registration.md) ghi scope, endpoint, migration 031, cờ bật/tắt, cấu hình SMTP/Google và các kiểm tra còn lại.
- `IssueSession` cấp phiên chung cho password login, Google và sinh viên mới. SQL chỉ cập nhật LastLoginAt sau kiểm trạng thái/hash hiện hành; không ghi đè toàn bộ user bằng bản đọc cũ.
- `authFlow` là cookie HttpOnly/SameSite=Lax, Secure ở production, ràng buộc nonce/OTP/grant với browser. OTP và grant chỉ dùng một lần, theo đúng mục đích; không cấp quyền dashboard. UI không lưu password/grant/access token trong localStorage/sessionStorage; chỉ giữ metadata challenge để khôi phục bước OTP.
- Recovery/thêm mật khẩu/đổi email thu hồi phiên cũ. Đổi email xác minh cả hộp thư cũ và mới. Client không replay các endpoint xác minh khi nhận 401; tránh trừ lượt OTP hai lần do refresh interceptor.
- HMAC OTP và mã hóa outbox dùng hai khóa server riêng, không dùng JWT secret. Thao tác gửi chạy ngoài transaction qua worker; limiter và pause sender nằm trong SQL dùng chung nhiều process.
- AUTH_EMAIL_ENABLED/SELF_REGISTRATION_ENABLED/GOOGLE_AUTH_ENABLED mặc định false. Không có email thật hoặc truy cập DB test từ các kiểm thử tự động trong đợt này; production cần Google/SMTP/SQL và HTTPS/proxy check riêng.
