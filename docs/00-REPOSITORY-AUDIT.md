# Repository audit — QuanLyPhongLAB

Ngày hoàn tất: 2026-10-02 · Baseline Git: `6c0f53e` · Trạng thái: báo cáo nội bộ, chưa phê duyệt thay đổi runtime.

## 1. Executive Summary

Dự án đã vượt mức skeleton: có ứng dụng Next.js fullstack, nghiệp vụ đặt từng máy, phân loại thiết bị nội bộ/cho mượn, SQL migrations, quyền truy cập và 87 test tự động đạt. Tuy nhiên, **tài liệu, skill và đường chạy thực tế chưa đồng bộ**; một số ranh giới bảo mật và vòng đời tồn kho cần kiểm tra/sửa trước khi kết luận sẵn sàng production.

Mức trưởng thành: **MVP chức năng đang phát triển, có nền kiểm thử; chưa đủ bằng chứng về độ sẵn sàng vận hành**. Đây là nhận định `INFERRED`, không phải chứng nhận bảo mật hoặc kết luận hệ thống đã bị khai thác.

Ưu tiên không phải đổi framework hay viết lại Clean Architecture. Ưu tiên là: xác nhận và xử lý credential/đăng ký thiết bị, chuẩn hóa HTTP boundary, chốt mô hình tồn kho, thống nhất đặc tả quyền, rồi bổ sung test đường chạy thật.

Đợt này chỉ tạo báo cáo, playbook V2 và template. Không sửa source, schema, cấu hình, AGENTS, skill hay tài liệu cũ; không truy cập DB/server/broker; không đọc giá trị `.env` thật.

## 2. Phương pháp và độ tin cậy

| Nhãn               | Ý nghĩa trong báo cáo                                                                   |
| ------------------ | --------------------------------------------------------------------------------------- |
| KNOWN              | Quan sát được trong file/lệnh đã kiểm tra; không tự mở rộng thành tình trạng production |
| INFERRED           | Suy luận từ nhiều bằng chứng; cần kiểm thử/đo để xác nhận tác động                      |
| UNKNOWN            | Chưa có bằng chứng đủ                                                                   |
| CONFLICTING        | Hai nguồn mô tả khác nhau, chưa tự chọn một bên làm luật                                |
| NEEDS_CONFIRMATION | Cần người sở hữu nghiệp vụ/hệ thống quyết định                                          |
| BLOCKED            | Một bước cụ thể không thể tiếp tục vì thiếu điều kiện/quyền                             |
| NOT_APPLICABLE     | Không áp dụng cho phạm vi, có lý do                                                     |

Đã đọc toàn bộ V1, nội dung yêu cầu đính kèm, README, các tài liệu `00`–`20`, `equipment-import.md`, `lending-catalog.md`, `api_info.md`, `.agent/AGENTS.md`, `.agent/README.md` và 7 skill. Đặc tả Word có 494 đoạn/1 bảng; trích xuất text khớp TXT khi bỏ khoảng trắng. Chỉ đối chiếu nội dung Word, không đánh giá bố cục in.

Source được **kiểm tra theo luồng đại diện**, không phải review từng dòng toàn repo: login → route adapter → controller → use case → repository; booking → availability → approve → check-in/out; import; device registration/logging; client auth/MQTT; migration runner, schema trọng yếu, config và test inventory. Có tìm kiếm xuyên source để kiểm tra imports, route, test và trigger. Không chạy dependency audit qua mạng hoặc pentest.

Các file lock/build/cache, `node_modules`, ảnh UI và scratch không được coi là đặc tả hiện hành. Test được đọc imports/fixtures/assertion inventory và một số file đầy đủ; không tuyên bố review toàn bộ từng assertion.

Khi kiểm tra worktree cuối đợt có thêm `.postman/` và `postman/` chưa được theo dõi, ngoài baseline ban đầu. Các thư mục này không do đợt audit tạo, chưa được audit nội dung và được giữ nguyên. V1 cùng file khóa Office có sẵn cũng được giữ nguyên.

## 3. Current Architecture

`KNOWN`: root `package.json` chạy Next.js; lockfile và package cài đặt ghi Next **16.3.0**, React 19, TypeScript, Tailwind, SQL Server qua `mssql`, Vitest. Không có `backend/package.json` hay package workspace backend/frontend được Git theo dõi. Không thấy NestJS trong đường chạy đã xác minh.

