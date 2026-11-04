# Agent task checklist

Dùng checklist theo rủi ro, không tạo thêm file cho task nhỏ. Mục không liên quan ghi N/A; không tick việc chưa làm.

## UNDERSTAND

- [ ] Yêu cầu hiện tại là explain/diagnose/audit hay implement? Quyền sửa khác nhau.
- [ ] Outcome, acceptance criteria, scope/non-goals và chỉ dẫn áp dụng rõ.
- [ ] Unknown/conflicting rules có owner/bước kiểm chứng; không invent nghiệp vụ.

## LOCATE

- [ ] Xem worktree; phân biệt thay đổi người dùng và task này.
- [ ] Đọc knowledge/skill liên quan, trace entry → logic → data → consumer/test.
- [ ] Kiểm commands/tool/target thật; không suy từ folder hay docs lịch sử.

## PLAN

- [ ] Mức kế hoạch tương xứng: vài bước hoặc plan file nếu cross-module/rủi ro.
- [ ] Impact tới DB/API/UI/security/integration/docs, compatibility và rollback được xét.
- [ ] Authority/target cho external/destructive action rõ trước thao tác.

## IMPLEMENT

- [ ] Thay đổi nhỏ đáp ứng AC, giữ convention/invariants đã duyệt.
- [ ] Không refactor/đổi framework/business rules ngoài scope.
- [ ] Không ghi secret, mất data/history hoặc bỏ kiểm quyền server.

## TEST

- [ ] Happy, negative/permission, edge/retry/partial failure theo rủi ro.
- [ ] DB concurrency/rollback có kiểm chứng đúng lớp nếu liên quan.
- [ ] UI thực tế/focus/viewport nếu đổi UI và môi trường cho phép.
- [ ] Ghi command/target/result; PASS, FAIL, NOT_RUN, BLOCKED rõ ràng.

## REVIEW

- [ ] Diff chỉ trong scope; không xóa test để xanh CI.
- [ ] Business rules, data scope, compatibility và privacy giữ đúng.
- [ ] Code complete/feature complete/merge ready/release ready không bị nhập làm một.

## DOCUMENT

- [ ] Cập nhật nguồn canonical được phép; không chép rule sang nhiều file.
- [ ] Handoff có kết quả, file, evidence, unknown/risk và phần cố ý không đổi.
- [ ] Commit/push/deploy chỉ khi được yêu cầu hoặc được ủy quyền rõ.
- [ ] Nếu thiếu gate bắt buộc: nêu blocker, không báo hoàn thành giả.
