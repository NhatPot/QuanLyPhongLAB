# Agent workflow migration plan — đề xuất, chưa thực hiện

2026-10-02 · Baseline `6c0f53e` · Owner phê duyệt: chủ dự án và người phụ trách hệ thống.

Đây là kế hoạch chuyển đổi **quy trình/tri thức** và backlog kỹ thuật từ [audit](00-REPOSITORY-AUDIT.md), không phải SQL migration hay giấy phép sửa production. Đợt hiện tại chỉ tạo các tài liệu mới; mọi việc ở bảng dưới đều **PROPOSED / NOT_STARTED**. Không ước lượng số giờ.

## Current → Target

| Current đã quan sát                                            | Target nhỏ nhất hữu ích                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| Docs Express/Vite/role cũ cạnh source Next và docs feature mới | Index phân biệt ACTIVE/HISTORICAL/PROPOSED, rules có owner      |
| 7 skill local, nhiều schema/rules trùng và lệch                | Workflow skill ngắn, tham chiếu knowledge canonical             |
| `.agent` bị ignore, link đường dẫn máy cá nhân                 | Entry point được version/discover đúng công cụ, link tương đối  |
| Có 87 unit/mocked tests, thiếu HTTP/SQL integration evidence   | Gate chạy được, xác minh boundary/counters/concurrency critical |
| Một số bảo mật/contract/runtime chưa được xác nhận             | Threat decisions, credential controls và runbook có evidence    |
| V1 nhiều scaffold/checklist                                    | V2 tiered: task nhỏ ít thủ tục, task rủi ro có impact/rollback  |

Không đặt mục tiêu “chuyển toàn bộ sang Clean Architecture hoàn hảo”, đổi framework, tách services hoặc tạo tất cả thư mục V2.

## Cách ưu tiên và phê duyệt

- P0: triage ngay, chặn public rollout nếu rủi ro có hiệu lực; không tự truy cập hệ thống ngoài.
- P1: critical flow/security cần xử lý bằng task riêng có tests.
- P2: nâng độ tin cậy/bảo trì, sau các điểm critical.
- P3: optional, chỉ có business case.
- Complexity LOW/MEDIUM/HIGH phản ánh độ rộng/unknown/dependency, không phải thời gian.
- Chọn task → xác nhận scope/owner/target → baseline/tests → thay đổi nhỏ → review/evidence → đóng task. Rủi ro được người có thẩm quyền chấp nhận, không do agent tự quyết.

Các phase có thứ tự chuyển đổi tài liệu; **không trì hoãn test bảo mật đến Phase5**. Mỗi sửa code ở Phase1 phải có regression test ngay. Phần đọc/chuẩn hóa độc lập có thể tiến hành song song sau phê duyệt.

## Phase 1 — Critical cleanup

| Task / Priority                                         | Benefit                                                         | Risk / điều kiện                                                                                           | Affected files hoặc hệ thống                                                                                                                 | Complexity |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| M01 · P0 · Triage MQTT credential/ACL (F01)             | Ngăn coi secret browser là bí mật; giới hạn dữ liệu metrics     | Rotation có thể ngắt agent/dashboard; owner broker xác nhận ACL/credential thật, không in key              | `src/features/computers/ComputersPage.tsx`, config/runbook MQTT đề xuất; broker ngoài repo chỉ khi được phép                                 | HIGH       |
| M02 · P0 · Chốt enrollment/re-enrollment thiết bị (F02) | Không cho client tự thay key chỉ bằng định danh công khai       | Client cũ/bootstrap có thể ngừng hoạt động; cần migration compatibility và deny test                       | `src/app/api/devices/register/route.ts`, `src/server/application/use-cases/device/RegisterDeviceUseCase.ts`, repository agent, `api_info.md` | HIGH       |
| M03 · P1 · Redact log và quản lý retention (F03)        | Không ghi API key/request nhạy cảm nguyên văn                   | Mất thông tin debug; giữ metadata an toàn, kiểm log cũ/rotation qua quy trình riêng                        | `src/server/utils/device-api-logger.ts`, `DeviceController.ts`, tests mới và runbook logging                                                 | MEDIUM     |
| M04 · P1 · Fail-closed config/secrets (F04)             | Không dùng signing key/DB defaults ở production                 | Startup sẽ dừng khi thiếu config; chuẩn bị env mẫu/checker và test startup                                 | `JwtTokenService.ts`, SQL `connection.ts`, `load-environment.ts`, `.env.example`, deployment docs                                            | MEDIUM     |
| M05 · P1 · Validation/error/auth boundary (F05/F08)     | Kiểu sai được 400, lỗi nội bộ không rò, quyền/session policy rõ | Không phá response PC Monitor; quyết định anyOf/allOf, cookie/revocation/CSRF và rate limit dựa deployment | `src/app/api/auth/**`, `route-helper.ts`, `AuthController.ts`, use cases auth, route tests; proxy khi được phép                              | HIGH       |
| M06 · P1 · Chốt và sửa equipment lifecycle (F06)        | Đối chiếu tồn kho vật lý, lịch đặt, nhận/trả/hỏng/mất           | Cộng/trừ mù có thể double-count; cần owner domain, DB test riêng, kế hoạch dữ liệu cũ                      | Booking use cases, `SqlAvailabilityQueryService.ts`, equipment/item repositories, docs14–15, tests; migration mới chỉ nếu thiết kế cần       | HIGH       |

