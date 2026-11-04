# Kế hoạch đăng nhập Google và tự đăng ký bằng email trường

**Trạng thái hiện tại — FIT LHU SSO (§27, 04/11/2026):** đã cấu hình client và bật SSO trên localhost, thay đăng nhập trực tiếp cho người dùng thường; chủ dự án xác nhận đã vào hệ thống. SELECT xác nhận liên kết SSO giữ đúng user giảng viên cũ, Google identity, TEACHER/APPROVED và hồ sơ đầy đủ; có bản ghi phiên SSO được cấp. Chưa triển khai trên VPS/tên miền thật. Các phần Google/OTP bên dưới giữ lịch sử trước chuyển đổi; khi SSO bật, đăng ký/mật khẩu/OTP/recovery do SSO quản lý, Lab chỉ thu hồ sơ bắt buộc và duyệt giảng viên.

Ngày: 03/11/2026. Trạng thái: đã triển khai mã nguồn, áp dụng migration 031 và bật Google trên máy phát triển ngày 04/11 bằng Client ID chủ dự án cung cấp. Nút Google/API nonce đã kiểm qua dịch vụ Google/database thực; chủ dự án thử tài khoản trường và server xác minh được hosted domain `lhu.edu.vn`. Đã cấu hình miền này; tài khoản Google đã duyệt được khôi phục theo yêu cầu tại §19, còn chờ thử phiên/hoàn thiện thực. SMTP đã xác thực, bật trên localhost và gửi một OTP thử được Gmail chấp nhận tại §20; chủ hộp thư đã xác nhận nhận được OTP, chưa xác nhận nhập mã thành công. §15–16 giữ lịch sử chuẩn bị Google/migration.

Owner quyết định nghiệp vụ: chủ dự án. Người triển khai chịu trách nhiệm xác minh cấu hình và bằng chứng kiểm thử. Cập nhật gần nhất: 04/11/2026.

**Chẩn đoán lần đăng nhập thực mới nhất (§19):** hồ sơ Google giảng viên đã APPROVED/có TEACHER nhưng user bị xoá mềm, nên Google bị chặn đúng chính sách. Chủ dự án xác nhận khôi phục; đã bỏ dấu xoá cho đúng một user trong transaction, giữ hồ sơ/quyền/identity, thu hồi phiên cũ và ghi audit. DB hiện ACTIVE/APPROVED, chưa có mật khẩu; cần chủ tài khoản đăng nhập Google lại để hoàn thiện. Không có yêu cầu chờ duyệt của tài khoản này vì đã duyệt trước đó.

**Quyết định mới nhất — ACCOUNT-DETAILS-01 / GOOGLE-ONBOARDING-01 / SCHOOL-LOGIN-01 (04/11):** đăng ký email và hoàn thiện Google dùng chung một biểu mẫu họ tên/khoa/phòng ban/**số điện thoại bắt buộc**/mật khẩu/xác nhận; mỗi luồng chỉ đặt mật khẩu một lần. Email → OTP → biểu mẫu chung → tạo tài khoản; Google → phiên giới hạn → biểu mẫu chung (nếu Google cần OTP thì xác minh trước). Giảng viên Google chờ duyệt trước khi được hoàn thiện. Tài khoản mới dùng email trường làm định danh đăng nhập, admin giữ ngoại lệ; tài khoản cũ chuyển đổi sau. Quyết định số điện thoại bắt buộc tại §23 thay lựa chọn tùy chọn trước đó tại §18.

Phạm vi triển khai gồm Google/đăng ký email/OTP/recovery/duyệt giảng viên và phương thức đăng nhập trong hồ sơ. **Đính chính đã xác nhận ngày 04/11/2026:** giữ giao diện cũ hai cột, logo/nền/giới thiệu bên trái và nền sáng bên phải; chỉ bố trí lại khung biểu mẫu bên phải cho tinh gọn, sau đó bỏ badge và ba ô thông tin theo yêu cầu mới nhất. Thiết kế navy toàn trang ngày 03/11 là cách hiểu trước đã được thay thế. §14 ghi giai đoạn code/local chưa sửa cấu hình thật; §15 ghi yêu cầu tiếp tục Google trên DB phát triển hiện có, chuẩn bị khoá server và lần migration bị rollback do thiếu quyền. Không đổi credential database, không gửi email thật hoặc seed user.

Áp dụng [AI Agent Project Playbook](../00-AI-AGENT-PROJECT-PLAYBOOK.md), đặc biệt §10–12, §17 và §23: phân biệt quyết định đã xác nhận với đề xuất/UNKNOWN, giữ đúng phạm vi, không lưu secret trong docs, và không báo hoàn thành chức năng khi chưa có bằng chứng chạy. Thông tin và AC được gộp trong kế hoạch này, không tạo thêm bộ tài liệu trùng nội dung.

## 1. Mục tiêu và quyết định đã xác nhận

Trải nghiệm đăng nhập quen thuộc: tiếp tục bằng Google hoặc dùng tài khoản/mật khẩu; có Đăng ký, Xác minh email, Quên mật khẩu và phản hồi rõ ràng.

| Đối tượng | Email | Tạo tài khoản lần đầu | Sau xác minh |
| --- | --- | --- | --- |
| Sinh viên | `MSSV@lachong.edu.vn` | Google hoặc đăng ký thủ công | Role `STUDENT`; Google mới phải hoàn thiện tài khoản trước khi dùng dashboard |
| Giảng viên | `nhatlm@lhu.edu.vn` | Google hoặc đăng ký thủ công | Chờ quản trị viên duyệt; sau duyệt role `TEACHER`, Google mới vẫn phải hoàn thiện tài khoản |
| Tài khoản được cấp đang tồn tại | Email/username hiện có | Không tạo lại | Giữ role và status hiện có |
| Email ngoài hai miền | Miền khác | Không tự đăng ký | Hiển thị hướng dẫn dùng email trường |

Chính sách chờ duyệt giảng viên đã được người dùng xác nhận. Miền được kiểm tra chính xác phía server, không dựa vào trường role gửi từ trình duyệt. Chuẩn hóa email bằng trim/lowercase; không tự bỏ dấu chấm hoặc phần `+...`. Chưa chốt quy tắc chỉ-nhận-số cho MSSV vì người dùng mới cung cấp dạng thường gặp.

Tự xác minh email chứng minh quyền sở hữu hộp thư trường; không tự chứng minh tình trạng đang theo học nếu trường vẫn giữ email cho cựu sinh viên. Đối chiếu danh sách đào tạo là mở rộng sau nếu có yêu cầu.

## 2. Hiện trạng trước đợt triển khai (baseline khảo sát)

- `src/app/(auth)/login/page.tsx`: form username/email và mật khẩu, chưa có đăng ký hoặc Google.
- `src/services/auth-api.ts`, `src/features/auth/AuthContext.tsx`: login, me, refresh, logout và quản lý hồ sơ.
- `src/app/api/auth/login/route.ts`: Next route dùng adapter gọi `AuthController`.
- `LoginUseCase`: bcrypt, kiểm status, đọc role/permission, cấp token và ghi audit.
- Web có CSRF, kiểm Origin, cookie HttpOnly, access token 15 phút, refresh 7 ngày và kiểm phiên hiện hành.
- `CreateUserUseCase` phục vụ tạo tài khoản bởi người có quyền; không dùng trực tiếp làm API đăng ký công khai vì nhận role tùy chọn và mật khẩu tạm.
- `Users.PasswordHash` hiện NOT NULL; domain entity hiện yêu cầu passwordHash là string.
- Có `STUDENT`, `TEACHER`, status ACTIVE/LOCKED/INACTIVE; chưa có external identity, email verification, gửi mail, OTP, quên mật khẩu.
- `UpdateCurrentUserProfileUseCase` cho tự đổi email; luồng mới phải phân biệt email đã xác minh với email nhập trong hồ sơ.
- Repo đang có thay đổi chưa commit, bao gồm auth/session. Khi triển khai phải giữ những thay đổi này và nối vào cơ chế phiên mới nhất.

## 3. Trải nghiệm và bố cục

Visitor mode: Operate. Người dùng cần vào hệ thống hoặc tạo tài khoản trong ít bước, nhận biết ngay đang chờ việc gì.

**Cập nhật mới nhất theo yêu cầu ngày 04/11/2026:** xoá badge “Hệ thống quản lý tập trung và an toàn” và toàn bộ ba ô “24/7 — Theo dõi trạng thái”, “01 — Phòng Lab tập trung”, “100% — Lưu vết thao tác”. Giữ logo, nền, tiêu đề và đoạn giới thiệu bên trái, khung tài khoản bên phải. Quyết định này thay phần giữ ba ô thông tin trong mô tả/lịch sử trước đó.

**CONFIRMED — WEB-AUTH-DESIGN-01, đính chính 04/11/2026:** giữ nguyên bố cục hai cột của giao diện cũ: nền navy có lưới, logo LHU IT LAB, phần giới thiệu và ba ô thông tin bên trái; nền sáng bên phải. Khung tài khoản bên phải là khung trắng gọn tối đa 410px, tiêu đề giữa khung, input một cột có icon, nút chính xanh và liên kết phụ rõ ràng. Chỉ mượn cách tổ chức khung từ hai mẫu mới, không chuyển toàn trang sang nền navy. Các trang đăng ký/quên mật khẩu/OTP dùng cùng shell cũ và biểu mẫu gọn; mobile ẩn cột giới thiệu như trước. Không đổi dashboard hoặc nghiệp vụ auth. [Ảnh và bản xem trước](../../designs/auth-pages/index.html), [quyết định thiết kế và kiểm tra](../../designs/auth-pages/README.md).

### Trang đăng nhập `/login`

Thứ tự nội dung:

1. Logo LHU IT LAB trong cột trái như cũ; tiêu đề “Đăng nhập” trong khung ở cột phải. Mobile hiện logo trên khung.
2. Nhãn “Tên đăng nhập hoặc email” và “Mật khẩu” hiện phía trên từng ô nhập, chữ xám đậm/bán đậm theo ảnh gốc; mật khẩu có nút hiện/ẩn.
3. Liên kết “Quên mật khẩu?” và nút “Đăng nhập”.
4. Phân cách “hoặc”, nút Google chính thức “Tiếp tục bằng Google”.
5. Liên kết “Tạo tài khoản”. Theo yêu cầu mới nhất, xoá dòng hướng dẫn tĩnh “Sinh viên: @lachong.edu.vn / Giảng viên: @lhu.edu.vn — cần quản trị viên duyệt.” khỏi trang đăng ký; quy tắc miền và duyệt phía server vẫn áp dụng.

Google có thể tự tạo tài khoản ở lần đầu; mô tả ngắn ngay cạnh lựa chọn này. Không ép người dùng chọn sinh viên/giảng viên trước vì server xác định chính sách theo miền email.

### Trang đăng ký `/register`

Có nút Google và lựa chọn “Đăng ký bằng email”. Luồng thủ công gồm ba bước có tên rõ ràng:

1. **Email:** nhập email trường, hiển thị loại tài khoản suy ra từ miền, bấm “Gửi mã xác minh”.
2. **Xác minh:** nhập mã 6 số, hiển thị email đích đã che một phần, thời gian hiệu lực, đổi email, gửi lại sau bộ đếm 60 giây và số lượt gửi lại còn lại trên tổng 5 lượt. Server là nguồn chuẩn của bộ đếm; tải lại trang không cấp thêm lượt.
3. **Hoàn thiện tài khoản:** dùng biểu mẫu chung với Google; email chỉ đọc, bắt buộc họ tên, khoa/phòng ban, số điện thoại, mật khẩu và xác nhận. Bấm “Hoàn tất tài khoản” lưu toàn bộ trong cùng lần tạo user. Không chuyển tiếp sang một bước đặt mật khẩu khác.

Email-first tránh lưu mật khẩu trước khi chứng minh sở hữu email, và tránh gắn mật khẩu của người khởi tạo yêu cầu vào tài khoản của người khác.

Google cung cấp đủ họ tên thì tạo sinh viên và cấp phiên chỉ phục vụ hoàn thiện tài khoản tại `/complete-account`; chưa được gọi API nghiệp vụ. Thiếu họ tên thì xác nhận tên từ bằng chứng Google trước khi tạo tài khoản, chưa đặt mật khẩu tại bước này. Sau đó dùng cùng biểu mẫu bắt buộc họ tên, khoa/phòng ban, số điện thoại, mật khẩu và xác nhận. Email trường giữ nguyên làm định danh đăng nhập. Google cần OTP và đã có họ tên thì OTP đúng chuyển tới phiên giới hạn/biểu mẫu chung, bỏ form trung gian. Giảng viên thực hiện bước hoàn thiện sau khi được duyệt và đăng nhập lại. Không cần OTP/SMTP thêm cho bước hoàn thiện bằng phiên Google đã xác minh. Lưu nguyên tử hồ sơ/mật khẩu, thu hồi phiên rồi yêu cầu đăng nhập lại.

### Chờ duyệt `/registration-status`

Giảng viên hoàn tất đăng ký thấy “Email đã được xác minh. Tài khoản đang chờ quản trị viên phê duyệt.” Không phát phiên truy cập dashboard khi chưa được duyệt.

Đăng nhập lại trong thời gian chờ trả về cùng trạng thái sau khi đã chứng minh quyền sở hữu tài khoản. Bản ghi đăng ký có thể tra cứu qua bằng chứng giới hạn chỉ cho phép xem trạng thái, không dùng làm access token.

Admin có danh sách “Đăng ký giảng viên chờ duyệt”: họ tên, email, thời điểm, phương thức xác minh; thao tác duyệt/từ chối có ghi nhận người xử lý, thời điểm và lý do từ chối. Duyệt xong gửi email thông báo; người dùng đăng nhập lại.

### Quên mật khẩu `/forgot-password`, đặt lại `/reset-password`

**CONFIRMED — RECOVERY-01:** quên mật khẩu dùng OTP gửi về email của tài khoản. Luồng cụ thể:

