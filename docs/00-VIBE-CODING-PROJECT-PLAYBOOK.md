# 00 — VIBE CODING PROJECT PLAYBOOK
## Chuẩn xây dựng dự án với AI Coding Agent / Codex

> **Mục tiêu:** biến một yêu cầu còn mơ hồ thành một dự án có thể triển khai, kiểm thử, bảo trì và mở rộng được bằng cách phối hợp **Source Code + Docs + AGENTS.md + Skills + Plan + Tests**.
>
> Tài liệu này **không phụ thuộc framework**. Có thể dùng cho website, REST API, full-stack app, mobile backend, internal tool hoặc hệ thống nghiệp vụ.

---

# 1. Tư duy cốt lõi

Vibe coding không nên hiểu là:

> “Nói AI làm cả dự án rồi chấp nhận code nó sinh ra.”

Cách làm chuẩn hơn là:

```text
Ý tưởng
  ↓
Phân tích bài toán
  ↓
Đặc tả yêu cầu
  ↓
Mô hình nghiệp vụ
  ↓
Thiết kế dữ liệu + kiến trúc + API
  ↓
Lập kế hoạch triển khai
  ↓
AI đọc đúng Docs + Skill liên quan
  ↓
Code theo từng lát cắt nhỏ
  ↓
Test + Review + Security Check
  ↓
Cập nhật Docs
  ↓
Commit / Release
```

Nguyên tắc quan trọng:

1. **Repository là nguồn sự thật.**
2. **Docs mô tả hệ thống đang phải hoạt động như thế nào.**
3. **AGENTS.md là bản đồ chỉ đường, không phải một cuốn giáo trình khổng lồ.**
4. **Skill chỉ chứa workflow lặp lại hoặc kiến thức chuyên biệt.**
5. **Plan chứa trạng thái của công việc đang thực hiện.**
6. **Source code phải được kiểm chứng bằng test, lint, typecheck, build hoặc các kiểm tra tương đương.**
7. **Không viết code trước khi hiểu code hiện tại và yêu cầu cần thay đổi.**
8. **Mọi thay đổi lớn phải truy ngược được từ Requirement → Design → Code → Test.**

---

# 2. Mô hình tổ chức repository đề xuất

Đây là cấu trúc tham khảo. Không bắt buộc dự án nào cũng phải có toàn bộ file ngay từ đầu.

```text
project-root/
│
├── AGENTS.md
├── README.md
├── .gitignore
├── .env.example
│
├── .agent/
│   ├── PLANS.md
│   └── skills/
│       ├── repository-audit/
│       │   └── SKILL.md
│       ├── requirements-analysis/
│       │   └── SKILL.md
│       ├── domain-modeling/
│       │   └── SKILL.md
│       ├── database-design/
│       │   └── SKILL.md
│       ├── api-design/
│       │   └── SKILL.md
│       ├── auth-rbac/
│       │   └── SKILL.md
│       ├── architecture/
│       │   └── SKILL.md
│       ├── testing/
│       │   └── SKILL.md
│       ├── security-review/
│       │   └── SKILL.md
│       └── code-review/
│           └── SKILL.md
│
├── docs/
│   ├── 00-project-overview.md
│   ├── 01-problem-goals-scope.md
│   ├── 02-stakeholders-actors-roles.md
│   ├── 03-requirements.md
│   ├── 04-business-rules.md
│   ├── 05-user-stories-acceptance-criteria.md
│   ├── 06-use-cases-user-flows.md
│   ├── 07-domain-model.md
│   ├── 08-data-model.md
│   ├── 09-api-contract.md
│   ├── 10-architecture.md
│   ├── 11-security-auth-rbac.md
│   ├── 12-test-strategy.md
│   ├── 13-deployment-operations.md
│   ├── 14-traceability-matrix.md
│   │
│   ├── adr/
│   │   ├── 0001-choose-database.md
│   │   └── 0002-choose-architecture.md
│   │
│   └── plans/
│       ├── active/
│       └── completed/
│
├── src/
├── tests/
├── scripts/
└── ...
```

## Ý nghĩa 4 thành phần quan trọng

### `AGENTS.md`

Dùng làm **bản đồ cho coding agent**:

- dự án là gì;
- source nằm ở đâu;
- docs nào là nguồn sự thật;
- lệnh install / dev / test / lint / build;
- quy ước code;
- quy định bắt buộc trước khi sửa source;
- skill nào được dùng trong trường hợp nào;
- khi nào phải tạo plan;
- những vùng không được tự ý thay đổi.

Không nên nhét toàn bộ kiến thức kiến trúc, database, coding standard và business rule vào một file này.

---

### `docs/`

Dùng làm **knowledge base của dự án**.

Docs trả lời các câu hỏi:

- Hệ thống giải quyết vấn đề gì?
- Ai sử dụng?
- Có những chức năng gì?
- Business rule là gì?
- Entity nào tồn tại?
- Database được thiết kế ra sao?
- API nào được cung cấp?
- Kiến trúc nào đang dùng?
- Quyền nào được phép làm gì?
- Kiểm thử ra sao?
- Vì sao một quyết định kỹ thuật được chọn?

---