Gate Phase1: phân biệt exposure thật và source risk; có decision/owner/target, regression tests deny/failure, không lộ secret trong diff/evidence. Không yêu cầu agent đọc `.env` production để viết báo cáo. M01/M02 triển khai thay đổi external phải xin quyền riêng.

## Phase 2 — Docs normalization

| Task / Priority                                | Benefit                                                       | Risk / điều kiện                                                                | Affected files                                                                                                  | Complexity |
| ---------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- |
| M07 · P1 · Chốt matrix role-action-scope (F07) | Giữ quyền tự mượn STUDENT/TEACHER, ngăn regression từ docs cũ | Multi-role và tùy chỉnh DB không được suy đoán từ seed; owner xác nhận          | docs01/05/13/17/18, `lending-catalog.md`, migration029 dùng làm evidence; canonical permissions doc mới đề xuất | MEDIUM     |
| M08 · P2 · Knowledge index và lifecycle        | Người/agent tìm đúng nguồn nhanh                              | Không chuyển file làm gãy links; đánh dấu historical trước khi archive          | `docs/index.md` đề xuất; metadata/link docs00–20, Word/TXT source relationship                                  | MEDIUM     |
| M09 · P2 · Runtime/setup as-built (F10)        | Chạy được từ clone, rõ Next/SQL/MQTT/ports/Node               | Lệnh local chưa chứng minh deploy; test bằng môi trường được phép               | README, docs02/03/19; architecture/runbook mới; package/PM2/compose chỉ đọc làm evidence trước                  | MEDIUM     |
| M10 · P2 · API/device contract version (F13)   | Web và PC Monitor cùng hiểu identifier/key/response           | Thay payload ảnh hưởng external client; phân biệt spec vs compatibility aliases | `api_info.md`, Swagger source, auth/device contracts, contract tests mới                                        | MEDIUM     |
| M11 · P2 · Đưa V2 vào quy trình lựa chọn tier  | Giảm scaffold/giấy tờ, giữ security gates                     | Không biến mọi template thành bắt buộc                                          | V2, docs index, team onboarding; V1 giữ lịch sử                                                                 | LOW        |

Gate Phase2: mỗi rule/contract có owner/source canonical, trạng thái tài liệu và replacement links rõ; không xóa V1/Word/TXT để “dọn sạch”. Commands phải tồn tại hoặc được ghi là proposal. Ngày DB đã kiểm tra trước đây không bị đổi thành hôm nay nếu chưa kiểm lại.

## Phase 3 — Skill normalization

| Task / Priority                                       | Benefit                                                      | Risk / điều kiện                                                        | Affected files                                                                                      | Complexity |
| ----------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| M12 · P1 · Booking/SQL/test skills bỏ luật sai        | Tránh TECHNICIAN/status/công thức tồn kho cũ điều khiển code | Chưa có canonical rules thì không thay bằng suy đoán; phụ thuộc M06/M07 | `.agent/skills/booking-business-rules`, `sqlserver-database-design`, `test-case-clean-architecture` | MEDIUM     |
| M13 · P2 · Rút gọn architecture/repository/API/review | Trigger rõ, link source, severity theo tác động              | Gộp quá mức mất workflow; không tự thay kiến trúc repo                  | 4 skill còn lại, `.agent/README.md`, references thật cần thiết                                      | MEDIUM     |
| M14 · P2 · Metadata/discovery và skill checks         | Tool chọn đúng skill; entry không God skill                  | Format/path phụ thuộc agent; template chưa phải package cài đặt         | Skill frontmatter, metadata nếu cần, fixture tasks / guide kiểm discovery                           | LOW        |

Gate Phase3: thử đúng trigger, ngoài scope, thiếu prerequisite; không đọc cả knowledge mặc định; không hard-code paths cá nhân. Business rules chỉ tham chiếu docs chuẩn. Không tạo skill mới cho thao tác audit một lần. Skill security/ops/frontend chỉ được thêm sau khi chứng minh workflow lặp và có owner.

## Phase 4 — AGENTS cleanup

| Task / Priority                                             | Benefit                                           | Risk / điều kiện                                                        | Affected files                                                                         | Complexity |
| ----------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| M15 · P2 · Entry point ngắn, map/commands/conflict protocol | Agent onboarding nhất quán, hành động trong scope | Auto-discovery tùy tool; không tạo hai file chỉ dẫn trái nhau           | Root `AGENTS.md` đề xuất, `.agent/AGENTS.md`, `.agent/README.md`; dựa template đã điền | MEDIUM     |
| M16 · P2 · Version bộ hướng dẫn đã chuẩn hóa (F09)          | Clone sạch nhận knowledge/workflows               | `.agent` có thể có local file/secret; phải inventory và whitelist trước | `.gitignore`, các instruction/skill được duyệt; không stage toàn thư mục mù            | LOW        |