1. Người dùng bấm “Quên mật khẩu?”, nhập email và chọn “Gửi mã xác minh”.
2. Nếu tài khoản đủ điều kiện khôi phục, gửi OTP tới email đang gắn với tài khoản; không cho nhập một email nhận mã khác. Phản hồi công khai thống nhất dù email không tồn tại hoặc không đủ điều kiện, không tiết lộ trạng thái tài khoản.
3. Người dùng nhập OTP. Có nút gửi lại tối đa 5 lần ngoài lần gửi đầu, cùng quy tắc tại §5; UI hiển thị số lượt còn lại và thời gian chờ.
4. OTP đúng và còn hạn được tiêu thụ nguyên tử; server cấp reset grant ngẫu nhiên, một lần dùng, gắn userId/email/mục đích/browser flow, chỉ lưu hash. Thời hạn grant đề xuất 10 phút. Chỉ khi có grant hợp lệ mới mở bước đặt mật khẩu mới và xác nhận mật khẩu.
5. Hoàn tất đặt lại: kiểm grant, trạng thái tài khoản và email vẫn khớp; cập nhật hash mật khẩu, MustChangePassword=false, tiêu thụ grant, vô hiệu các challenge/grant reset còn lại và thu hồi toàn bộ phiên cũ trong transaction. OTP không tự trở thành access token và không đủ để gọi API dashboard.
6. Ghi audit, gửi email thông báo qua outbox và đưa về trang đăng nhập. Thông báo gửi thất bại không hoàn tác mật khẩu đã đổi; xử lý retry theo §8.3. Không tự đăng nhập sau reset và không gửi mật khẩu mới qua email.

Tài khoản bị khóa/xóa, giảng viên chưa duyệt hoặc bị từ chối không được kích hoạt hay đổi quyền bằng recovery. Quên mật khẩu vẫn có giới hạn yêu cầu phía server cho cả email tồn tại và không tồn tại; không khóa tài khoản chỉ vì có người yêu cầu OTP nhiều lần.

Tài khoản chỉ có Google tiếp tục bằng Google rồi hoàn thiện tài khoản bắt buộc theo GOOGLE-ONBOARDING-01. Luồng quên mật khẩu không âm thầm tạo mật khẩu cho tài khoản Google chưa hoàn thiện; sau khi đã đặt mật khẩu thì có thể dùng recovery OTP khi SMTP sẵn sàng.

### Hồ sơ cá nhân

Hiển thị email đã xác minh, Google đã liên kết, có/chưa có mật khẩu. Cho liên kết Google Workspace cùng email sau xác nhận mật khẩu hiện tại hoặc thêm mật khẩu bằng OTP tới email đang gắn với tài khoản. Đổi email yêu cầu xác minh hộp thư hiện tại trước, rồi xác minh hộp thư mới, sau đó thu hồi phiên cũ; không ghi đè email đã xác minh bằng endpoint sửa hồ sơ chung. Giữ miền tương ứng loại tài khoản; chuyển loại tài khoản phải qua quản trị viên. Khi mất quyền truy cập hộp thư cũ, liên hệ quản trị viên thay vì bỏ bước xác minh.

### Trạng thái và khả năng sử dụng

- Loading, gửi mail thất bại, Google bị hủy/chặn popup, sai miền, mã sai/hết hạn/đã dùng, vượt lượt thử, email đã có tài khoản, chờ duyệt/từ chối, tài khoản khóa.
- Khi mới đưa vào outbox, hiển thị “Đang gửi mã”; khi SMTP chấp nhận mới hiển thị “Đã gửi mã, vui lòng kiểm tra hộp thư và thư rác”. SMTP chấp nhận không bảo đảm thư đã tới inbox. Không thành công giả khi thiếu cấu hình hoặc gửi thất bại. Luồng recovery vẫn giữ phản hồi không tiết lộ tài khoản tồn tại.
- OTP dùng một input hỗ trợ dán đủ mã, `inputMode="numeric"`, `autoComplete="one-time-code"`; có thể trang trí thành ô nếu vẫn giữ hỗ trợ bàn phím/screen reader.
- Label gắn input, lỗi inline và vùng thông báo đọc được bằng screen reader; focus về bước/lỗi phù hợp.
- Dùng autocomplete cho email, current-password/new-password; cho phép dán mật khẩu.
- Mobile ưu tiên form, logo nằm trong luồng trang, bàn phím mở vẫn cuộn được; không có thanh cuộn ngang ở 320px.
- Không thêm checkbox ghi nhớ nếu chưa thực hiện chính sách thời hạn phiên tương ứng.
- Chuyển hướng sau đăng nhập chỉ nhận đường dẫn nội bộ hợp lệ; giữ đích ban đầu qua bước Google/hoàn tất, không nhận URL tùy ý.

### Mẫu email OTP theo màu website

**CONFIRMED — EMAIL-DESIGN-01:** dùng bố cục ảnh chủ dự án cung cấp làm tham chiếu, phối màu theo website LHU IT LAB đang có thay cho màu tím trong ảnh.

- Header navy `#06294c` → `#073761` → `#0a4a7d`, có solid fallback; nền ngoài `#f4f8fd`, điểm nhấn primary `#297ef5`, mã xanh `#1d4ed8` trên nền `#eff6ff`.
- Thứ tự: thương hiệu → lời chào/mục đích → OTP lớn → hiệu lực và một lần dùng → lưu ý bảo mật → chữ ký/footer. Đăng ký và quên mật khẩu có nội dung riêng; recovery nêu mật khẩu chưa thay đổi nếu người nhận không thực hiện yêu cầu.
- HTML email: bảng rộng tối đa 600px, CSS inline, font an toàn cho email, không JavaScript/ảnh ngoài; có plain text tương ứng. Gradient/bo góc không được là điều kiện để đọc nội dung trên Outlook.
- Biến `otp`, `expiresInMinutes`, `year` do server cung cấp/validate/escape; thời hạn trong thư phải khớp challenge còn hiệu lực khi thực sự gửi. Không đưa OTP vào subject/preheader hoặc ghi log.
- Không gắn nút sao chép chạy JavaScript trong email; người dùng copy mã từ nội dung. Nút sao chép ở trang preview chỉ phục vụ xem xét thiết kế. Sender lấy từ cấu hình đã được cấp quyền, không chép địa chỉ ví dụ thành cấu hình thật.
- [Bản xem trước](../../designs/auth-emails/index.html), [HTML đăng ký](../../designs/auth-emails/registration-otp.html), [HTML quên mật khẩu](../../designs/auth-emails/password-reset-otp.html), [hướng dẫn biến và tích hợp](../../designs/auth-emails/README.md).
- Trạng thái: đã nối bản template runtime với hàng đợi gửi SMTP trong mã nguồn; chưa bật hoặc gửi thư thật. Cần kiểm tra Gmail web/mobile, Outlook, Apple Mail và sáng/tối bằng thư thật trên staging.

## 4. Luồng Google và tài khoản trùng

1. Trình duyệt lấy nonce một lần từ server, render nút Google Identity Services và nhận ID token qua JavaScript callback.
2. Gửi token về API cùng cơ chế CSRF hiện có. Server xác minh chữ ký, audience, issuer, expiry, nonce và `email_verified` bằng thư viện Google.
3. Kiểm email đúng miền cho đăng ký mới. Với Workspace, kiểm `hd` theo cấu hình miền/tenant đã xác nhận. Không giả định `hd` luôn trùng phần sau `@`, vì trường có thể dùng alias domain.
4. Khi Google không có thẩm quyền xác nhận hộp thư trường (ví dụ tài khoản Google dùng email ngoài Workspace, thiếu `hd`), yêu cầu OTP tới email đó trước khi đăng ký/liên kết.
5. Tìm external identity theo `(Provider, Subject)` với Subject là `sub`. Nếu đã liên kết, đăng nhập user đó sau khi kiểm status; không đổi role theo miền email mỗi lần login.
6. Nếu chưa liên kết nhưng email khớp tài khoản cũ: yêu cầu xác thực tài khoản cũ rồi mới liên kết, không gộp tự động theo email. Người quên mật khẩu phải dùng recovery an toàn; Google đăng nhập mới không được ghi đè mật khẩu cũ.
7. Nếu chưa có tài khoản: áp dụng chính sách sinh viên/giảng viên, hoàn tất thông tin còn thiếu rồi tạo user và identity nguyên tử.
8. Sinh viên ACTIVE nhận phiên cookie từ dịch vụ cấp phiên chung; nếu chưa có mật khẩu thì phiên bị giới hạn bởi `requiresAccountSetup` và chưa dùng API nghiệp vụ. Giảng viên chờ duyệt chưa nhận phiên; sau duyệt đăng nhập Google cũng phải hoàn thiện nếu chưa có mật khẩu.

Tài khoản đã khóa, bị xóa hoặc đang chờ duyệt không thể dùng Google/đăng ký lại để vượt trạng thái. Identity Google và email normalized có ràng buộc unique; xử lý cả trường hợp hai yêu cầu đăng ký chạy đồng thời.

## 5. OTP và bằng chứng xác minh

Quy tắc đã xác nhận:

- **CONFIRMED — OTP-01:** đăng ký có 1 lần gửi đầu và tối đa 5 lần gửi lại, tức tối đa 6 lượt yêu cầu gửi được chấp nhận trong ngân sách tương ứng. Quên mật khẩu áp dụng riêng cùng quy tắc 1 + 5. “5 lần” là gửi lại OTP, khác với số lần nhập sai mã.
- **OTP-02:** bộ đếm theo email normalized + mục đích, lưu phía server. Tải lại trang, đổi trình duyệt, tạo challenge mới hoặc bấm lại “Quên mật khẩu” không reset ngân sách. Hai mục đích REGISTER và RESET_PASSWORD có ngân sách riêng nhưng vẫn chịu giới hạn tổng theo email/IP/tài khoản gửi. Giới hạn tổng hoặc lỗi dịch vụ có thể chặn sớm hơn.

Thông số kỹ thuật đề xuất ban đầu, cấu hình phía server:

- Mã 6 chữ số sinh bằng CSPRNG, hiệu lực 5 phút, tối đa 5 lần nhập sai.
- Gửi lại sau 60 giây. Áp dụng OTP-01 theo cửa sổ 60 phút trượt: tối đa 6 lượt được chấp nhận/email/mục đích, gồm lần đầu và tối đa 5 lần gửi lại. Khi hết lượt, server trả thời điểm có thể thử lại; không reset chỉ vì hết hạn một OTP. Cửa sổ 60 phút là đề xuất, số lượt gửi lại 5 đã được người dùng chốt.
- Khi nhận yêu cầu hợp lệ, giữ chỗ lượt gửi và ghi outbox nguyên tử; nhấp đúp/idempotent retry không tính thêm lượt. SMTP worker thử lại cùng một thư không phải lượt người dùng bấm gửi lại, nhưng vẫn tiêu thụ ngân sách gửi toàn hệ thống theo §8.3. Không tự hoàn lượt cho kết quả SMTP chưa xác định để tránh bị lợi dụng.
- Gửi lại tạo mã mới và vô hiệu mã cũ; không reset ngân sách nhập sai tích lũy của email/mục đích trong cửa sổ chống dò mã. Nếu hết lượt gửi lại nhưng mã mới nhất còn hạn, người dùng vẫn được xác minh trong số lượt nhập sai cho phép. Sau khi hết lượt nhập sai phải chờ theo chính sách server, không lấy mã mới để tiếp tục dò ngay.
- Lưu HMAC của mã với secret riêng cùng challengeId/email/mục đích; không chỉ hash thường vì không gian 6 chữ số nhỏ. Không log mã, token, mật khẩu.
- Challenge gắn browser flow qua bí mật ngẫu nhiên trong cookie HttpOnly; ID công khai một mình không đủ chuyển bước.
- Verify thành công tiêu thụ OTP nguyên tử, cấp bằng chứng ngẫu nhiên ngắn hạn chỉ cho đúng email và mục đích. Bằng chứng hoàn tất đăng ký có hiệu lực đề xuất 10 phút, một lần dùng và chỉ lưu hash.
- Tạo user, gán role, đánh dấu hoàn tất và tiêu thụ bằng chứng trong cùng transaction. Không cho đổi email/role trong request hoàn tất.
- Tách mục đích REGISTER, RESET_PASSWORD, CHANGE_EMAIL, LINK_IDENTITY, SET_PASSWORD; mã hoặc bằng chứng của mục đích này không dùng cho mục đích khác.
- Gửi mail ngoài transaction DB; có trạng thái gửi, idempotency và retry có giới hạn. Không gọi SMTP trong transaction giữ khóa.
- Challenge/limiter lưu dùng chung trong SQL Server để nhiều process vẫn áp dụng cùng giới hạn; dọn bản ghi hết hạn định kỳ.

## 6. Mô hình dữ liệu đề xuất

| Thành phần | Bổ sung |
| --- | --- |
| `Users` | `EmailVerifiedAt` nullable; `PasswordHash` nullable cho Google-only; `RegistrationSource` nếu cần báo cáo |
| `UserExternalIdentities` | Id, UserId, Provider, Subject, EmailAtLink, LinkedAt; unique Provider+Subject, và UserId+Provider |
| `AuthChallenges` | FlowId, email normalized/UserId, purpose, HMAC/hash, expiry, attempt counters, verified/consumed timestamps, browser binding, delivery status |
| `AccountRegistrations` | UserId, RequestedRole, status PENDING_REVIEW/APPROVED/REJECTED, SubmittedAt, ReviewedBy, ReviewedAt, ReviewNote |
| `AuthRateEvents` | Các sự kiện cửa sổ trượt theo khóa HMAC email+mục đích, IP, global delivery budget; cập nhật trong transaction dùng khóa SQL chung |
| `AuthEmailOutbox` | Payload mã hóa AES-256-GCM, challenge, expiry, trạng thái gửi/retry; ciphertext bị xóa sau trạng thái kết thúc |

Chờ duyệt: User có status INACTIVE, chưa gán role TEACHER; dùng AccountRegistrations để phân biệt với tài khoản INACTIVE khác. Duyệt gán TEACHER và chuyển ACTIVE trong cùng transaction. Từ chối giữ user không có quyền và lưu quyết định; đăng ký lại không ghi đè quyết định cũ.

EmailVerifiedAt của user cũ mặc định NULL; không suy diễn rằng email cũ đã được xác minh. Đăng nhập mật khẩu hiện tại vẫn hoạt động. Cần xác minh khi liên kết/đổi email hoặc thiết lập phương thức xác thực mới.

Điều chỉnh domain entity, repository mapping, LoginUseCase, ChangePasswordUseCase, admin reset và DTO để xử lý password nullable rõ ràng. Google-only có MustChangePassword=false; admin reset nếu thêm mật khẩu sẽ đi theo quy trình hiện có và ghi audit.

Đã tạo và áp dụng `database/migrations/031_SelfServiceAuth.sql` lên DB phát triển ngày 04/11/2026; bằng chứng tại §16. Rollback từ chối thu hồi nullable PasswordHash nếu còn tài khoản Google-only, để không mất khả năng đăng nhập/dữ liệu.

## 7. Backend và API dự kiến

