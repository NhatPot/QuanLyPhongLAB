# Execution plan — <task>

Status: DRAFT / READY / IN_PROGRESS / BLOCKED / VERIFIED / CLOSED

Owner: <role> · Tier/risk: <level + lý do> · Baseline: <commit/date>.
Mẫu cho task cross-module/rủi ro; task nhỏ dùng vài dòng thay vì tạo file này. Mục không áp dụng ghi N/A kèm lý do, không điền giả.

## Goal

<Kết quả đo/quan sát được. Code complete hay feature complete, phạm vi bàn giao nào?>

## Context

<Yêu cầu đã duyệt, evidence hiện trạng, links rule/ADR/API liên quan.>

## Scope / Non-goals

- Được thay: <files/components/behavior>.
- Không thay: <business rules/data/framework ngoài task>.
- External/DB authority: <read-only/local write/deploy riêng; target được phép>.

## Requirements / Business Rules

| ID   | Requirement hoặc link rule chuẩn | AC / evidence cần có | Owner  |
| ---- | -------------------------------- | -------------------- | ------ |
| AC-1 | <không sao chép cả domain spec>  | <observable result>  | <role> |

## Current Behavior / Desired Behavior

<Expected vs actual, repro/entry point. Giữ gì, đổi gì, ai bị ảnh hưởng?>

## Impact Analysis / Affected Components

| Mặt tác động           | Files/consumers                      | Thay đổi, compatibility, kiểm chứng |
| ---------------------- | ------------------------------------ | ----------------------------------- |
| DB Impact              | <schema/migration/backfill hoặc N/A> | <invariant/lock/data cũ>            |
| API Impact             | <routes/clients>                     | <payload/errors/version>            |
| UI Impact              | <pages/forms>                        | <states/a11y/cache>                 |
| Security Impact        | <identity/permissions/scope/secrets> | <deny/abuse cases>                  |
| Integrations/ops       | <jobs/cache/device/deploy>           | <side effects/config>               |
| Backward Compatibility | <old clients/data>                   | <transition/rollout>                |

## Unknowns / Decisions

| ID  | Nhãn    | Câu hỏi / evidence mâu thuẫn | Owner / bước tiếp |
| --- | ------- | ---------------------------- | ----------------- |
| U-1 | UNKNOWN | <missing fact>               | <verify/ask>      |

Không đổi nhãn thành KNOWN nếu chưa có bằng chứng. Quyết định nghiệp vụ ngoài scope cần chốt trước nhánh triển khai đó.

## Implementation Steps

1. <Characterization/repro test và kiểm trạng thái hiện tại>.
2. <Lát cắt nhỏ nhất, files dự kiến>.
3. <Consumers và tương thích nếu có>.
4. <Verify/review/docs/handoff>.

## Test Plan

- Happy path: <AC>.
- Invalid/edge/stale/retry: <cases>.
- Permission/ownership/privacy: <deny cases>.
- Transaction/concurrency/partial failure: <mock vs integration rõ>.
- UI/E2E khi liên quan: <viewport/flow>.
- Regression: <consumer cần giữ>.

## Validation Commands / Evidence

| Command/check thực tế             | Target / side effects | Result  | Evidence       |
| --------------------------------- | --------------------- | ------- | -------------- |
| <không giả định npm test tồn tại> | <local/test DB>       | NOT_RUN | <sau khi chạy> |

## Risks / Rollback

<Rủi ro, xác suất/tác động nếu có bằng chứng, mitigation, owner chấp nhận.>
<Điều kiện dừng/rollback; rollback code khác data; backup/restore/roll-forward khi DOWN không an toàn.>

## Docs Update

<Nguồn canonical phải cập nhật, generated artifact nào, skill/ADR có cần không. Nếu không được phép sửa ghi deferred.>

## Status / Handoff

- Completed: <bằng chứng>.
- Remaining/blocked: <điều kiện gỡ>.
- Gates: Ready / Code / Feature / Merge / Release — <đạt/chưa đạt/N/A, lý do>.
- Intentionally unchanged: <scope giữ nguyên>.
- Next authorized step: <không tự mở rộng sang deploy>.