### `.agent/skills/`

Dùng cho **workflow hoặc chuyên môn có thể tái sử dụng**.

Ví dụ:

```text
Yêu cầu: thêm API đặt phòng
          ↓
requirements-analysis
          ↓
booking-business-rules
          ↓
database-design
          ↓
api-design
          ↓
auth-rbac
          ↓
testing
          ↓
code-review
```

Skill không nên trở thành bản sao của Docs.

---

### `docs/plans/`

Dùng cho **công việc đang thực hiện**.

Ví dụ:

```text
docs/plans/active/
└── add-booking-cancellation.md
```

Sau khi hoàn thành:

```text
docs/plans/completed/
└── add-booking-cancellation.md
```

Plan cho biết:

- mục tiêu;
- phạm vi;
- file dự kiến sửa;
- database migration;
- API thay đổi;
- test phải thêm;
- rủi ro;
- checklist;
- trạng thái.

---

# 3. PHASE 0 — Repository Audit

## Mục tiêu

Trước khi sửa hoặc viết thêm code, agent phải hiểu dự án hiện tại.

## Agent phải đọc

Ưu tiên theo thứ tự:

```text
1. AGENTS.md
2. README.md
3. package manifest / dependency manifest
4. configuration files
5. docs/
6. .agent/skills/
7. source tree
8. database schema / migrations
9. routes / controllers / handlers
10. tests
11. CI/CD
12. deployment config
```

Ví dụ manifest:

```text
package.json
pnpm-lock.yaml
package-lock.json
requirements.txt
pyproject.toml
pom.xml
build.gradle
*.csproj
Cargo.toml
go.mod
```

## Không cần đọc sâu ngay

Thông thường bỏ qua:

```text
node_modules/
.next/
dist/
build/
coverage/
.tmp/
.cache/
logs/
binary assets
generated files
```

Trừ khi đang điều tra lỗi liên quan trực tiếp.

## Kết quả Repository Audit phải trả lời được

```text
- Dự án đang làm gì?
- Stack hiện tại là gì?
- Điểm khởi chạy ứng dụng nằm ở đâu?
- Frontend / Backend / Database nằm ở đâu?
- Module chính là gì?
- Kiến trúc hiện tại là gì?
- Luồng request đi qua những tầng nào?
- Auth đang hoạt động ra sao?
- Database truy cập qua lớp nào?
- Test hiện có ở đâu?
- Những docs nào còn đúng?
- Docs nào đã lệch source?
- Skill nào đang trùng nhau?
- Phần nào có technical debt?
- Phần nào tuyệt đối không nên refactor tùy tiện?
```

## Output nên tạo

```text
docs/00-current-state-audit.md
```

Cấu trúc:

```md
# Current State Audit

## 1. Project Summary
## 2. Tech Stack
## 3. Repository Map
## 4. Runtime Flow
## 5. Architecture Observed
## 6. Data Layer
## 7. API Layer
## 8. Authentication / Authorization
## 9. Tests
## 10. Documentation Health
## 11. Skills Health
## 12. Risks / Technical Debt
## 13. Recommended Improvements
```

---

# 4. PHASE 1 — Xác định bài toán

Không bắt đầu bằng framework.

Bắt đầu bằng:

```text
Problem
↓
Goal
↓
Scope
↓
Stakeholder
↓
Actor / Role
↓
Requirement
```

## 4.1 Problem Statement

Phải trả lời:

```text
Ai đang gặp vấn đề?
Vấn đề cụ thể là gì?
Hiện tại họ giải quyết bằng cách nào?
Điểm bất tiện / chi phí / rủi ro là gì?
Tại sao cần xây hệ thống?
```

Template:

```md
## Problem

[Nhóm người dùng] hiện đang gặp [vấn đề].

Hiện tại họ phải [cách xử lý hiện tại].

Điều này dẫn tới:
- ...
- ...
- ...

Hệ thống mới cần giúp:
- ...
- ...
```

---

## 4.2 Goals và Non-goals

### Goals

Những kết quả dự án phải đạt.

### Non-goals

Những thứ **không làm trong phiên bản này**.

Đây là bước rất quan trọng để AI không tự mở rộng scope.

---

# 5. PHASE 2 — Stakeholder, Actor, Role và Permission

Phân biệt rõ:

```text
Stakeholder = người / tổ chức có lợi ích liên quan
Actor       = đối tượng tương tác với hệ thống
Role        = vai trò quyền hạn trong hệ thống
Permission  = hành động cụ thể được phép thực hiện
```

Ví dụ:

```text
Actor: User

Role:
- Student
- Lecturer
- Admin

Permission:
- booking.create
- booking.read
- booking.approve
- user.manage
```

Nên có Permission Matrix:

| Action | Student | Lecturer | Admin |
|---|---:|---:|---:|
| View own profile | ✓ | ✓ | ✓ |
| Create booking | ✓ | ✓ | ✓ |
| Approve booking |  | ✓ | ✓ |
| Manage users |  |  | ✓ |

---

# 6. PHASE 3 — Requirements

Chia làm hai nhóm.

## Functional Requirements

Hệ thống **phải làm được gì**.

Ví dụ:

```text
FR-001 User có thể đăng nhập.
FR-002 User có thể xem danh sách phòng.
FR-003 User có thể tạo yêu cầu đặt phòng.
FR-004 Lecturer có thể duyệt yêu cầu.
```

## Non-functional Requirements

Hệ thống **phải đạt chất lượng gì**.

Ví dụ:

```text
NFR-001 API protected phải yêu cầu authentication.
NFR-002 Input phải được validate ở server.
NFR-003 Password không được lưu plaintext.
NFR-004 Mọi migration phải có thể chạy lại trên môi trường mới.
NFR-005 Các thao tác quan trọng phải có audit log nếu nghiệp vụ yêu cầu.
```

Có thể bổ sung:

```text
Performance
Security
Reliability
Availability
Maintainability
Accessibility
Observability
Privacy
Backup / Recovery
Scalability
```

---

# 7. PHASE 4 — User Story và Acceptance Criteria

Template:

```md
### US-001 — Đăng nhập

**As a** registered user  
**I want** to log in  
**So that** I can access features for my account.

#### Acceptance Criteria

- Given ...
- When ...
- Then ...

#### Business Rules

- BR-001 ...
- BR-002 ...

#### Related APIs

- POST /auth/login

#### Related Tests

- AUTH-LOGIN-001
- AUTH-LOGIN-002
```

Một User Story chưa đủ rõ nếu không thể viết Acceptance Criteria.

---

# 8. PHASE 5 — Business Rules

Business Rule là **luật nghiệp vụ**, không phải code implementation.

Ví dụ:

```text
BR-BOOKING-001
Một phòng không được có hai booking đã duyệt bị trùng thời gian.

BR-BOOKING-002
Người tạo booking chỉ được hủy booking của chính mình nếu booking chưa bắt đầu.

BR-BOOKING-003
Admin có thể hủy booking bất kỳ nhưng phải lưu lý do.
```

Business Rule nên có ID.

Lợi ích:

```text
Requirement
   ↓
Business Rule
   ↓
Use Case
   ↓
Source
   ↓
Test
```

---

# 9. PHASE 6 — User Flow và Use Case

## User Flow

Mô tả các bước người dùng đi qua.

```text
Login
  ↓
Danh sách phòng
  ↓
Chọn phòng
  ↓
Chọn thời gian
  ↓
Submit
  ↓
Validation
  ↓
Booking created
```

## Use Case

Mô tả logic hệ thống.

Ví dụ:

```text
CreateBookingUseCase

Input
- userId
- roomId
- startAt
- endAt

Checks
1. User tồn tại.
2. Room tồn tại.
3. startAt < endAt.
4. User có quyền booking.create.
5. Không có booking hợp lệ bị trùng lịch.

Output
- Booking
```

---

# 10. PHASE 7 — Domain Modeling

Không phải dự án nào cũng cần Domain Driven Design đầy đủ.

Nhưng dự án có nghiệp vụ nên xác định tối thiểu:

```text
Entity
Value Object
Business Invariant
Use Case
Domain Service nếu thực sự cần
```

## Entity

Đối tượng nghiệp vụ có danh tính.

Ví dụ:

```text
User
Room
Booking
Course
Invoice
Order
Product
```

## Value Object

Giá trị không cần danh tính độc lập.

Ví dụ:

```text
Email
Money
DateRange
Address
PasswordHash
```

## Business Invariant

Điều luôn phải đúng.

Ví dụ:

```text
Booking.startAt < Booking.endAt
Order.total >= 0
Email phải hợp lệ
```

---

# 11. PHASE 8 — Data Model / ERD

Chỉ thiết kế database sau khi đã hiểu nghiệp vụ.

Mỗi bảng cần xem xét:

```text
Primary Key
Foreign Key
Unique Constraint
Nullability
Index
Status
CreatedAt
UpdatedAt
Soft Delete nếu thật sự cần
Audit Fields nếu cần
```

Ví dụ:

```text
users
rooms
bookings
roles
permissions
user_roles
role_permissions
```

## Trước khi code database phải trả lời

```text
Entity nào cần persistence?
Quan hệ 1-1, 1-N, N-N?
Field nào unique?
Query phổ biến là gì?
Field nào cần index?
Có transaction boundary nào?
Có race condition nào?
Migration strategy là gì?
Seed data có cần không?
```

---

# 12. PHASE 9 — Architecture

Không áp Clean Architecture một cách máy móc.

Chọn kiến trúc theo độ phức tạp.

## Dự án nhỏ

Có thể dùng:

```text
route
↓
controller
↓
service
↓
repository
↓
database
```

## Dự án nghiệp vụ phức tạp

Có thể dùng:

```text
presentation / interface
          ↓
application
          ↓
domain
          ↑
infrastructure
```

Nguyên tắc quan trọng hơn tên folder:

```text
Domain không phụ thuộc framework.
Business logic không nằm rải rác trong controller.
Database detail không chi phối use case.
Validation có vị trí rõ ràng.
Dependency direction có chủ đích.
Module boundaries rõ ràng.
```

---

# 13. PHASE 10 — API Contract

Trước khi agent code API, nên có contract.

