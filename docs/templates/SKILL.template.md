---
name: replace-with-workflow-name
description: "TEMPLATE: thay bằng khả năng cụ thể và tình huống kích hoạt; không kích hoạt mẫu này như skill thật."
---

# <Workflow name>

Mẫu tham khảo, chưa cài đặt. Chỉ dùng khi workflow lặp và có giá trị hơn một checklist trong task. Điền metadata theo công cụ đích; không tạo scripts/references/agents metadata nếu chưa cần.

## Purpose

<Kết quả workflow tạo ra và rủi ro/lỗi thường gặp mà nó giúp tránh.>

## When to Use

- Dùng khi: <trigger hẹp, ví dụ yêu cầu thực tế>.
- Không dùng khi: <task dễ bị match nhầm>.
- Mode nếu có: <simple/advanced, điều kiện chọn>; bỏ mục nếu chỉ một workflow.

## Inputs

- <Task, target files/environment, approved rules/contract>.
- <Evidence hiện trạng, acceptance criteria>.
- Không yêu cầu gửi secret qua chat; dùng cơ chế cấu hình an toàn của dự án.

## Preconditions

- <Chỉ dẫn áp dụng và scope/authority đã xác nhận>.
- <Tool/dependency/test target thực sự có sẵn>.
- Thiếu dữ liệu quyết định: đánh dấu UNKNOWN/NEEDS_CONFIRMATION và hỏi đúng phần; vẫn làm phần độc lập.
- Thao tác destructive/external cần kiểm tra target và quyền ngay trước thực thi.

## Workflow

1. Locate: <entry point, references cần đọc, điều kiện lựa chọn>.
2. Inspect: <invariant/contract cần xác minh, không sao chép business rules vào đây>.
3. Decide: <trade-offs/unknowns, điểm phải xin chốt>.
4. Execute: <các bước đặc thù workflow và giới hạn thay đổi>.
5. Verify: <kiểm tra hành vi/failure/side effects>.
6. Handoff: <artifact/evidence/remaining risks>.

Failure/retry: <lỗi nào retry an toàn, idempotency, số lần/điều kiện dừng phù hợp>. Không retry mutation mù khi không biết lần trước đã thành công chưa.

## Output

<File/report/diff cụ thể; format tối thiểu; không tạo hàng loạt artifacts ngoài yêu cầu.>

## Validation

- <Command hoặc behavioral check đã xác minh, target an toàn>.
- <Ca hợp lệ, deny/edge, tác động dữ liệu nếu có>.
- <Cách kiểm artifacts/links; nếu script mới thì phải thử script>.
- Phân biệt PASS/FAIL/NOT_RUN/BLOCKED và giới hạn của mock/static checks.

## Do Not

- Không suy diễn quyền từ việc được yêu cầu “làm xong”.
- Không tự đổi business rules, framework hay data ngoài scope.
- Không chép secrets/log nhạy cảm vào output.
- Không nạp mọi reference nếu không áp dụng; không biến skill thành sách toàn dự án.
- Không coi ví dụ là policy của mọi dự án.

## Done When

<Outcome đạt + evidence đủ + constraints giữ + phần chưa kiểm tra được nêu rõ.>

## References

| Reference thực có | Khi đọc     | Nguồn chuẩn / owner |
| ----------------- | ----------- | ------------------- |
| <relative-path>   | <điều kiện> | <owner/status>      |

Xóa phần References nếu skill ngắn và tự đủ. Không tạo link tới file chưa tồn tại trong skill được kích hoạt.

## Maintenance / forward checks

Owner: <role> · Status: DRAFT/ACTIVE/SUPERSEDED · Reviewed: <date/baseline>.

Thử một yêu cầu đúng trigger, một ngoài scope và một thiếu điều kiện. Review hành vi có đúng scope không, không chỉ kiểm YAML. Gộp/sửa trigger khi chồng lấn; retire khi workflow không còn dùng. Đây là template nên placeholder là chủ ý, không phải skill đã validate/cài đặt.
