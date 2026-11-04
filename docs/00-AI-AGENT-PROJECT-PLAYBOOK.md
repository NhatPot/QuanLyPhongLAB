# AI Agent Project Playbook

## Master Guide — tổ chức và phát triển software với AI coding agent

Phiên bản 1.0 · Ngày 2026-10-03 · Trạng thái: hướng dẫn tham khảo, chỉ có hiệu lực trong một dự án sau khi chủ dự án chọn cách áp dụng.

**Câu hỏi tài liệu giải quyết:** Trước khi giao việc cho AI, con người cần chuẩn bị gì để agent hiểu đúng sản phẩm, tìm đúng kiến thức, triển khai đúng phạm vi và bàn giao kết quả có thể kiểm chứng?

Áp dụng cho website, web app, backend API, full-stack, mobile, internal tool, hệ thống quản lý và SaaS; không phụ thuộc Node.js, Python, .NET, Java hay framework cụ thể. Repository đang chứa tài liệu chỉ là nguồn tham khảo, không phải kiến trúc đích.

Đây là **operating model**: cách tổ chức thông tin, quyết định và công việc giữa con người với agent. Không phải scaffold source code, danh sách thư viện phải cài hay chỉ thị refactor repository. Các đường dẫn, tên skill, lệnh và cấu trúc minh họa bên dưới không có nghĩa chúng đã tồn tại hoặc đã được kích hoạt.

### Cách đọc và bắt đầu