Tách port `IGoogleIdentityVerifier`, `IEmailSender`, kho challenge và use case đăng ký công khai. Tách cấp session/audit login thành dịch vụ chung dùng bởi password login và Google login để giữ cookie/refresh/logout nhất quán.

| Endpoint | Vai trò |
| --- | --- |
| `GET /api/auth/config` | Trạng thái khả dụng và client ID công khai, không trả secret |
| `POST /api/auth/account-setup` | Phiên Google ACTIVE chưa có mật khẩu: lưu hồ sơ/mật khẩu, thu hồi phiên và yêu cầu đăng nhập lại |
| `POST /api/auth/google/nonce` | Khởi tạo browser flow/nonce có thời hạn, có CSRF |
| `POST /api/auth/google` | Xác minh Google; trả trạng thái đã đăng nhập/cần hoàn tất/cần liên kết/chờ duyệt |
| `POST /api/auth/register/request-code` | Kiểm miền, khởi tạo challenge và yêu cầu gửi mã |
| `POST /api/auth/register/verify-code` | Tiêu thụ OTP, cấp bằng chứng đăng ký |
| `POST /api/auth/register/complete` | Tạo user từ bằng chứng email hoặc Google đã xác minh |
| `POST /api/auth/otp/resend` | Gửi lại cho challenge cùng browser; không cấp thêm ngân sách |
| `POST /api/auth/password/request-reset` | Yêu cầu mã reset, phản hồi thống nhất |
| `POST /api/auth/password/verify-reset` | Kiểm mã và cấp reset grant |
| `POST /api/auth/password/reset` | Tiêu thụ grant, đổi mật khẩu và thu hồi phiên |
| `POST /api/auth/me/google/link` | Liên kết sau xác thực lại tài khoản hiện hữu |
| `GET /api/auth/me/security` | Trạng thái phương thức đăng nhập của người dùng hiện tại |
| `POST /api/auth/me/password/request-code`, `.../verify-code`, `.../set` | Thêm mật khẩu cho tài khoản Google sau xác thực lại/xác minh |
| `POST /api/auth/me/email/request-code`, `.../verify-current`, `.../request-new`, `.../verify-code`, `.../change` | Xác minh email cũ rồi email mới, kiểm miền/trùng email, cập nhật và thu hồi phiên |
| `GET /api/account-registrations` | Danh sách giảng viên chờ duyệt cho người có quyền |
| `POST /api/account-registrations/:id` | Body `approved` và `note`; duyệt/từ chối có audit, quyền riêng, từ chối cần lý do |

Trang `/registration-status` trình bày trạng thái chờ duyệt sau kết quả đăng ký hoặc Google; chưa có API công khai tra cứu hồ sơ theo email. Đăng nhập Google trả trạng thái chờ duyệt sau chứng minh danh tính; login mật khẩu chỉ giải thích trạng thái sau khi kiểm mật khẩu đúng.

Contract phân biệt trạng thái nghiệp vụ với lỗi; không trả token Google hoặc access/refresh token web trong JSON/query string. Adapter Next và Express dùng cùng use case/validation. Cập nhật interceptor để lỗi 401 ở các endpoint auth công khai mới không tự thử refresh phiên cũ.

Admin dùng quyền riêng như ACCOUNT_REGISTRATION_REVIEW, được seed cho ADMIN; không mở cho mọi tài khoản USER_VIEW. Web gửi CSRF qua apiClient hiện tại; grant và nonce không thay thế bảo vệ CSRF/Origin.

## 8. Dịch vụ và cấu hình cần chuẩn bị

- Google OAuth web client ID, authorized JavaScript origins cho localhost và domain thật; branding/audience phải cho phép cả hai nhóm tài khoản. Không giả định hai miền nằm trong cùng Workspace tenant.
- Chọn callback JavaScript cho ID token; phương án này cần client ID và không cần Google client secret. Chỉ xin thông tin danh tính cơ bản, không xin quyền đọc Gmail.
- Gửi mail: đã xác nhận dùng email giảng viên của chủ dự án trong giai đoạn đầu; ví dụ đã cung cấp là `nhatlm@lhu.edu.vn`. Cần xác minh tài khoản thực sự dùng Google Workspace và được phép gửi từ ứng dụng. Chi tiết tại §8.1–8.4. OTP do ứng dụng gửi, không phải Gmail API của sinh viên.
- Biến thực tế: GOOGLE_CLIENT_ID, STUDENT_EMAIL_DOMAINS, TEACHER_EMAIL_DOMAINS, GOOGLE_ALLOWED_HOSTED_DOMAINS, AUTH_OTP_SECRET, AUTH_EMAIL_ENCRYPTION_KEY, AUTH_EMAIL_DAILY_LIMIT, AUTH_EMAIL_IP_HOURLY_LIMIT, SMTP_HOST/PORT/SECURE/USER/PASSWORD, MAIL_FROM, APP_ORIGIN; cờ AUTH_EMAIL_ENABLED, SELF_REGISTRATION_ENABLED và GOOGLE_AUTH_ENABLED (mặc định false). Client ID công khai được trả qua `/auth/config`, không cần biến NEXT_PUBLIC_GOOGLE_CLIENT_ID.
- Với outbox cần worker gửi thư và tác vụ cleanup chạy được trong mô hình hosting thực tế; payload mã cần mã hóa bằng khóa server riêng, không lưu bản rõ.
- Cờ bật/tắt riêng Google và tự đăng ký; giao diện giải thích đúng khi dịch vụ chưa được cấu hình.
- Chính sách mật khẩu đăng ký/reset mới thống nhất, đề xuất tối thiểu 12 ký tự; bcrypt hiện tại phải kiểm giới hạn 72 byte UTF-8 để không cắt âm thầm. Không tự thay luật mật khẩu tài khoản cũ trong đợt này.

### 8.1. Quyết định người gửi và nguồn hạn mức

- **CONFIRMED — MAIL-01:** dùng tài khoản giảng viên làm người gửi ban đầu. Một tài khoản gửi mã tới nhiều sinh viên; sinh viên không cung cấp mật khẩu email và không tự gửi mail từ tài khoản của họ. SMTP_USER/MAIL_FROM phải là tài khoản hoặc địa chỉ đã được cấp quyền gửi.
- **KNOWN — thông tin nhà cung cấp, kiểm tra ngày 03/11/2026:** Google công bố mức thông thường 2.000 thư/24 giờ với Gmail SMTP trên Google Workspace; cửa sổ 24 giờ trượt, không reset theo 0 giờ. Khi vượt hạn mức có thể bị ngừng gửi tới 24 giờ. Có thêm giới hạn người nhận và bộ lọc chống lạm dụng. Xem nguồn Google ở §12.
- **UNKNOWN — tài khoản cụ thể:** hạn mức/edition, chính sách SMTP và khả năng tạo App Password của email giảng viên chưa được kiểm tra. Người sở hữu tài khoản hoặc quản trị viên Workspace xác nhận trước khi bật gửi thật. Không coi 2.000 là ngân sách ứng dụng được bảo đảm.
- **MAIL-02:** thư OTP, gửi lại, reset mật khẩu và thông báo từ web dùng chung hạn mức tài khoản với thư giảng dạy/công việc. Ví dụ 100 sinh viên nhận 2 lần là 200 thư; số thư không đồng nghĩa số tài khoản đăng ký thành công.
- Không suy luận `@lachong.edu.vn` là cùng tổ chức Workspace với `@lhu.edu.vn` chỉ vì cùng trường. Kiểm tra thư thực sự tới được cả hai miền trên môi trường thử nghiệm.

### 8.2. Cách kết nối và quản lý cấu hình

