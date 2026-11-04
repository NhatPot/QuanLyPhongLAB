# Project inception checklist

Mẫu cho dự án mới. Dự án đang chạy: đối chiếu hiện trạng, không scaffold lại. Chọn tier theo playbook V2; không cần làm toàn bộ ADVANCED để bắt đầu.

## ESSENTIAL — tối thiểu

- [ ] Vấn đề, người dùng và outcome có thể quan sát đã rõ.
- [ ] Scope MVP và non-goals rõ; có owner quyết định nghiệp vụ.
- [ ] Một luồng chính, một lỗi quan trọng và acceptance criteria.
- [ ] Actors, quyền, data scope và dữ liệu nhạy cảm được nhận diện.
- [ ] Các invariant/state quan trọng được chốt hoặc ghi NEEDS_CONFIRMATION.
- [ ] Ràng buộc hosting/DB/integrations/năng lực đội đã biết; không chọn kiến trúc vì tên gọi.
- [ ] Stack/phương án nhỏ nhất phù hợp; chưa cần repository/DDD/service tách riêng nếu không có lý do.
- [ ] README có setup/commands thực chạy; config example không chứa secret thật.
- [ ] Git ignore chỉ artifacts/secrets/local state; không vô tình bỏ knowledge cần chia sẻ.
- [ ] Một vertical slice chạy được, có kiểm chứng và deny/failure case phù hợp.
- [ ] Nếu có DB: migrations, constraints, test target an toàn và cách phục hồi.
- [ ] Không dùng production để test/reset/seed demo.
- [ ] Cách chạy và bàn giao tối thiểu; unknowns không bị giả thành facts.

## RECOMMENDED — khi nhiều người dùng hoặc bảo trì dài hơn

- [ ] Knowledge index có owner/status và links; architecture as-built ngắn.
- [ ] Agent entry point ngắn, discovery theo công cụ được xác nhận.
- [ ] Ma trận role-action-scope và domain glossary/invariants.
- [ ] API contracts/consumer compatibility, error handling, validation đang thực thi.
- [ ] Typecheck/lint/test/build commands nếu stack hỗ trợ; CI cho gates thật.
- [ ] Critical integration tests, đặc biệt auth/DB/concurrency.
- [ ] UI states, accessibility, responsive và smoke theo vai trò.
- [ ] Threat review, secret lifecycle, logs redaction/retention.
- [ ] Deployment/rollback, backup/restore, health/logs có người chịu trách nhiệm.
- [ ] ADR chỉ cho quyết định lớn; kế hoạch cho task cross-module.
- [ ] Skill chỉ cho workflow lặp; không tự cài hàng loạt skill.

## ADVANCED — cần business case hoặc yêu cầu tổ chức

- [ ] SLO/RPO/RTO đã thống nhất và đo được, không tự đặt số.
- [ ] Load/chaos/DR tests, multi-region nếu nhu cầu phục hồi yêu cầu.
- [ ] Compliance/privacy review, evidence retention, separation of duties theo chính sách.
- [ ] API version/deprecation hỗ trợ nhiều external consumers.
- [ ] Security scanning/observability sâu và người xử lý cảnh báo.
- [ ] Service boundaries độc lập khi scale/ownership/release chứng minh cần.
- [ ] Kiểm toán/lifecycle knowledge tự động nếu maintenance cost hợp lý.

## Chốt trước khi bắt đầu

Tier: <...> · Owner: <...> · Critical unknowns: <...>.
Mục bỏ qua/N/A và lý do: <...>.
Lát cắt đầu tiên và bằng chứng hoàn tất: <...>.