Template:

```md
## POST /bookings

### Authorization
Permission: `booking.create`

### Request

```json
{
  "roomId": "string",
  "startAt": "ISO-8601",
  "endAt": "ISO-8601"
}
```

### Success

HTTP 201

```json
{
  "data": {
    "id": "string",
    "status": "PENDING"
  }
}
```

### Errors

- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 FORBIDDEN
- 404 ROOM_NOT_FOUND
- 409 BOOKING_CONFLICT
```

Mỗi API nên xác định:

```text
Method
Path
Auth
Permission
Input
Validation
Output
Error contract
Status codes
Pagination
Filtering
Sorting
Idempotency nếu cần
Rate limiting nếu cần
```

---

# 14. PHASE 11 — Security Design

Security không để cuối dự án mới thêm.

Checklist tối thiểu:

```text
[ ] Authentication strategy rõ ràng
[ ] Authorization được kiểm tra server-side
[ ] RBAC / Permission rõ ràng
[ ] Input validation
[ ] Output không rò dữ liệu nhạy cảm
[ ] Password hashing
[ ] Secret nằm ngoài repository
[ ] .env.example không có secret thật
[ ] SQL injection được phòng tránh
[ ] XSS / CSRF được xem xét khi phù hợp
[ ] CORS cấu hình rõ
[ ] Upload file có giới hạn
[ ] Rate limiting cho endpoint nhạy cảm nếu cần
[ ] Audit log cho hành động nhạy cảm nếu cần
[ ] Dependency vulnerabilities được kiểm tra
```

---

# 15. PHASE 12 — Test Strategy

AI không được coi “code chạy được” là hoàn thành.

Nên phân loại:

```text
Unit Test
Integration Test
API Test
Database Test
End-to-End Test
Regression Test
Security-sensitive Test
```

## Nguyên tắc

Test phải tập trung vào hành vi và business rule.

Ví dụ:

```text
BR-BOOKING-001
Một phòng không được có hai booking được duyệt trùng thời gian.
```

Phải có test cho:

```text
- không trùng → thành công
- trùng toàn phần → từ chối
- trùng đầu → từ chối
- trùng cuối → từ chối
- sát biên nhưng không trùng → theo đúng business rule
```

---

# 16. PHASE 13 — Traceability Matrix

Đây là phần rất nên có khi dùng AI coding.

File:

```text
docs/14-traceability-matrix.md
```

Ví dụ:

| Requirement | Business Rule | Use Case | API | Implementation | Test |
|---|---|---|---|---|---|
| FR-003 | BR-BOOKING-001 | CreateBooking | POST /bookings | `...` | `...` |
| FR-004 | BR-BOOKING-010 | ApproveBooking | PATCH /bookings/:id/approve | `...` | `...` |

Nếu thay đổi Requirement, agent có thể nhìn bảng này để biết vùng nào bị ảnh hưởng.

---

# 17. Thiết kế AGENTS.md

`AGENTS.md` nên ngắn và có tính điều hướng.

Template đề xuất:

```md
# AGENTS.md

## Project
[Mô tả dự án 3-5 dòng]

## Source of Truth
Before implementation, read the relevant files in `docs/`.

Important:
- Architecture: `docs/10-architecture.md`
- Requirements: `docs/03-requirements.md`
- Business rules: `docs/04-business-rules.md`
- API contract: `docs/09-api-contract.md`
- Security: `docs/11-security-auth-rbac.md`
- Tests: `docs/12-test-strategy.md`

## Repository Map
- `src/...`
- `tests/...`
- `docs/...`
- `.agent/skills/...`

## Commands
- Install: ...
- Dev: ...
- Test: ...
- Lint: ...
- Typecheck: ...
- Build: ...

## Mandatory Workflow
1. Inspect existing implementation before editing.
2. Read related docs.
3. Load only relevant skills.
4. Create/update an execution plan for non-trivial work.
5. Make the smallest coherent change.
6. Run relevant tests and static checks.
7. Review the diff.
8. Update docs when behavior or architecture changes.

## Constraints
- Never commit secrets.
- Do not change public contracts without updating docs/tests.
- Do not bypass authorization.
- Do not silently change business rules.
- Do not introduce a new dependency without a clear reason.
```

---

# 18. Thiết kế Skill

Một skill chỉ nên giải quyết **một workflow tương đối ổn định**.

Ví dụ tốt:

```text
api-controller-validation
booking-business-rules
repository-pattern
database-migration
auth-rbac
test-case-generation
security-review
code-review
```

Ví dụ quá rộng:

```text
backend-everything
build-full-project
all-coding-rules
```

## Template `SKILL.md`

```md
---
name: api-contract-review
description: Review or design HTTP API contracts, including routes, validation, response shapes, status codes, authorization and error handling. Use when adding or changing an API endpoint.
---

# API Contract Review

## Inputs to inspect
- related requirement
- business rules
- current routes
- DTO/schema
- authorization rules
- tests

## Workflow
1. Identify the use case.
2. Confirm authorization.
3. Define request schema.
4. Define validation.
5. Define success response.
6. Define error cases.
7. Check backward compatibility.
8. Update API docs.
9. Add or update tests.

## Do not
- invent business rules;
- expose internal database models directly without a reason;
- return inconsistent error shapes;
- bypass server-side authorization.

## Done when
- contract is documented;
- implementation matches contract;
- tests cover success and failure paths.
```