- Muốn bắt đầu ngay: đọc [mô hình tổng thể](#model) và §2–4, sau đó điền [Task Package — §10](#task-package).
- Muốn quản lý công việc: đọc [Agile/Scrum — §3](#agile) và §7–17.
- Muốn biết phải chuẩn bị tài liệu nào: đọc [Docs system — §4](#docs-system), [kiến thức kỹ thuật — §18–24](#technical-knowledge) và [ba mức áp dụng — §25](#project-levels).
- Dự án mới / dự án cũ: dùng [§26](#new-project) / [§27](#existing-project).
- Muốn xem một ví dụ chạy xuyên suốt: đọc [§31 — Đặt phòng](#example).
- Muốn lấy mẫu: dùng [§32 — 12 template](#templates), chỉ lấy mẫu đang cần.

Người mới không cần viết hết tài liệu trước khi code. Với việc đầu tiên, hãy chốt **người dùng, vấn đề, kết quả, giới hạn, luật quan trọng và cách nghiệm thu**. Agent có thể hỗ trợ soạn phần còn lại, nhưng không được tự quyết yêu cầu sản phẩm thay bạn.

Quy ước trong playbook: **MUST** = bắt buộc khi điều kiện áp dụng xuất hiện; **SHOULD** = mặc định nên làm, có thể bỏ với lý do; **MAY** = tùy chọn. “Bắt buộc có thông tin” không có nghĩa “bắt buộc có một file riêng”. `N/A` phải có lý do; `UNKNOWN` không được tự biến thành một yêu cầu đã duyệt.

<a id="model"></a>

## 1. Mô hình tổng thể: từ mục tiêu đến bằng chứng

```text
PRODUCT → PROJECT KNOWLEDGE → AGILE / SCRUM → ARCHITECTURE
        → AGENT INSTRUCTIONS → SKILLS → TASK / EXECUTION PLAN
        → IMPLEMENTATION → TEST → REVIEW → DOC SYNC → DELIVERY
             ↑                                          │
             └──── phản hồi, phát hiện mới, điều chỉnh ──┘
```

Mũi tên là quan hệ truyền context và kiểm chứng, **không phải waterfall** buộc hoàn thành mọi tài liệu rồi mới lập trình. Mỗi lát cắt nhỏ đi qua vòng lặp; kiến trúc và tài liệu được cập nhật khi có thông tin mới.

| Tầng               | Trách nhiệm                                           | Đầu ra / người chịu trách nhiệm                                    |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Product            | Vì ai, giải quyết gì, ưu tiên gì, không làm gì        | Vision, mục tiêu, phạm vi; chủ sản phẩm                            |
| Project knowledge  | Những sự thật, quy tắc và giới hạn đã biết của dự án  | Docs có nguồn và owner; người phụ trách nghiệp vụ/kỹ thuật         |
| Agile / Scrum      | Chuyển nhu cầu thành phần việc có thứ tự và phản hồi  | Backlog, story, nhịp giao hàng; nhóm sản phẩm/phát triển           |
| Architecture       | Chọn ranh giới và cách hệ thống vận hành phù hợp      | Bản đồ hệ thống, contract, quyết định quan trọng; kỹ thuật         |
| Agent instructions | Chỉ đường đọc, lệnh kiểm tra và quyền thao tác        | `AGENTS.md` hoặc entrypoint công cụ hỗ trợ; maintainer             |
| Skills             | Chuẩn hóa cách làm một loại việc lặp lại              | Workflow có trigger và validation; người sở hữu workflow           |
| Task / Plan        | Xác định việc hiện tại và cách thực hiện nó           | Task Package, plan theo rủi ro; người giao việc + người triển khai |
| Implementation     | Hiện thực hành vi trong phạm vi được giao             | Source, cấu hình, migration khi cần; developer/agent hỗ trợ        |
| Test               | Tạo bằng chứng cho AC, luật và hồi quy                | Test và kết quả thực chạy; người triển khai/kiểm thử               |
| Review             | Kiểm tra ý định, diff, rủi ro và bằng chứng           | Nhận xét, quyết định chấp nhận; reviewer có trách nhiệm            |
| Doc sync           | Giữ kiến thức hiện hành phù hợp thay đổi đã duyệt     | Docs/contract/rule cập nhật, không nhân bản                        |
| Delivery           | Đưa thay đổi đến đúng môi trường trong quyền được cấp | Release, smoke check, hướng phục hồi; người phụ trách vận hành     |

### Mười loại thông tin phải phân biệt

| Loại                       | Trả lời điều gì / vì sao cần                                | Nơi lưu và lúc agent đọc                                          | Ví dụ / quan hệ                                                  |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Product knowledge       | Giá trị, người dùng, phạm vi; tránh xây sai thứ             | Vision/scope/backlog; trước đề xuất feature hoặc ưu tiên          | “Giúp thành viên tự đặt phòng”; dẫn đến feature                  |
| 2. Project knowledge       | Sự thật cụ thể: domain, dữ liệu, runtime, quyền; tránh đoán | Docs chuyên đề; đọc phần liên quan trước thay đổi                 | Cách xác định một phòng, timezone; ràng buộc implementation      |
| 3. Agent instructions      | Tìm đâu, thao tác thế nào, được làm gì                      | Entry `AGENTS.md`; đầu mỗi task và hướng dẫn theo thư mục áp dụng | Link rules, test commands; dẫn đến docs/skills, không chép chúng |
| 4. Reusable skills         | Làm loại việc này có kiểm soát như thế nào                  | `SKILL.md` được công cụ hỗ trợ; khi trigger khớp task             | Quy trình thay API; tham chiếu contract và rule của dự án        |
| 5. Feature specifications  | WHY / WHAT / RULES / EXPECTED BEHAVIOR                      | Feature spec; trước tách task và khi sửa hành vi                  | “Đặt phòng”; kết nối story, AC, rule và luồng                    |
| 6. Sprint/task information | Làm gì bây giờ, vì sao, tiến độ và phụ thuộc                | Board/issue hoặc docs agile; khi nhận và bàn giao việc            | Sprint chọn US-BOOKING-001; task triển khai API                  |
| 7. Execution plans         | Task này sửa thế nào, kiểm thế nào                          | Issue hoặc plan file; sau khảo sát, trước sửa                     | Đổi handler, ghi DB an toàn, thêm test cạnh tranh                |
| 8. Architecture decisions  | Vì sao chọn phương án quan trọng                            | ADR; khi thay boundary/quyết định liên quan                       | Vì sao dùng một ứng dụng nguyên khối; cập nhật bản đồ kiến trúc  |
| 9. Source code             | Hành vi đã được hiện thực ra sao                            | Source/config/migration; sau hiểu yêu cầu và khi tìm đường chạy   | API tạo booking; không tự chứng minh đúng nghiệp vụ              |
| 10. Tests                  | Hành vi nào được kiểm chứng trong điều kiện nào             | Test + evidence; trước/sau sửa và lúc review                      | Hai yêu cầu trùng giờ không cùng thành công; đối chiếu AC/rule   |

“Product knowledge” là một phần của kiến thức tổng thể, nhưng tách trách nhiệm để không nhầm **điều sản phẩm cần** với **điều hệ thống hiện đang làm**. Một file có thể chứa vài phần ở dự án nhỏ, miễn tiêu đề, trạng thái và nguồn quyết định vẫn rõ.

## 2. Project inception: chuẩn bị đủ để bắt đầu, không thiết kế hết tương lai

Chủ dự án cung cấp sự hiểu biết về người dùng và quyết định phạm vi. Agent giúp phỏng vấn, hệ thống hóa, tìm điểm thiếu, đề xuất lựa chọn. Người phụ trách kỹ thuật xác nhận tính khả thi. Một người có thể đảm nhiệm nhiều vai, nhưng vẫn phải phân biệt loại quyết định.

| Nội dung trước lát cắt đầu tiên | Mức                                           | Nội dung tối thiểu / nơi lưu                                                | Khi được giản lược hoặc bỏ                                              |
| ------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Idea → Problem → Vision         | MUST                                          | Ai gặp vấn đề gì; sản phẩm giải quyết thế nào; vision/README                | Gộp vài đoạn, không bắt pitch deck                                      |
| Goals, non-goals, scope         | MUST                                          | Kết quả mong đợi, giới hạn MVP, ngoài phạm vi                               | Chưa có số đo thì ghi cách xác nhận; không tự bịa KPI                   |
| Stakeholders, actors, roles     | MUST                                          | Ai quyết định, ai sử dụng, ai vận hành; actor-action-scope                  | Tool cá nhân có thể chỉ một actor; không cần RBAC giả tạo               |
| Requirements chức năng          | MUST                                          | Luồng đầu tiên và hành vi mong đợi                                          | Chỉ làm rõ phần sắp triển khai, không cần toàn bộ roadmap               |
| Requirements phi chức năng      | MUST xét rủi ro                               | Dữ liệu nhạy cảm, hiệu năng, khả dụng, accessibility, offline nếu liên quan | Không cần SLA enterprise nếu chưa có nhu cầu; ghi N/A có lý do          |
| Business rules                  | MUST với luật ảnh hưởng kết quả/quyền/dữ liệu | ID, phát biểu kiểm được, owner, trạng thái                                  | Website giới thiệu ít luật có thể gộp trong spec                        |
| Epic / Feature / Story / AC     | MUST có outcome và AC; MAY dùng đủ phân cấp   | Feature/story hoặc issue có điều kiện nghiệm thu                            | Việc nhỏ bỏ epic, gộp feature và story                                  |
| User flows / use cases          | SHOULD; MUST cho luồng nhiều nhánh/rủi ro     | Bước chính, từ chối, actor, tiền/hậu điều kiện                              | Một thao tác đơn giản dùng vài dòng, không cần UML                      |
| Domain model / glossary         | SHOULD; MUST khi thuật ngữ dễ hiểu khác nhau  | Khái niệm, trạng thái, quan hệ; domain docs                                 | Không bắt mô hình DDD hay class diagram                                 |
| Data model                      | MUST nếu lưu dữ liệu bền vững                 | Ý nghĩa dữ liệu, ID, ràng buộc, ownership                                   | Không có lưu trữ thì N/A; bảng nhỏ không cần ERD riêng                  |
| Architecture                    | MUST có bản đồ vừa đủ                         | Entry point, module, runtime, dependency, hệ thống ngoài                    | App nhỏ chỉ một sơ đồ/đoạn README                                       |
| API contract                    | MUST nếu thay interface giữa các bên          | Input/output/lỗi/quyền/compatibility                                        | Không có API mạng thì mô tả interface cần thiết, không dựng REST cho đủ |
| Security                        | MUST theo bề mặt thực tế                      | Trust boundary, dữ liệu, quyền, secrets, hành động nguy hiểm                | Không có login vẫn cần xét dữ liệu công khai và secret deploy           |
| Testing strategy                | MUST                                          | AC nào kiểm bằng gì, môi trường an toàn, lệnh thật                          | Có thể một đoạn; không bắt mọi tầng test                                |
| Backlog                         | MUST có thứ tự việc                           | Danh sách outcome, ưu tiên, phụ thuộc, owner                                | Issue list đủ; không đồng thời duy trì nhiều bản                        |
| Sprint                          | MAY                                           | Mục tiêu đợt làm, việc được chọn, chất lượng cần đạt                        | Solo hoặc luồng liên tục có thể dùng Kanban, không ép sprint            |

**Điểm dừng trước code:** chưa biết ai được đặt phòng, thế nào là trùng giờ hoặc cần duyệt không thì hỏi chủ nghiệp vụ; chưa biết framework xử lý transaction thế nào thì agent khảo sát kỹ thuật. Hai loại thiếu thông tin không nên đẩy hết về người dùng.

<a id="agile"></a>

## 3. Agile / Scrum: quản lý yêu cầu trước, giao kỹ thuật sau

Scrum có ba artifact: Product Backlog, Sprint Backlog, Increment; commitment tương ứng là Product Goal, Sprint Goal, Definition of Done. Epic, Feature, User Story và Definition of Ready là quy ước bổ trợ, không phải artifact bắt buộc. Sprint Review nhận phản hồi, không phải cổng bắt buộc để release. Tham chiếu: [Scrum Guide chính thức](https://scrumguides.org/scrum-guide.html).

Phần còn lại là **cách phối hợp với agent do playbook đề xuất**, không phải thêm quy định vào Scrum. Nếu nhóm áp dụng đầy đủ Scrum, giữ các trách nhiệm và sự kiện của framework. Nếu chỉ cần backlog, giới hạn việc đang làm và review ngắn, hãy gọi đó là cách làm Agile nhẹ/Kanban, không ép lễ nghi hay gán nhãn Scrum đầy đủ.

```text
Product Vision → Product Goal → Product Backlog có thứ tự
  → Epic / Feature / Story + AC (mức chi tiết tùy nhu cầu)
  → lựa chọn theo Sprint Goal hoặc kéo việc tiếp theo
  → Engineering Task → Task Package → Execution Plan
  → Agent implementation → Tests + Review → DoD
  → phần sản phẩm dùng được → phản hồi → điều chỉnh Backlog
```

### Không gọi tất cả là “task”

| Khái niệm                | WHAT / WHY                                | WHEN / FILE / agent đọc                         | Ví dụ và quan hệ                                       |
| ------------------------ | ----------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Product Goal             | Kết quả sản phẩm cần hướng tới            | Trước ưu tiên; vision/backlog                   | Thành viên tự đặt phòng thay trao đổi thủ công         |
| Epic                     | Nhóm nhu cầu lớn để nhìn hướng đi         | Khi cần gom nhiều feature; backlog              | Quản lý đặt phòng; không cần một epic cho typo         |
| Feature                  | Năng lực sản phẩm cung cấp                | Khi làm rõ phạm vi; feature spec                | Đặt phòng, gồm một hoặc nhiều story                    |
| User Story               | Nhu cầu từ góc nhìn actor và giá trị      | Khi chọn lát cắt có thể nghiệm thu; issue/story | Là thành viên, tôi muốn đặt phòng để có chỗ họp        |
| Acceptance Criteria — AC | Điều kiện kiểm được cho một story/feature | Trước implementation; lưu ở story/spec          | Chọn giờ hợp lệ thì nhận mã; trùng giờ thì bị từ chối  |
| Business Rule — BR       | Điều phải đúng xuyên các luồng            | Khi hiểu/đổi nghiệp vụ; domain docs             | Một phòng không có hai lịch hiệu lực chồng thời gian   |
| Engineering Task         | Phần việc triển khai cụ thể               | Khi tách story; issue/Task Package              | Thêm API tạo booking, phục vụ AC-01 đến AC-03          |
| Execution Plan           | Cách thực hiện task này                   | Sau đọc context và source; plan/issue           | Đổi handler, transaction, test; hết task thì đóng plan |
| Skill                    | Cách làm một loại việc có thể lặp         | Khi workflow khớp task; skill file              | Kiểm contract, auth, validation, integration cho API   |

AC là điều kiện nghiệm thu **lần giao này**; BR có thể chi phối nhiều story lâu dài. Task “viết API” có thể hoàn tất trong khi story “người dùng đặt phòng trên UI” vẫn chưa xong. Plan không quyết định giá trị sản phẩm; skill không thay thế plan.

### Quyền quyết định giữa người và agent

| Người/nhóm chịu trách nhiệm                 | Quyết định                                          | Agent hỗ trợ, không thay quyền                             |
| ------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Chủ sản phẩm / Product Owner nếu dùng Scrum | Giá trị, ưu tiên, scope, chấp nhận thay đổi yêu cầu | Soạn backlog, tìm thiếu sót, đề xuất chia story            |
| Chủ nghiệp vụ                               | Quy tắc, ngoại lệ, đối tượng được phép thao tác     | Nêu xung đột và đưa ví dụ để xác nhận                      |
| Nhóm phát triển / kỹ thuật                  | Thiết kế, cách triển khai, rủi ro kỹ thuật          | Khảo sát, lập plan, viết source/test trong phạm vi         |
| Reviewer / người kiểm thử                   | Kiểm chứng độc lập phù hợp rủi ro                   | Chuẩn bị evidence, tự review; không giả có người phê duyệt |
| Người vận hành                              | Môi trường, quyền deploy, phục hồi, dữ liệu thật    | Soạn runbook; chỉ thực thi khi được phép                   |
| Người điều phối / Scrum Master nếu có       | Gỡ vướng và cải tiến cách phối hợp                  | Tóm tắt blocker, đề xuất cải tiến quy trình                |

AI không phải Product Owner; không tự đổi thứ tự backlog, tự đặt business rule hoặc chấp nhận rủi ro thay người có trách nhiệm. Thấy vấn đề ngoài scope thì ghi đề xuất, không tự nhận thêm việc.

<a id="docs-system"></a>

## 4. Docs system: một nguồn chuẩn, nhiều đường dẫn đến nó

**Docs là kiến thức của dự án, không phải prompt dài ra lệnh cho AI.** Mỗi tài liệu hiện hành SHOULD có owner, phạm vi, trạng thái, ngày kiểm tra và nguồn liên quan. Agent được cập nhật khi task thay đổi nội dung đó; owner quyết định các thay đổi ý nghĩa nghiệp vụ.

Ba cách tổ chức tài liệu tương ứng ba mức dự án ở §25:

- **MINIMAL / LEVEL A:** README chứa vision, scope, bản đồ và lệnh; một issue chứa story/AC/task/plan ngắn; AGENTS gọn; source và bằng chứng kiểm thử. Không cần tạo thư mục docs chỉ để có thư mục.
- **STANDARD / LEVEL B:** tách những nguồn thay đổi khác nhau: product, rules/quyền, feature, architecture/contracts, backlog, testing. Plan và ADR chỉ sinh khi có lý do.
- **ADVANCED / LEVEL C:** thêm ownership theo module, quyết định liên đội, contracts/versioning, security/operations và traceability theo rủi ro. Không mặc định hàng trăm file.

### Danh mục tài liệu và cách agent sử dụng

Đường dẫn sau là gợi ý cho dự án mới. Giữ convention tốt đang có. Board/issue tracker có thể là nguồn chuẩn thay `docs/agile/`; không duy trì hai backlog độc lập.

| Tài liệu / vị trí gợi ý                               | Vì sao / nội dung tối thiểu                                | Khi cần; owner cập nhật                       | Agent đọc; liên kết / ví dụ                                   |
| ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| `README.md`                                           | Giới thiệu, chạy/test, entrypoint docs                     | Mọi repo; maintainer khi setup thay đổi       | Bắt đầu làm; dẫn tới map và commands                          |
| `docs/index.md`                                       | Mục lục, owner/status, nguồn chuẩn theo chủ đề             | Khi nhiều docs khó tìm; maintainer            | Tìm context; không chép nội dung docs con                     |
| `docs/product/vision.md`                              | Problem, users, goals, non-goals, scope                    | Mọi dự án; chủ sản phẩm; A gộp README         | Khi khởi động/ưu tiên; dẫn backlog                            |
| `docs/product/requirements.md`                        | Nhu cầu chức năng/phi chức năng, ràng buộc                 | Khi vượt vài story; chủ sản phẩm + kỹ thuật   | Khi đề xuất feature; không liệt kê class cần viết             |
| `docs/domain/glossary.md`                             | Thuật ngữ, ý nghĩa entity/trạng thái                       | Domain dễ nhầm; chủ nghiệp vụ                 | Trước sửa luật/data; “lịch hiệu lực” nghĩa gì                 |
| `docs/domain/business-rules.md`                       | BR ID, invariant, ngoại lệ, owner, trạng thái              | Khi có luật; chủ nghiệp vụ                    | Trước thiết kế/test; được story/API/test tham chiếu           |
| `docs/domain/roles-permissions.md`                    | Actor → action → data scope → điều kiện                    | Khi có phân quyền; chủ nghiệp vụ + security   | Trước thêm endpoint/visibility; không suy quyền từ tên role   |
| `docs/features/<feature>.md`                          | WHY/WHAT/AC/rules/flow/edge cases                          | Feature nhiều nhánh; sản phẩm + kỹ thuật      | Refinement và implementation; link story, BR                  |
| `docs/architecture/system-overview.md`                | Context, module, runtime, boundary, ownership              | Mọi dự án vừa đủ; kỹ thuật                    | Trước đổi cross-module; A gộp README                          |
| `docs/architecture/data-model.md`                     | Semantics, quan hệ, constraints, tx/concurrency, retention | Có DB; kỹ thuật/data owner                    | Trước sửa persistence; link migration chứ không chép toàn DDL |
| `docs/architecture/api-contract.md` hoặc schema chuẩn | Request/response/errors/auth/compatibility                 | Có consumer API; API owner                    | Trước thay contract; link generated docs nếu có               |
| `docs/architecture/frontend.md`                       | IA, flows, components, states, accessibility               | Có UI đủ phức tạp; UI/product owner           | Trước sửa luồng; liên kết design system và API                |
| `docs/architecture/security.md`                       | Authn/authz, trust boundary, sensitive data, secrets       | Có bề mặt rủi ro; security/kỹ thuật           | Trước tác động bảo mật; không chứa credential thật            |
| `docs/agile/product-backlog.md` hoặc board            | Thứ tự outcome, AC links, phụ thuộc/status                 | Có từ một việc cần chọn; chủ sản phẩm         | Nhận đúng việc; không thay plan kỹ thuật                      |
| `docs/agile/stories/`, `sprints/` hoặc issues         | Story/AC; goal/selected work/tasks                         | Khi cần tách; sản phẩm + nhóm phát triển      | Nhận task/review; không nhân bản board                        |
| `docs/tasks/` hoặc issue                              | Task Package, phạm vi, quyền, evidence                     | Mỗi việc; người giao + người thực hiện        | Điểm vào context cho một lần làm                              |
| `docs/plans/` hoặc phần plan trong issue              | Tác động, steps, validation, rollback                      | Task phức tạp/rủi ro; người triển khai        | Trước sửa và lúc tiếp tục sau ngắt quãng                      |
| `docs/decisions/ADR-*.md`                             | Context/decision/alternatives/consequences/status          | Quyết định quan trọng; kỹ thuật có thẩm quyền | Khi đụng quyết định đó; không là TODO                         |
| `docs/testing/test-strategy.md`                       | Risk → loại test → môi trường/lệnh/gate                    | Mọi dự án vừa đủ; kỹ thuật/QA                 | Trước chạy test; A gộp README/task                            |
| `docs/operations/`                                    | Deploy/config/backup/restore/monitoring                    | Khi vận hành thực; người vận hành             | Chỉ khi release hoặc thay vận hành                            |

### Vòng đời và xử lý nguồn mâu thuẫn

1. Dùng trạng thái `DRAFT → REVIEWED → ACTIVE → SUPERSEDED/ARCHIVED` nếu cần; tối thiểu phân biệt đề xuất với đã duyệt.
2. Một rule/contract có một nơi quản lý chính. Spec, skill, task trỏ về đó bằng link/ID. Nội dung sinh tự động ghi nguồn và lệnh sinh; sửa nguồn, không vá riêng output.
3. Docs mô tả ý định đã duyệt; source/test/migration cho biết implementation và bằng chứng. Không có quy tắc “code luôn thắng” hoặc “docs luôn thắng”.
4. Khi mâu thuẫn, ghi hai nguồn, tác động, người quyết định. Với hành vi/quyền chưa rõ, hỏi owner trước khi sửa nhánh đó. Test cũ có thể đang kiểm một bug.
5. Trong cùng thay đổi hành vi, đồng bộ nguồn chuẩn và links liên quan. Nếu chưa được phép sửa docs khác, ghi đề xuất riêng; không âm thầm mở scope.
6. Cập nhật khi có thay đổi/incident/onboarding thất bại. Không thay ngày review để tạo cảm giác tài liệu còn đúng.

## 5. AGENTS.md: entrypoint + router + operating rules

AGENTS trả lời **“đọc đâu, làm sao, giới hạn gì?”**, không trả lời thay toàn bộ kiến thức sản phẩm. Maintainer viết/duyệt; agent đọc trước task và trước khi vào phạm vi có hướng dẫn riêng.

Nội dung tối thiểu: project một đoạn; map source/docs/skills; nguồn chuẩn; commands đã kiểm tra; quy trình task; điều kiện cần plan/test/doc sync; an toàn và DoD. Ví dụ routing:

| Task                   | Đọc trước                                        | Skill nếu có và phù hợp                |
| ---------------------- | ------------------------------------------------ | -------------------------------------- |
| Thay hành vi đặt phòng | Feature/story → booking rules → quyền → contract | Workflow domain, API hoặc UI liên quan |
| Đổi schema             | Data model → migration convention → consumers    | Database-change workflow               |
| Sửa giao diện          | Feature/flow → frontend docs → API               | UI implementation/validation workflow  |

Không nhét mọi schema, toàn bộ phân quyền, danh sách task tuần này hoặc tất cả skill vào AGENTS. Một trang gọn có link tốt thường hữu ích hơn một tài liệu khổng lồ. Khi dự án lớn, MAY có hướng dẫn theo thư mục nếu công cụ hỗ trợ và không tạo luật mâu thuẫn.

Vị trí và cơ chế nhận AGENTS/skill tùy agent; phải kiểm tra công cụ thực tế. Một thư mục tên `.agent/` không tự chứng minh tool đã tải nội dung. Nếu tool không hỗ trợ, dùng entrypoint tương đương hoặc đưa đường dẫn rõ trong Task Package. Mẫu §32.1 là khung để điền, không phải cấu hình tự kích hoạt.

## 6. Skill system: workflow tái sử dụng, không phải kho kiến thức dự án

Skill đáng tạo khi công việc **lặp lại + đủ phức tạp + cần quy trình ổn định + có cách kiểm chứng**. Không cần đạt số lần hay số dòng cố định. Người sở hữu workflow duyệt; agent chỉ nạp khi trigger đúng và đọc references theo điều kiện.

| Nếu bạn đang viết…            | Nơi đúng       | Ví dụ “Đặt phòng”                                                     |
| ----------------------------- | -------------- | --------------------------------------------------------------------- |
| Một sự thật/luật của sản phẩm | Docs           | BR-BOOKING-001 định nghĩa trùng lịch và trạng thái giữ chỗ            |
| Cách xử lý một lớp vấn đề lặp | Skill          | Đọc rule thời gian, kiểm atomicity, cạnh tranh, quyền, boundary tests |
| Cách sửa công việc hiện tại   | Execution Plan | Task này đổi entry API, thao tác ghi và ba nhóm test                  |
| Kết quả cần giao lần này      | Task / story   | Thành viên gửi yêu cầu hợp lệ và nhận mã booking                      |

Không tạo skill cho “sửa lỗi A hôm nay”, danh sách role của riêng một sản phẩm, hoặc thao tác đơn giản đã đủ rõ trong AGENTS. Domain skill vẫn là **workflow kiểm domain**; luật thực tế nằm ở docs, không chép vào skill để rồi lệch phiên bản.

### Anatomy và lifecycle

Mẫu §32.10 có `name`, `description` (nêu trigger), Purpose, When to Use, Preconditions, Inputs, Relevant Project Docs, Workflow, Validation, Output, Do Not, Done When, References, Scripts. Phần không dùng ghi N/A hoặc bỏ khi tạo skill thật, không dựng thư mục rỗng.

Workflow phải hướng đến kết quả, cho phép phương án kỹ thuật tương đương. References chứa hướng dẫn bổ trợ và chỉ được đọc khi cần; scripts dùng cho bước lặp có đầu vào/đầu ra rõ, không chạy lệnh nguy hiểm mặc định. Không kèm secret, task state hoặc yêu cầu tự deploy.

Đề xuất → thử trên task đại diện → review kết quả và trigger → áp dụng → cải tiến hoặc retire. Thử cả trường hợp phù hợp, ngoài scope và thiếu điều kiện; kiểm hành vi chứ không chỉ format YAML. Skill không cấp thêm quyền thao tác và không thay quyết định của chủ dự án.

### Taxonomy tùy chọn

| Loại skill   | Workflow phù hợp / ví dụ                         | Đọc kiến thức từ                        |
| ------------ | ------------------------------------------------ | --------------------------------------- |
| Generic      | Tái hiện bug, impact analysis                    | Task, conventions, source/test          |
| Domain       | Kiểm lịch, tiền, tồn kho hoặc trạng thái         | Domain rules của dự án hiện tại         |
| Architecture | Kiểm boundary khi đổi module                     | System overview, ADR hiện hành          |
| Database     | Thiết kế/test migration an toàn                  | Data semantics, constraints, môi trường |
| API          | Thêm/thay endpoint có contract và negative tests | API/security docs                       |
| Frontend     | Triển khai form/flow có đủ states                | Feature, design system, API             |
| Security     | Threat sketch và kiểm boundary/quyền             | Security policy, permission matrix      |
| Testing      | Chuyển AC/risk thành test phù hợp                | Story, rules, test strategy             |
| Review       | Review diff/compatibility/evidence               | Task, plan, source, results             |
| Operations   | Release/restore theo kiểm soát                   | Runbook, target, quyền thực thi         |

Đây là các loại có thể dùng, không phải mười skill phải cài. Dự án mới có thể chưa có skill nào. Khi hai skill chồng nhau, chọn phần cần thiết hoặc thu hẹp trigger; không chạy hai bộ quy trình trùng lặp chỉ để đủ danh sách.

## 7. Feature Spec: nơi chốt hành vi, không phải bản liệt kê class

Feature spec mô tả **WHY, WHAT, RULES, EXPECTED BEHAVIOR**. Chủ sản phẩm sở hữu ý định; kỹ thuật bổ sung tác động và câu hỏi. Agent đọc khi refinement, tách task, triển khai và review.

Trong flow Agile, spec là tài liệu hỗ trợ backlog item: được làm rõ dần trước khi chọn story, tiếp tục cập nhật khi có quyết định đã duyệt. Không phải cửa ải bắt viết hết sản phẩm trước sprint. Một feature đơn giản có thể dùng ngay issue chứa story/AC, không cần hai bản.

Nội dung: Problem, Goal, Non-goals, Actors, User Stories, AC, BR links, User Flow, Edge Cases, Permission, Data/API/UI Impact, Security, Test Scenarios, Dependencies, Open Questions. **Impact** mô tả phần chịu tác động và ràng buộc; tên hàm, thứ tự sửa file thuộc plan.

Ví dụ: feature Đặt phòng cần người dùng chọn phòng và giờ, nhận kết quả hoặc thông báo trùng. Spec không bắt tên controller hay ORM. Với rule chưa duyệt, ghi câu hỏi “đặt là giữ chỗ ngay hay chờ duyệt?”, không tự chọn phương án trong code.

## 8. Product Backlog: quản lý giá trị và thứ tự, không quản lý dòng code

Backlog là danh sách công việc sản phẩm có thứ tự; chủ sản phẩm cập nhật ưu tiên, nhóm phát triển cung cấp phụ thuộc/ước lượng/rủi ro. Agent đọc item được giao và ngữ cảnh lân cận có ảnh hưởng, không tự đổi thứ tự.

Một item nên có: **ID, Type, Epic, Feature, Title, Description, Priority/Order, Status, Dependencies, Acceptance Criteria, Related Docs, Business Rules, Sprint**. Với backlog nhỏ, nhiều trường có thể là link/N/A. Type có thể là feature, story, bug, technical enabler hoặc spike; không ép mọi lỗi thành “Là người dùng…”.

Ví dụ item `US-BOOKING-001`: thành viên tự đặt phòng; priority 1 do chủ sản phẩm duyệt; AC-01…04; link feature và BR; sprint SPRINT-01. Không đặt “sửa dòng 75, thêm repository class…” trong mô tả giá trị — nội dung đó thuộc engineering task/plan.

Workflow trạng thái MAY dùng `IDEA → REFINED → READY → IN_PROGRESS → REVIEW → DONE`; đây là convention của nhóm, không state machine bắt buộc cho mọi dự án. Trạng thái Done phải có evidence và ý nghĩa rõ, không tương đương đã release.

## 9. Sprint workflow và cách làm nhẹ hơn

Khi dùng sprint, hồ sơ sprint là nơi ghi goal, selected stories, tasks, phụ thuộc, rủi ro và evidence. Nhóm phát triển cập nhật tiến độ; chủ sản phẩm cùng nhóm làm rõ phạm vi. Agent không tự “nhét thêm” việc vào sprint.

| Bước đề xuất                      | Người làm / AI hỗ trợ                                  | Đầu ra                                        |
| --------------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| 1. Xem Product Backlog            | Chủ sản phẩm xác định ưu tiên; AI tóm tắt dependencies | Các ứng viên phục vụ goal                     |
| 2. Sprint Planning                | Con người chốt mục tiêu/khả năng; AI đề xuất chia nhỏ  | Sprint Goal, selected work, dự kiến cách giao |
| 3. Kiểm Ready                     | Nhóm xem AC/rules/unknown; AI chỉ ra thiếu             | Item đủ rõ hoặc trả về refinement/spike       |
| 4. Tách engineering tasks         | Kỹ thuật cùng agent đề xuất, tránh tách rời giá trị    | Tasks có owner, phụ thuộc, phạm vi            |
| 5. Giao Task Packages / lập plans | Người giao chốt quyền, agent khảo sát                  | Context và kế hoạch theo rủi ro               |
| 6. Triển khai / kiểm thử          | Agent thực hiện trong scope, báo blocker               | Diff + evidence + tiến độ thật                |
| 7. Review / DoD                   | Con người kiểm kết quả phù hợp rủi ro                  | Phần đạt Done; việc chưa đạt không giấu đi    |
| 8. Sprint Review / cải tiến       | Trao đổi với stakeholder; AI tổng hợp phản hồi         | Điều chỉnh backlog và cách phối hợp           |

Ready được chuẩn bị từ refinement và kiểm lại trước khi code, không phải một bước hành chính chờ đến cuối planning. Nếu thực hành Scrum, Daily Scrum và Retrospective vẫn có vai trò của chúng; status report của AI không thay sự phối hợp của con người.

**Solo hoặc nhóm nhỏ:** một board, giới hạn việc đang làm, mỗi lần chọn một story, review khi hoàn thành có thể đủ. Không bắt story points, velocity, daily meeting hoặc file sprint nếu chúng không giúp ra quyết định. Dù bỏ sprint, không bỏ AC, scope, kiểm thử và phản hồi.

<a id="task-package"></a>

## 10. Agent Task Package: người giao việc phải cung cấp gì?

Task Package là **gói context tối thiểu cho một công việc cụ thể**, lưu trong issue, message có cấu trúc hoặc `docs/tasks/<id>.md`. Nó nối yêu cầu sản phẩm với kỹ thuật và là điểm quay lại khi phiên làm việc bị gián đoạn.

| Trường                 | Ai chuẩn bị / nội dung tối thiểu                                               |
| ---------------------- | ------------------------------------------------------------------------------ |
| Task ID / Goal         | Người giao: định danh và kết quả cần đạt, không chỉ “làm tiếp”                 |
| Related Story / AC     | Người giao hoặc link nguồn chuẩn: điều kiện nghiệm thu thuộc task              |
| Business Rules         | Link ID liên quan, trạng thái đã duyệt; không tự invent luật thiếu             |
| Related Docs           | Các nguồn đã biết; agent được tìm tiếp qua router                              |
| Relevant Skills        | Workflow phù hợp nếu có; agent xác minh trigger/khả dụng                       |
| Affected Area          | Module/luồng dự kiến; không bắt người dùng biết mọi file                       |
| Non-goals              | Điều không làm; ví dụ không thay auth, không mở rộng sang hủy lịch             |
| Constraints            | Compatibility, kiến trúc hiện hành, môi trường, dữ liệu được giữ               |
| Authority / Safety     | Được sửa gì, chạy test ở đâu, có được ghi DB/deploy không                      |
| Expected Output        | Diff, tests, docs liên quan, báo cáo; hoặc chỉ phân tích nếu được yêu cầu      |
| Validation Required    | AC nào cần test gì, evidence nào bắt buộc; chưa rõ để agent đề xuất            |
| Open Questions / Owner | Ai giải quyết quyết định còn thiếu; không đòi user trả lời thứ có thể đọc code |

**Người không chuyên chỉ cần bắt đầu bằng:** “Ai dùng? Họ muốn làm gì? Khi nào đúng/sai? Không được thay gì? Tôi muốn nhận gì?”. Agent giúp chuyển thành package, tìm paths và commands. Không cần người dùng viết sẵn thiết kế kỹ thuật; cần họ quyết định những gì thuộc sản phẩm.

Ví dụ ngắn: `TASK-BOOKING-API-01` thêm API phục vụ `US-BOOKING-001`; chấp nhận giờ hợp lệ, từ chối trùng lịch và giữ đúng danh tính; đọc feature/rules/API/security; chỉ sửa booking API/persistence/tests/docs; không ghi DB thật. Bản điền đầy đủ ở §31, mẫu tái sử dụng ở §32.8.

## 11. Execution Plan: HOW của task này

Plan được agent/người triển khai lập **sau khi đọc context và khảo sát source/tests**, không suy từ tên thư mục. Plan ghi current/desired behavior, affected components, DB/API/UI/security impact, files dự kiến, steps, test plan, commands, risks, rollback và docs cần cập nhật.

| Loại task                           | Cách lập plan vừa đủ                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Typo/copy nhỏ không đổi hành vi     | Không cần plan file; nêu phạm vi rồi sửa và kiểm diff                                  |
| Bug khu trú                         | Repro → nguyên nhân có bằng chứng → sửa → regression; ghi trong issue                  |
| Feature cross-module                | MUST có plan bền vững trong file/issue, đủ để tiếp tục và review                       |
| Thay DB/auth/permissions/public API | MUST có plan phù hợp rủi ro, compatibility, negative tests, recovery và quyền thực thi |
| Spike/read-only investigation       | Ghi câu hỏi, giới hạn và evidence cần lấy; không lén chuyển sang implementation        |

Sửa chính tả trong tài liệu API không phải thay public contract. Độ nhạy của **hành vi thay đổi**, không số dòng hoặc tên module, quyết định gate.

Plan có thể điều chỉnh khi phát hiện mới. Agent được tối ưu cách làm trong scope; thay outcome, rule, boundary lớn hoặc quyền ghi dữ liệu phải được quyết định lại. “Files dự kiến” là giả thuyết được kiểm tra, không lý do để bỏ sót caller thật.

Plan **không phải** backlog: backlog nói vì sao và ưu tiên làm gì; plan nói cách thực hiện một việc đã chọn. Sau task, đóng plan, giữ evidence/nguyên nhân quyết định cần thiết; không dùng plan cũ làm policy vĩnh viễn.

## 12. Agent execution protocol

| Bước                 | Agent làm gì                                                          | Điều kiện/đầu ra trước bước tiếp                 |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| RECEIVE TASK         | Phân biệt explain/diagnose/review với implement; xác định scope/quyền | Task Package hoặc thiếu sót cần làm rõ           |
| READ AGENTS          | Đọc entrypoint và instructions áp dụng                                | Biết map, commands, giới hạn                     |
| RESOLVE TASK CONTEXT | Đi từ package và router tới nguồn chuẩn                               | Danh sách context liên quan, không dump cả repo  |
| READ FEATURE / STORY | Hiểu actor, outcome, AC, non-goals                                    | Biết việc cần nghiệm thu                         |
| READ BUSINESS RULES  | Đọc invariant, quyền, state/exception liên quan                       | Rule được xác nhận hoặc câu hỏi cho owner        |
| LOAD RELEVANT SKILLS | Chọn workflow đúng trigger; đọc phần bắt buộc                         | Không cài thêm skill chỉ vì được nhắc ví dụ      |
| LOCATE SOURCE        | Lần entrypoint, callers, data flow và integration thật                | Hiện trạng có đường dẫn làm bằng chứng           |
| LOCATE TESTS         | Xem test, fixture, commands, môi trường/tác dụng phụ                  | Baseline/repro và khoảng trống kiểm thử          |
| IMPACT ANALYSIS      | Xét DB/API/UI/quyền/jobs/cache/consumers/deploy liên quan             | Ranh giới ảnh hưởng, unknown, compatibility      |
| PLAN                 | Chọn plan tương xứng §11                                              | Ready và các phê duyệt cần thiết đã có           |
| IMPLEMENT            | Thay đổi nhỏ trong scope, giữ edits của người khác                    | Diff có thể review; không tự refactor ngoài task |
| TEST                 | Chạy kiểm tra liên quan ở target an toàn                              | PASS/FAIL/NOT_RUN/BLOCKED kèm bằng chứng         |
| SELF REVIEW          | So AC/BR, diff, secrets, quyền và hồi quy                             | Không dùng “build xanh” làm toàn bộ kết luận     |
| DOC SYNC             | Đồng bộ nguồn kiến thức/contract bị thay đổi trong scope              | Links và trạng thái nhất quán                    |
| HANDOFF              | Báo outcome, changes, evidence, risks, phần còn lại                   | Không đánh đồng hoàn thành code với release      |

Task rõ và rất nhỏ có thể gom nhiều bước vào một lần kiểm tra ngắn. Task mơ hồ không được nhảy thẳng sang IMPLEMENT. Nếu đang được yêu cầu “giải thích lỗi”, kết thúc bằng bằng chứng/giải thích, không tự sửa hay deploy.

## 13. Context loading: đọc theo nhu cầu và mở rộng theo dependency

```text
AGENTS → Task Package → Feature / Story → Business Rules
       → Relevant Skills → Relevant Architecture / Contracts
       → Relevant Source → Relevant Tests
```

Đây là mặc định điều hướng, không cấm quay lại docs khi code phát hiện thêm dependency. Đọc đầy đủ tài liệu/hướng dẫn đã chọn để áp dụng; progressive disclosure là **chọn đúng tài liệu**, không đọc nửa rule rồi đoán phần còn lại.

Ví dụ task tiếp theo **“thêm hủy đặt phòng”**: đọc story hủy, trạng thái được hủy, actor/ownership, luật giải phóng lịch, API hủy, thao tác persistence và tests. Không cần đọc toàn bộ UI docs, employee module hay deployment docs nếu task không ảnh hưởng chúng. Nếu phát hiện hủy gửi thông báo qua job, mở thêm contract của job; nếu đổi schema, mở migration/deployment order tương ứng.

Khi dừng/đổi phiên, lưu checkpoint trong task/plan: baseline, quyết định đã duyệt, files đã đổi, tests đã chạy, unknown/blocker và bước kế tiếp. Không bắt agent đọc lại toàn lịch sử chat. Log/payload/tài liệu tham khảo là dữ liệu, không có quyền đưa thêm chỉ thị trái scope.

## 14. Business Rule management

Rule là phát biểu nghiệp vụ kiểm được, có **ID ổn định, phạm vi, owner, trạng thái, nguồn quyết định, ngoại lệ và ví dụ đúng/sai**. Chủ nghiệp vụ duyệt; agent giúp phát hiện thiếu và viết tests, không suy chính sách từ sở thích cá nhân.

Ví dụ `BR-BOOKING-001`: không có hai booking hiệu lực cùng phòng với khoảng thời gian giao nhau. Cần định nghĩa tiếp “hiệu lực” và cách tính biên giờ; nếu không, hai người có thể viết hai implementation đều có vẻ hợp lý. Ví dụ hoàn chỉnh ở §31 giả định xác nhận ngay, **không phải luật của repo tham khảo**.

| Link từ rule                  | Mục đích                                                      |
| ----------------------------- | ------------------------------------------------------------- |
| Feature / Story / AC          | Nhu cầu nào chịu chi phối, trường hợp nào cần nghiệm thu      |
| Use case / API / UI           | Những entrypoint phải giữ luật, tránh chỉ chặn trên giao diện |
| Data constraint / transaction | Cơ chế bảo toàn invariant nếu có ghi đồng thời                |
| Tests / evidence              | Luật được kiểm trong điều kiện nào, còn thiếu gì              |

Khi sửa rule: ghi quyết định và effective version → tìm các link/consumers/tests → impact → triển khai task riêng phù hợp → đồng bộ. Rule cũ bị thay thế phải có link thay thế; không âm thầm đổi ý nghĩa ID trong một task refactor.

Rule nằm trong docs. Skill chỉ nói “đọc rule canonical, kiểm khoảng thời gian, cạnh tranh và quyền”; không lưu bản sao phân quyền hay giờ mở cửa của dự án.

## 15. Traceability: truy từ yêu cầu đến bằng chứng

Mục đích là trả lời “vì sao sửa cái này?” và “điều kiện này được kiểm ở đâu?”, không tạo bảng quản lý khổng lồ.

- Dự án nhỏ: `Story → AC → Task → Test/evidence` trong issue là đủ.
- Khi phức tạp: thêm `Epic/Feature ↔ Story ↔ AC/BR ↔ Task ↔ implementation/API/migration ↔ tests`.
- Quan hệ thực là nhiều-nhiều: một rule có thể được nhiều story/test bảo vệ; một test có thể kiểm nhiều AC. Không buộc cây một-một giả tạo.

| Story / AC             | Rule           | Task / thành phần                        | Evidence                                |
| ---------------------- | -------------- | ---------------------------------------- | --------------------------------------- |
| US-BOOKING-001 / AC-02 | BR-BOOKING-001 | TASK-BOOKING-API-01 / tạo lịch nguyên tử | DB concurrency test + API conflict test |

Người triển khai cập nhật mapping lúc viết test; reviewer đối chiếu trước Done. Link ID trong tên test/PR thường đủ; không cần spreadsheet riêng hay công cụ truy vết enterprise cho vài story.

## 16. Definition of Ready: khi nào đủ rõ để giao implement?

DoR ở đây là thỏa thuận nội bộ để tránh giao việc mơ hồ, không phải hàng rào yêu cầu biết hết tương lai. Lưu checklist chung trong docs workflow/AGENTS và evidence riêng trong story/task.

- Goal/actor/outcome rõ; scope và non-goals được hiểu giống nhau.
- AC quan sát hoặc kiểm được; có cả trường hợp từ chối quan trọng.
- Rule/quyền ảnh hưởng thiết kế đã được owner xác nhận.
- Dependency/contract quan trọng đã biết; môi trường và quyền thao tác đủ rõ.
- Unknown có thể đảo thiết kế căn bản đã được giải quyết, hoặc task hiện tại được đổi thành spike có giới hạn.
- Có cách kiểm kết quả; agent được tự tìm paths/commands, không bắt người giao liệt kê mọi chi tiết.

Ví dụ chưa Ready: “đặt phòng như app khác”, chưa rõ cần duyệt. Ví dụ Ready: “thành viên đã xác thực đặt và được xác nhận ngay khi không trùng; chưa làm hủy/duyệt/thanh toán”. Owner xác nhận; agent không tự đánh dấu Ready bằng cách đoán.

## 17. Definition of Done: hoàn thành phải có bằng chứng

DoD là chuẩn chất lượng chung; AC là yêu cầu riêng của story. Nhóm kỹ thuật/sản phẩm thống nhất chuẩn phù hợp, agent đối chiếu trong handoff. Chỉ bỏ mục không liên quan bằng N/A có lý do, không bỏ âm thầm mục bắt buộc bị lỗi.

| Gate           | Cần chứng minh                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| Hành vi        | AC trong phạm vi đạt; rules và compatibility được giữ                           |
| Kiểm thử       | Test liên quan/regression đạt; kết quả ghi đúng command/target                  |
| Kiểm tĩnh      | Build/type/lint/format phù hợp stack đạt nếu áp dụng                            |
| Security       | Authn/authz/ownership và đường từ chối liên quan đã kiểm                        |
| Data           | Migration/transaction/concurrency, dữ liệu cũ, phục hồi đã xét nếu ảnh hưởng    |
| Docs           | Nguồn chuẩn/contract liên quan đồng bộ trong phạm vi                            |
| Scope / review | Diff được review; không có thay đổi ngoài yêu cầu hoặc secret/log không nên lưu |
| Handoff        | Rủi ro, hạn chế, phần chưa chạy và điều kiện release được báo trung thực        |

**Task Done ≠ Story Done ≠ Released.** API task có thể Done nhưng UI story chưa xong. Story đạt DoD có thể chưa deploy. Một kiểm tra bắt buộc `NOT_RUN/BLOCKED` không được báo PASS. Nếu có waiver, người có thẩm quyền phải ghi rủi ro và giới hạn; agent không tự phê duyệt.

Test là bằng chứng trong phạm vi điều kiện đã thử, không chứng minh tuyệt đối phần mềm không có lỗi. “Compile thành công”, “demo dùng mock chạy được” hoặc “AI đã tự review” riêng lẻ đều không đủ cho Done của tính năng có dữ liệu/quyền thực.

<a id="technical-knowledge"></a>

## 18. Architecture documentation: bản đồ để sửa đúng chỗ

Kiến trúc mô tả hệ thống được chia thế nào, chạy thế nào và ai sở hữu dữ liệu; không chỉ tên các folder. Kỹ thuật sở hữu `system-overview.md` hoặc mục tương đương trong README; agent đọc trước thay cross-module/integration, cập nhật khi thay boundary đã được duyệt.

Nội dung tối thiểu:

- **System Context:** người dùng và hệ thống ngoài tương tác với sản phẩm.
- **Modules / Boundaries:** nhiệm vụ mỗi module, interface và những gì không thuộc nó.
- **Runtime Flow:** một request/job/event thật đi qua đâu, tác vụ chạy ở client/server/device nào.
- **Dependency Direction:** module nào được phụ thuộc module nào; ví dụ import và lời gọi thực tế.
- **Data Ownership:** thành phần nào được ghi dữ liệu nào, nguồn chuẩn khi có bản sao/cache.
- **External Integrations:** contract, failure/retry, người sở hữu tích hợp.
- **Deployment Topology:** process/service/environment và cấu hình liên quan, khi có nhu cầu vận hành.

Ví dụ Đặt phòng: UI → điểm vào server → xử lý đặt lịch → lưu trữ; auth cung cấp danh tính, DB bảo vệ invariant cùng cơ chế ghi. Đây là luồng trách nhiệm, không bắt tách thành bốn class hay bốn service.

Framework-native architecture, monolith, modular monolith hoặc mô hình khác đều hợp lệ khi đáp ứng nhu cầu. Không mặc định Clean Architecture, DDD, Repository Pattern, CQRS hay microservices. Dùng boundary khi nó giảm coupling/rủi ro thực; ghi ADR khi lựa chọn quan trọng. Không thêm một backend trung gian nếu chưa có mục đích rõ, nhưng cũng không xóa tầng hiện hữu chỉ vì một sơ đồ mẫu đơn giản hơn.

## 19. Database documentation: hiểu ý nghĩa trước khi sửa schema

Khi có dữ liệu bền vững, kỹ thuật/data owner duy trì `data-model.md` và migrations thực thi. Agent đọc trước khi đổi schema/query/write path. Project nhỏ có thể dùng bảng vài dòng thay ERD đồ sộ.

| Cần biết                      | Nội dung / ví dụ Đặt phòng                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Data model / entity semantics | Room là tài nguyên; Booking là một khoảng sử dụng, không phải một người                |
| Relationships / ownership     | Booking thuộc phòng và người đặt; ai có quyền ghi/xem                                  |
| Constraints / indexes         | FK, điều kiện giờ, unique thật sự có ý nghĩa; index theo truy vấn lịch                 |
| Migrations / seed             | Thứ tự phiên bản, tương thích dữ liệu cũ; seed reference khác seed demo                |
| Transaction / concurrency     | Các thao tác cùng atomic boundary; cách giữ invariant khi nhiều request                |
| Lifecycle / retention         | Được xóa hay lưu lịch sử, thời hạn giữ theo policy, dữ liệu nhận dạng nào cần bảo vệ   |
| Time / units                  | Instant/timezone/đơn vị số lượng; ví dụ lưu thời gian chuẩn và hiển thị giờ địa phương |

Không suy “có transaction là hết race condition”. Plan phải chọn và test cơ chế phù hợp DB thực: invariant có thể cần constraint, locking hoặc isolation thích hợp. Mọi đường ghi liên quan phải tuân thủ, không chỉ UI mới.

Migrations trong repo là schema dự kiến theo phiên bản, không chứng minh server đã áp dụng. Trước ghi DB, xác định chính xác environment/target/quyền; test trên DB riêng. Không tự xóa dữ liệu, sửa migration đã chạy hoặc dùng tài khoản toàn quyền để vượt trở ngại. Recovery có thể là rollback app, roll-forward dữ liệu hoặc restore; không hứa DOWN luôn an toàn.

## 20. API documentation: hợp đồng giữa các bên

API contract là thỏa thuận observable giữa client và server/hệ thống khác, do API owner cập nhật. Agent MUST đọc contract và tìm consumers trước thay interface public; không chỉ sửa DTO ở một chỗ.

Nội dung tối thiểu: route/method hoặc operation; auth; permission/ownership; request types/required fields/limits; validation; response; errors/status codes; pagination/filter/sort nếu có; versioning/deprecation nếu cần. Ghi cả semantics, ví dụ “availability là kết quả tham khảo, tạo lịch kiểm lại nguyên tử”.

Nguồn chuẩn có thể là OpenAPI/schema/contract tests cùng phần giải thích; không bắt viết thêm một bảng Markdown trùng toàn bộ schema. Agent biết đâu là nguồn sinh, command nào cập nhật output, behavior nào được kiểm ở runtime.

Ví dụ Đặt phòng: request nhận `roomId`, `startTime`, `endTime`; danh tính lấy từ session. Contract ghi lỗi thời gian/trùng lịch/quyền và bảo đảm không ghi dữ liệu khi từ chối. Những route/code ở §31 chỉ là contract minh họa, không ép API của mọi dự án dùng cùng envelope hay HTTP code.

## 21. Frontend documentation: hành trình và trạng thái, không phải CSS dump

Chỉ cần khi có UI. Product/UI owner duy trì feature flow và frontend docs; agent đọc trước sửa trang/component liên quan, không đọc tất cả màn hình.

- **Information Architecture:** nhóm thông tin và navigation để người dùng tìm việc cần làm.
- **User Flows, Pages / Routes:** điểm vào, bước thao tác, đường quay lại và kết quả.
- **Design System / Components:** tokens/components/patterns dùng lại và nơi tìm nguồn thật.
- **States:** loading, empty, error, success, disabled, submitting, stale/conflict, offline khi cần.
- **Responsive / Accessibility:** viewport quan trọng, keyboard/focus/labels, tương phản và thông báo trạng thái.
- **API Integration:** nguồn dữ liệu, validation, cache invalidation, retry và xử lý race/double-submit.
- **Permissions / Visibility:** ai thấy thao tác/dữ liệu nào; server vẫn quyết định quyền.

Ví dụ Đặt phòng: người dùng chọn giờ trước, xem khả dụng, chọn phòng, xác nhận; nếu người khác vừa giữ chỗ, UI thông báo xung đột và cho chọn lại. Không coi nút bị ẩn là authorization. Không cần ghi từng CSS property vào docs; source/design tokens là nơi quản lý chi tiết đó.

## 22. Test strategy: test theo rủi ro, không theo số lượng file

Test strategy nối **risk/AC/rule → loại test → môi trường → command → evidence**. Kỹ thuật/QA sở hữu; agent đọc trước lập test plan và chạy lệnh. Dự án nhỏ có thể lưu một bảng trong README/issue.

| Loại               | Khi hữu ích                                            | Ví dụ / bằng chứng không thay thế được                              |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Unit               | Logic thuần, nhiều biên                                | So sánh khoảng giờ; không chứng minh khóa DB                        |
| Integration        | Thành phần thật phối hợp                               | Handler với persistence hoặc dịch vụ ngoài trong môi trường test    |
| API / contract     | Request, response, lỗi, quyền ở entrypoint             | Invalid input, 401/403/409 theo contract được duyệt                 |
| Database           | Schema, constraint, migration, transaction/concurrency | Hai connection tranh cùng lịch; rollback không để dữ liệu dở        |
| Component          | State/interaction của UI                               | Validation và thông báo xung đột ở form                             |
| E2E                | Luồng người dùng trọng yếu                             | Đăng nhập → chọn phòng → tạo lịch → thấy xác nhận                   |
| Regression         | Giữ lỗi đã sửa không tái phát                          | Test lỗi trùng giờ từng xảy ra; có thể thuộc mọi tầng               |
| Security-sensitive | Kiểm misuse/deny/ownership                             | Giả requester, sai quyền, dữ liệu ngoài scope; không chỉ happy path |

Không bắt mọi task có tám loại test. Thay nhãn dùng visual/diff check; đổi authorization cần kiểm đường từ chối; đổi concurrency cần DB behavior thật, không chỉ mock. Build/type/lint hỗ trợ nhưng không thay test hành vi.

Trước chạy: xác minh lệnh tồn tại, environment, fixture và tác dụng phụ. Không dùng production làm DB test. Với UI, xem kết quả thực ở trạng thái/viewport liên quan; không xem được thì báo hạn chế.

Evidence ghi `PASS / FAIL / NOT_RUN / BLOCKED`, command/check, target, kết quả và lý do. Không viết “đã test” cho một test chỉ mới thêm source. Không xóa/skip test để làm xanh; thay test lỗi thời phải có căn cứ requirement và kiểm thay thế.

## 23. Security knowledge: policy ở docs, workflow ở skill

Security docs do người phụ trách kỹ thuật/security cùng chủ nghiệp vụ chốt. Agent đọc trước thay auth, quyền, dữ liệu nhạy cảm hoặc boundary; security skill chỉ hướng dẫn cách kiểm, không đặt policy thay dự án.

| Kiến thức cần có                | Câu hỏi cần trả lời                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Authentication model            | Danh tính được xác thực ở đâu, vòng đời session/token, thu hồi thế nào?             |
| Authorization model             | Actor có action nào, trên object/data scope nào, điều kiện gì?                      |
| Roles / permissions / ownership | Role là nhóm quyền nào; người dùng chỉ thao tác dữ liệu của mình hay toàn hệ thống? |
| Sensitive data                  | Dữ liệu nào cần hạn chế truy cập, log/masking/retention ra sao?                     |
| Secret policy                   | Lưu/provision/rotate ở đâu; không ghi credential thật vào docs, source hay log      |
| Trust boundaries                | Client/server/DB/job/third-party tin cậy ở mức nào; kiểm đầu vào tại đâu?           |

Ví dụ Đặt phòng: người đặt lấy từ danh tính đã xác thực, không tin `requesterId` do client gửi; không trả thông tin riêng của người đặt khác qua danh sách phòng trống. Policy cụ thể phải được owner duyệt, không suy quyền từ nhãn “cấp cao”.

Với task nhạy cảm, tạo threat sketch ngắn: tài sản → actor → boundary → abuse case → control → test. Unknown security quan trọng là điều kiện chưa Ready, không lý do để dùng default nguy hiểm. Hướng dẫn này không cho phép agent tự scan hệ thống ngoài, đổi quyền production hay dùng secret tìm thấy để mở scope.

## 24. ADR: vì sao quyết định quan trọng tồn tại

Architecture Decision Record lưu **Context, Decision, Alternatives, Consequences, Status**, thêm owner/date/links khi cần. Kỹ thuật có thẩm quyền duyệt; agent soạn khi task cần quyết định lớn, đọc khi thay phần chịu tác động.

Nên dùng khi lựa chọn khó đảo, ảnh hưởng nhiều consumer/team, có trade-off không hiển nhiên: chọn DB, cấu trúc triển khai, chiến lược session, public contract hay cơ chế bảo toàn dữ liệu. Không viết ADR cho đổi tên biến hoặc TODO thường ngày.

Ví dụ: “Dùng một ứng dụng nguyên khối cho phiên bản đầu vì một nhóm vận hành; chưa tách dịch vụ do chi phí triển khai/quan sát.” Ghi phương án khác, điều kiện xem lại, tác động chứ không chỉ “vì best practice”. Đây là ví dụ cách ghi, không phải lựa chọn bắt buộc.

ADR đã chấp nhận bị thay thế thì ghi `SUPERSEDED` và link ADR mới; architecture docs mô tả hiện trạng hiện hành. Plan giải thích cách thực hiện task; ADR giải thích vì sao quyết định dài hạn được chọn.

<a id="project-levels"></a>

## 25. Ba mức áp dụng: tăng kiểm soát khi cần, không tăng giấy tờ theo thói quen

| Thành phần        | LEVEL A — SIMPLE / MINIMAL                             | LEVEL B — STANDARD                                               | LEVEL C — COMPLEX / ADVANCED                                                            |
| ----------------- | ------------------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Phù hợp           | Tool nhỏ, prototype, dự án học tập ít rủi ro           | Sản phẩm có dữ liệu thật, nhiều luồng/role, vài người làm        | Domain/integration/cạnh tranh phức tạp, nhiều nhóm hoặc rủi ro vận hành lớn             |
| Docs tối thiểu    | README: goal/scope/map/commands; issue: story/AC/rules | A + feature/rules/quyền, data/API nếu có, backlog, test strategy | B + ownership/interfaces liên module, operations/security và quyết định sâu theo rủi ro |
| AGENTS            | Entry ngắn, chỉ đường và an toàn                       | Router theo loại task, commands và gates đã kiểm                 | Có thể thêm scoped instructions, không nhân bản kiến thức                               |
| Skills            | Có thể 0; chỉ thêm workflow lặp thật sự                | Một số workflow cần ổn định; không quota số skill                | Workflow chuyên biệt đã thử, owner và lifecycle rõ                                      |
| Planning          | Issue vài dòng; typo không plan file                   | Plan cho cross-module; bắt buộc với thay DB/auth/public API      | Impact/compatibility/dependencies/rollout sâu hơn cho task nhạy cảm                     |
| Testing           | Checks trọng yếu + AC/regression phù hợp               | Unit/integration/API/UI tùy thay đổi                             | Thêm concurrency/contract/security/load/recovery theo rủi ro đã xác định                |
| Architecture docs | Đoạn/sơ đồ luồng thật trong README                     | System map, boundaries, data ownership, contracts                | Topology/interfaces/quyết định liên nhóm; không tự động microservices                   |
| Agile             | Ordered issues, từng việc, feedback                    | Backlog/story/task; sprint nếu có ích                            | Điều phối dependencies; vẫn giữ gói task nhỏ                                            |

Tier là baseline, không miễn trừ bảo mật. Tool nhỏ xử lý mật khẩu hoặc dữ liệu quan trọng vẫn phải dùng gate nhạy cảm cho task đó. Chuyển mức khi xuất hiện vấn đề cụ thể: không tìm được rule, thay API làm hỏng consumer, ownership mơ hồ, khó kiểm release. Không chuyển mức chỉ để repo có nhiều folder hơn.

<a id="new-project"></a>

## 26. Workflow tạo dự án mới — 16 bước

Các bước có thể lặp hoặc gộp ở LEVEL A. “Owner” là trách nhiệm con người, không bắt tuyển 16 vị trí. Đầu ra có thể là một mục trong cùng README/issue.

| Bước                            | INPUT                                | ACTIVITY                                          | OUTPUT                                              | WHO / OWNER                     | AI ROLE                                            |
| ------------------------------- | ------------------------------------ | ------------------------------------------------- | --------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| 1. Project Discovery            | Ý tưởng, người dùng, vấn đề quan sát | Làm rõ nỗi đau, hiện trạng, người quyết định      | Problem/actors/unknowns                             | Chủ dự án + người dùng đại diện | Đặt câu hỏi, tổng hợp, không tự bịa nhu cầu        |
| 2. Product Definition           | Kết quả discovery                    | Chốt vision, goals, non-goals, scope MVP          | Vision/scope được duyệt                             | Chủ sản phẩm                    | Soạn lựa chọn và trade-offs                        |
| 3. Requirements                 | Scope, constraints                   | Chọn hành vi và chất lượng cần đạt                | Requirements/AC sơ bộ                               | Sản phẩm + kỹ thuật             | Viết ví dụ kiểm được, tìm mâu thuẫn                |
| 4. Domain                       | Luồng và thuật ngữ                   | Chốt entity semantics, rules, actor-action-scope  | Glossary/rules/domain sketch                        | Chủ nghiệp vụ                   | Mô hình hóa, đánh dấu rule chưa xác nhận           |
| 5. Architecture                 | Requirements/domain/ràng buộc        | Chọn cấu trúc nhỏ nhất phù hợp, xác định boundary | System/data/API/security map vừa đủ; ADR nếu cần    | Kỹ thuật                        | So sánh phương án, spike khi được giao             |
| 6. Repository Setup             | Stack/kiến trúc đã chọn              | Tạo repo/conventions/lệnh chạy an toàn            | Source tối thiểu chạy được, config mẫu không secret | Kỹ thuật                        | Scaffold trong scope, không cài thêm tùy hứng      |
| 7. Docs Setup                   | Kiến thức đã chốt, tier              | Lưu nguồn chuẩn, owner và links                   | README/docs map, không tạo bộ thư mục rỗng          | Maintainer + owners             | Sắp xếp, kiểm links và trạng thái                  |
| 8. AGENTS Setup                 | Repo map, commands thật, safety      | Viết entrypoint/router công cụ hỗ trợ             | AGENTS ngắn có hiệu lực được xác minh               | Maintainer                      | Soạn và thử đường đọc cho task đầu                 |
| 9. Initial Skills               | Workflow lặp đã thấy                 | Chọn skill hữu ích hoặc chưa tạo                  | 0 hoặc vài skill đã thử                             | Workflow owner                  | Đề xuất anatomy/trigger; không tự cài mọi skill    |
| 10. Backlog                     | Goals, feature/story/AC              | Sắp thứ tự giá trị và phụ thuộc                   | Ordered Product Backlog                             | Chủ sản phẩm                    | Gợi ý chia nhỏ và phát hiện dependencies           |
| 11. Sprint Planning / chọn việc | Backlog, năng lực và goal            | Chọn lát cắt, kiểm Ready, giới hạn WIP            | Sprint backlog hoặc next-item queue                 | Sản phẩm + nhóm phát triển      | Ước lượng có căn cứ, không tự đổi priority         |
| 12. First Feature               | Story/spec/rules đủ rõ               | Tách tasks, cấp authority, lập plan               | Task Package + plan cần thiết                       | Kỹ thuật + chủ sản phẩm         | Tìm source/test và tác động, làm rõ blockers       |
| 13. Implementation              | Package/plan/authority               | Xây lát cắt dọc có thể kiểm chứng                 | Source/migration/config trong scope                 | Developer                       | Thực thi và checkpoint, báo lệch kế hoạch          |
| 14. Testing                     | AC/rules/risk + diff                 | Chạy checks trên môi trường an toàn               | Evidence, defects/remaining work                    | Developer/QA                    | Viết/chạy tests, báo thật phần chưa chạy           |
| 15. Review                      | Diff/evidence/docs                   | Đối chiếu AC, DoD, quyền và scope                 | Chấp nhận hoặc yêu cầu sửa                          | Reviewer + chủ sản phẩm         | Self-review, giải thích, sửa trong scope           |
| 16. Release                     | Phần đạt DoD + quyền release         | Kiểm target/config/data/recovery; deploy và smoke | Phiên bản kiểm chứng + feedback/backlog mới         | Người vận hành                  | Chuẩn bị/thực hiện phần được giao, không tự deploy |

Nên chọn lát cắt đầu có giá trị từ UI/API đến dữ liệu và test thay vì xây toàn bộ tầng kỹ thuật trước rồi mới nối. Với API-only, lát cắt kết thúc ở consumer/contract test; không tạo UI giả để đủ quy trình.

<a id="existing-project"></a>

## 27. Workflow đưa agent vào dự án đang tồn tại

Không bắt rewrite, đổi framework hay dọn toàn repo trước task đầu. Khảo sát vừa đủ để làm việc an toàn; mở rộng kiến thức theo những khu vực thực sự chạm tới.

| Chuỗi bước                             | Đầu ra / owner                                             | Agent làm và giới hạn                                                    |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Existing Source → Repository Discovery | Map entrypoints/commands/config/tests; kỹ thuật            | Đọc cấu trúc, worktree, đường chạy thật; không tự sửa                    |
| → Architecture Map                     | Bản đồ as-built ngắn; kỹ thuật                             | Phân biệt source đang dùng với phần cũ/chưa rõ, ghi evidence             |
| → Business Rules Extraction            | Danh sách observed rules; chủ nghiệp vụ xác nhận           | Suy ra ứng viên từ source/test/docs, **không coi bug thành policy**      |
| → Docs Baseline                        | Nguồn chuẩn tối thiểu + conflicts/unknowns; owners         | Giữ convention hữu ích; không viết lại mọi tài liệu                      |
| → AGENTS                               | Entry/router phù hợp công cụ; maintainer                   | Chỉ tạo/sửa khi được giao quyền, link baseline                           |
| → Skills                               | Workflow lặp hữu ích; workflow owner                       | Tái dùng trước, chỉ tạo khi đáp ứng §6                                   |
| → Backlog                              | Việc sản phẩm và technical debt được ưu tiên; chủ sản phẩm | Tách findings khỏi authorized work, không tự lấy toàn bộ audit làm scope |
| → Agent Workflow                       | Một task nhỏ có package/plan/evidence; developer/reviewer  | Thử quy trình, chỉnh phần gây vướng rồi tiếp tục                         |

Các nhãn hữu ích: `KNOWN` có bằng chứng; `INFERRED` là suy luận; `UNKNOWN` thiếu dữ liệu; `CONFLICTING` là nguồn trái nhau; `NEEDS_CONFIRMATION` chờ owner; `N/A` không liên quan. Chỉ kiểm runtime/DB khi được phép; không dùng secrets trong repo để tự truy cập thêm hệ thống.

## 28. Vận hành tài liệu và bàn giao qua nhiều phiên

Không cần một “dự án quản lý quy trình” riêng. Dùng cùng vòng đời task để giữ kiến thức cập nhật:

1. Khi nhận việc, ghi links và phiên bản/baseline đủ nhận biết hiện trạng.
2. Khi có quyết định nghiệp vụ, cập nhật nguồn rule/spec sau phê duyệt; plan chỉ link quyết định đó.
3. Khi implementation khác plan, ghi lý do và tác động; xin hướng dẫn nếu vượt scope.
4. Khi hoàn tất, cập nhật evidence/docs liên quan, đóng plan và giữ checkpoint cho phần chưa xong.
5. Khi đổi agent/người làm, chuyển outcome, decisions, files, test status, blockers, next step; không chuyển một đống chat thay context có cấu trúc.

Agent không tự commit/push/PR/deploy nếu ngoài yêu cầu. Không chạy formatter toàn repo cho một thay đổi docs. Nếu dùng nhiều agent được cho phép, phân rõ phạm vi và người tích hợp; kết quả của agent khác vẫn cần review, không mặc định đúng.

## 29. Reference project structure — bản đồ, không phải scaffold phải tạo

Ký hiệu: `[M]` thông tin/capability tối thiểu; `[O]` optional theo tính năng/tier; `[L]` chỉ tách riêng khi lớn/phức tạp. `[M]` không bắt đúng tên folder: source/tests có thể theo convention framework hoặc colocated.

```text
project/
├── README.md                        [M] entry cho con người; A có thể gộp nhiều docs
├── AGENTS.md                        [M] hoặc entrypoint tương đương công cụ hỗ trợ
├── src/                             [M] source; tên/vị trí theo framework
├── tests/                           [M] bằng chứng kiểm thử; folder riêng là optional
├── docs/                            [O] tách khi README/issue không còn đủ rõ
│   ├── index.md                     [O] router kiến thức
│   ├── product/                     [O] vision/scope/requirements
│   ├── domain/                      [O] glossary/rules/permissions
│   ├── features/                    [O] specs không nhân bản story
│   ├── architecture/               [O] system/data/API/frontend/security tùy nhu cầu
│   ├── agile/                       [O] bỏ nếu board/issue tracker là nguồn chuẩn
│   │   ├── product-backlog.md
│   │   ├── stories/
│   │   └── sprints/
│   ├── tasks/                       [O] bỏ nếu task packages nằm trong issues
│   ├── plans/                       [O] chỉ cho task cần plan bền vững
│   ├── decisions/                   [O] ADR có quyết định thật
│   ├── testing/                     [O] strategy; A có thể gộp
│   ├── operations/                  [O] khi vận hành: deploy/restore/monitor
│   └── governance/                  [L] ownership/compliance evidence khi có yêu cầu
├── .agent/skills/                   [O] ví dụ vị trí; phải kiểm tool support
├── database/                        [O] migrations/seed nếu có DB, hoặc nơi framework quy định
└── ops/                             [O] cấu hình/script thực thi, khác runbook giải thích
```

Không folder riêng nào như `domain/`, `plans/`, `governance/` là điều kiện để phần mềm “chuẩn”. Bộ LEVEL A có thể chỉ gồm README, AGENTS, source/tests và một issue; điều quan trọng là tìm được thông tin cần thiết và biết ai quyết định.

## 30. Golden rules và ranh giới của playbook

| Artifact        | Câu hỏi cốt lõi                                                      |
| --------------- | -------------------------------------------------------------------- |
| DOCS            | **WHAT IS TRUE:** điều gì đúng/đã duyệt về dự án, ở phiên bản nào?   |
| AGENTS          | **WHERE + HOW TO OPERATE:** đọc đâu, kiểm gì, giới hạn thao tác nào? |
| SKILLS          | **HOW TO REPEAT:** làm một loại việc lặp lại có kiểm soát thế nào?   |
| FEATURE / STORY | **WHAT OUTCOME:** cần đem lại kết quả gì?                            |
| BUSINESS RULES  | **WHAT MUST REMAIN TRUE:** bất biến nào phải giữ?                    |
| TASK            | **WHAT NOW:** việc cụ thể được giao bây giờ là gì?                   |
| EXECUTION PLAN  | **HOW THIS TASK:** task này được hiện thực và kiểm chứng thế nào?    |
| SOURCE          | Hiện thực hành vi.                                                   |
| TESTS           | Cung cấp bằng chứng về hành vi trong điều kiện đã kiểm.              |
| ADR             | **WHY:** vì sao quyết định quan trọng được chọn?                     |

### Điều học từ case study, đã được tổng quát hóa

Repository tham khảo có entrypoint `.agent/AGENTS.md`, docs theo từng mảng, skill workflows và các luồng có rule/quyền/test. V1/V2 gợi ý tốt về scope, progressive disclosure, impact, safety và evidence. Các tài liệu booking cùng [hướng dẫn cho mượn](lending-catalog.md) cho thấy cần nối actor, trạng thái, thời gian và tests; các bản mô tả khác thời điểm cũng cho thấy cần quản lý nguồn chuẩn và mâu thuẫn.

Playbook giữ **nguyên tắc** đó, không sao chép role, schema, phân tầng, DB hay quy trình duyệt của sản phẩm tham khảo. Bổ sung trọng tâm Product → Agile → Task Package → Plan → Evidence và ba mức áp dụng, để chuyển sang dự án khác mà không mang theo chính sách Lab.

Phần skill được thiết kế theo hướng dẫn `skill-creator`: workflow hẹp có trigger, đọc kiến thức qua references, validation có thể kiểm tra; không cài skill mới và không chứa bản sao business rules. Nguồn thực hành còn lại là mô hình tổng hợp của tài liệu này, không được trình bày như một tiêu chuẩn bắt buộc của ngành.

### Những điều cố ý không bắt buộc

Clean Architecture, DDD, Repository Pattern, microservices, generic base classes; Scrum ceremonies cho nhóm không chọn Scrum; story points; template file cho mọi đầu việc; ADR cho mọi thay đổi; full audit trước mọi task; đọc toàn repo; bộ mười skill mặc định; công cụ quản trị enterprise cho dự án nhỏ. Chỉ thêm khi giải quyết vấn đề thực và lợi ích lớn hơn chi phí duy trì.

### Tự kiểm trước khi áp dụng sang repo mới

- Nếu tài liệu còn chứa tên role/schema/lệnh của case study: thay bằng facts của dự án đích.
- Nếu buộc đổi framework/kiến trúc để theo playbook: đang áp dụng sai.
- Nếu tạo file chỉ để điền mẫu: gộp hoặc bỏ; giữ thông tin thiết yếu.
- Nếu rule nằm ở cả skill/spec/docs: chỉ định nguồn chuẩn, dùng links ở nơi còn lại.
- Nếu backlog chứa chi tiết implementation còn task không có AC: tách lại trách nhiệm.
- Nếu agent không biết đọc gì đầu tiên: sửa router/package trước khi tăng context.
- Nếu Done chỉ có “build passed”: thêm evidence cho hành vi và rủi ro liên quan.

<a id="example"></a>

## 31. Ví dụ end-to-end: Đặt phòng

**Toàn bộ phần này là một sản phẩm giả định**, độc lập với repository đang chứa tài liệu. Các quy tắc sau được giả định đã được chủ sản phẩm ví dụ duyệt để minh họa quan hệ artifact; không phải đề xuất thay policy của hệ thống hiện tại. Mọi path/skill/task/test bên dưới là minh họa, chưa được tạo hay chạy.

### 31.1. Product → Epic → Feature → Story

| Artifact                    | Nội dung đã thống nhất trong ví dụ                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Product Goal PG-01          | Thành viên tự tìm và đặt phòng họp, nhận kết quả rõ ràng, giảm trao đổi thủ công                              |
| Epic EPIC-BOOKING           | Quản lý việc sử dụng phòng họp                                                                                |
| Feature FEAT-BOOKING-CREATE | Đặt một phòng cho một khoảng thời gian                                                                        |
| Story US-BOOKING-001        | Là thành viên có quyền đặt, tôi muốn chọn phòng và giờ để được xác nhận chỗ họp                               |
| Non-goals                   | Chưa làm duyệt nhiều cấp, thanh toán, lịch lặp, hủy hoặc sửa lịch                                             |
| Tiền đề                     | Có danh tính đăng nhập, quyền `booking.create`, dữ liệu phòng mẫu an toàn; một DB giao dịch dùng cho ghi lịch |
| Hành vi được duyệt          | Đặt hợp lệ xác nhận ngay với trạng thái `CONFIRMED`; không có bước `PENDING` trong ví dụ này                  |

Feature spec giữ problem/goal/flow và link tới story/rules. Story giữ AC; backlog trỏ tới các nguồn đó, không chép lại cả nội dung.

### 31.2. AC và Business Rules — hai loại khác nhau

| Acceptance Criteria của story     | Kết quả quan sát được                                                                                                                            | Rule liên quan                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| AC-01 — đặt hợp lệ                | Chọn phòng tồn tại và khoảng giờ hợp lệ không trùng; nhận mã booking, giờ, phòng và trạng thái xác nhận                                          | BR-BOOKING-001, 002, 003         |
| AC-02 — không cấp trùng           | Khi lịch vừa bị người khác giữ hoặc hai người gửi đồng thời, không có hai booking hiệu lực chồng nhau; bên bị từ chối thấy thông báo rõ          | BR-BOOKING-001                   |
| AC-03 — từ chối sai dữ liệu/quyền | Sai giờ/phòng/quyền/danh tính thì không tạo booking; không được đặt thay bằng cách gửi requester giả                                             | BR-BOOKING-002, 003              |
| AC-04 — thao tác UI đầy đủ        | Chọn ngày/giờ/phòng bằng form có nhãn; thấy loading/empty/error/success; không báo thành công khi chưa xác nhận, lỗi không làm mất input cần sửa | AC-01…03 và frontend conventions |

| ID             | Rule canonical trong `docs/domain/business-rules.md`                                                                                                     | Ví dụ                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| BR-BOOKING-001 | Cùng một phòng không có hai booking `CONFIRMED` với khoảng `[start, end)` giao nhau. Tất cả đường ghi phải giữ luật ngay cả khi cạnh tranh               | 09:00–10:00 và 09:30–10:30 xung đột; 10:00–11:00 được phép nối tiếp |
| BR-BOOKING-002 | Nhận instant có timezone/offset hợp lệ; so sánh theo thời gian chuẩn. Tại lúc tạo, `now < start < end`; phòng phải tồn tại. UI hiển thị timezone rõ      | Giờ kết thúc bằng bắt đầu hoặc bắt đầu trong quá khứ bị từ chối     |
| BR-BOOKING-003 | Chỉ người đã xác thực có `booking.create` được đặt cho chính mình; requester lấy từ auth context. Contract không cho nhập requester và từ chối field này | Người A không thể tạo lịch đứng tên B; thiếu quyền không ghi DB     |

Owner cả ba rule: chủ nghiệp vụ ví dụ; status ACTIVE sau xác nhận. Công thức kiểm giao nhau: `existing.start < requested.end` và `requested.start < existing.end`, với cùng phòng và trạng thái giữ chỗ. Công thức này **không tự giải quyết race condition**; thao tác kiểm + ghi phải được bảo vệ phù hợp.

### 31.3. Sprint item → engineering tasks

`SPRINT-01` có goal: “Thành viên tự đặt được một phòng và không bị cấp trùng.” Chọn `US-BOOKING-001`; không kéo thêm hủy lịch vào scope.

| Task                   | Phần được giao                                                                             | Phụ thuộc / Done riêng                            |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| TASK-BOOKING-API-01    | Contract, khả dụng, tạo booking nguyên tử, auth/validation, tests/data migration cần thiết | Từ tiền đề/rules đã duyệt; API/data evidence đạt  |
| TASK-BOOKING-UI-01     | Form chọn giờ/phòng, integration và các trạng thái                                         | Có contract; cần API thực khi nghiệm thu tích hợp |
| TASK-BOOKING-VERIFY-01 | E2E luồng người dùng và review traceability toàn story                                     | API + UI sẵn sàng, dữ liệu test riêng             |

Không tính story Done chỉ vì task API đã Done. Các task kỹ thuật phục vụ cùng một lát cắt người dùng, không phải ba feature độc lập.

### 31.4. Agent Task Package đã điền

```markdown
# TASK-BOOKING-API-01

Goal: Xây API để thành viên xem phòng khả dụng và đặt một phòng hợp lệ.
Story: US-BOOKING-001; sprint SPRINT-01.
AC trong phạm vi: phần server của AC-01, AC-02, AC-03.
AC ngoài phạm vi: UI AC-04; do TASK-BOOKING-UI-01 xử lý.
Business Rules: BR-BOOKING-001, 002, 003 (ACTIVE, owner nghiệp vụ đã duyệt).
Related Docs:

- docs/features/booking.md
- docs/domain/business-rules.md
- docs/domain/roles-permissions.md
- docs/architecture/system-overview.md
- docs/architecture/data-model.md
- docs/architecture/api-contract.md
- docs/architecture/security.md
- docs/testing/test-strategy.md
  Relevant Skills nếu có: api-change; concurrency-validation; test-design.
  Affected Area: booking HTTP entrypoint, availability query, persistence và tests.
  Non-goals: UI, hủy/sửa lịch, duyệt, thanh toán, thay auth system, refactor module khác.
  Constraints: Giữ convention hiện có; caller identity từ auth; không lộ lịch của người khác.
  Authority: Sửa source/tests/docs liên quan; tạo/test migration trên DB test riêng.
  Không được: Ghi DB thật, đổi quyền tài khoản, deploy hoặc xóa dữ liệu đang dùng.
  Expected Output: Diff; contract/data docs cập nhật; test evidence; risks/remaining work.
  Validation Required:
- Happy path, invalid input, unauthenticated, forbidden, requester spoof.
- Overlap, khoảng tiếp giáp, hai connection cạnh tranh trên DB test thật.
- Migration và failed-write rollback nếu thay persistence.
  Open Questions: Không còn quyết định nghiệp vụ nền tảng chưa chốt.
  Technical Discovery: Agent tìm source paths và commands thật trước lập plan.
```

### 31.5. Docs → Skills → Execution Plan

Agent đọc AGENTS để tìm map/lệnh; Task Package dẫn tới story và ba rule; API/security/data docs giải thích contract/ownership/transaction; skills hướng dẫn cách triển khai và kiểm, **không cung cấp rule mới**. Chưa có skill tương ứng thì dùng workflow trong task/AGENTS, không dừng chỉ vì thiếu một tên skill minh họa.

Plan minh họa sau khảo sát một repo giả định:

| Mục                 | Nội dung                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current Behavior    | Có auth và phòng; chưa có luồng tạo booking. Xác nhận bằng source/tests, không đoán từ screenshot                                                                                        |
| Desired Behavior    | Xem khả dụng và tạo booking theo AC-01…03; kết quả xem khả dụng không giữ chỗ                                                                                                            |
| API Impact          | Thêm GET `/rooms/availability?startTime=...&endTime=...` và POST `/bookings`; auth + `booking.create`; GET chỉ trả id/tên/khả dụng, không trả danh tính người đặt khác                   |
| Contract            | POST nhận roomId/startTime/endTime; thành công 201; invalid/requester field 400; chưa xác thực 401; thiếu quyền 403; phòng không tồn tại 404; conflict 409; lỗi hệ thống không lộ nội bộ |
| DB Impact           | Booking có ID, room, requester, start/end/status; FK/check/index thích hợp. Giữ rule chồng giờ bằng cơ chế phù hợp DB thực, không chỉ unique(start,end)                                  |
| Concurrency         | Trong một transaction, tuần tự hóa kiểm + ghi theo phòng, ví dụ khóa bản ghi phòng nếu DB hỗ trợ đúng semantics. Tất cả writers phải cùng tuân thủ; kiểm bằng hai connection             |
| UI Impact           | Chỉ cung cấp contract cho UI task; không sửa giao diện ở task này                                                                                                                        |
| Security            | Lấy requester từ session; từ chối field requester; không ghi khi auth/validation thất bại                                                                                                |
| Files dự kiến       | Entry API/booking operation/persistence + migration nếu cần + tests và docs liên quan; xác minh paths thật trước sửa                                                                     |
| Steps               | Chốt contract → thêm regression/behavior tests → persistence/schema → API/validation → integration/concurrency → review và doc sync                                                      |
| Validation Commands | Lấy chính xác từ repo/test config: kiểm tĩnh, unit/API, DB integration. Ghi target test; không bịa lệnh npm/dotnet/pytest khi chưa xác minh                                              |
| Risks               | Availability có thể cũ; race nhiều writers; timezone; failed-write; migration chưa áp dụng                                                                                               |
| Recovery            | Trước release chỉ test DB riêng. Khi chuẩn bị release cần kế hoạch riêng: rollback app tương thích hoặc roll-forward; không tự DROP dữ liệu người dùng                                   |
| Docs To Update      | Contract, data model, feature/AC links nếu cần; rule không đổi trong task này                                                                                                            |

### 31.6. Plan → source changes → tests

Đây là **bản đồ thay đổi minh họa**, không yêu cầu viết các file này trong mọi stack. Một module framework-native có thể chứa vài trách nhiệm nếu vẫn rõ và test được.

| Khu vực source dự kiến     | Thay đổi                                                           | Evidence cần có                                      |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| HTTP/API entry của booking | Parse input, auth/permission, mapping lỗi và response              | API malformed/auth/forbidden/spoof tests             |
| Booking operation          | Kiểm giờ/phòng, gọi thao tác ghi có bảo vệ invariant               | Unit boundaries + API happy/conflict                 |
| Persistence                | Kiểm + insert cùng atomic/concurrency boundary; giữ requester đúng | DB integration hai connection, failed-write rollback |
| Schema/migration nếu cần   | Tạo quan hệ/constraints/index không xóa dữ liệu cũ                 | Migration trên DB test và kiểm schema/constraints    |
| UI trong task riêng        | Chọn phòng/giờ, xử lý kết quả và states                            | Component + E2E với API thực                         |

Một pseudocode để hiểu trách nhiệm, không phải production code:

```text
createBooking(authContext, input):
  kiểm xác thực + quyền; kiểm input, từ chối requester do client gửi
  xác định requester từ authContext; chuẩn hóa các instant
  bắt đầu transaction trên cơ chế lưu trữ đã chọn
    xác nhận phòng tồn tại; bảo vệ ghi cạnh tranh cho phòng này
    kiểm now < start < end tại thời điểm xử lý
    kiểm lịch CONFIRMED giao khoảng [start, end)
    nếu trùng: từ chối, không insert
    nếu không: insert booking CONFIRMED với requester đã xác thực
  commit trước khi trả kết quả thành công
```

### 31.7. Bộ kiểm thử và traceability cho cùng story

| Test ID | Tình huống / kết quả cần đạt                                                             | Link              | Loại                          |
| ------- | ---------------------------------------------------------------------------------------- | ----------------- | ----------------------------- |
| T-01    | Đặt hợp lệ trả mã/trạng thái và ghi đúng requester                                       | AC-01, BR-001…003 | API + DB                      |
| T-02    | Cùng phòng chồng giờ bị conflict, không thêm dòng                                        | AC-02, BR-001     | Integration                   |
| T-03    | Giờ kết thúc bằng giờ bắt đầu lịch kế tiếp được phép                                     | AC-02, BR-001     | Unit + integration            |
| T-04    | Hai kết nối gửi cùng phòng/giờ: đúng một thành công, một conflict; chỉ một lịch hiệu lực | AC-02, BR-001     | DB concurrency thực           |
| T-05    | End ≤ start, giờ quá khứ, thiếu offset hoặc input sai bị từ chối                         | AC-03, BR-002     | Unit/API                      |
| T-06    | Chưa đăng nhập hoặc thiếu quyền không ghi DB                                             | AC-03, BR-003     | API security                  |
| T-07    | Client gửi requester giả bị 400; không có lịch đứng tên người khác                       | AC-03, BR-003     | API security                  |
| T-08    | Phòng không tồn tại bị từ chối                                                           | AC-03, BR-002     | API/DB                        |
| T-09    | Lỗi giữa transaction không để booking dở; lỗi trả về không lộ chi tiết nội bộ            | AC-01/03          | DB/API failure                |
| T-10    | Schema/migration áp dụng được, ràng buộc giữ dữ liệu hợp lệ                              | Data gate         | DB nếu có migration           |
| T-11    | Availability không lộ thông tin người đặt; POST kiểm lại khi availability đã cũ          | AC-02/03          | Contract/integration          |
| T-12    | Thành viên thao tác bằng UI, nhận mã; các trạng thái lỗi/loading rõ                      | AC-01…04          | Component/E2E, task UI/verify |

Test thời gian dùng clock/data kiểm soát để không hỏng ngẫu nhiên theo ngày chạy. Test cạnh tranh phải phối hợp hai thao tác thật để kiểm invariant, không chỉ mock hai lời gọi. Test list này là **kế hoạch**, chưa phải báo cáo PASS.

### 31.8. Handoff → DoD → feedback

Handoff của API task nêu: files/behavior đã đổi, mapping T-01…11, commands/target/results thật, migration/recovery prerequisites, docs đã sync, rủi ro và việc UI còn lại. Nếu T-04 bắt buộc nhưng DB test chưa chạy, báo BLOCKED/NOT_RUN, không nói “API hoàn tất đầy đủ”.

Sau khi UI và verify tasks hoàn thành, người review kiểm AC-01…04 và DoD cho **cả story**. Chỉ phần đã đạt mới được báo Done; release là bước khác cần quyền và target rõ. Phản hồi “cần hủy lịch” trở thành backlog item mới; không âm thầm thêm vào task API đang đóng.

Tóm lại cùng ví dụ đã đi qua: **PG-01 → EPIC-BOOKING → FEAT-BOOKING-CREATE → US-BOOKING-001 → AC/BR → SPRINT-01 → TASK-BOOKING-API-01 → Package → Docs/Skills → Plan → Source changes → Tests → DoD**. Mỗi artifact có chức năng riêng nhưng các ID/link giúp agent tìm đúng phần cần dùng.

<a id="templates"></a>

## 32. Mười hai template Markdown — chỉ lấy mẫu đang cần

Tất cả mẫu nằm ngay trong tài liệu này; **không phải mười hai file được tạo kèm**. Tên file gợi ý vai trò, không bắt giữ nguyên chữ hoa hay vị trí. Với LEVEL A, có thể dùng các mục tương ứng trong README/issue.

Thay placeholder bằng dữ liệu thật trước khi giao agent. Chọn một nguồn chuẩn cho mỗi nội dung; dùng ID/link thay sao chép. Mẫu không cấp quyền chạy lệnh, ghi DB, cài skill hay deploy. Các trường không liên quan ghi `N/A — lý do`; phần chưa biết ghi `UNKNOWN — owner/bước xác minh`.

### 32.1. AGENTS.md

Dùng sau khi biết repo map và lệnh thật; maintainer duyệt. Giữ ngắn, link docs sâu; không copy nguyên master guide vào đây.

```markdown
# Project

<Một đoạn: sản phẩm, người dùng, phạm vi; owner liên hệ>

## Repository Map

- Source: <paths và entrypoints thực>
- Tests: <paths; tests colocated nếu có>
- Docs index: <path hoặc nguồn tương đương>
- Skills: <vị trí được công cụ hỗ trợ; chưa có thì ghi rõ>

## Source of Truth

- Product/AC: <source>; business rules: <source>.
- Architecture/data/API/security: <sources>.
- Source/test cho biết hiện trạng; docs/rules đã duyệt cho biết ý định.
- Mâu thuẫn ảnh hưởng hành vi/quyền: ghi evidence và hỏi owner, không tự chọn policy.

## Documentation Map

| Khi làm          | Đọc                                                 |
| ---------------- | --------------------------------------------------- |
| Thay feature     | Story/AC → rules/quyền → spec/contract liên quan    |
| Thay dữ liệu/API | Data/API docs → consumers → migration/compatibility |
| Thay UI          | Flow/states → frontend conventions → API            |

## Skill Discovery

<Cách tìm skill thực tế và trigger chính; không danh sách skill giả>
Chỉ nạp skill phù hợp; đọc hướng dẫn bắt buộc trước khi áp dụng.

## Commands

| Mục đích   | Command đã xác minh | Working directory / target / tác dụng phụ |
| ---------- | ------------------- | ----------------------------------------- |
| Chạy local | <command>           | <directory; environment>                  |
| Kiểm tĩnh  | <command>           | <directory>                               |
| Test       | <command>           | <DB/fixture an toàn nếu có>               |

## Task Workflow

Task → context → source/tests → impact → plan → implement → test → review → doc sync → handoff.
Chỉ diagnose/review nếu task chỉ yêu cầu như vậy. Không tự mở scope.

## Planning Rules

Typo không cần plan file. Cross-module và thay DB/auth/public contract cần plan bền vững.
Unknown làm đổi thiết kế/quyền: hỏi owner hoặc đề xuất spike trước implement.

## Testing Rules

Test theo AC/risk, gồm deny/failure khi liên quan. Không dùng production làm DB test.
Báo command/target/PASS/FAIL/NOT_RUN/BLOCKED; build không thay test hành vi.

## Documentation Rules

Cập nhật nguồn chuẩn bị ảnh hưởng trong scope; nơi khác dùng link, không nhân bản rule.

## Safety Constraints

Giữ edits người khác. Không lộ secret. Không tự xóa dữ liệu/reset repo/đổi quyền.
Commit/push/deploy/thao tác môi trường thật cần nằm trong authority được giao.

## Definition of Done

AC/rules đạt; kiểm thử cần thiết có evidence; diff đúng scope; docs đồng bộ;
security/data/compatibility được kiểm khi liên quan; rủi ro và phần chưa làm được báo rõ.
```

### 32.2. PROJECT-VISION.md

Dùng ở inception hoặc khi đổi định hướng; chủ sản phẩm sở hữu. Không dùng vision làm plan kỹ thuật.

```markdown
# Project Vision — <tên sản phẩm>

Owner: <người quyết định> | Status: <DRAFT/ACTIVE> | Reviewed: <date>

## Problem

<Ai gặp vấn đề gì? Hiện giải quyết ra sao? Bằng chứng hoặc giả thuyết cần kiểm?>

## Target Users / Stakeholders

<Actors, người sử dụng, người vận hành và người duyệt phạm vi>

## Vision

<Giá trị sản phẩm mang lại trong 1–2 câu>

## Goals / Success Evidence

| Goal ID | Kết quả mong muốn | Cách nhận biết/đo                           | Owner   |
| ------- | ----------------- | ------------------------------------------- | ------- |
| PG-01   | <outcome>         | <metric hoặc cách nghiệm thu; không bịa số> | <owner> |

## MVP Scope

<Những năng lực đầu tiên; lát cắt có giá trị>

## Non-goals

<Điều chưa làm hoặc không thuộc sản phẩm>

## Constraints / Risks

<Ngân sách/deadline/hosting/data/security/integration thực tế; unknown ghi rõ>

## Links / Open Questions

Backlog: <source>; requirements: <source>; decisions cần chốt: <question + owner>.
```

### 32.3. FEATURE-SPEC.md

Dùng khi cần làm rõ năng lực có nhiều nhánh/story; sản phẩm cùng kỹ thuật duy trì. A có thể gộp vào story.

```markdown
# Feature — <ID / tên>

Owner: <owner> | Status: <DRAFT/ACTIVE> | Goal/Epic: <links>

## Problem

<Vấn đề người dùng cần giải quyết; WHY>

## Goal

<Outcome quan sát được; WHAT>

## Non-goals

<Ngoài phạm vi>

## Actors

<Ai sử dụng, ai vận hành; link permission matrix>

## User Stories

<Story IDs/links; chỉ ghi nội dung tại nguồn chuẩn>

## Acceptance Criteria

<AC ở đây nếu feature là đơn vị nghiệm thu; nếu ở story thì link AC IDs>

## Business Rules

<BR IDs + link canonical + trạng thái; không chép policy sang nhiều chỗ>

## User Flow

<Tiền điều kiện → các bước chính → kết quả; use case nhiều nhánh nếu cần>

## Edge Cases

<Invalid input, missing data, stale/concurrent state, failure/retry phù hợp>

## Permission

<Actor/action/data scope; link nguồn quyền; đường bị từ chối>

## Data Impact

<Khái niệm/dữ liệu cần lưu/giữ/xóa; chưa liệt kê chi tiết implementation>

## API Impact

<Consumers/contract chịu ảnh hưởng; link contract>

## UI Impact

<Pages/flow/states/accessibility; N/A nếu không UI>

## Security Considerations

<Sensitive data, ownership, trust boundary liên quan>

## Test Scenarios

<AC/BR → happy/deny/failure/boundary/concurrency scenarios khi liên quan>

## Dependencies

<Feature/contract/dữ liệu/decisions cần có trước>

## Open Questions

<Question / impact / owner / status; đánh dấu điều chặn Ready>
```

### 32.4. BUSINESS-RULES.md

Dùng làm nguồn canonical của luật, owner nghiệp vụ duyệt. Không biến quan sát từ code cũ thành ACTIVE nếu chưa xác nhận.

```markdown
# Business Rules — <domain>

Owner: <người duyệt nghiệp vụ> | Reviewed: <date>
Glossary: <link>; permission policy: <link>.

## BR-<DOMAIN>-001 — <tên ngắn>

- Status: <DRAFT/ACTIVE/SUPERSEDED/OBSERVED-NEEDS-CONFIRMATION>
- Owner / decision source: <người, link, ngày/phiên bản>
- Statement: <Điều phải luôn đúng, có thể kiểm chứng>
- Scope: <Actors/operations/entities/states chịu tác động>
- Terms / boundaries: <Định nghĩa từ, timezone, khoảng biên/đơn vị nếu cần>
- Exceptions: <Ngoại lệ được duyệt hoặc không có>
- Valid example: <trường hợp hợp lệ>
- Invalid example: <trường hợp phải từ chối>
- Related features/stories/AC: <IDs/links>
- Enforcement entrypoints: <use cases/API/data paths; mô tả trách nhiệm>
- Tests / evidence: <test IDs/links>
- Change history / replacement: <quyết định thay đổi, rule thay thế nếu có>

## Unresolved Rules

| Question   | Evidence hiện tại | Design impact | Owner   | Next step |
| ---------- | ----------------- | ------------- | ------- | --------- |
| <question> | <source>          | <impact>      | <owner> | <action>  |
```

### 32.5. USER-STORY.md

Dùng cho một nhu cầu có giá trị và có thể nghiệm thu; không bắt technical spike phải viết theo giọng người dùng.

```markdown
# US-<DOMAIN>-001 — <title>

Feature/Epic: <IDs/links> | Owner: <owner> | Status: <status>

## User Need

Là <actor>, tôi muốn <capability>, để <giá trị>.

## Scope / Non-goals

<Phần được giao và phần chưa làm>

## Acceptance Criteria

| ID    | Given / When              | Then — kết quả kiểm được          | Rule    | Test/evidence |
| ----- | ------------------------- | --------------------------------- | ------- | ------------- |
| AC-01 | <điều kiện / hành động>   | <kết quả>                         | <BR ID> | <link khi có> |
| AC-02 | <trường hợp từ chối/biên> | <không ghi dữ liệu hoặc lỗi đúng> | <BR ID> | <link>        |

## Context / Dependencies

Spec: <link>; rules/quyền: <links>; dependency: <IDs>; questions: <owner/status>.

## Ready Check

Goal/scope/AC rõ; rules quan trọng được duyệt; dependency/unknown ảnh hưởng nền tảng đã xử lý.

## Engineering Tasks

<Task IDs/links; phân rõ AC nào mỗi task phục vụ>

## Done Evidence

<AC mapping; test results; review; docs sync; remaining work; release status riêng>
```

### 32.6. PRODUCT-BACKLOG.md

Dùng khi không có board/issue tracker làm nguồn chuẩn. Chủ sản phẩm quản lý thứ tự; agent hỗ trợ soạn, không tự đổi priority.

```markdown
# Product Backlog — <product>

Owner: <owner> | Product Goal: <link> | Ordering rule: <ví dụ thứ tự số do owner duyệt>
Nguồn chuẩn: <file này hoặc board; chọn một>.

## Ordered Items

| Order | ID   | Type                      | Epic     | Feature  | Title     | Priority   | Status   | Dependencies | Sprint   |
| ----- | ---- | ------------------------- | -------- | -------- | --------- | ---------- | -------- | ------------ | -------- |
| 1     | <ID> | <Story/Bug/Enabler/Spike> | <ID/N/A> | <ID/N/A> | <outcome> | <priority> | <status> | <IDs>        | <ID/N/A> |

## Item Detail — <ID>

- Description / value: <Nhu cầu và lý do>
- Acceptance Criteria: <AC hoặc link nguồn chuẩn>
- Related Docs: <links>
- Business Rules: <BR IDs/links>
- Dependencies / unresolved decisions: <IDs + owner>
- Engineering tasks: <links khi tách; không chứa kế hoạch sửa từng file ở đây>
- Priority change: <ai quyết định, khi nào, vì sao nếu cần>
```

### 32.7. SPRINT.md

Dùng khi nhóm chọn sprint. Nếu dùng luồng liên tục, thay bằng goal/next-item/WIP trên board; không tạo file cho đủ.

```markdown
# SPRINT-<ID>

Period: <start/end> | Team: <people> | Product owner/contact: <person>

## Sprint Goal

<Giá trị cụ thể đợt này cần đạt; link Product Goal>

## Selected Stories

| Story | AC/spec | Ready / unresolved questions | Dependencies |
| ----- | ------- | ---------------------------- | ------------ |
| <ID>  | <links> | <evidence hoặc blocker>      | <IDs>        |

## Engineering Tasks / Plan

| Task | Story/AC | Owner    | Package/plan | Status   | Evidence  |
| ---- | -------- | -------- | ------------ | -------- | --------- |
| <ID> | <IDs>    | <person> | <links>      | <status> | <results> |

## Risks / Blockers / Scope Decisions

<Risk, owner, next step; thay scope phải có người quyết định>

## Definition of Done

<Link chuẩn chung; yêu cầu riêng của các story nếu có>

## Review / Feedback / Improvement

<Phần Done và evidence; phần chưa Done; phản hồi; backlog changes do owner duyệt>
<Release status riêng; bài học về cách làm, không tự coi demo là release>
```

### 32.8. AGENT-TASK.md

Đây là mẫu ưu tiên khi muốn giao việc ngay. Người giao điền outcome/giới hạn; agent bổ sung findings/paths/validation sau khảo sát.

```markdown
# TASK-<ID> — <title>

Owner / decision contact: <person>
Mode: <implement / diagnose / review / explain / spike>

## Goal

<Kết quả cần giao trong task này>

## Related User Story / Acceptance Criteria

<Story + AC IDs/links; phần AC thuộc task và ngoài task>

## Business Rules

<Canonical BR IDs/links, trạng thái đã duyệt; policy chưa rõ ghi câu hỏi>

## Related Docs / Relevant Skills

<Docs cần đọc; skills thực có trigger phù hợp hoặc không có>

## Affected Area

<Luồng/module dự kiến; agent xác minh source/callers/tests>

## Non-goals

<Những phần không làm>

## Constraints / Authority / Safety

<Compatibility, architecture conventions, data phải giữ, quyền được thực thi>
<Environment cho phép; hành động cần approval riêng; không ghi secret vào package>

## Expected Output

<Source/test/docs/report hoặc chỉ report nếu diagnose/review>

## Validation Required

<AC/risk → check/test; target an toàn; command do agent xác minh>

## Questions / Dependencies

<Question hoặc dependency / impact / owner / status; điều chặn Ready>

## Handoff / Checkpoint

<Baseline, findings, decisions, changes, test results, risks, next step>
```

### 32.9. EXECUTION-PLAN.md

Dùng cho cross-module hoặc thay đổi nhạy cảm; có thể nằm trong issue thay file. Chỉ lập sau đọc context/source đủ cho rủi ro.

```markdown
# Execution Plan — TASK-<ID>

Owner: <person> | Status: <PROPOSED/ACTIVE/COMPLETED/BLOCKED>
Task/Story/AC: <links> | Baseline: <branch/commit/state đủ nhận biết>

## Goal

<Kết quả task; link non-goals>

## Current Behavior

<Hiện trạng + source/test/repro evidence, không chỉ phỏng đoán>

## Desired Behavior

<AC/BR IDs; điều cần giữ nguyên>

## Impact Analysis

| Area                | Impact / consumers / compatibility / N/A reason            |
| ------------------- | ---------------------------------------------------------- |
| Affected components | <modules/entrypoints/dependencies>                         |
| Database            | <schema/query/migration/transaction/concurrency/retention> |
| API                 | <contract/callers/errors/versioning>                       |
| UI                  | <flows/states/accessibility>                               |
| Security            | <auth/ownership/data boundaries>                           |
| Operations          | <config/jobs/cache/deployment order nếu cần>               |

## Files Expected To Change

<Paths đã khảo sát và trách nhiệm; cập nhật nếu phát hiện caller thật>

## Implementation Steps

1. <Bước nhỏ + đầu ra kiểm được>
2. <Bước tiếp theo; dependency và approval nếu cần>

## Test Plan / Validation Commands

| AC/BR/risk | Test/check | Command thật / directory / safe target | Result                      |
| ---------- | ---------- | -------------------------------------- | --------------------------- |
| <ID>       | <check>    | <verified command>                     | <NOT_RUN/PASS/FAIL/BLOCKED> |

## Risks / Open Questions

<Risk, evidence, owner, mitigation; không che unknown>

## Rollback / Recovery

<Cách phục hồi thật sự, data constraints; authority; không giả định DOWN an toàn>

## Docs To Update

<Nguồn chuẩn bị ảnh hưởng và links; không nhân bản rule vào plan>

## Progress / Handoff

<Decisions, files changed, evidence, deviations, remaining work và next step>
```

### 32.10. SKILL.md

Mẫu cho workflow lặp; chỉ tạo package thật sau khi chọn rõ trigger và xác minh định dạng của công cụ. `description` giúp chọn skill; thân bài hướng dẫn thực hiện. Không lưu business policy cụ thể của dự án trong generic skill.

```markdown
---
name: <repeatable-workflow-name>
description: <Làm loại việc gì; dùng khi nào/trigger cụ thể; loại trừ scope dễ nhầm>
---

# Purpose

<Outcome lặp lại mà workflow này giúp đạt>

# When to Use

<Trường hợp phù hợp; trường hợp không áp dụng>

# Preconditions

<Task rõ scope; authority/environment; điều thiếu phải hỏi hoặc xác minh>

# Inputs

<Task Package, AC, rule links, contracts, paths/evidence cần có>

# Relevant Project Docs

<Cách tìm nguồn canonical qua AGENTS/docs map; không hardcode luật riêng sản phẩm>
<Đọc rule/architecture/security/test strategy đúng phần chịu tác động>

# Workflow

1. Hiểu outcome và nguồn chuẩn của task.
2. Khảo sát source/tests/consumers liên quan.
3. Phân tích tác động đặc thù của workflow này: <các bước không hiển nhiên>.
4. Lập plan phù hợp rủi ro; xử lý unknown quan trọng.
5. Thực hiện trong scope; chọn implementation theo convention/constraints thật.
6. Kiểm chứng và review; cập nhật docs cần thiết trong phạm vi.

# Validation

<Checks/tests theo failure modes; target an toàn; cách lấy commands thật>
<Cách kiểm trigger đúng/sai và tình huống thiếu điều kiện khi thử skill>

# Output

<Artifacts/evidence/handoff tối thiểu; không bắt một format quá nặng>

# Do Not

Không tự tạo requirement/rule; không chép policy vào skill.
Không mở rộng quyền, dùng secret để truy cập thêm hệ thống, tự deploy/xóa dữ liệu.
Không báo PASS nếu chưa kiểm; không bắt pattern kỹ thuật khi không có lý do.

# Done When

<Outcome đạt; validation có evidence; risks/limitations/remaining work rõ>

# References

<Link tài liệu bổ trợ + điều kiện phải đọc; chỉ tạo nếu thật sự cần>

# Scripts

<Script đã thử + inputs/outputs/side effects/authority; hoặc N/A>
```

### 32.11. ADR.md

Dùng cho quyết định quan trọng, không cho mọi task. Ghi cả phương án giữ hiện trạng nếu đó là một lựa chọn hợp lý.

```markdown
# ADR-<ID> — <decision title>

Status: <PROPOSED/ACCEPTED/REJECTED/SUPERSEDED>
Owner/approver: <person> | Date: <date>
Related: <feature/requirements/architecture/task links>

## Context

<Vấn đề, constraints, evidence, điều gì khiến cần quyết định>

## Decision

<Chọn gì, áp dụng phạm vi nào, ai phê duyệt>

## Alternatives

| Option                                                 | Benefits | Costs / risks | Why not chosen |
| ------------------------------------------------------ | -------- | ------------- | -------------- |
| <giữ hiện trạng / phương án đơn giản / phương án khác> | <...>    | <...>         | <...>          |

## Consequences

<Tác động tốt/xấu: implementation, test, data, compatibility, operations>

## Validation / Revisit Conditions

<Cách kiểm quyết định phù hợp; tín hiệu cần xem lại>

## Supersedes / Superseded By

<ADR links hoặc N/A; giữ lịch sử thay vì xóa quyết định cũ>
```

### 32.12. TEST-STRATEGY.md

Dùng để chọn bằng chứng theo risk và làm rõ môi trường/lệnh kiểm. Không đặt coverage percentage hoặc số lượng test tùy ý để thay chất lượng.

```markdown
# Test Strategy — <project hoặc module>

Owner: <developer/QA> | Reviewed: <date>
Scope: <luồng/phiên bản>; requirements/rules: <sources>.

## Risks / Critical Flows

<Điều hỏng gây tác động lớn; authorization/data/concurrency/UI khi liên quan>

## Test Selection

| Risk / AC / BR | Unit              | Integration / API / DB | Component / E2E   | Evidence |
| -------------- | ----------------- | ---------------------- | ----------------- | -------- |
| <ID/risk>      | <checks hoặc N/A> | <checks hoặc N/A>      | <checks hoặc N/A> | <links>  |

Regression và security-sensitive cases được đánh dấu ở loại test phù hợp.
Không cần mọi ô đều có test; ghi lý do với phần không áp dụng.

## Environments / Test Data

<Local/CI/staging; fixtures; dữ liệu giả; kiểm soát clock; cleanup an toàn>
<Không dùng production để kiểm ghi/xóa dữ liệu; không lưu secret trong file này>

## Commands / Preconditions

| Check   | Verified command  | Working directory / target | Preconditions / side effects |
| ------- | ----------------- | -------------------------- | ---------------------------- |
| <check> | <command có thật> | <target>                   | <requirements>               |

## Gates / Definition of Done

<Checks bắt buộc theo risk, cần reviewer nào, cách xử lý blocker>
<Build/lint không thay behavior tests; mock không thay DB concurrency evidence>

## Evidence Format

<Version/baseline, date, check/command, environment, PASS/FAIL/NOT_RUN/BLOCKED, kết quả>
<Không ghi PASS chỉ vì đã viết test; link failure/remaining work nếu có>

## Limitations / Deferred Coverage

<Chưa kiểm gì, vì sao, risk, owner và bước kế tiếp; không ngầm coi là đạt>
```