Ứng dụng là **monolith fullstack với tổ chức server theo lớp, có adapter Express → Next**, không phải kiến trúc “Next gọi HTTP sang một NestJS khác” trong cấu hình mặc định. `NEXT_PUBLIC_API_URL` có thể đổi đích API; cấu hình triển khai thật là `UNKNOWN`.

Có ý đồ Clean Architecture, nhưng không thể gọi là tuân thủ hoàn toàn:

- `ComputerController.ts:147` có SQL và cập nhật trạng thái ngay trong thao tác summary.
- `application/use-cases/equipment/ImportEquipments.ts:1` import `mssql` và implementation SQL trực tiếp.
- `domain/repositories/IBookingEquipmentItemRepository.ts:2` biết kiểu `mssql.Transaction`.
- Controller truy cập container toàn cục; lớp trong/lớp ngoài chưa tách đều. Đây là nợ kiến trúc, **không mặc định nghiêm trọng ngang một lỗi vượt quyền**.

Giữ monolith hiện tại là hướng hợp lý trước mắt; chưa có đo tải, ranh giới đội ngũ hay nhu cầu triển khai độc lập chứng minh cần microservices.

## 4. Repository Map

| Vị trí                                  | Vai trò quan sát được                       | Lưu ý                                                                                                        |
| --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/app/(auth)`, `src/app/(dashboard)` | Routes UI Next                              | Không dùng routing Vite như docs cũ                                                                          |
| `src/app/api/**/route.ts`               | Entry point HTTP thực tế                    | Cần kiểm tra validation tại đây, không chỉ Express router cũ                                                 |
| `src/features`                          | UI theo tính năng, context, form            | `BookingsPage` dùng `BorrowingCatalog`; còn dùng helper từ `LendingCatalog`, chưa được xóa file này tùy tiện |
| `src/services`                          | API client, adapters, mock mode             | Mặc định `/api`, mock là opt-in                                                                              |
| `src/server/presentation`               | Controllers/Express routes/middleware       | Một phần route/middleware tồn tại nhưng chưa thấy được mount vào main runtime                                |
| `src/server/application`                | Use cases và ports                          | Có ngoại lệ phụ thuộc SQL trực tiếp                                                                          |
| `src/server/domain`                     | Entities, invariants, repository interfaces | Không hoàn toàn độc lập driver                                                                               |
| `src/server/infrastructure`             | SQL repositories, auth, cache, logger       | Composition ở `container/dependency-container.ts`                                                            |
| `database/migrations`                   | 001–030, runner theo thứ tự                 | Repository có migration không chứng minh DB thật đã áp dụng                                                  |
| `database/scripts`, `database/seeds`    | Script DBA/demo/seed                        | Không chạy trong audit này                                                                                   |
| `docs/00–19`                            | Kế hoạch xây MVP lịch sử                    | Nhiều trang không còn là runbook hiện hành                                                                   |
| `.agent`                                | AGENTS và 7 skill local                     | Bị `.gitignore` loại; `git ls-files .agent` rỗng                                                             |
| `backend/`, `frontend/`                 | Dấu vết bố cục cũ/local                     | Không suy ra hai dịch vụ từ tên thư mục                                                                      |
| `ecosystem.config.cjs`                  | PM2 Next port 3141                          | Khác port 3000 trong npm scripts                                                                             |
| `docker-compose.yml`                    | SQL Server local, port host 1434            | Không phải compose đầy đủ web/frontend/backend                                                               |
| `socket-server.js`                      | Script Socket.IO riêng port 3001            | Package `socket.io` không khai báo trực tiếp; chưa xác nhận còn dùng                                         |

## 5. Runtime Flow

```text
Browser UI → services/api-client (/api mặc định)
           → Next src/app/api route
           → route-helper: auth/permission + adapter Request/Response
           → controller → use case → ports/repositories → SQL Server