## Nếu Skill phức tạp

Có thể thêm:

```text
skill-name/
├── SKILL.md
├── references/
├── scripts/
└── assets/
```

Dùng:

```text
references/ = kiến thức tham khảo
scripts/    = thao tác có thể tự động hóa
assets/     = template / fixture / sample
```

---

# 19. Bộ Skill nền tảng đề xuất

Không cần tạo tất cả trong ngày đầu tiên.

Chỉ tạo khi dự án có nhu cầu lặp lại.

```text
repository-audit
requirements-analysis
domain-modeling
architecture-review
database-design
database-migration
api-design
api-controller-validation
auth-rbac
error-handling
testing
test-case-generation
security-review
code-review
documentation-sync
deployment-check
```

Skill riêng theo nghiệp vụ:

```text
booking-business-rules
student-enrollment-rules
payment-rules
inventory-rules
approval-workflow
```

---

# 20. Quy tắc phân biệt Docs và Skill

Dùng quy tắc sau:

## Nếu câu hỏi là:

> “Hệ thống này hiện đang được thiết kế như thế nào?”

→ **Docs**

Ví dụ:

```text
API hiện có gì?
Database có bảng gì?
Booking có rule gì?
Role nào có permission gì?
```

## Nếu câu hỏi là:

> “Khi gặp loại công việc này, AI phải xử lý theo quy trình nào?”

→ **Skill**

Ví dụ:

```text
Khi tạo migration phải kiểm tra gì?
Khi thêm endpoint phải validate ra sao?
Khi review security phải kiểm tra gì?
```

---

# 21. Execution Plan cho tác vụ lớn

Không cho agent lao vào code ngay khi task lớn.

Template:

```md
# Plan — [Tên tính năng]

## Goal

## User Impact

## Related Requirements

## Related Business Rules

## Current Implementation

## Proposed Design

## Files Expected to Change

## Database Changes

## API Changes

## Security Impact

## Test Plan

## Migration / Backward Compatibility

## Risks

## Implementation Steps

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Validation

- [ ] Unit tests
- [ ] Integration tests
- [ ] Lint
- [ ] Typecheck
- [ ] Build
- [ ] Manual smoke test

## Docs to Update
```

---

# 22. Vibe Coding Loop chuẩn

Mỗi task nên đi theo vòng sau:

```text
UNDERSTAND
   ↓
LOCATE
   ↓
PLAN
   ↓
IMPLEMENT
   ↓
TEST
   ↓
REVIEW
   ↓
DOCUMENT
   ↓
COMMIT
```

## 1. UNDERSTAND

Agent nhắc lại:

```text
Mục tiêu là gì?
Scope là gì?
Không làm gì?
Acceptance Criteria là gì?
```

## 2. LOCATE

Agent tìm:

```text
Feature tương tự
Module liên quan
Business rule liên quan
Database table liên quan
API liên quan
Test hiện có
```

## 3. PLAN

Agent xác định:

```text
File nào sửa?
Có thêm file không?
Có migration không?
Có thay contract không?
Có ảnh hưởng security không?
Test nào cần thêm?
```

## 4. IMPLEMENT

Nguyên tắc:

```text
Smallest coherent change
```

Không refactor lan rộng nếu task không yêu cầu.

## 5. TEST

Chạy các kiểm tra phù hợp.

Ví dụ:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Hoặc command tương đương của stack hiện tại.

## 6. REVIEW

Agent phải tự review diff:

```text
Có bug logic không?
Có duplicate code không?
Có bỏ qua permission không?
Có leak data không?
Có error chưa xử lý không?
Có làm vỡ API cũ không?
Có dead code không?
```

## 7. DOCUMENT

Nếu behavior thay đổi:

```text
update docs
update API contract
update business rule
update ADR nếu quyết định kiến trúc thay đổi
```

## 8. COMMIT

Commit phải thể hiện một thay đổi logic rõ ràng.

---

# 23. Quality Gates

## Gate 0 — Repository Understanding

Không code nếu chưa xác định được:

```text
entry point
module liên quan
docs liên quan
test command
```

## Gate 1 — Requirement Ready

Không code feature nếu chưa có:

```text
goal
scope
acceptance criteria
business rule quan trọng
```

## Gate 2 — Design Ready

Nếu feature ảnh hưởng dữ liệu / API / auth:

```text
data model
API contract
permission
error cases
```

phải rõ trước.

## Gate 3 — Implementation Ready

Phải có plan nếu thay đổi lớn hoặc liên quan nhiều module.

## Gate 4 — Merge Ready

Phải đạt:

```text
tests pass
lint pass
typecheck pass nếu có
build pass nếu có
security review phù hợp
diff reviewed
docs synced
```

## Gate 5 — Release Ready

Xem xét:

```text
migration
environment variables
seed
rollback
logging
monitoring
backup
deployment instructions
```

---

# 24. Definition of Done

Một task chỉ được xem là hoàn thành khi:

```text
[ ] Acceptance Criteria đạt
[ ] Business Rule được giữ đúng
[ ] Source phù hợp kiến trúc hiện tại
[ ] Validation đầy đủ
[ ] Authorization đầy đủ
[ ] Error handling hợp lý
[ ] Tests liên quan pass
[ ] Lint / typecheck / build pass khi dự án có dùng
[ ] Không đưa secret vào source
[ ] Không còn debug code không cần thiết
[ ] Docs liên quan được cập nhật
[ ] Agent đã review diff cuối
```

---

# 25. ADR — Architecture Decision Record

Dùng khi có quyết định kỹ thuật đáng kể.

Ví dụ:

```text
Chọn PostgreSQL thay vì MongoDB
Chọn REST thay vì GraphQL
Chọn JWT + Refresh Token
Chọn modular monolith
Chọn repository abstraction
```

Template:

```md
# ADR-XXXX — [Decision]

## Status
Proposed / Accepted / Superseded

## Context

## Decision

## Alternatives Considered

## Consequences

## Migration Impact
```

Không cần tạo ADR cho quyết định nhỏ.

---

# 26. Quy trình khi bắt đầu một dự án hoàn toàn mới

```text
01. Problem
02. Goals / Non-goals
03. Stakeholders
04. Actors / Roles
05. Requirements
06. Business Rules
07. User Stories
08. Acceptance Criteria
09. User Flows / Use Cases
10. Domain Model
11. Data Model
12. Architecture
13. API Contract
14. Security / RBAC
15. Test Strategy
16. Repository Scaffold
17. AGENTS.md
18. Skills cần thiết
19. Execution Plan
20. Implementation theo vertical slice
21. Test / Review
22. Deployment
23. Documentation sync
```

---

# 27. Vertical Slice Development

Không nên làm theo kiểu:

```text
viết toàn bộ database
↓
viết toàn bộ repository
↓
viết toàn bộ controller
↓
sau cùng mới test
```

Ưu tiên:

```text
Feature A
Requirement
→ DB
→ Use Case
→ API
→ Test
→ hoàn tất

Feature B
Requirement
→ DB
→ Use Case
→ API
→ Test
→ hoàn tất
```

Mỗi lát cắt tạo ra một chức năng có thể kiểm chứng.

---

# 28. Khi agent được yêu cầu thêm một feature

Agent phải thực hiện checklist sau:

```text
1. Đọc AGENTS.md.
2. Đọc docs liên quan.
3. Đọc skill liên quan.
4. Tìm code tương tự đã tồn tại.
5. Xác định Requirement / Business Rule.
6. Xác định impact.
7. Tạo hoặc cập nhật plan nếu task không nhỏ.
8. Chỉnh docs/spec trước nếu contract chưa rõ.
9. Implement.
10. Test.
11. Review.
12. Cập nhật docs.
13. Báo cáo chính xác file đã thay đổi và kiểm tra đã chạy.
```

---

# 29. Khi agent được yêu cầu sửa bug

Không sửa theo triệu chứng trước.

Quy trình:

```text
REPRODUCE
↓
LOCATE
↓
ROOT CAUSE
↓
REGRESSION TEST
↓
FIX
↓
FULL RELEVANT TEST
↓
REVIEW
```

Agent phải cố gắng:

1. tái hiện lỗi;
2. xác định nguyên nhân;
3. thêm test khiến code cũ fail;
4. sửa code;
5. xác nhận test mới pass;
6. kiểm tra ảnh hưởng phụ.

---

# 30. Khi agent được yêu cầu refactor

Refactor không được âm thầm làm đổi behavior.

Trước refactor:

```text
[ ] Behavior hiện tại đã hiểu
[ ] Test đủ để bảo vệ behavior quan trọng
[ ] Scope refactor rõ
[ ] Không trộn refactor lớn với feature không liên quan
```

Sau refactor:

```text
[ ] Existing tests pass
[ ] Public API không đổi ngoài dự kiến
[ ] Docs architecture được cập nhật nếu cần
```

---

# 31. Khi agent được yêu cầu sửa database

Bắt buộc kiểm tra:

```text
Schema hiện tại
Migration hiện tại
Existing production data assumptions
Foreign keys
Unique constraints
Indexes
Backward compatibility
Rollback / recovery
Seed
Tests
```

Không được chỉ sửa ORM model rồi xem như hoàn tất.

---

# 32. Khi agent được yêu cầu sửa Authentication / Authorization

Bắt buộc kiểm tra riêng:

```text
Authentication:
Ai là người dùng?

Authorization:
Người đó được phép làm gì?

Ownership:
Resource có thuộc về người đó không?

Role:
Người đó có vai trò gì?

Permission:
Role đó có quyền hành động này không?
```

Không chỉ ẩn button ở frontend.

Server phải kiểm tra quyền.

---

# 33. Docs Health Check

Định kỳ yêu cầu agent so sánh:

```text
Docs
vs
Source
vs
Tests
```

Tìm:

```text
Outdated docs
Dead docs
Duplicate docs
Missing docs
Contradictory docs
Broken links
Old endpoint names
Old table names
Old permission names
```