Gate Phase4: clean-clone/discovery test trong môi trường local được phép; link tương đối chạy trên máy khác; commands được kiểm; không đưa secrets/local state vào Git. Không thực hiện `git add -f .agent` hàng loạt.

## Phase 5 — Testing / quality gate

| Task / Priority                                           | Benefit                                                     | Risk / điều kiện                                                         | Affected files                                                                    | Complexity |
| --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------- |
| M17 · P1 · HTTP boundary auth/permission/validation tests | Bắt khác biệt Express schema và Next runtime                | Tránh test mock hết boundary làm mất ý nghĩa                             | `src/app/api/**` tests, route-helper/auth controllers, test config nếu cần        | MEDIUM     |
| M18 · P1 · SQL integration/booking-inventory concurrency  | Chứng minh transaction/locks/rowversion trên DB thật        | Tuyệt đối DB test riêng; guard host/name; không reset production         | `tests/integration` đề xuất, migrations/runner tests, repos/booking critical path | HIGH       |
| M19 · P2 · Commands và CI tối thiểu                       | Mọi người chạy cùng gate, không lệnh “npm test” tưởng tượng | Không thêm dependencies hàng loạt; xác định CI hosting quyền             | package.json scripts test/check đề xuất, CI config mới, README, docs18            | MEDIUM     |
| M20 · P2 · Browser smoke/AC và evidence release           | Xác minh UX/quyền/critical flow bằng runtime                | Cần dữ liệu test và app environment; không claim screenshot mock là test | UI test setup đề xuất, feature AC, smoke/operations docs                          | MEDIUM     |

Gate Phase5: negative tests, SQL apply/upgrade/rollback hoặc roll-forward, concurrency nhiều connections và smoke theo role có evidence. Không dùng số lượng test/coverage như chứng nhận an toàn. Kết quả local hiện tại: 87 tests + typecheck PASS; chưa phải đầu ra Phase5.

## Phase 6 — Optional advanced improvements

| Task / Priority                                          | Benefit                                         | Risk / điều kiện                                                | Affected files                                                                                  | Complexity |
| -------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| M21 · P2 · Characterization rồi giảm layer leakage (F12) | Controller mỏng, transaction seam rõ, dễ test   | Không trộn sửa nghiệp vụ; giữ response và semantics             | `ComputerController.ts`, `ImportEquipments.ts`, domain transaction port, repositories liên quan | MEDIUM     |
| M22 · P2 · Chốt một đường realtime được hỗ trợ (F14)     | Rõ Socket.IO/MQTT ownership, auth và dependency | Không xóa script chỉ vì tìm không thấy caller; hỏi owner/client | socket-server.js, package.json, ComputersPage, MQTT/device runbook                              | MEDIUM     |
| M23 · P3 · Generated contracts/docs checks               | Giảm drift API/schema/link                      | Chi phí automation có thể lớn hơn lợi ích; chỉ thêm khi lặp     | Contract nguồn/generator, CI/docs lint đề xuất                                                  | MEDIUM     |
| M24 · P3 · Observability/DR/compliance nâng cao          | Phù hợp nhu cầu vận hành được đo                | Không áp enterprise preset; cần SLA/owner/budget                | ops/runbooks/monitoring config, ADR nếu thay kiến trúc                                          | HIGH       |

Gate Phase6: mỗi việc có pain/benefit được chứng minh, không chỉ làm “cho chuẩn”. Microservices, DDD toàn bộ, framework DI hoặc thay stack không nằm trong plan này.

## Thứ tự đề nghị bắt đầu

1. Chủ hệ thống chốt phạm vi triage M01/M02 và xác nhận exposure mà không chia sẻ key trong chat.
2. M03/M04 là các task bảo mật có ranh giới tương đối rõ; kèm tests ngay.
3. Chốt M06/M07 với owner nghiệp vụ, rồi mới sửa counters/permissions docs.
4. M08/M09 tạo bản đồ onboarding thật; M12–M16 theo sau để không version hóa luật sai.
5. M17–M20 hoàn thiện gates; M21–M24 chỉ chọn khi còn giá trị.

## Change control, rollback và trạng thái

Mỗi task có branch/diff nhỏ, baseline, reviewer, commands và kết quả; không tự commit/push/deploy. Doc-only normalization có thể revert diff sau review; không xóa lịch sử. Code/auth changes phải giữ client compatibility; DB changes có plan riêng, không giả định DOWN an toàn. Credential rotation cần owner và phối hợp client, không thể “revert Git” là khôi phục xong.

Chốt phase khi outcome/evidence đạt, không vì đã tạo đủ file. Nếu có gate bắt buộc chưa chạy, báo BLOCKED/NOT_RUN rõ ràng. Playbook/template mới là **deliverable của audit**, không phải bằng chứng bất kỳ task migration nào đã được triển khai.