1. Chủ tài khoản kiểm tra Google Workspace, bật xác minh hai bước và khả năng tạo App Password theo chính sách trường. Nếu bị chặn, xác minh lựa chọn OAuth2 cho người gửi hoặc nhờ quản trị viên cấu hình relay; không dùng mật khẩu đăng nhập thông thường hay tắt bảo vệ tài khoản để vượt chính sách.
2. Nếu App Password được cho phép, cấu hình server với `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, SMTP_USER và MAIL_FROM là địa chỉ được phép gửi. SMTP_PASSWORD là App Password do chủ tài khoản điền trực tiếp vào môi trường triển khai. Không ghi giá trị thật vào kế hoạch, source, log hoặc biến NEXT_PUBLIC.
3. Triển khai `IEmailSender` qua SMTP/Nodemailer; tách cấu hình để sau này đổi nhà cung cấp mà không đổi nghiệp vụ OTP. Google client ID dùng cho đăng nhập không tự cấp quyền gửi email từ tài khoản giảng viên.
4. Kiểm tra kết nối/xác thực SMTP trước, rồi kiểm tra gửi tới hộp thư thử nghiệm được chỉ định khi task triển khai có phạm vi gửi thật rõ ràng. Kết nối thành công chưa chứng minh thư tới inbox.
5. Ghi lại môi trường, kết quả và thời điểm kiểm tra; không ghi secret/nội dung OTP. Nếu App Password bị thu hồi khi đổi mật khẩu Google, cập nhật cấu hình gửi và kiểm tra lại.

### 8.3. Giới hạn và xử lý quá tải trong ứng dụng

Số lượt gửi lại 5 cho đăng ký và quên mật khẩu là **CONFIRMED** tại OTP-01. Cửa sổ thời gian và các ngưỡng tổng dưới đây là **PROPOSED**, có thể điều chỉnh khi triển khai dựa trên lưu lượng và hạn mức đã xác minh; không phải hạn mức Google hoặc cam kết được phép gửi thêm ngoài quota:

| Lớp kiểm soát | Đề xuất ban đầu | Hành vi |
| --- | --- | --- |
| Email + REGISTER / RESET_PASSWORD | 1 lần đầu + tối đa 5 lần gửi lại cho mỗi mục đích; đề xuất cửa sổ 60 phút trượt, cách nhau 60 giây | Tối đa 6 lượt được chấp nhận mỗi mục đích; không reset khi tạo challenge/phiên trình duyệt mới |
| Email + mục đích xác minh khác | Đề xuất tối đa 6 lượt/60 phút trượt, cách nhau 60 giây | Chịu giới hạn tổng theo email và không cấp quyền dùng mã chéo mục đích |
| Email trên mọi mục đích | Đề xuất tối đa 12 yêu cầu gửi/giờ trượt | Điều chỉnh từ đề xuất cũ 10 để phù hợp hai ngân sách 1 + 5; các mục đích khác vẫn dùng chung trần này |
| IP | Tối đa 30 yêu cầu gửi/giờ, cấu hình được | Tính cả mạng phòng máy dùng chung IP khi hiệu chỉnh; không tự tin header IP từ client |
| Toàn bộ tài khoản gửi trong web | Tối đa 500 lượt gửi/24 giờ trượt ở giai đoạn đầu | Tính chung mọi loại thư và các lần thử gửi/retry; cập nhật nguyên tử giữa các worker |
| Cảnh báo vận hành | Khi dùng 80% ngân sách ứng dụng hoặc có lỗi quota từ SMTP | Hiển thị cho quản trị viên/ghi metric, không tự gửi thêm thư cảnh báo bằng tài khoản đang hết quota |

- **MAIL-03:** ngân sách web không đo được đầy đủ thư giảng viên gửi ngoài ứng dụng và không bảo đảm Google không chặn sớm. Giữ khoảng dự phòng cho thư công việc, dừng gửi khi nhà cung cấp từ chối quota dù bộ đếm web chưa đạt trần.
- **MAIL-04:** giữ chỗ ngân sách gửi nguyên tử trước khi giao SMTP; các worker dùng kho SQL chung. Dùng idempotency để request lặp không sinh thêm thư; rate limit không chỉ nằm trong bộ nhớ một process. Alias cùng tài khoản không tạo ngân sách mới.
- Vượt giới hạn phía ứng dụng: trả lỗi rate limit phù hợp kèm Retry-After nếu xác định được; không xếp hàng vô hạn. Tránh phản hồi khác nhau làm lộ tài khoản trong luồng recovery.
- SMTP báo hết quota: tạm dừng kênh gửi, thông báo dịch vụ tạm thời không khả dụng; không retry dồn dập. Lỗi xác thực/cấu hình phải chờ sửa cấu hình; lỗi tạm thời dùng backoff và số lần thử hữu hạn.
- Worker kiểm lại tuổi thọ challenge trước mỗi lần gửi; không gửi OTP hết hạn hoặc mã đã bị thay bằng lần gửi lại. SMTP timeout sau khi gửi có thể có kết quả không rõ, nên không hứa gửi chính xác một lần; xử lý trạng thái không chắc chắn và tránh sinh mã mới trong mỗi retry.
- Khi kênh mail tạm dừng, đăng nhập mật khẩu hiện có và Google đã liên kết vẫn hoạt động nếu không cần bước xác minh email bổ sung. Không nới kiểm tra email hay cấp quyền để né lỗi gửi mail.

### 8.4. Vận hành và phương án thay thế

- Theo dõi số thư theo cửa sổ trượt, số resend, lỗi/quota và backlog; không log địa chỉ email đầy đủ nếu không cần cho xử lý sự cố. Google/SMTP quyết định chấp nhận gửi; số liệu web chỉ phản ánh phần web sử dụng.
- Khi lưu lượng tăng hoặc ảnh hưởng thư giảng dạy, chuyển sang hộp thư riêng của Lab, SMTP relay do trường cấu hình hoặc dịch vụ transactional email. Đây là hướng mở rộng, chưa thay lựa chọn tài khoản giảng viên hiện đã xác nhận. Relay có hạn mức/chính sách riêng, không áp dụng mặc định con số Gmail SMTP.
- Phục hồi sự cố: tắt cờ gửi mail/tự đăng ký email, ngừng worker nhận thêm thư; hết hạn hoặc hủy challenge không còn dùng được. Giữ nguyên tài khoản và dữ liệu hiện có; cập nhật credential/nhà cung cấp rồi thử lại trên staging trước khi bật. Không rollback schema hoặc xóa user chỉ để xử lý lỗi SMTP.

## 9. Thứ tự triển khai

1. Chốt định dạng MSSV, Workspace/alias; xác minh tài khoản giảng viên, quyền SMTP, quota và mô hình worker theo §8; hoàn thiện API contracts/trạng thái, schema và quyền duyệt. Điền cấu hình thật chỉ trong môi trường server.
2. Migration, domain/repository, challenge dùng một lần, limiter dùng chung, ngân sách gửi trượt, mail sender/outbox và mẫu thư tiếng Việt. Kiểm thử quota/retry bằng SMTP giả trước khi thử hộp thư thực.
3. Đăng ký email + OTP + hoàn tất + chờ duyệt; quản trị viên duyệt/từ chối và gửi thông báo.
4. Google verifier + nonce + liên kết tài khoản + cấp phiên chung; kiểm tương thích với bảo vệ session hiện tại.
5. Trang login/register/xác minh/chờ duyệt; bổ sung quên mật khẩu và quản lý phương thức đăng nhập trong hồ sơ.
6. Test tập trung, typecheck/build, thử thực tế hai miền trên staging; sau đó bật cờ tính năng cho production.

Mỗi giai đoạn có thể review độc lập; chỉ coi luồng hoàn tất khi cả UI, API, gửi mail, phân quyền và trạng thái lỗi đã nối xuyên suốt. Các kiểm tra tự động không dùng dữ liệu thật của database đang cấu hình.

## 10. Tiêu chí nghiệm thu

- Sinh viên mới: Google tạo đúng một tài khoản STUDENT; đăng ký OTP tạo được tài khoản và đăng nhập mật khẩu được.
- **AC-GOOGLE-ONBOARDING-01:** Google mới chưa có mật khẩu phải hoàn thiện họ tên, khoa/phòng ban, số điện thoại và đặt/xác nhận mật khẩu; email bất biến. Trước hoàn tất, cả UI và API nghiệp vụ bị chặn; không vượt qua bằng URL trực tiếp, bearer token, sửa profile hoặc endpoint thêm mật khẩu cũ. Lưu nguyên tử và thu hồi phiên; không yêu cầu SMTP cho bước này.
- **AC-ACCOUNT-DETAILS-01:** email và Google dùng chung biểu mẫu; mỗi luồng chỉ đặt mật khẩu một lần. Đăng ký OTP lưu hồ sơ đầy đủ cùng password hash và vào dashboard STUDENT, không qua Google setup. Thiếu/trắng số điện thoại hoặc khoa/phòng ban bị chặn ở client và server, không tạo user/cập nhật mật khẩu một phần. Google cần OTP không mở một form đặt mật khẩu trung gian.
- **AC-GOOGLE-ONBOARDING-02:** Google giảng viên chưa duyệt không nhận phiên; duyệt xong đăng nhập lại vẫn phải hoàn thiện. Không tự gán quyền theo dữ liệu biểu mẫu, không sửa email hoặc role trong bước này.
- **AC-SCHOOL-LOGIN-01:** tài khoản mới đăng ký hoặc admin tạo (trừ ADMIN) dùng email trường làm username; không sinh hậu tố ngẫu nhiên hoặc nhận tên đăng nhập tùy chọn. Tài khoản cũ có mật khẩu giữ cách đăng nhập để chuyển đổi sau; không tự thay email ngoài trường bằng email giả.
- Giảng viên mới qua cả hai cách: xác minh xong chờ duyệt, chưa truy cập dashboard; duyệt xong đăng nhập được với TEACHER; từ chối có thông báo phù hợp.
- Admin/tài khoản cũ: đăng nhập như hiện tại, không bị đổi role hoặc ép xác minh đồng loạt; Google không tự chiếm tài khoản trùng email.
- Email đã có tài khoản không được bắt đầu đăng ký lại: request-code/resend trả `409 ACCOUNT_EXISTS`, không tạo challenge hay outbox mới. Nếu tài khoản xuất hiện sau khi đã gửi OTP, verify không cấp registration grant; nếu xuất hiện sau verify, complete không ghi đè tài khoản.
- Một người có thể liên kết Google sau xác thực lại, rồi dùng cả mật khẩu lẫn Google trên cùng userId.
- Sai miền, forged/expired/wrong-audience Google token, nonce replay, thiếu xác minh Workspace đều bị xử lý đúng; người hủy Google vẫn dùng form được.
- OTP sai/hết hạn/đã dùng, gửi lại, nhập song song, nhiều worker và đổi email giữa các bước không vượt kiểm tra; resend không reset số lượt dò.
- Hai request tạo tài khoản/duyệt cùng lúc không tạo trùng user, identity, role hay session ngoài ý muốn.
- Khóa/xóa/từ chối tài khoản không bị vượt qua bằng đăng ký lại, Google hay reset password.
- Recovery không tiết lộ tài khoản, grant sai mục đích bị từ chối; reset thu hồi phiên cũ.
- Thiếu SMTP, timeout và lỗi gửi có thông báo/retry đúng; không lộ mã/token/password trong log hoặc response.
- **AC-MAIL-01 → MAIL-01/02:** người nhận thấy đúng người gửi đã cấu hình; số OTP/resend/thông báo được cộng chung vào ngân sách web. Gửi thử hai miền trên staging chỉ sau khi có cấu hình và phạm vi gửi thật.
- **AC-MAIL-02 → MAIL-03/04:** nhiều worker gửi đồng thời không vượt ngân sách ứng dụng; cửa sổ trượt không reset ở 0 giờ, alias không cấp thêm quota, retry không bỏ qua bộ đếm.
- **AC-MAIL-03 → §8.3:** kiểm ranh giới 60 giây, giới hạn email/mục đích/IP/toàn cục; giả lập quota rejection, auth error, temporary failure và timeout không rõ kết quả. Không cần gửi đủ 2.000 thư thật để test giới hạn.
- **AC-MAIL-04 → §8.3/8.4:** khi tạm dừng mail, không báo giả đã gửi/không gửi mã hết hạn; login hiện có vẫn hoạt động. Đổi cấu hình sender/khôi phục worker không cần sửa rule đăng ký hay xóa dữ liệu user.
- **AC-OTP-01 → OTP-01/02:** riêng từng luồng đăng ký và quên mật khẩu, khi chưa chạm giới hạn tổng và hết cooldown, chấp nhận lần đầu và 5 lần gửi lại; từ chối lần gửi lại thứ 6. Kiểm cả request đồng thời, reload, trình duyệt mới và challenge mới không cấp thêm lượt.
- **AC-OTP-02 → §5:** resend vô hiệu mã cũ và giữ số lượt nhập sai tích lũy; hết lượt resend vẫn xác minh được mã mới nhất nếu còn hạn/chưa hết số lượt nhập sai. Kiểm thời điểm mở lại ngân sách bằng clock giả, không phải chờ thật một giờ.
- **AC-RECOVERY-01 → RECOVERY-01:** nhập email → nhận OTP → verify → grant → đặt mật khẩu → đăng nhập bằng mật khẩu mới; mật khẩu cũ và mọi phiên cũ không dùng được sau thành công. Thông báo email không chứa mật khẩu.
- **AC-RECOVERY-02 → RECOVERY-01/§5:** không thể đặt mật khẩu khi chưa verify; OTP/grant sai, hết hạn, đã dùng, sai mục đích, khác email/browser flow hoặc email tài khoản đã thay đổi đều bị từ chối. Hai request reset cùng grant chỉ một request thành công.
- **AC-RECOVERY-03 → RECOVERY-01:** phản hồi yêu cầu gửi mã không phân biệt email tồn tại/Google-only/chờ duyệt; kiểm trạng thái qua đường khác cũng không làm lộ tài khoản. Reset không kích hoạt tài khoản khóa/chưa duyệt và không tự tạo mật khẩu cho Google-only.
- **AC-EMAIL-DESIGN-01 → EMAIL-DESIGN-01:** hai mẫu dùng màu/nhãn LHU IT LAB từ website; OTP có thể copy đủ 6 số, thời hạn khớp server, không còn token chưa thay trong thư gửi. HTML/plain text có cùng mã/mục đích/thời hạn; không lộ mã qua subject/preheader.
- **AC-EMAIL-DESIGN-02 → EMAIL-DESIGN-01:** kiểm layout desktop/mobile, CSS bị strip, ảnh bị chặn và dark mode; ghi nhận kiểm thử email client thực riêng với kiểm tra browser preview. Trang preview không được gửi làm body email.
- Desktop/mobile, bàn phím, dán OTP, autofill, focus/lỗi, reload bước xác minh và nội bộ redirect hoạt động.
- Regression auth-session-security và API thiết bị; Vitest mục tiêu, typecheck, build. SQL integration dùng DB test riêng; Google/mail E2E cần cấu hình staging thực.

## 11. Quyết định còn mở

- MSSV chỉ gồm số hay có cả chữ, độ dài thực tế; chưa biến ví dụ thành regex cứng.
- Hai miền có được quản lý bởi Google Workspace không, có chung tenant/alias không; giá trị `hd` hợp lệ.
- Đã chọn tài khoản giảng viên cho giai đoạn đầu; còn UNKNOWN quyền SMTP/App Password hoặc OAuth/relay, quota cụ thể, domain website production và mô hình chạy worker. Owner: chủ tài khoản/quản trị viên trường xác nhận quyền và quota; người triển khai xác minh cấu hình trên staging.
- Đã chốt tối đa 5 lần gửi lại cho đăng ký và quên mật khẩu theo OTP-01. Cửa sổ 60 phút, cooldown và các ngưỡng tổng ở §8.3 vẫn là đề xuất kỹ thuật; cần hiệu chỉnh theo lưu lượng thực tế và mạng dùng chung IP, không trình bày như luật đã duyệt riêng từng con số.
- Khi nào cần đối chiếu danh sách sinh viên đang học; hiện chỉ xác minh email trường.

Các mục này là thông tin để triển khai, không cản trở việc review kế hoạch. Chính sách giảng viên chờ duyệt đã chốt.

## 12. Nguồn kỹ thuật

- [Google: xác minh ID token tại server, hosted domain và liên kết theo sub](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- [Google: web client ID, JavaScript origins và thiết lập Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
- [OWASP: recovery, phản hồi thống nhất, rate limit và bằng chứng một lần](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
- [Google: hạn mức Gmail trong Workspace, cửa sổ 24 giờ trượt và thời gian ngừng gửi](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace).
- [Google: gửi thư từ ứng dụng bằng Gmail SMTP hoặc SMTP relay](https://knowledge.workspace.google.com/admin/gmail/send-email-from-a-printer-scanner-or-app).
- [Google: App Password, xác minh hai bước và hạn chế với tài khoản tổ chức](https://support.google.com/accounts/answer/185833?hl=vi).

Số lượt gửi lại 5 tại OTP-01 và recovery qua OTP tại RECOVERY-01 là yêu cầu người dùng đã xác nhận. Các thông số còn lại về độ dài mã, thời hạn, ngân sách tổng, cấu trúc bảng/API và mật khẩu là đề xuất cho dự án; không phải giá trị mặc định do Google/OWASP quy định. Con số 2.000 thư/24 giờ tại §8.1 là thông tin Google công bố, cần xác minh lại trước triển khai cho tài khoản thực tế.

## 13. Bằng chứng cập nhật kế hoạch

Phần này ghi giai đoạn chỉ thiết kế trước khi người dùng yêu cầu triển khai web. Trạng thái hiện tại xem §14.

- Task: cập nhật kế hoạch và tạo mẫu HTML/plain text/preview theo màu website; tài khoản giảng viên gửi mail, resend 1 + 5 và recovery bằng OTP đã được ghi nhận. Chưa triển khai backend gửi mail/auth.
- Đã đối chiếu quyết định của chủ dự án, quy tắc tài liệu/phạm vi/secret trong playbook, thông tin hạn mức và thiết lập SMTP từ Google ngày 03/11/2026.
- Kiểm tra tài liệu: nội dung, link file nội bộ, tính nhất quán CONFIRMED/PROPOSED/UNKNOWN; AC-MAIL, AC-OTP và AC-RECOVERY liên kết tới rule/luồng liên quan. Thay đề xuất cũ 5 tổng lượt/giờ bằng 1 đầu + 5 resend, cập nhật trần tổng đề xuất từ 10 thành 12 để tránh mâu thuẫn với hai ngân sách.
- Mẫu email: PASS kiểm tra cấu trúc/biến/HTML/plain text, render local desktop 1000px và mobile 375px/320px không tràn ngang, chuyển hai mẫu hoạt động. Có ảnh và giới hạn kiểm tra tại [README mẫu email](../../designs/auth-emails/README.md). Bộ dò thiết kế có WARN font/đường nhấn được ghi nhận tại đó.
- SMTP/Google/DB và email client thực tế: NOT_RUN — chưa xác minh tài khoản gửi, chưa gửi email thật hoặc chạy migration. Unit/integration/build backend: N/A cho thay đổi tài liệu và mẫu HTML tĩnh này; các kiểm thử chức năng ở §10 là việc phải làm khi triển khai, chưa phải kết quả PASS.

## 14. Triển khai mã nguồn và bàn giao local

### Đã thực hiện

- UI biểu mẫu tinh gọn trong bố cục cũ hai cột (đính chính ngày 04/11): `/login`, `/register`, `/forgot-password`, bước OTP/hoàn tất/reset, `/registration-status`, `/set-password`, `/change-email`; liên kết giữa các trang hoạt động, giữ login mật khẩu hiện có.
- Backend use case/ports/store SQL riêng: OTP HMAC, browser binding HttpOnly, grant một lần, role cố định theo miền, giới hạn 1 + 5 resend/60 phút trượt, cooldown 60 giây, attempt budget không reset khi resend, quota/IP dùng chung nhiều worker.
- Google ID token verify bằng Google Auth Library, nonce một lần, subject `sub` unique; không tự gộp theo email. Chưa xác nhận được hosted domain thì đăng ký Google phải xác minh thêm email. Liên kết tài khoản cũ yêu cầu Google Workspace cùng email/hosted domain được cấu hình và mật khẩu hiện tại.
- Cấp session dùng chung `IssueSession`; cập nhật LastLoginAt có kiểm trạng thái/hash hiện hành, tránh ghi đè profile/status từ bản đọc cũ. Tài khoản chờ duyệt không nhận session dashboard.
- Đăng ký giảng viên INACTIVE, chưa có role TEACHER; phần duyệt/từ chối trong Quản lý người dùng, quyền riêng, quyết định có actor/target audit và ghi chú.
- Quên mật khẩu bằng OTP, thu hồi phiên sau đổi; thiết lập mật khẩu cho Google-only và đổi email hai hộp thư trong phần Phương thức đăng nhập của Hồ sơ. Email đã xác minh không còn sửa trực tiếp trong form chung.
- Worker gửi SMTP riêng (`npm run auth:mail-worker`), payload outbox mã hóa, retry hữu hạn, bỏ mã hết hạn/đã thay, circuit khi provider báo quota gửi hoặc xác thực sender thất bại, audit mốc 80% ngân sách. Lỗi quota hộp thư của một người nhận không làm dừng cả hệ thống. Bộ đếm web không đo được thư công việc gửi ngoài ứng dụng.
- Template HTML/plain text đã nối runtime tại `src/server/infrastructure/email/templates/`; Swagger có contract các endpoint mới. `.env.example` có tên cấu hình, không có credential thật.

### Bằng chứng đã chạy

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm run typecheck` | PASS | Kiểm kiểu, không chứng minh SQL thật |
| `npx vitest run` | PASS — 17 files, 181 tests | Repository/SMTP/Google giả lập; gồm các kiểm thử hồi quy có sẵn, tạm dừng/khôi phục sender và cờ gửi mail |
| `npm run build` | PASS — compile, TypeScript và sinh trang production | Không deploy |
| Browser local | PASS — 1440px, 480px, 320px; không tràn ngang, không runtime exception trong các luồng đã thử | API auth bị chặn và thay bằng dữ liệu giả, không chạm DB/mail thật |
| Luồng browser | OTP reset → kiểm xác nhận mật khẩu → cập nhật; đăng ký giảng viên → OTP → họ tên/mật khẩu → chờ duyệt; reload bước OTP | Chưa thử Google popup thật hoặc mail client thật |
| SQL Server / Google thật / SMTP thật | NOT_RUN | Chưa có DB test tách riêng, Client ID/hd và credential SMTP; chưa chạy migration trên DB đang cấu hình |