---

# 34. Skill Health Check

Định kỳ kiểm tra:

```text
Skill có bị trùng không?
Description có nói rõ khi nào dùng không?
Skill có quá dài không?
Có chứa thông tin dự án đáng lẽ nằm ở docs không?
Có instruction đã lỗi thời không?
Có thể chuyển thao tác lặp thành script không?
Skill có Done Criteria không?
```

---

# 35. Nguyên tắc tiết kiệm context cho AI

Không yêu cầu AI đọc toàn bộ repository cho mọi task.

Dùng progressive disclosure:

```text
AGENTS.md
   ↓
Docs liên quan
   ↓
Skill liên quan
   ↓
Source liên quan
   ↓
Tests liên quan
```

Ví dụ task:

> Thêm validation cho API đặt phòng.

Không cần load:

```text
UI design docs
deployment docs
toàn bộ module user
toàn bộ skill không liên quan
```

---

# 36. Những lỗi thường gặp khi vibe coding

## Anti-pattern 1

```text
Prompt rất dài chứa toàn bộ dự án
```

Thay bằng:

```text
AGENTS.md → docs → skills → task prompt
```

## Anti-pattern 2

```text
AI tự quyết business rule
```

Thay bằng:

```text
Business rule phải nằm trong docs hoặc được người dùng xác nhận.
```

## Anti-pattern 3

```text
Code trước, docs sau
```

Với thay đổi contract lớn:

```text
spec/design trước → code sau
```

## Anti-pattern 4

```text
Một skill làm mọi việc
```

Thay bằng skill nhỏ theo workflow.

## Anti-pattern 5

```text
Refactor toàn hệ thống trong lúc thêm một feature nhỏ
```

Thay bằng smallest coherent change.

## Anti-pattern 6

```text
Test chỉ happy path
```

Phải có:

```text
success
validation failure
authorization failure
not found
conflict
edge cases
```

## Anti-pattern 7

```text
Docs nói một kiểu, source chạy một kiểu
```

Phải có documentation sync trước khi kết thúc task.

---

# 37. Prompt chuẩn để yêu cầu Codex đọc lại một dự án hiện có

Có thể dùng nguyên prompt dưới đây.

```text
Hãy audit toàn bộ repository này trước khi thay đổi code.

Mục tiêu:
1. Hiểu chính xác hệ thống hiện tại.
2. So sánh source code, docs, .agent, skills và tests.
3. Phát hiện phần thiếu, trùng, lỗi thời hoặc không nhất quán.
4. Không được giả định kiến trúc chỉ từ tên thư mục; phải kiểm tra implementation thật.
5. Không refactor source trong giai đoạn audit.

Hãy đọc theo thứ tự:
- AGENTS.md / README
- manifest và config
- docs/
- .agent/ và skills
- source tree
- database schema / migrations
- routes / controllers / use cases / services / repositories
- authentication / authorization
- tests
- CI/CD và deployment config nếu có

Bỏ qua build artifacts, dependency folders, caches, logs và generated files trừ khi cần điều tra.

Sau khi đọc, hãy tạo báo cáo gồm:
A. Project summary
B. Tech stack
C. Repository map
D. Runtime/request flow
E. Current architecture
F. Domain/module boundaries
G. Database/data flow
H. API structure
I. Authentication & authorization
J. Testing status
K. Docs status
L. Skills status
M. Technical debt / risks
N. Recommended target structure
O. Migration plan từ cấu trúc hiện tại sang cấu trúc đề xuất

Quan trọng:
- Không phá code đang hoạt động chỉ để làm cấu trúc đẹp hơn.
- Ưu tiên cải tiến tăng khả năng hiểu, kiểm thử, bảo trì và độ tin cậy của AI agent.
- Mỗi đề xuất phải chỉ rõ lý do và vùng source bị ảnh hưởng.
- Những điều chưa xác minh phải đánh dấu là UNKNOWN thay vì tự suy đoán.
```

---

# 38. Prompt chuẩn để Codex xây một dự án mới

```text
Bạn là engineering agent chịu trách nhiệm xây dựng dự án này theo hướng spec-driven + agent-first development.

Không bắt đầu code ngay.

PHASE 1 — DISCOVERY
Hãy giúp xác định:
- Problem
- Goals
- Non-goals
- Stakeholders
- Actors / Roles
- Functional Requirements
- Non-functional Requirements
- Business Rules
- User Stories
- Acceptance Criteria
- User Flows / Use Cases

PHASE 2 — DESIGN
Sau khi requirement đủ rõ, hãy thiết kế:
- Domain model
- Data model / ERD
- Permission matrix
- Architecture
- Module boundaries
- API contracts
- Error model
- Security model
- Test strategy
- Deployment assumptions

PHASE 3 — REPOSITORY
Đề xuất:
- source tree
- docs tree
- AGENTS.md
- skills cần thiết
- execution plan
- coding conventions
- commands để test / lint / typecheck / build

PHASE 4 — IMPLEMENTATION
Triển khai theo vertical slice.
Mỗi slice phải:
1. có requirement;
2. có acceptance criteria;
3. có business rule liên quan;
4. có implementation;
5. có test;
6. chạy validation;
7. review diff;
8. cập nhật docs.

Không tự tạo business rule khi chưa có căn cứ.
Không đổi public contract âm thầm.
Không bỏ qua authorization.
Không đưa secret vào repository.
Không coi task hoàn tất nếu chưa kiểm tra bằng test hoặc validation phù hợp.
```