FIT PC Monitor → Next /api/devices/* → device use cases → SQL/cache
ComputersPage → MQTT over WebSocket → broker cấu hình phía client
socket-server.js: đường chạy phụ, không thấy trong PM2 chính; cần xác nhận
```

Ví dụ login: `auth/login/route.ts` gọi `container.authController.login` với `requireAuth: false`; controller gọi `LoginUseCase`, băm/so mật khẩu qua port, ghi hash refresh token và audit/session; client lấy `/auth/me`. Không có HTTP hop sang NestJS trong chuỗi này.

Booking tạo `PENDING`, lưu thiết bị và mã máy trong transaction. Approve khóa `sp_getapplock` tài nguyên `LabBookingApproval`, kiểm tra lại availability rồi duyệt. Check-in/out có khóa và lịch sử máy. Availability tính peak theo thời gian, coi lượt chưa trả là còn chiếm tài nguyên. Tuy nhiên lịch giữ chỗ theo thời gian và các cột tồn kho vật lý chưa nhất quán trong toàn bộ vòng đời, xem F06.

## 6. Docs Audit — từng tài liệu

Phân loại là **đề xuất**, chưa di chuyển/xóa/sửa file. `CURRENT_PARTIAL` nghĩa là có ích nhưng chưa xác nhận mọi chi tiết bằng runtime; không có tài liệu nào được nâng thành chân lý chỉ vì mới hơn.

| File                                             | Phân loại                      | Giữ / bổ sung / sửa đề xuất                                                                                |
| ------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `README.md`                                      | CURRENT_PARTIAL                | Giữ mô tả Next fullstack; sửa Node 18+ (Next cài đặt yêu cầu >=20.9), port DB/dev/PM2 và lệnh kiểm thử     |
| `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md` | HISTORICAL, CONFLICTING        | Tách quyết định còn hiệu lực (single Lab) khỏi Express/Vite/workspaces và quyền sinh viên cũ               |
| `docs/01-dac-ta-vai-tro-va-phan-quyen.md`        | CONFLICTING                    | Chốt lại quyền tự mượn 6 role, scope own/assigned/all và multi-role; không khôi phục cấm STUDENT           |
| `docs/02-khoi-tao-du-an-tu-repository-trong.md`  | HISTORICAL                     | Không dùng để bootstrap repo hiện tại; lệnh workspaces không khớp                                          |
| `docs/03-tao-khung-clean-architecture.md`        | HISTORICAL/PARTIAL             | Giữ hướng dependency, cập nhật runtime/path và ngoại lệ có bằng chứng                                      |
| `docs/04-database-migration-core-rbac.md`        | PARTIAL                        | 16 migration nền chưa phản ánh 017–030; không dùng làm schema dump hiện hành                               |
| `docs/05-seed-roles-permissions-admin.md`        | CONFLICTING                    | Giữ seed idempotent, không log password; quyền STUDENT/MANAGER khác migration 029                          |
| `docs/06-error-handler-va-api-response.md`       | TARGET, chưa đồng nhất         | Giữ mục tiêu lỗi an toàn; đối chiếu adapter Next, correlationId và response device/login                   |
| `docs/07-auth-login-current-user.md`             | PARTIAL/TARGET                 | Refresh hash có thật; rate limit, validation, token storage cần kiểm chứng theo route thật                 |
| `docs/08-frontend-shell-login-role-layout.md`    | HISTORICAL/PARTIAL             | UX checklist hữu ích; cấu trúc Vite/route role và menu STUDENT đã cũ                                       |
| `docs/09-lab-profile-singleton.md`               | PARTIAL                        | Singleton có constraint; API đang có `/api/labs`, không chỉ tên `/api/lab-profile` đề xuất                 |
| `docs/10-crud-computer.md`                       | PARTIAL                        | Bổ sung từng máy, lịch sử bàn giao, monitoring và trạng thái; không xem checklist là test đã pass          |
| `docs/11-crud-equipment.md`                      | PARTIAL                        | Bổ sung IsLendable/import; xác nhận vòng đời counters so với F06                                           |
| `docs/12-check-availability-use-case.md`         | PARTIAL                        | Bổ sung chọn ID máy, peak, checked-in quá giờ; chốt lịch tương lai vs tồn kho hiện tại                     |
| `docs/13-create-booking-and-calendar.md`         | CONFLICTING                    | STUDENT 403 và đường dẫn teacher cũ khác tính năng hiện tại; quyền hủy cũng cần đối chiếu                  |
| `docs/14-booking-approval-reservation.md`        | CONFLICTING                    | Nêu cập nhật Equipments/inventory transaction khi duyệt; source chỉ reserve booking items                  |
| `docs/15-checkin-checkout.md`                    | CONFLICTING                    | Nói không gán máy cụ thể đã bị thay bởi 030; equipment return payload chưa khớp code                       |
| `docs/16-incident-management.md`                 | TARGET/PARTIAL                 | Giữ scope và audit; quy trình upload/checkout incident không tự coi đã hoàn thiện                          |
| `docs/17-role-dashboard.md`                      | CONFLICTING/PARTIAL            | Nội dung STUDENT không có booking và MANAGER chỉ đọc đã cũ; số liệu cần đối chiếu nguồn                    |
| `docs/18-testing-security-uat.md`                | TARGET, chưa hoàn tất          | STUDENT bị chặn là ca cũ; nhiều lớp test/gate mới là mong muốn, không phải kết quả                         |
| `docs/19-deployment-handover.md`                 | HISTORICAL/TARGET              | Giữ backup/least privilege; build workspace/container mô tả không khớp root Next/PM2                       |
| `docs/20-expense-management.md`                  | CURRENT_PARTIAL                | Tài liệu theo module tốt; `npm run test` chưa tồn tại; chưa audit đủ vòng đời chi phí                      |
| `docs/equipment-import.md`                       | CURRENT_PARTIAL                | Hướng dẫn preview/commit, chỉ thêm mới và giới hạn rõ; có test; giữ làm mẫu docs feature                   |
| `docs/lending-catalog.md`                        | CURRENT_PARTIAL                | Phù hợp chọn từng máy/ẩn nội bộ; xác minh DB ghi ngày 10/09 không thay thế xác minh hiện tại               |
| `docs/Website Quản Lý Phòng Lab CNTT.docx`       | HISTORICAL source brief        | Giữ yêu cầu gốc; không chạy SQL mẫu trong Word lên DB hiện tại                                             |
| `docs/Website_Quan_Ly_Phong_Lab_CNTT.txt`        | DUPLICATE text export          | Nội dung khớp Word; đề xuất ghi nguồn/version hoặc sinh lại, tránh hai bản cùng sửa                        |
| `api_info.md`                                    | EXTERNAL CONTRACT, CONFLICTING | Mô tả MAC/key cố định; source nhận UUID và cấp key lại. Cần chốt tương thích client, không tự đổi response |
| `docs/00-VIBE-CODING-PROJECT-PLAYBOOK.md`        | DRAFT V1                       | Giữ nguyên; V2 độc lập, giảm gánh quy trình, không dùng V1 làm đặc tả Lab                                  |
| `.agent/README.md`                               | LOCAL ROUTER, PARTIAL          | Danh sách skill hữu ích; links file:///D: không portable, skill chứa luật cũ                               |

Không có bằng chứng các checklist UAT/deploy cũ đã được hoàn thành. File khóa Office `~$...docx` không phải tài liệu nghiệp vụ; không đụng tới.

### Nhận xét riêng V1

Giữ: progressive disclosure, vertical slice, kiểm chứng trước khi sửa, tránh God skill, bảo mật và test sớm. V1 đã cảnh báo không áp DDD mọi nơi; không nên phê bình sai rằng V1 bắt buộc DDD.

Cần sửa trong V2: scaffold quá nhiều docs/skills mặc định; workflow/checklist lặp; dự án nhỏ vẫn bị dẫn tới nhiều lớp/repository; “repo là nguồn sự thật” quá tuyệt đối; ví dụ phân quyền/multi-room dễ bị hiểu thành luật Lab; thiếu quy trình giải quyết mâu thuẫn và phân biệt code complete/merge ready. Lệnh mẫu test/lint cần đánh dấu là ví dụ, không mặc định tồn tại. Commit/publish không phải bước tự động được phép. Một số code fence lồng nhau cần dùng fence ngoài dài hơn.

## 7. AGENTS.md Audit

`.agent/AGENTS.md` ngắn, giữ scope và yêu cầu hỏi khi nghiệp vụ mơ hồ là điểm tốt; **không phải God AGENTS hiện tại**. Vấn đề chính:

- Nằm trong thư mục bị ignore, không có root `AGENTS.md` được theo dõi: clone sạch không nhận bộ hướng dẫn này; cơ chế auto-discovery tùy công cụ chưa xác minh.
- Ví dụ role Kỹ thuật viên/đăng ký số lượng đã lạc hậu; đường dẫn tuyệt đối gắn máy cá nhân.
- Thiếu map đường chạy thật, commands đã kiểm chứng, phân tầng kế hoạch, conflict protocol và yêu cầu bằng chứng cuối task.
- Quy tắc tách lớp quá cứng so với code; khi gặp ngoại lệ phải ghi nhận, không tự refactor ngoài phạm vi để “đạt chuẩn”.

Đề xuất root entry point ngắn, link tương đối tới knowledge hiện hành; chỉ đưa phần đặc thù module vào chỉ dẫn con nếu công cụ hỗ trợ. Mẫu mới ở [AGENTS.template.md](templates/AGENTS.template.md), **chưa kích hoạt**.

## 8. Skills Audit và Skill Map đề xuất

7 skill hiện tại là Markdown local không có YAML `name/description`, phù hợp đọc bằng tay nhưng chưa chứng minh discovery tự động cho mọi agent. Không ép dùng cùng một đường dẫn cho mọi công cụ.

| Skill hiện có                  | Đánh giá                                                                                             | Hướng chuẩn hóa, chưa thực hiện                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `clean-architecture-nodejs`    | Nguyên tắc tốt, path/Express bootstrap cũ, trộn quy ước và bài học chung                             | Giữ skill; rút ngắn entry, link architecture thực tế, nói rõ exceptions và khi nào không cần abstraction  |
| `repository-pattern`           | Lặp dependency rules, chứa interface mẫu lệch source; có ngoại lệ read query khác skill architecture | Gộp phần trùng vào references kiến trúc; chỉ tách skill riêng nếu workflow persistence đủ lặp lại         |
| `sqlserver-database-design`    | Sai schema/role/status/timezone so với migrations; công thức tồn chỉ 3 thành phần thay vì 6          | Tách schema sang docs, giữ workflow migration/locking/verify/rollback có chặn production                  |
| `booking-business-rules`       | Giữ single Lab/overlap hữu ích; TECHNICIAN, CHECKED_OUT/OVERDUE và thời gian “ví dụ” gây hiểu nhầm   | Canonical rules ở docs domain; skill hướng dẫn thay đổi booking + impact/test, không chép luật lần nữa    |
| `api-controller-validation`    | Response/controller guide hữu ích; Express middleware không đại diện route Next thật                 | Thêm trigger boundary, schema thực sự chạy, anyOf/allOf, authn/authz/object scope, compatibility          |
| `test-case-clean-architecture` | Phân lớp test tốt; ca overlap “luôn thất bại”, overdue/status còn cũ                                 | Dẫn rule/test ID hiện hành; tách mocked test khỏi SQL integration; thêm deny cases và concurrent evidence |
| `code-review`                  | Có format findings; dùng TECHNICIAN, xếp mọi vi phạm kiến trúc Critical quá mức                      | Severity theo tác động; evidence/reproduction/confidence; không buộc sửa ngoài scope                      |

Skill nên có trigger, input, điều kiện dừng, output và validation cụ thể. Không nạp cả 7 skill cho task đổi một nhãn UI.

| Nhóm / workflow                        | Dùng gì trước mắt                          | Khi nào mới tạo skill riêng                                                             |
| -------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Core agent / discovery, planning       | AGENTS + task checklist + execution plan   | Không cần skill tổng “làm mọi thứ”                                                      |
| Architecture / persistence             | Chuẩn hóa 2 skill hiện có, có thể gộp      | Tách khi có thao tác lặp và references riêng                                            |
| Backend HTTP boundary                  | Chuẩn hóa API skill                        | Khi có nhiều endpoint/adapters cần cùng quy trình                                       |
| Frontend UX và accessibility           | Checklist feature + tiêu chuẩn UI hiện có  | Khi lặp review form/dialog/responsive; không thêm UI framework                          |
| Database / SQL Server                  | Chuẩn hóa DB skill                         | Đã có workflow lặp, nên duy trì                                                         |
| Security / identity, device enrollment | Threat checklist và feature plan           | Tạo skill hẹp nếu thường xuyên sửa auth/device keys; không nhét toàn bộ security manual |
| Testing                                | Chuẩn hóa test skill                       | Đã có 8 suite, cần routing đúng lớp kiểm thử                                            |
| Domain booking / inventory             | Docs domain canonical + booking skill ngắn | Đã có tác động nhiều module, cần duy trì                                                |
| Operations / release, restore          | Runbook được xác nhận trước                | Chỉ thành skill khi quy trình đã chạy lặp, có target/permission checks                  |
| Review                                 | Chuẩn hóa code-review                      | Giữ format evidence, không phát sinh một skill cho mỗi bug                              |

## 9. Test Audit

Kết quả chạy tại workspace trong đợt audit, hoàn tất 2026-10-02:

| Lệnh thực chạy                                                     | Kết quả                        | Giới hạn                                                                                  |
| ------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------- |
| `.\node_modules\.bin\vitest.cmd run --pool=threads --maxWorkers=1` | 8 files, **87 passed**, exit 0 | Unit/mocked tests; không kết nối DB thật                                                  |
| `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`         | PASS, exit 0                   | Kiểm kiểu; không build hay kiểm hành vi runtime                                           |
| `git ls-files .agent .github backend frontend`                     | Không trả file                 | Không tìm thấy CI GitHub/instructions được version ở các vị trí này; CI bên ngoài UNKNOWN |

Suites: `equipment-import-file` (Excel roundtrip/formula), `equipment-import` (CSV/validation/mã), `ImportEquipments` (mock transaction/audit rollback), `UpdateEquipmentCategoryUseCase`, `UpdateCurrentUserProfileUseCase`, `RegisterDeviceUseCase`, `lending`, `computer-booking`.

Điểm mạnh: test không chỉ happy path; có thiết bị nội bộ, ID spoof, mã trùng, sai số lượng, chọn đúng máy, giờ nhận/trả, rollback import.

Khoảng trống quan sát: chưa thấy suite HTTP Next route/auth validation, login/session revocation, SQL migration/repository integration, concurrency hai kết nối thật, equipment handover/return counters, expense lifecycle hoặc browser E2E. Không có coverage report; không gán % coverage. Mock `uow.complete` không chứng minh rollback SQL; assert thứ tự gọi lock không chứng minh chống race ở DB.

`package.json` chưa có `test`/`lint` scripts dù docs có lệnh này. Không chạy `npm run format` vì sẽ viết toàn repo. Không chạy build, migrations, seeds, HTTP production, MQTT hay dependency network scan; đây không phải kết quả thất bại, mà là **NOT_RUN**.

## 10. Security Audit

Đây là review source có giới hạn, không chứng minh exploit production. Không sao chép credential vào báo cáo.

Điểm tốt: SQL parameter binding ở repositories đã kiểm tra; refresh token lưu hash; thiết bị có key hash; permission kiểm ở server; thiết bị nội bộ bị lọc tại use case; audit các thao tác booking; cookie refresh HttpOnly/Secure theo production.

Rủi ro cụ thể:

- MQTT client `ComputersPage.tsx:186–200` có `NEXT_PUBLIC_*` username/password và fallback literal, subscribe wildcard metrics. Secret nằm phía browser không thể giữ bí mật. ACL/quyền publish và hiệu lực credential thật `UNKNOWN`; cần xác nhận, thu hồi/đổi credential nếu đang dùng, cấp quyền client tối thiểu. Chuyển sang biến `NEXT_PUBLIC` đơn thuần không sửa được vấn đề.
- `devices/register/route.ts` bỏ auth; `RegisterDeviceUseCase` tìm thiết bị cũ từ định danh client rồi upsert key hash mới và trả `api_key`. Cần cơ chế enrollment/re-enrollment được chứng thực; không xem MAC/UUID là bằng chứng quyền sở hữu. Chưa thử khai thác hay truy cập broker/server.
- `DeviceController.register` ghi nguyên response thành công; `device-api-logger.ts` ghi nguyên request/response. Response có `api_key`: đường code ghi key rõ ra file log đã xác định. Ignore Git không bảo vệ log trên máy chủ, backup hay lịch sử Git cũ.
- `JwtTokenService` có signing-secret mặc định; DB connection có user/password fallback và luôn trust certificate. Env thật không được kiểm tra; cần fail closed ở production và xác nhận TLS/least privilege.
- Adapter Next không chạy Express `validateRequest` chain. Ví dụ login không gọi `loginSchema`, tự `.trim()` input; kiểu sai có thể gây lỗi thay vì 400 chuẩn. Một số route khác tự validate, không suy rộng “mọi API không validate”.
- `handleApiError` trả `Error.message` thô; `LoginUseCase` cũng chuyển exception text sang failure trả client. Mục tiêu che SQL/stack trong docs06 chưa đạt đồng nhất.
- Access token lưu localStorage và cookie không HttpOnly; tăng bề mặt XSS. JWT permissions là snapshot, `getAuthUser` không truy vấn lại trạng thái user mỗi request. Cần xác định thời gian hiệu lực sau khóa/đổi quyền và threat model, không tự đổi cơ chế session.
- Chưa tìm thấy rate limiter/CSRF policy/security headers trong main path đã kiểm tra; proxy có thể cung cấp một phần, trạng thái triển khai `UNKNOWN`. Chính sách mật khẩu cho phép rất ngắn cần được chủ hệ thống chấp nhận rủi ro, không tự thêm lại regex chữ hoa.
- Socket server phụ không thấy authentication và phát metrics cho mọi connection; chưa biết được triển khai hay không. Cần xác nhận trước khi giữ/mở port hoặc xóa script.

## 11. Database Audit

`KNOWN`: SQL migrations có FK, CHECK, UUID, UTC timestamps, singleton LabProfile, 6 thành phần tồn kho, rowversion, audit/history, IsLendable mặc định tắt và identity snapshots máy. `SqlEquipmentRepository` có update `WHERE Id AND RowVersion`. Transaction/lock được dùng cho booking và import; đây là nền tốt, không đề nghị bỏ.

`runner.ts` tách `-- UP/-- DOWN`, transaction từng migration và ghi `_MigrationHistory`; script DBA riêng hữu ích khi app thiếu DDL. 029/030 chủ động chặn DOWN để giữ lịch sử: **không có rollback tự động an toàn cho mọi migration**. Không chạy nguyên migration có cả DOWN trong SSMS.

Khoảng trống: chưa có bằng chứng replay migration/restore trên DB test; chưa có checksum chống sửa migration đã áp dụng; `reset-test` chỉ chặn qua NODE_ENV, chưa xác thực tên/host DB test; không được chạy chỉ vì đổi NODE_ENV. Snapshot email/tên cần retention/access policy. User runtime cần least privilege, không mặc định dùng `sa`.

`CONFLICTING`: docs14–15 mô tả reservation/counters vật lý, source approve chỉ cập nhật booking item; check-in/out không thực hiện equipment handover/return quantities hay inventory transaction. Availability vẫn trừ requested quantities từ lịch, nên **không thể kết luận đơn giản mọi booking sẽ overbook**. Nhưng số liệu tồn vật lý/bàn giao/trả hỏng/mất chưa có bằng chứng hoàn chỉnh. Phải chốt một mô hình và test xuyên vòng đời, tránh vá cộng/trừ khiến đếm hai lần.

DB production, migrations thực tế, trigger DBA ngoài repo, permission grants, backup/restore và dữ liệu tồn hiện tại đều `UNKNOWN`; không dùng ảnh SSMS cũ làm bằng chứng mới.

## 12. AI Coding Workflow Audit

Đã có bộ hướng dẫn và feature docs mới, nhưng chưa có index chỉ rõ hiện hành/lịch sử; agent có thể đọc luật cũ rồi đảo quyền STUDENT hoặc tái tạo Express workspace. Không có evidence manifest/traceability ngắn gọn nối rule → route → test → migration. Các task nhỏ dễ bị V1 kéo sang scaffold docs/skills không cần thiết.

V2 đề xuất: đọc entry point → chọn docs/skill liên quan → lần đường chạy → ghi impact/unknown → thay đổi nhỏ → kiểm chứng → handoff có giới hạn. Tách **kiến thức**, **chỉ dẫn agent**, **workflow skill**, **kế hoạch task** và **quyết định kiến trúc**. Không nạp toàn bộ tri thức repo vào một prompt.

## 13. Problems Found — ưu tiên và bằng chứng

P0 = cần triage ngay, chặn mở rộng public/release nếu đang có hiệu lực; P1 = rủi ro cao cần sửa theo task được duyệt; P2 = nợ bảo trì; P3 = tùy chọn. Không dùng severity để tự cấp quyền thay đổi production.

| ID  | Ưu tiên / nhãn                      | Bằng chứng                                                            | Tác động và hành động đề xuất                                                                               |
| --- | ----------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| F01 | P0 KNOWN source; exposure UNKNOWN   | `ComputersPage.tsx:191–192`                                           | Credential MQTT ở browser/fallback; xác nhận ACL, rotation qua chủ hệ thống, không in key                   |
| F02 | P0 KNOWN path; exploit INFERRED     | `devices/register/route.ts:6`, `RegisterDeviceUseCase.ts:83,284`      | Public re-registration có thể thay key của định danh cũ; enrollment proof + deny tests trước public rollout |
| F03 | P1 KNOWN                            | `DeviceController.ts:79`, `device-api-logger.ts:36`                   | Key trả về bị log rõ; redact/retention; kiểm tra lịch sử an toàn, rotation nếu lộ                           |
| F04 | P1 KNOWN fallback; deployed UNKNOWN | `JwtTokenService.ts:16`, `connection.ts`                              | Thiếu config vẫn khởi tạo; startup validation, không dùng fallback secret/sa ở production                   |
| F05 | P1 KNOWN                            | `auth/login/route.ts`, `route-helper.ts`, `auth.routes.ts`            | Validation chain khác nhau, raw errors/correlation thiếu; test trên Next boundary rồi sửa tập trung         |
| F06 | P1 CONFLICTING                      | Approve/CheckIn/CheckOut use cases + docs14–15                        | Chốt inventory lifecycle; test một thiết bị xuyên duyệt–nhận–trả–hỏng, không vá mù                          |
| F07 | P1 KNOWN conflict                   | docs01/05/13/18 vs migration029 và computer-booking tests             | Luật role cũ có thể gây regression; canonical permissions + approval record                                 |
| F08 | P1 UNKNOWN deployment controls      | AuthContext/AuthController/getAuthUser, main path search              | Session/XSS, revocation delay, rate limit/CSRF; threat review và kiểm tra proxy                             |
| F09 | P2 KNOWN                            | `.gitignore`, `git ls-files .agent`, `.agent/README.md`               | Knowledge local không theo clone, links tuyệt đối; normalize rồi mới version                                |
| F10 | P2 KNOWN                            | package.json, README, docs02/19, PM2/compose                          | Commands/version/ports drift; runtime runbook cần nguồn duy nhất                                            |
| F11 | P1 cho critical paths, KNOWN gap    | 8 test files, không có CI được track tại `.github`                    | Thiếu route/SQL integration; unit xanh không đủ production gate                                             |
| F12 | P2 KNOWN                            | ComputerController, ImportEquipments, IBookingEquipmentItemRepository | Layer leakage/GET side effects; refactor nhỏ sau characterization tests                                     |
| F13 | P2 CONFLICTING                      | `api_info.md`, RegisterDeviceUseCase                                  | Device contract MAC/UUID/key lifecycle cần version và compatibility tests                                   |
| F14 | P2 UNKNOWN usage                    | socket-server.js, package.json, MQTT UI                               | Hai hướng realtime và script thiếu dependency; xác nhận owner/runtime trước quyết định                      |

## 14. Duplication, Missing Areas, Risk Areas

Trùng: quyền/status/schema lặp ở Word, docs00–18 và skills; dependency rules lặp AGENTS/architecture/repository/review; response spec lặp docs06/API skill/Swagger/device contract. Không gộp tất cả vào một file lớn: chỉ định owner/source canonical, các nơi khác dùng liên kết hoặc artifact sinh tự động.

Thiếu: docs index có trạng thái, architecture as-built, ma trận role-action-scope hiện hành, threat model device/MQTT, inventory decision, operations runbook đã chạy thử, API compatibility/version policy, test strategy có commands thật, decision log, retention/restore evidence. Không nhất thiết mỗi mục là một file riêng.

Rủi ro khi thay đổi: đổi response có thể phá PC Monitor; thay stock formula có thể double-count; xóa user/máy có thể mất khả năng truy lịch sử; role nhiều quyền có thể nhìn tài sản nội bộ đúng thiết kế; đưa `.agent` vào Git trước khi sửa drift có thể lan truyền luật sai.

## 15. What Should NOT Be Changed

- Không viết lại Next/SQL Server hoặc tách backend chỉ vì tên kiến trúc.
- Không đảo quyền mượn của STUDENT/TEACHER theo tài liệu cũ.
- Không xóa lịch sử/snapshot/soft-delete, dữ liệu thật, migration đã chạy.
- Không bỏ lock, transaction, rowversion, audit hay test để “đơn giản hóa”.
- Không thay đổi contract PC Monitor/MQTT hoặc rotate credential không qua người sở hữu.
- Không tạo microservices, repository generic, framework DI hay bộ docs enterprise mặc định.
- Không sửa V1/AGENTS/skills cũ trong đợt này. Template chỉ là bản mẫu, chưa là chỉ dẫn có hiệu lực.

## 16. Recommended Improvements / bước chốt

1. Chủ hệ thống triage F01/F02, xác nhận public exposure/ACL/enrollment; xử lý credential qua kênh riêng, không đưa vào chat/docs.
2. Mở task có scope cho F03–F06 kèm regression tests; quyết định nghiệp vụ tồn kho trước khi sửa.
3. Chốt permissions hiện hành với owner, lấy `lending-catalog.md` và migration029 làm bằng chứng, không tự lấy luật cũ làm chuẩn.
4. Duyệt [migration plan](00-AGENT-WORKFLOW-MIGRATION-PLAN.md); áp dụng từng phase, không big-bang.
5. Dùng [playbook V2](00-VIBE-CODING-PROJECT-PLAYBOOK-V2.md) như đề xuất quy trình nhẹ; chỉ kích hoạt template sau khi điền và review.

Các unknown cần chủ hệ thống xác nhận: môi trường đang chạy/port, DB schema & grants, MQTT credential/ACL, Socket.IO còn dùng không, nguồn policy chính thức, backup/retention và chủ sở hữu release. Phần audit local đã hoàn thành; xác minh production là công việc riêng, chưa được thực hiện.
