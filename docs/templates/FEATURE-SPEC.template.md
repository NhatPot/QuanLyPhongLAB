# Feature spec — <name>

Status: DRAFT / REVIEWED / ACTIVE / SUPERSEDED
Owner: <product/domain role> · Tier/risk: <...> · Last verified: <date/baseline>.
Mục không áp dụng ghi N/A có lý do; feature nhỏ có thể gộp vào task.

## Problem / Goal / Non-goals

<Ai gặp khó khăn gì, outcome muốn đạt, giới hạn và điều không làm.>

## Actors / User Story

“Là <actor>, tôi muốn <hành động>, để <giá trị>.”

| Actor             | Action   | Data scope              | Điều kiện / deny case         |
| ----------------- | -------- | ----------------------- | ----------------------------- |
| <role/permission> | <action> | OWN/ASSIGNED/ALL/<khác> | <không suy quyền từ tên role> |

## Requirements / Business Rules

| ID  | Rule / nguồn canonical | Điều cần giữ | Cần chốt     |
| --- | ---------------------- | ------------ | ------------ |
| R-1 | <rule/decision link>   | <invariant>  | <owner/none> |

Phân biệt policy đã duyệt và proposal. Không chép cả schema/domain book vào feature spec.

## Acceptance Criteria

| ID   | Given / When / Then                            | Test hoặc evidence dự kiến |
| ---- | ---------------------------------------------- | -------------------------- |
| AC-1 | <đầu vào hợp lệ / thao tác / kết quả quan sát> | <unit/integration/UI>      |
| AC-2 | <thiếu quyền / thao tác / từ chối không write> | <HTTP deny test>           |
| AC-3 | <failure/edge / thao tác / dữ liệu nhất quán>  | <regression>               |

## User Flow / UI States

<Entry → chọn/nhập → xác nhận → pending/success; nhánh cancel/error/retry.>
<Loading/empty/error/disabled/stale; focus/keyboard/responsive; dùng components hiện hữu.>

## Edge Cases

<Invalid/missing input, duplicates, concurrent changes, deleted/locked resources, timezone, retry/double submit.>

## API / Compatibility

<Route/method, request/response/error, limits/pagination/idempotency, consumers cũ; link contract chuẩn.>

## Data

<Entities/relations, constraints/units/timezone, transaction, history/delete/retention, migration/backfill.>

## Security

<Authentication, authorization server, object scope, sensitive fields, audit/log redaction, abuse controls.>

## Tests / Traceability

<AC → code boundary → test/evidence. Mock vs runtime/DB integration phải phân biệt.>

## Unknowns / Release

<KNOWN/INFERRED/UNKNOWN/CONFLICTING, owner và bước kiểm chứng.>
<Rollout/rollback nếu cần; metrics/feedback chứng minh outcome; gate còn thiếu.>