Ảnh và log kiểm tra tại [gallery](../../designs/auth-pages/index.html), [ui-checks.json](../../designs/auth-pages/ui-checks.json). Phiên bản local mặc định để Google/đăng ký mới tắt cho tới khi cấu hình hợp lệ; API trả lỗi khả dụng thật, không báo giả đã gửi mã.

### Trước khi bật trên môi trường được chọn

1. Chọn DB test/staging tách khỏi DB đang dùng, sao lưu và review migration 031 cùng các migration còn pending trước khi chạy `npm run db:migrate`. Agent chưa chạy lệnh này trên DB thật.
2. Điền cấu hình server trong môi trường thích hợp: SMTP của tài khoản giảng viên đã được cấp quyền gửi, MAIL_FROM; AUTH_OTP_SECRET ngẫu nhiên riêng ≥32 ký tự và AUTH_EMAIL_ENCRYPTION_KEY riêng 64 ký tự hex. Không dùng lại các khóa hiện có hoặc đưa vào NEXT_PUBLIC/source/docs. Backend/.env được hỗ trợ fallback; biến môi trường/root `.env` có ưu tiên.
3. Tạo Google OAuth web client, cấu hình đúng origins và xác minh `hd` thực tế của trường (bao gồm alias), điền GOOGLE_CLIENT_ID và GOOGLE_ALLOWED_HOSTED_DOMAINS. Phương thức SMTP đang triển khai là App Password; nếu trường chặn thì cần cấu hình phương án gửi được IT cho phép trước khi bật.
4. Sau migration/config, bật AUTH_EMAIL_ENABLED, chạy `npm run auth:mail-worker -- --verify` để kiểm kết nối/xác thực SMTP mà chưa gửi thư. Bật SELF_REGISTRATION_ENABLED/GOOGLE_AUTH_ENABLED phù hợp và chạy worker Node bền vững qua trình quản lý tiến trình. Nếu môi trường serverless cần worker/job ngoài; không dựa vào request web để gửi outbox.
5. Kiểm SMTP bằng hộp thư test được chỉ định, Google thật, SQL transaction/concurrency và HTTPS/proxy/cookie. Điều chỉnh AUTH_EMAIL_IP_HOURLY_LIMIT cho mạng trường dùng chung IP; chỉ bật TRUST_PROXY khi proxy kiểm soát header thật.
6. Khi lỗi dịch vụ: tắt AUTH_EMAIL_ENABLED/cờ đăng ký và ngừng worker gửi mới, giữ nguyên tài khoản; drain/expire outbox trước khi đổi khóa mã hóa. Khi SMTP đã được sửa, dừng worker cũ rồi chạy `npm run auth:mail-worker -- --resume` để xác minh SMTP, bỏ trạng thái tạm dừng và tiếp tục; bộ đếm gửi thật vẫn giữ nguyên. Kiểm kết nối không chứng minh quota gửi đã phục hồi; nếu provider tiếp tục từ chối thì circuit dừng lại. Không tự rollback/xóa dữ liệu để sửa SMTP.

Các phần này là điều kiện vận hành còn lại, không phải bằng chứng đã chạy. Không có deployment, migration, gửi thư thật hoặc thay credential trong lần triển khai local này.

Review giao diện độc lập ngày 03/11: **ship** cho phiên bản navy trước đính chính; không dùng kết quả đó thay bằng chứng của bố cục cập nhật. Quy tắc thiết kế được đồng bộ tại `DESIGN.md` và `.impeccable/design.json`.

### Đính chính giao diện ngày 04/11/2026

- Khôi phục cột giới thiệu/brand/nền lưới và ba ô thông tin từ trang login cũ trong git; cột phải giữ nền sáng. Khung biểu mẫu trắng dùng cấu trúc tinh gọn, không còn nền navy toàn trang. Google dùng theme outline chính thức; các trạng thái OTP/lỗi/cooldown giữ nguyên hành vi.
- `npm run typecheck`: PASS. Browser local: PASS tại 1533px, 1440px, 1024px, 768px, 480px, 320px, không tràn ngang hoặc runtime exception; kiểm lại reset OTP, lỗi xác nhận mật khẩu, đăng ký giảng viên đến chờ duyệt và reload bước OTP. Xác nhận cột giới thiệu hiện từ 1024px và ẩn dưới ngưỡng này. API auth được chặn/thay bằng dữ liệu giả, không gọi DB/mail thật. Ảnh trong gallery và `ui-checks.json` đã cập nhật.
- 181 tests/17 files và production build ở bảng trên là bằng chứng của lần triển khai 03/11; không chạy lại toàn bộ test backend cho chỉnh sửa bố cục/màu này. Google/SMTP/SQL thật vẫn NOT_RUN như trước.
- Review bố cục trước lần đổi màu mới nhất: **ship**. Đã sửa phát hiện viền input quá nhạt bằng `#8291a5`, tương phản 3,21:1 trên nền trắng; reviewer xác nhận ảnh desktop/mobile không có hồi quy. Detector phạm vi layout: 0 findings. Chấp nhận giữ chi tiết bố cục/nền/ba ô thông tin từ giao diện cũ theo yêu cầu đính chính; không biến quy tắc của skill thành yêu cầu thay nhận diện.

### Bảng màu form theo ảnh mới nhất ngày 04/11/2026

**CONFIRMED — WEB-AUTH-COLOR-01:** chủ dự án yêu cầu quay về màu form cũ: nút #297ef5 (hover #2563eb), viền input #e2e8f0, icon/placeholder #94a3b8, nền trắng và bóng nhẹ. Thay quyết định viền đậm #8291a5 của lần review trước. Giữ bố cục hai cột và toàn bộ nghiệp vụ. Focus, nhãn truy cập, hiện/ẩn mật khẩu và lỗi vẫn hoạt động; số liệu tương phản của bảng màu trước là lịch sử, không phải chứng nhận WCAG cho bảng màu người dùng vừa chọn. Chỉnh sửa lần này chỉ CSS và tài liệu/ảnh; kiểm browser bằng API giả, không gọi SQL, Google hay SMTP thật.

## 15. Tiếp tục bật Google trên database phát triển — 04/11/2026

Chủ dự án xác nhận dùng database phát triển đang cấu hình. Ban đầu chưa có Client ID; sau hướng dẫn đã tạo OAuth Web client và cung cấp Client ID để cấu hình. Đây là phạm vi chuẩn bị môi trường mới, bổ sung cho lịch sử chỉ kiểm local tại §14.

### Phần đã chuẩn bị

- `npm run auth:check -- --database`: chỉ SELECT, không migration/gửi mail. Kiểm thực tế thấy thiếu schema 031; các role ADMIN/STUDENT/TEACHER và bảng AuthSessions có sẵn. Còn pending 027, 028, 031; không tự áp dụng hai migration thiết bị ngoài phạm vi auth.
- Đã thêm AUTH_OTP_SECRET và AUTH_EMAIL_ENCRYPTION_KEY ngẫu nhiên vào `backend/.env`, cùng các cờ Google/đăng ký/mail tắt và chỗ trống Client ID/hosted domains. Không in/lưu giá trị khoá trong tài liệu hoặc log, không đổi credential DB/JWT/SMTP hiện có. `.env` và `backend/.env` được git ignore.
- `npm run auth:google-setup -- --apply-migration` đã thử riêng 031 trong transaction: **ROLLED_BACK**, SQL code 1088. Kiểm quyền xác nhận ALTER Users = 0, CREATE TABLE = 0, ALTER dbo schema = 0. Không báo schema đã triển khai. Script hiện preflight quyền trước khi thử DDL.
- Đã xuất [SQL UP-only cho người quản lý DB](../../database/operations/031_SelfServiceAuth.up.sql), có transaction/rollback và ghi migration history. Chọn đúng database phát triển trong SSMS rồi dùng tài khoản quản trị/migration để chạy file này. Không chạy toàn bộ file migration gốc bằng SSMS vì file gốc có cả phần DOWN. Không cấp db_owner cho tài khoản ứng dụng chỉ để chạy migration.
- Google UI có timeout tải thư viện 12 giây, nút thử lại khi lỗi kết nối, chặn gửi lặp trong lúc xử lý. Bổ sung COOP `same-origin-allow-popups` cho login/register/profile và Referrer-Policy phù hợp localhost/production theo hướng dẫn Google.
- Kiểm thử mới dùng token RS256 ký bằng khoá thử nghiệm cục bộ, thư viện Google Auth thật, chỉ thay nguồn public key. Từ chối sai chữ ký/audience/issuer/hết hạn, email chưa xác minh hoặc thiếu nonce/sub/email. HTTP Google dùng dịch vụ cấp cookie chung, không trả token qua JSON và không cấp phiên cho giảng viên chờ duyệt.
- `npx vitest run`: **PASS — 18 files, 193 tests**. `npm run build` và `npm run typecheck`: **PASS**. Typecheck được chạy lại sau khi build hoàn tất vì chạy đồng thời lúc đầu gặp file type Next đang được tạo lại; không thay tsconfig để né kiểm tra. Đây là kiểm thử code/local; chưa có Google Client ID thật hay schema 031 trên DB này. Kiểm provider/transaction SQL thực và gửi thư vẫn chưa hoàn tất.
- Browser Google giả lập: **PASS** tải thư viện lỗi → thử lại → nút sẵn sàng; nhấp đúp chỉ gửi một lần; kết quả giảng viên chuyển tới trang chờ duyệt. [Bằng chứng](../../designs/auth-pages/google-ui-checks.json) ghi rõ Google library và API đều bị thay bằng dữ liệu giả. HEAD `/login` xác nhận COOP/Referrer-Policy mới; kiểm SQL xuất ra chỉ chứa UP và có rollback: PASS.

### Chủ dự án tạo Google OAuth Client ID

Theo [hướng dẫn Google cập nhật](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), thực hiện:

1. Mở [Google Cloud — Clients](https://console.cloud.google.com/auth/clients), chọn hoặc tạo project cho LHU IT LAB.
2. Trong Google Auth Platform → Branding, đặt tên ứng dụng LHU IT LAB, chọn email hỗ trợ/liên hệ của chủ dự án và lưu. Cấu hình Audience cho những tài khoản dự định thử. Nếu hai miền không thuộc cùng Workspace tenant đã xác nhận, dùng External; nếu ứng dụng ở trạng thái Testing, thêm tài khoản thử theo yêu cầu của Console. Không mặc định hai miền cùng tenant.
3. Vào Clients → Create client → Web application. Đặt tên dễ nhận biết, ví dụ LHU IT LAB Local.
4. Authorized JavaScript origins: thêm `http://localhost` và `http://localhost:3000`. Origin không có `/login` hoặc đường dẫn khác. Thêm origin HTTPS thực tế khi triển khai. Luồng hiện tại dùng JavaScript callback nên không cần tự đặt redirect URI.
5. Copy Client ID dạng `...apps.googleusercontent.com` gửi cho người triển khai hoặc điền vào GOOGLE_CLIENT_ID. Không cần Client Secret, không xin quyền Gmail, không dùng mật khẩu email làm Client ID. Không ghi khoá nội bộ vào Google Console.

### Sau khi có Client ID và DB đã chạy 031

- Điền GOOGLE_CLIENT_ID trong server env. Chỉ điền GOOGLE_ALLOWED_HOSTED_DOMAINS sau khi xác nhận `hd` thật của trường/alias; không suy đoán từ đuôi email. Với miền Workspace được cho phép, sinh viên mới có thể tạo tài khoản qua Google mà không cần SMTP. Nếu chưa xác minh hosted domain, luồng yêu cầu OTP và cần cấu hình SMTP; không bỏ qua kiểm tra này để chạy thử.
- Bật GOOGLE_AUTH_ENABLED=true và SELF_REGISTRATION_ENABLED=true khi sẵn sàng cho tài khoản mới. Giữ AUTH_EMAIL_ENABLED=false nếu chưa chuẩn bị SMTP; Google không tự cấp quyền gửi email.
- Khởi động lại server để nhận env mới, chạy `npm run auth:check -- --database`, sau đó thử tài khoản sinh viên và giảng viên thật. Chủ tài khoản tự chọn/đăng nhập Google trong trình duyệt. Xác nhận STUDENT, chờ duyệt TEACHER, tài khoản email trùng không tự liên kết và cookie phiên hoạt động.
- Không đánh dấu Google dùng thật thành công chỉ vì nút xuất hiện hoặc Client ID đúng định dạng; cần kết quả xuyên suốt trình duyệt → Google → server → database → phiên.

### Đã nhận Client ID — 04/11/2026

- Đã lưu GOOGLE_CLIENT_ID trong `backend/.env` trên máy phát triển, không lưu Client Secret được gửi kèm. Luồng GIS ID-token không dùng Client Secret; đã hướng dẫn chủ tài khoản thu hồi/đổi secret vì đã chia sẻ qua chat.
- Chủ dự án chọn origin triển khai `https://lab.fitlhu.com`; ảnh Console cho thấy đã nhập origin này cùng `http://localhost` và `http://localhost:3000`. Chưa xác minh cấu hình server/deployment trên tên miền thật.
- Kiểm tra tại thời điểm nhận Client ID: schema còn thiếu và tài khoản ứng dụng chưa có DDL nên cờ Google/đăng ký còn tắt. Đây là lịch sử trước khi chủ dự án cung cấp kết nối quản trị; trạng thái hiện tại tại §16.
- OAuth Console đang ở chế độ Testing theo ảnh: cần tài khoản thử phù hợp trong Audience. Chưa có kết quả đăng nhập Google thật; bước tiếp theo là người có quyền quản trị DB chạy bản UP-only, sau đó kiểm schema và đăng nhập bằng tài khoản trường trong trình duyệt.

## 16. Đã áp dụng schema và bật Google local — 04/11/2026

Chủ dự án cung cấp kết nối quản trị SQL và yêu cầu thực hiện trực tiếp trên server/database phát triển đang cấu hình. Thông tin quản trị chỉ dùng trong bộ nhớ của tiến trình migration qua stdin không echo; không ghi vào source, `.env`, log hoặc tài liệu. Tài khoản kết nối ứng dụng vẫn giữ nguyên.

- Xác nhận đúng `ItLabManagerDb` trên server được chỉ định, quyền quản trị hợp lệ; dung lượng cấp phát 80 MB. Trước migration có 20 user.
- Tạo bản sao lưu COPY_ONLY có CHECKSUM trong thư mục backup mặc định của SQL Server và chạy RESTORE VERIFYONLY thành công. File: `ItLabManagerDb_before_auth031_1793761206489_a757ce19.bak`. Không sao chép dữ liệu backup ra máy phát triển.
- Chạy riêng bản UP của 031 trong transaction: **APPLIED**, migration history ghi nhận đúng một dòng. Sau migration vẫn 20 user; không seed/xoá/tạo user và không chạy các migration thiết bị 027/028.
- `npm run auth:check -- --database` bằng tài khoản ứng dụng cũ: **SCHEMA_PRESENT**, không thiếu bảng/cột, đủ quyền DML trên năm bảng mới; tài khoản này vẫn không có ALTER Users/CREATE TABLE/ALTER schema. Không cấp db_owner cho ứng dụng.
- Đã bật GOOGLE_AUTH_ENABLED và SELF_REGISTRATION_ENABLED trong server env local, khởi động lại Next dev để nhận cấu hình. AUTH_EMAIL_ENABLED vẫn tắt; chưa đoán/gán GOOGLE_ALLOWED_HOSTED_DOMAINS khi chưa có bằng chứng `hd`.
- Kiểm API thật trên localhost: config bật Google và đúng Client ID; lấy CSRF rồi POST google/nonce thành công HTTP 200, tạo challenge trong SQL Server, browser binding cookie HttpOnly. Không in nonce/token/cookie và không tạo user.
- Kiểm trình duyệt với Google Identity Services thật, không chặn/thay API: nút Google chính thức render thành công, không runtime exception. [Ảnh](../../designs/auth-pages/google-ready.png), [báo cáo giới hạn](../../designs/auth-pages/google-provider-checks.json). Chưa bấm chọn tài khoản hoặc gửi Google credential; chưa chứng minh login/role/session xuyên suốt.
- Bổ sung thông báo khi chưa xác nhận hosted domain và SMTP đang tắt: trả lỗi cấu hình kèm miền do Google đã ký/xác minh (nếu có), không tạo user, không bỏ qua OTP và không tái dùng nonce. Chủ dự án đăng nhập bằng email trường và cung cấp kết quả để xác nhận miền tiếp theo.
- `npm run typecheck`: **PASS**. Ba file test auth/Google/HTTP mục tiêu: **PASS — 48 tests**, gồm trường hợp cấu hình Workspace/OTP chưa sẵn sàng. Kết quả full suite 193 tests/build PASS ở §15 thuộc phiên bản trước lần thêm thông báo này; không trình bày như đã chạy lại full suite/build.

Phạm vi đã bật là máy phát triển `http://localhost:3000`. Chưa triển khai/cập nhật cấu hình trên `https://lab.fitlhu.com`, chưa gửi mail thật. Bước còn lại cần chủ tài khoản tự chọn tài khoản trường trong Google; nếu Google yêu cầu tài khoản thử, thêm email đó trong Audience → Test users. Xác minh hosted domain hoặc hoàn thiện SMTP trước khi đăng ký lần đầu có thể hoàn tất.

### Đã xác nhận Workspace sau lần thử của chủ dự án

- Chủ dự án cung cấp thông báo server “Cần quản trị viên xác nhận miền Google Workspace lhu.edu.vn …”. Thông báo chỉ phát sinh sau khi token Google/chữ ký/audience/nonce/email đã được kiểm tra; dùng bằng chứng này để cấu hình `GOOGLE_ALLOWED_HOSTED_DOMAINS=lhu.edu.vn`, không suy ra từ đuôi email hoặc tự thêm miền khác.
- Đã khởi động lại Next dev. `npm run auth:check -- --database`: Google/registration bật, hosted domain đã cấu hình, schema đầy đủ và đủ quyền DML bằng tài khoản ứng dụng; SMTP vẫn tắt. Google có `hd=lhu.edu.vn` hợp lệ có thể đi luồng đăng ký trực tiếp; email trường vẫn quyết định STUDENT/TEACHER, giảng viên vẫn chờ duyệt. Miền Workspace khác cần bằng chứng riêng.
- Chỉ thay cấu hình server và tài liệu, không nới kiểm tra Google, không tạo user hoặc tự duyệt giảng viên. Chủ dự án tải lại trang, đăng nhập Google lần nữa để kiểm kết quả tạo tài khoản/phiên thực; chưa ghi nhận kết quả này thành PASS.

## 17. Thu gọn trang Quản lý người dùng — 04/11/2026

Theo yêu cầu chủ dự án, ưu tiên diện tích cho bảng người dùng: thay khung đăng ký giảng viên chờ duyệt bằng nút có số lượng trong hàng thao tác đầu trang. Bấm nút mở hộp thoại có vùng cuộn riêng; đóng bằng Escape và trả focus về nút. Giữ quyền duyệt, ghi chú bắt buộc khi từ chối và API hiện có. Sửa khóa cache thống kê thành `users-summary` để thống kê tải lại sau duyệt.

- Thu gọn ô thống kê từ 96px xuống 72px, giảm khoảng cách và chiều cao hàng; vai trò/trạng thái không xuống dòng. Desktop dành chiều cao còn lại cho bảng cuộn; mobile cuộn trang tự nhiên, hai bộ lọc nằm cùng hàng và bảng cuộn ngang trong khung.
- Đã xoá các nhãn/phần mô tả theo yêu cầu trước đó: “Quản trị hệ thống”, “API trực tiếp”, mô tả đầu trang/danh sách và các chú thích dưới số thống kê.
- `npm run typecheck`: **PASS**. Browser với API giả: **PASS** ở 1280×736, 1440×900, 1024×768, 768×900, 375×812, 320×812; không tràn ngang toàn trang hoặc runtime exception. Tại 1280×736, vùng cuộn bảng cao 380px, thấy 5 hàng đầy đủ; mở hộp duyệt không dịch chuyển bảng. Kiểm empty/error/retry, duyệt/từ chối, ghi chú và Escape/focus bằng dữ liệu giả; không gọi SQL/Google/SMTP thật. [Ảnh desktop](../../designs/users-page/desktop.png), [ảnh hộp duyệt mobile](../../designs/users-page/reviews-mobile.png), [báo cáo](../../designs/users-page/ui-checks.json).

## 18. Hoàn thiện bắt buộc sau Google và tài khoản mới dùng email trường — 04/11/2026

Chủ dự án xác nhận GOOGLE-ONBOARDING-01 và SCHOOL-LOGIN-01: bắt buộc họ tên, khoa/phòng ban, mật khẩu mới/xác nhận; email Google làm tài khoản đăng nhập và không sửa trong bước hoàn thiện. Số điện thoại tùy chọn tại thời điểm này, **đã được thay bằng bắt buộc tại §23**. Sau trao đổi, chủ dự án chọn **chỉ áp dụng chính sách định danh email ngay cho tài khoản mới; tài khoản cũ chuyển đổi sau**. Admin giữ tên đăng nhập riêng.

- Thêm `/complete-account` cùng shell auth hiện có. Sinh viên mới hoặc giảng viên Google đã được duyệt nhưng chưa có mật khẩu được chuyển bắt buộc vào trang này, kể cả khi truy cập URL dashboard trực tiếp. Giảng viên chưa duyệt vẫn không nhận phiên.
- `requiresAccountSetup` được tính từ trạng thái chưa có mật khẩu hiện hành trong DB ở `/auth/me` và mỗi lần xác thực phiên; không tin cờ phía client/token. Next và Express cùng chặn API nghiệp vụ HTTP 403 `ACCOUNT_SETUP_REQUIRED`; phiên chỉ được đọc hồ sơ của mình, hoàn thiện hoặc đăng xuất. Không thể dùng endpoint đổi profile/thêm mật khẩu cũ để vượt bước bắt buộc.
- `POST /auth/account-setup` dùng CSRF/Origin và userId từ phiên; server lấy email/identity Google, kiểm ACTIVE và chưa có mật khẩu. Cùng transaction khóa auth: cập nhật họ tên/khoa/phòng ban/điện thoại, username=email, hash mật khẩu, vô hiệu grant reset/set-password và thu hồi phiên, ghi audit. Xóa cookie và về login; sau đó dùng được Google hoặc email+mật khẩu. Không cần OTP/SMTP, không nhận role/status/email/userId từ biểu mẫu. Hai lần lưu đồng thời chỉ một thành công, lỗi audit rollback hồ sơ/mật khẩu/thu hồi phiên.
- Tài khoản mới qua tự đăng ký dùng email làm username. Admin tạo tài khoản thường cũng phải dùng đúng `@lachong.edu.vn` / `@lhu.edu.vn`, server tự dùng email normalized làm username; UI không mở ô chọn username. Tài khoản ADMIN giữ ngoại lệ. Không đổi username/email hàng loạt, không khóa tài khoản cũ và không thay đổi cơ chế mật khẩu tạm của admin. Schema username hiện tối đa 100 ký tự, có kiểm tra độ dài thay vì cắt dữ liệu.
- Không thêm schema/migration, không đổi env/credential và không tạo user, đổi mật khẩu hoặc gửi mail thật trong lần sửa này. Tài khoản Google-only đã tạo trước bước sửa này cũng được yêu cầu hoàn thiện ở lần đăng nhập tiếp theo vì chưa có mật khẩu; tài khoản cũ đã có mật khẩu giữ luồng hiện có.
- `npx vitest run`: **PASS — 20 files, 219 tests**; `npm run typecheck` và `npm run build`: **PASS**. Kiểm tra browser bằng API giả: **PASS** — URL dashboard → trang bắt buộc, email read-only, khoa/phòng ban required, lỗi mật khẩu không khớp, chống submit lặp, lưu → đăng nhập lại, không gọi API nghiệp vụ và không tràn ngang ở 1440/768/375/320px. [Ảnh desktop](../../designs/auth-pages/account-setup-desktop.png), [ảnh mobile](../../designs/auth-pages/account-setup-375.png), [báo cáo](../../designs/auth-pages/account-setup-checks.json). Chưa thử hoàn thiện bằng tài khoản Google/transaction SQL thực trên DB phát triển; kiểm thử use case dùng store giả, browser thay API, không trình bày như E2E provider/DB thật đã PASS.

## 19. Chẩn đoán tài khoản Google đã duyệt nhưng bị xoá — 04/11/2026

Chủ dự án báo lỗi “Tài khoản chưa được duyệt hoặc không khả dụng.” khi chọn email trường. Kiểm tra SELECT trên DB phát triển xác nhận có một identity Google giảng viên: user ACTIVE nhưng DeletedAt có giá trị, registration APPROVED/có ReviewedAt và role TEACHER. Không có registration PENDING_REVIEW; vì vậy danh sách duyệt trống là đúng dữ liệu, không phải mất yêu cầu duyệt. Google từ chối tài khoản đã xoá đúng chính sách; thông báo gộp khiến chủ dự án hiểu nhầm là chưa duyệt.

- Chủ dự án xác nhận “Khôi phục tài khoản đã được duyệt, giữ nguyên dữ liệu và quyền”. Thực hiện đúng một user qua tài khoản ứng dụng hiện có, khóa auth và transaction với điều kiện user đã xoá/ACTIVE, registration APPROVED, có identity Google và TEACHER. Bỏ DeletedAt, cập nhật thời điểm, thu hồi phiên và ghi audit `USER_RESTORED_SUPPORT` (hỗ trợ ngoài phiên web, không giả danh actor admin). Không tạo user, không đổi password/email/identity/role/registration hoặc duyệt thêm tài khoản khác. Kết quả DB: restored=1, ACTIVE/APPROVED/TEACHER, needsSetup=1.
- Sau kiểm Google token và nonce thành công, trả thông báo riêng cho `ACCOUNT_DELETED`, `ACCOUNT_LOCKED`, `REGISTRATION_REJECTED`; pending thực vẫn trả `pending_review`. Lỗi trạng thái cũng tiêu thụ nonce, không tự khôi phục qua Google. Phản hồi recovery công khai vẫn giữ thống nhất.
- Nút duyệt tải lại danh sách mỗi lần mở để không hiển thị dữ liệu cũ trong cửa sổ cache; trang chờ duyệt bỏ lời hứa chắc chắn gửi email khi SMTP chưa bật và giải thích bước hoàn thiện sau duyệt.
- Hai file test auth/HTTP mục tiêu: **PASS — 52 tests**, có kiểm chờ duyệt → duyệt → đăng nhập lại và lỗi xoá/khóa/từ chối không tạo lại user/không replay nonce. `npm run typecheck`: **PASS**. API local config: HTTP 200, Google enabled. Full suite/build ở §18 là lịch sử trước sửa thông báo/làm mới danh sách này, không coi như đã chạy lại. Chủ tài khoản còn phải thử Google và hoàn thiện hồ sơ thực; kết quả khôi phục DB không thay bằng chứng E2E Google → phiên → hoàn thiện.

## 20. Chuẩn bị SMTP để bật OTP — 04/11/2026

Chủ dự án báo “Chức năng xác minh email chưa sẵn sàng” và yêu cầu bật OTP thật. Kiểm tra cấu hình chỉ xuất boolean xác nhận AUTH_EMAIL_ENABLED=false và chưa có SMTP_HOST/PORT/SECURE/USER/PASSWORD/MAIL_FROM; khóa HMAC và khóa mã hóa outbox đã có. Đây là thiếu cấu hình kênh gửi, chưa phải bằng chứng mã OTP hoặc xác minh mã bị lỗi.

- Chuẩn bị trong `backend/.env`: Gmail SMTP `smtp.gmail.com:465`, TLS, tài khoản gửi `nhatlm@lhu.edu.vn` đã được chọn, tên người gửi LHU IT LAB và APP_ORIGIN localhost. Giữ SMTP_PASSWORD trống và AUTH_EMAIL_ENABLED=false cho tới khi có credential hợp lệ. Không dùng OAuth Client Secret hoặc mật khẩu đăng nhập hộp thư thay cho App Password.
- Cần chủ hộp thư tạo App Password theo chính sách Workspace, điền trực tiếp vào SMTP_PASSWORD trong env được ignore; không gửi secret qua chat. Chủ dự án yêu cầu hướng dẫn tạo App Password và cho phép gửi OTP thử tới `nhatlm@lhu.edu.vn`. Chưa có App Password, chưa bật cờ/chạy worker gửi và chưa gửi thư thật. Kiểm kết nối TLS tới Gmail SMTP: PASS, chứng chỉ hợp lệ; chưa xác thực sender. Worker `--verify` dừng đúng vì cờ tắt/thiếu credential. Bước tiếp theo: xác minh kết nối/xác thực SMTP sau khi owner điền credential, bật cờ và khởi động worker/web, thử OTP tới đúng hộp thư đã được chỉ định rồi xác nhận verify/resend.
- Google xác nhận App Password cần xác minh hai bước và có thể không khả dụng với tài khoản trường/tổ chức; nếu trường chặn thì cần SMTP relay/OAuth2 do quản trị viên cho phép. [Hướng dẫn Google được kiểm tra lại](https://support.google.com/accounts/answer/185833?hl=vi). Không báo OTP thật đã hoạt động khi chưa xác thực sender và nhận/verify được thư thử.

### Đã xác thực SMTP và gửi một OTP thử

- Sau khi chủ hộp thư cung cấp credential, đã lưu vào `SMTP_PASSWORD` trong `backend/.env` được git ignore; không đưa giá trị vào source/tài liệu/log. Nodemailer kiểm kết nối/xác thực Gmail SMTP: **PASS**. Bật `AUTH_EMAIL_ENABLED=true`, khởi động lại Next dev và chạy worker gửi nền. `auth:mail-worker --verify`: **PASS**, bước verify này không gửi thư. Chỉ cấu hình máy phát triển, chưa triển khai tên miền thật.
- API local `/api/auth/config`: **HTTP 200**, registration/password reset khả dụng. Yêu cầu thật có CSRF tới `/api/auth/register/request-code` cho đúng hộp thư được cho phép `nhatlm@lhu.edu.vn`: **HTTP 200**, tạo challenge và outbox mã hóa trong SQL. Worker gửi **một thư OTP thử**, Gmail chấp nhận; kiểm SELECT xác nhận outbox `SENT`, `Attempts=1`, payload đã xóa. Không tạo tài khoản hoặc thay mật khẩu/quyền.
- Kiểm tra tự động sau gửi dừng ở assertion của script kiểm chứng trước bước verify-code; đối chiếu SELECT xác nhận payload đã xóa đúng. Chưa kết luận nguyên nhân assertion; nghi vấn khác kiểu dữ liệu của độ dài trả về từ SQL. Không gửi lại thư để chạy lại kiểm tra. Challenge chưa được API xác minh; OTP → grant chưa được chứng minh. Chủ tài khoản thử lại luồng cần dùng trên web bằng mã mới gắn với trình duyệt của mình; verify/resend thực còn chờ xác nhận. Không coi SMTP chấp nhận là bằng chứng E2E OTP đã PASS.

- Chủ hộp thư xác nhận đã nhận được thư OTP thử ngày 04/11/2026: **PASS nhận thư thực**, không lưu mã trong tài liệu. Mã thử thuộc browser flow của script kiểm tra đã kết thúc; không dùng mã đó để bỏ qua browser binding hoặc xác minh cho một flow khác. Bước tiếp theo là yêu cầu/nhập mã trong cùng luồng trên web, chưa coi toàn bộ đăng ký/recovery là E2E PASS.

## 21. Chặn đăng ký lại email đã có tài khoản — 04/11/2026

Chủ dự án cung cấp ảnh OTP/hoàn tất đăng ký với email đang có tài khoản và xác nhận yêu cầu **“Chặn đăng ký lại email đã có tài khoản”**. Giữ thứ tự đăng ký email → OTP → họ tên/mật khẩu → tạo tài khoản. Lỗi trong `requestCode`: điều kiện REGISTER vẫn cho tài khoản ACTIVE nhận OTP, verify cấp grant và chỉ đến complete mới kiểm trùng. Lần gửi thử tại §20 cũng đã đi qua điều kiện cũ này; bằng chứng nhận thư không có nghĩa đăng ký lại là hành vi đúng.

- Sửa use case dùng chung Next/Express: mọi email đã có user (kể cả Google-only, pending/rejected, locked, deleted) bị chặn ngay request-code trước khi tạo challenge, trừ lượt gửi hoặc ghi outbox; trả `409 ACCOUNT_EXISTS` với hướng dẫn đăng nhập bằng Google/tài khoản hiện có hoặc quên mật khẩu. Không công khai trạng thái/quyền cụ thể của tài khoản. Resend áp dụng cùng kiểm tra.
- Verify mã REGISTER hợp lệ kiểm lại email trước khi cấp grant để chặn challenge cũ hoặc tài khoản vừa được tạo bởi luồng khác. Complete vẫn kiểm trùng trong transaction để xử lý cạnh tranh sau verify. Không sửa tài khoản/quyền/mật khẩu hiện có; recovery giữ phản hồi công khai thống nhất.
- `npx vitest run`: **PASS — 20 files, 230 tests**. Gồm 7 kiểm thử mới cho tài khoản tồn tại ở các trạng thái, normalized email, verify/resend khi tài khoản xuất hiện sau request; kiểm hồi quy tài khoản xuất hiện sau verify, OTP ngân sách 1 + 5 và recovery. `npm run typecheck`: **PASS**. Không chạy lại production build trong lần sửa backend này.
- Kiểm API thật trên localhost, dùng CSRF và đúng email đã được chỉ định: **HTTP 409 `ACCOUNT_EXISTS`**. SELECT trước/sau xác nhận số challenge REGISTER, outbox tương ứng và số user không đổi; không gửi thêm thư trong lần kiểm này. Không đổi UI hoặc cấu hình SMTP/Google/DB. Chưa kiểm E2E đăng ký một email mới qua nhập OTP và tạo tài khoản thực.

## 22. Bộ ảnh rà soát quy trình sinh viên — 04/11/2026

Chủ dự án yêu cầu xem sinh viên đăng ký, nhập OTP và chưa có tài khoản mà bấm đăng nhập sẽ thấy gì. Đã chụp **11 ảnh UI hiện tại** ở desktop 1440×1000, dùng email ví dụ và thay toàn bộ API/Google library bằng dữ liệu giả trong trình duyệt riêng. Không gọi SQL/SMTP/Google provider thật, không tạo tài khoản hoặc gửi thêm thư. Chỉ tạo ảnh, trang xem và script chụp; không thay giao diện/nghiệp vụ.

- [Mở bộ ảnh theo trình tự](../../designs/student-auth-review/index.html), [bằng chứng và giới hạn](../../designs/student-auth-review/checks.json). Script: `scratch/capture-student-auth-review.mjs`.
- Email mới: nhập email → OTP → mã sai vẫn ở bước xác minh → mã đúng mở họ tên/mật khẩu/xác nhận → Tạo tài khoản → dashboard STUDENT, không chờ duyệt. Tài khoản chỉ được tạo ở bước hoàn tất.
- Chưa có tài khoản, đăng nhập mật khẩu: hiển thị “Tên đăng nhập hoặc mật khẩu không chính xác.”; không tự đăng ký/gửi OTP. Email đã có tài khoản, đăng ký lại: lỗi `ACCOUNT_EXISTS` ở bước email.
- Google mới với Workspace đã được cho phép và đủ họ tên: chuyển bắt buộc tới Hoàn thiện tài khoản; lưu xong về đăng nhập lại. Google thiếu bằng chứng Workspace: mở OTP xác minh email. Đây là hai nhánh mô phỏng riêng; cấu hình thật mới xác nhận `hd=lhu.edu.vn`, chưa chứng minh `hd` của sinh viên bằng token thật. Popup chọn tài khoản Google không nằm trong bộ ảnh.
- Đã xem ảnh và kiểm không tràn ngang, trường auth có label, thông báo lỗi hiển thị và có `role=alert`, focus hiển thị; **0 runtime exceptions** trong các luồng chụp. Khung form rộng 410px. Không coi đây là kiểm WCAG đầy đủ hoặc bằng chứng E2E provider/DB/OTP thật. Dữ liệu dashboard và quyền sinh viên trong ảnh là fixture để minh họa kết quả điều hướng, không chứng nhận quyền trên DB hiện hành.

## 23. Biểu mẫu chung, chỉ đặt mật khẩu một lần và số điện thoại bắt buộc — 04/11/2026

**CONFIRMED — ACCOUNT-DETAILS-01:** chủ dự án thấy hai ảnh “Hoàn tất đăng ký” và “Hoàn thiện tài khoản” giống nhau, yêu cầu gộp để không nhập mật khẩu hai lần và bắt buộc số điện thoại. Hai ảnh cũ thực chất thuộc hai nhánh riêng; lần sửa này hợp nhất các trường thành `AccountDetailsFields`, dùng cùng tiêu đề/nút và nhãn hiển thị, giữ giao diện hai cột/màu hiện tại.

- Email → OTP → biểu mẫu chung email chỉ đọc, họ tên/khoa/phòng ban/số điện thoại/mật khẩu/xác nhận → lưu hồ sơ và hash trong transaction tạo tài khoản hiện có. Sinh viên vào dashboard ngay; không đi qua `/complete-account` hoặc đặt mật khẩu thêm. Giảng viên vẫn chờ duyệt, giữ mật khẩu đã đặt khi được duyệt.
- Google hợp lệ → phiên giới hạn → cùng biểu mẫu để đặt mật khẩu một lần. Google cần xác minh thêm email và đã có tên: OTP đúng hoàn tất bằng chứng Google rồi chuyển thẳng tới phiên giới hạn/biểu mẫu chung, bỏ form trung gian. Nếu thiếu tên, chỉ xác nhận họ tên trước tạo user, chưa hỏi mật khẩu; giảng viên Google vẫn hoàn thiện sau duyệt. Giữ grant trong bộ nhớ để có thể thử lại nếu bước tạo tài khoản lỗi sau khi OTP đã đúng.
- Cả client và use case/HTTP kiểm số điện thoại bắt buộc, trim và tối đa 50 ký tự; không áp đặt thêm regex số Việt Nam khi chưa chốt quy tắc. Đăng ký email cũng bắt buộc khoa/phòng ban như Google. Schema Users đã có Department/Phone nên không thêm migration. Không đổi username/email/role/status hàng loạt hoặc bắt tài khoản cũ đã có mật khẩu đi qua bước này.
- `npx vitest run`: **PASS — 20 files, 239 tests**; thêm 9 trường hợp lưu hồ sơ/mật khẩu một lần, thiếu/trắng/quá dài số điện thoại và thiếu khoa/phòng ban; kiểm cập nhật nguyên tử/không đặt lại mật khẩu của tài khoản đã hoàn tất. HTTP mục tiêu chạy lại sau bổ sung kiểm forwarding profile: **PASS — 9 tests**. `npm run typecheck`: **PASS**. Production build: **PASS** (compile, TypeScript, sinh trang), đã chạy xác nhận lại sau chỉnh nhỏ giữ grant để retry.
- Browser với API/Google giả: **PASS**, 15 ảnh, desktop 1440 và 768/375/320px không tràn ngang, số điện thoại `required` ở cả hai nhánh và để trống không gọi complete/setup; email chỉ đọc; đăng ký email vào dashboard không gọi Google setup; Google sau OTP tới biểu mẫu chung; hoàn thiện Google về đăng nhập. **0 runtime exceptions**. [Bộ ảnh mới](../../designs/shared-account-review/index.html), [email sau OTP](../../designs/shared-account-review/04-registration-details.png), [Google](../../designs/shared-account-review/08-google-new-student.png), [mobile 320px](../../designs/shared-account-review/12-shared-form-320.png), [báo cáo](../../designs/shared-account-review/checks.json). Bộ ảnh tại §22 là lịch sử trước khi gộp.
- Không tạo user, cập nhật mật khẩu/hồ sơ hoặc gửi thư thật trong lần sửa này. Repository browser đều giả; chưa xác nhận transaction SQL/provider/hoàn thiện bằng tài khoản thật. Màu/viền theo quyết định người dùng trước đó được giữ nguyên, không tuyên bố đây là audit WCAG đầy đủ.

## 24. Rút gọn nhãn biểu mẫu đăng ký — 04/11/2026

Theo yêu cầu mới nhất, biểu mẫu chung đổi “Khoa / Phòng ban” thành **“Ngành / Phòng ban”**, tiêu đề **“Đăng ký tài khoản”**, bỏ mô tả “Đặt mật khẩu và cập nhật hồ sơ để bắt đầu sử dụng hệ thống.”; bước 3 đổi thành **“Đăng ký”**. Thông báo yêu cầu nhập department dùng cùng từ “ngành / phòng ban”. Giữ tên trường kỹ thuật `department`, điều kiện bắt buộc và nghiệp vụ hiện có. `npm run typecheck`: **PASS**. Bộ ảnh tại §23 được cập nhật bằng browser với API giả; không gửi mail hoặc sửa dữ liệu thật. Không chạy lại full suite/build cho thay đổi câu chữ này.

## 25. Khôi phục nút Google khi hết ngân sách khởi tạo — 04/11/2026

Chủ dự án báo “Chưa kết nối được với Google” trên localhost. API config vẫn bật Google; POST nonce thật trả **429 AUTH_RATE_LIMITED**. SELECT xác nhận đủ 30 sự kiện khởi tạo trong một giờ cho khóa IP mà adapter Next dùng khi không tin proxy (`untrusted-client`), từ 09:15 đến 09:23 UTC. Component cũ lấy nonce trước khi tải thư viện, mỗi mount/tải lại/HMR lại tạo mới và gom mọi lỗi thành lỗi kết nối Google. Không có bằng chứng Client ID/Workspace bị mất cấu hình. Kiểm Chrome riêng tải thư viện Google thật **HTTP 200**; kết quả Node fetch 403 không đại diện cho trình duyệt.

- Server trả lại nonce chưa dùng/còn hạn cho đúng browser flow qua cookie `googleNonceId` HttpOnly/SameSite, không trừ thêm ngân sách. Nonce được tái dựng bằng HMAC riêng theo purpose, challengeId ngẫu nhiên và binding; chỉ dùng lại nếu purpose/binding/hash/expiry/consumed hợp lệ. Nonce đã dùng/hết hạn/khác browser không được tái dùng. Giới hạn tạo mới 30/giờ và xác minh Google 30/giờ giữ nguyên; cookie ID một mình không đủ quyền xác thực. Response có `expiresAt`, không thêm schema/migration.
- Client tải thư viện trước khi lấy nonce và dừng effect đã bị hủy để hạn chế request thừa. Lỗi thư viện, cấu hình/API và 429 được hiển thị đúng nguồn; 429 có bộ đếm theo Retry-After, không cho nhấn thử lại liên tục. Không báo nhầm mọi lỗi backend thành mất kết nối Google.
- Khôi phục đúng ngân sách **khởi tạo Google local** bị cạn: xóa 30 sự kiện của đúng khóa trong transaction dùng auth lock, ghi `AUTH_GOOGLE_NONCE_LIMIT_RESET_SUPPORT` với actor NULL và lý do hỗ trợ local. Không xóa challenge, không thay tài khoản/role/password/identity, không reset OTP, password-login hoặc `google-verify` budget; không đổi env hay cấu hình Google. Lần thử audit đầu dùng tên cột không tồn tại bị từ chối, không áp dụng; lần thực hiện đúng schema đã commit và xác nhận reset=30.
- API/SQL thật: **PASS** — năm lần POST nonce liên tiếp cùng browser cookie trả cùng nonce/challenge và không tăng sự kiện khởi tạo sau lần đầu; cookie HttpOnly, có thời hạn. Browser với Google và API thật: **BUTTON_RENDERED**, không runtime exception; chưa chọn tài khoản hoặc gửi Google credential. [Ảnh nút đã khôi phục](../../designs/auth-pages/google-ready-recovered.png), [bằng chứng provider](../../designs/auth-pages/google-provider-recovery-checks.json). Không coi nút hiện là E2E đăng nhập/hoàn thiện đã PASS.
- `npx vitest run`: **PASS — 20 files, 246 tests**; thêm kiểm reuse/binding/expiry/purpose/hash/consume và giới hạn tạo mới/cookie HTTP. `npm run typecheck` và `npm run build`: **PASS**. Browser API giả: **PASS** — thư viện lỗi không lấy nonce, 429 có thông báo/countdown, retry → ready, double click chỉ gửi một lần, giảng viên tới chờ duyệt. [Báo cáo](../../designs/auth-pages/google-ui-checks.json).
- Đối chiếu [Google JS API](https://developers.google.com/identity/gsi/web/reference/js-reference) về initialize/nonce và [cấu hình GIS](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Chỉ khắc phục localhost; chưa deploy tên miền thật hoặc gửi mail trong lần này.

## 26. Yêu cầu chuyển đăng nhập qua FIT LHU SSO — 04/11/2026

**Lịch sử hướng dẫn trước triển khai; trạng thái đã thay thế bởi §27.**

Chủ dự án cung cấp hướng dẫn FIT LHU SSO và ảnh trang quản trị tạo client, yêu cầu hướng dẫn đăng ký Lab để chuyển cơ chế đăng nhập sang SSO. **Đã xác nhận hướng chuyển; chưa tạo client, chưa có client ID/secret SSO và chưa triển khai callback OIDC trong Lab.** Không tự bật/tắt Google/OTP, thay tài khoản/quyền hoặc sao chép mật khẩu giữa hai hệ thống trong bước hướng dẫn này.

- Discovery thật `https://auth.fitlhu.com/.well-known/openid-configuration`: **HTTP 200**, issuer `https://auth.fitlhu.com`, Authorization Code, PKCE S256, ID token RS256; hỗ trợ confidential `client_secret_basic`/`client_secret_post`, scopes openid/profile/email/roles/offline_access. Hướng dẫn do chủ dự án cung cấp khớp metadata công khai. Đây là kiểm cấu hình provider, chưa là E2E đăng nhập.
- Cấu hình client **đề xuất cho localhost**: tên `LHU IT LAB — Local`, homepage `http://localhost:3000`, redirect `http://localhost:3000/api/auth/sso/callback`, post-logout `http://localhost:3000/login`, Confidential, scopes `openid profile email`; logo để trống nếu chưa có URL. Consent tắt cho ứng dụng nội bộ và không giới hạn riêng phương thức đăng nhập để dùng phương thức SSO đã bật. URI callback này là hợp đồng triển khai dự kiến, hiện chưa có handler SSO hoạt động.
- Production nên có client riêng: homepage `https://lab.fitlhu.com`, redirect `https://lab.fitlhu.com/api/auth/sso/callback`, post-logout `https://lab.fitlhu.com/login`. Secret chỉ lưu tại server được ignore/secret manager, không gửi qua chat, đưa vào NEXT_PUBLIC hoặc tài liệu.
- Khi triển khai cần state/nonce/PKCE verifier ràng buộc browser, callback kiểm state/iss, đổi code tại server và xác minh chữ ký JWKS/issuer/audience/expiry/nonce/email_verified; liên kết danh tính bằng `(issuer,sub)`. Giữ userId và dữ liệu Lab khi liên kết tài khoản cũ, không tự gộp email hoặc gán ADMIN theo claim tùy ý. Tận dụng dịch vụ session nội bộ hiện có, phân biệt đăng xuất Lab với đăng xuất SSO.
- **Đề xuất cần chốt trong task tích hợp:** mật khẩu/Google/OTP đăng ký/recovery do SSO quản lý; Lab chỉ thu hồ sơ ngành/phòng ban và số điện thoại còn thiếu, không bắt đặt thêm mật khẩu Lab cho user SSO. Giữ chính sách giảng viên chờ duyệt tại Lab và admin local khi chuyển đổi cho tới khi có quyết định khác; không tự dùng `roles` SSO thay quyền nghiệp vụ. Chỉ bỏ luồng đăng nhập trực tiếp sau khi liên kết legacy và kiểm provider/session/approval đầy đủ.

## 27. Triển khai FIT LHU SSO local và bàn giao production — 04/11/2026

Chủ dự án tạo client Confidential cho cả localhost và `https://lab.fitlhu.com`, cung cấp cấu hình và yêu cầu thêm vào env, thay cơ chế đăng nhập. Đã lưu client ID/secret và khóa flow riêng trong `backend/.env` được ignore, bật `FIT_SSO_ENABLED=true`, tắt đăng ký email trực tiếp bằng `SELF_REGISTRATION_ENABLED=false`, khởi động lại Next dev. Không đổi credential SQL/JWT/SMTP, không migration, không seed user, không sao chép mật khẩu sang SSO. Secret không được lưu trong tài liệu hoặc frontend.

### Hành vi đã triển khai

- Login có nút **Đăng nhập bằng FIT LHU SSO**. Đăng ký/quên mật khẩu đi qua SSO; Lab không gửi thêm OTP hoặc yêu cầu đặt mật khẩu riêng. Admin có lối local tại `/login?local=admin`; API mật khẩu cũng kiểm ADMIN. Google client cũ còn phục vụ bằng chứng liên kết tài khoản cũ, không còn là lựa chọn đăng nhập trực tiếp trong chế độ SSO.
- Authorization Code + PKCE S256 qua `openid-client`; callback xác minh RS256/JWKS, issuer/audience/expiry/nonce/state và `email_verified`. State/nonce/verifier và ID token dùng cho logout được mã hóa server-side; flow và liên kết gắn cookie HttpOnly, một lần dùng, có hạn và giới hạn SQL. Không trả OIDC token qua JSON hoặc localStorage.
- User mới: email trường quyết định STUDENT/TEACHER; sinh viên ACTIVE, giảng viên INACTIVE/PENDING_REVIEW và chưa nhận phiên. Duyệt vẫn do quản trị Lab, không lấy quyền từ claim SSO. Tài khoản khóa/xóa/từ chối không được tự kích hoạt lại.
- Email trùng tài khoản Lab cũ mở **Liên kết tài khoản Lab**, cần mật khẩu Lab hoặc đúng Google identity cũ sau khi SSO đã xác minh; không tự gộp theo email. Liên kết giữ userId, username, dữ liệu, mật khẩu cũ, role/status/registration. Đăng nhập Google cũ chỉ là bằng chứng cho thao tác liên kết này.
- Hồ sơ SSO chỉ có email read-only, họ tên, **Ngành / Phòng ban**, số điện thoại bắt buộc. Không có hai ô mật khẩu. Khi hồ sơ đủ, đi tới đích nội bộ; thiếu hồ sơ bị chặn cả UI/API nghiệp vụ. Đăng ký và hoàn thiện không tạo hai lần mật khẩu.
- Phiên Lab SSO giới hạn theo ID token và tối đa 10 phút, không kéo dài bằng refresh Lab. Hết hạn tiếp tục qua SSO; không xin offline_access. Logout UI thu hồi phiên Lab rồi chuyển tới provider logout qua redirect nội bộ một lần; provider lỗi vẫn đăng xuất Lab. Chưa triển khai back-channel logout/thu hồi tức thì từ provider.

### Bằng chứng và giới hạn

| Kiểm tra | Kết quả | Phạm vi |
| --- | --- | --- |
| `npx vitest run` | PASS — 23 files, 287 tests | Gồm flow/link/profile/session/logout, endpoint Next/HTTP, kiểm chữ ký RS256/JWKS bằng khóa thử và các hồi quy cũ; không dùng account thật |
| `npm run typecheck` | PASS | Kiểm kiểu |
| `npm run build` | PASS | Build local, không deploy |
| Browser mô phỏng | PASS — desktop 1440, mobile 375/320; 0 runtime exceptions | API/provider/Google được thay fixture; profile không có mật khẩu, bắt buộc phone, liên kết, admin local, lỗi và logout |
| `npm run auth:sso-check -- --database` | PASS | Discovery thật, PKCE/RS256, cấu hình server và schema hiện có |
| API/SQL/provider thật | PASS cho start/flow mã hóa/HttpOnly/invalid-state | Không tạo user trong các script kiểm tra; provider chấp nhận redirect URI local và production rồi chuyển login |
| Browser provider thật | PASS tới màn hình đăng nhập FIT LHU SSO | Không thay API; script không chọn account/nhập credential hoặc hoàn tất callback |
| Chủ tài khoản đăng nhập thực | Chủ dự án xác nhận **đã vào được hệ thống** | SELECT sau thử xác nhận liên kết SSO giữ đúng user cũ đã khôi phục, Google identity, ACTIVE/APPROVED/TEACHER, hồ sơ đầy đủ và có 2 phiên SSO được cấp; tại thời điểm SELECT không còn phiên SSO đang hiệu lực. Không dùng kết quả này để khẳng định luồng tạo sinh viên mới/duyệt giảng viên mới/logout provider thật đã PASS |

[Ảnh và giới hạn kiểm tra](../../designs/sso-auth/index.html), [browser fixture](../../designs/sso-auth/checks.json), [API/SQL thật](../../designs/sso-auth/live-checks.json), [browser provider thật](../../designs/sso-auth/provider-real-checks.json), [đối chiếu sau owner đăng nhập](../../designs/sso-auth/owner-login-checks.json). Kiểm bundle frontend không phát hiện client secret/khóa server đã cấu hình. Không lưu token, code hoặc mật khẩu trong báo cáo. Lệnh readiness chỉ kiểm cấu hình, trường `realUserLogin=NOT_RUN` của lệnh này mô tả giới hạn của script, không phủ nhận kết quả owner đã thử riêng.

### Cấu hình và đưa lên VPS/Docker

Hai URI callback đã được provider chấp nhận là `http://localhost:3000/api/auth/sso/callback` và `https://lab.fitlhu.com/api/auth/sso/callback`; post-logout tương ứng `/login`. Cùng client dùng được hai origin theo cấu hình chủ dự án đã lưu. Kiểm này không chứng minh code/cấu hình trên tên miền thật đã được cập nhật.

1. Đưa mã nguồn/dependency mới tới thư mục ứng dụng hiện có trên VPS bằng quy trình triển khai đang dùng. Không thay hoặc chạy lại Compose SQL Server như thể đó là service web; repo hiện chưa xác nhận Dockerfile/Compose web thực tế của VPS.
2. Trong env runtime của **service web production**, đặt `FIT_SSO_ENABLED=true`, `FIT_SSO_ISSUER=https://auth.fitlhu.com`, `FIT_SSO_CLIENT_ID` của client đã tạo, `FIT_SSO_CLIENT_SECRET` từ nơi lưu bảo mật, `FIT_SSO_FLOW_KEY` riêng 64 ký tự hex ngẫu nhiên, `FIT_SSO_ALLOWED_ORIGINS=https://lab.fitlhu.com`, `APP_ORIGIN=https://lab.fitlhu.com`, `SELF_REGISTRATION_ENABLED=false`, `NODE_ENV=production`, API cùng origin `/api`. Giữ khóa flow ổn định và đồng nhất giữa các replica; không copy toàn bộ env local đè credential DB production.
3. Cài dependency bằng `npm ci`, chạy `npm run auth:sso-check -- --database`, build `npm run build`, rồi restart/recreate đúng service web bằng process manager/Compose đang quản lý. Với image build nhiều stage cần giữ dependency runtime `openid-client` và template email hiện có; biến server phải vào container lúc chạy, không đưa secret vào build args/frontend.
4. Proxy HTTPS phải chuyển đúng Host/protocol và ghi đè header forwarded đáng tin cậy; chỉ bật TRUST_PROXY khi topology đáp ứng điều kiện. Không ghi query `/api/auth/sso/callback` vào access log. Kiểm cookie Secure và CSRF đúng origin trên tên miền thật.
5. Owner thử đăng nhập, liên kết tài khoản cũ, hồ sơ, quyền, giảng viên chờ duyệt và đăng xuất trên domain. Chỉ ghi production PASS sau bằng chứng này. Nếu cần rollback chế độ local, đặt `FIT_SSO_ENABLED=false` và khôi phục cờ đăng ký theo cấu hình đã chọn, restart web; không xóa identity/user hoặc đổi mật khẩu để rollback.

**Production chưa triển khai:** chủ dự án cho biết dùng VPS hoặc Docker nhưng chưa có host/thư mục/service thực tế. SSH chỉ cần nếu giao agent thao tác trực tiếp; chủ dự án có thể tự triển khai theo các bước trên. Chưa commit/push hoặc thay đổi máy chủ production trong task này.