---

# 39. Prompt chuẩn cho mỗi task coding

```text
Trước khi code:
1. Đọc AGENTS.md.
2. Xác định docs liên quan.
3. Chỉ load các skills cần thiết.
4. Đọc implementation và tests hiện tại.
5. Tóm tắt current behavior.
6. Xác định scope và impact.
7. Lập plan ngắn.

Sau đó:
8. Implement smallest coherent change.
9. Thêm/cập nhật tests.
10. Chạy relevant tests.
11. Chạy lint/typecheck/build nếu có.
12. Review diff như một senior engineer.
13. Kiểm tra security và backward compatibility nếu liên quan.
14. Cập nhật docs nếu behavior/contract/architecture thay đổi.

Cuối cùng báo cáo:
- What changed
- Why
- Files changed
- Tests/checks run
- Remaining risks
- Docs updated
```

---

# 40. Checklist khởi tạo dự án

```text
DISCOVERY
[ ] Problem
[ ] Goals
[ ] Non-goals
[ ] Stakeholders
[ ] Actors / Roles

REQUIREMENTS
[ ] Functional requirements
[ ] Non-functional requirements
[ ] Business rules
[ ] User stories
[ ] Acceptance criteria
[ ] User flows / use cases

DOMAIN / DATA
[ ] Entities
[ ] Value objects nếu cần
[ ] Invariants
[ ] ERD
[ ] Constraints
[ ] Index strategy
[ ] Migration strategy

ARCHITECTURE
[ ] System boundaries
[ ] Module boundaries
[ ] Dependency direction
[ ] API contract
[ ] Auth / RBAC
[ ] Error model

AI REPOSITORY
[ ] AGENTS.md
[ ] docs/
[ ] skills/
[ ] plans/
[ ] command reference
[ ] coding conventions

QUALITY
[ ] Test strategy
[ ] Security checklist
[ ] Code review workflow
[ ] CI checks
[ ] Definition of Done

OPERATIONS
[ ] Environment config
[ ] Deployment
[ ] Logging
[ ] Monitoring
[ ] Backup / recovery nếu cần
[ ] Rollback strategy
```

---

# 41. Mô hình tổng thể khuyến nghị

```text
                         ┌─────────────────────┐
                         │      USER IDEA      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ PRODUCT / BUSINESS  │
                         │      ANALYSIS       │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
          Requirements       Business Rules      User Flows
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   SYSTEM DESIGN     │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼────────────────────────┐
            ▼                       ▼                        ▼
        Domain                  Data Model               API/Auth
            │                       │                        │
            └───────────────────────┼────────────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   REPOSITORY DOCS   │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ▼                 ▼                 ▼
              AGENTS.md           docs/            skills/
                  │                 │                 │
                  └─────────────────┼─────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   EXECUTION PLAN    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   CODING AGENT      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ CODE → TEST → REVIEW│
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   DOCS SYNC / CI    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │       RELEASE       │
                         └─────────────────────┘
```

---

# 42. Quy tắc cuối cùng cho AI Agent

Khi làm việc trong repository này, agent phải ưu tiên:

```text
Correctness
>
Business Rules
>
Security
>
Backward Compatibility
>
Tests
>
Maintainability
>
Consistency
>
Convenience
```

Không được:

```text
- tự invent requirement;
- tự đổi business rule;
- tự bỏ authorization để làm code chạy;
- tự xóa validation;
- tự đổi schema production mà không migration;
- tự đổi API contract mà không cập nhật docs/test;
- tự thêm dependency lớn chỉ để giải quyết việc nhỏ;
- tự refactor ngoài scope;
- báo "done" khi chưa chạy validation phù hợp.
```

Nếu phát hiện mâu thuẫn giữa:

```text
Prompt
Docs
Source
Tests
```

agent phải:

1. nêu rõ mâu thuẫn;
2. xác định nguồn nào có khả năng là current source of truth;
3. kiểm tra implementation thực tế;
4. không âm thầm chọn một giả định;
5. yêu cầu xác nhận nếu thay đổi có thể làm khác nghiệp vụ.

---

# 43. Kết luận

Mục tiêu cuối cùng không phải là có thật nhiều file Markdown hay thật nhiều Skill.

Mục tiêu là tạo một hệ thống mà AI có thể trả lời chính xác 5 câu hỏi trước khi sửa code:

```text
1. Tôi đang thay đổi yêu cầu nào?
2. Business rule nào phải được bảo vệ?
3. Source nào chịu trách nhiệm cho hành vi này?
4. Test nào chứng minh thay đổi là đúng?
5. Docs nào phải cập nhật sau thay đổi?
```

Nếu repository trả lời được 5 câu hỏi này một cách nhanh chóng, dự án đã có nền tảng tốt cho **vibe coding có kiểm soát, agent-first development và bảo trì lâu dài**.
