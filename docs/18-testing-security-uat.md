# 18 — Testing, Security và UAT

## Mục tiêu

Kiểm tra chất lượng toàn hệ thống trước khi triển khai.

Đọc trước:

- `.agent/skills/test-case-clean-architecture/SKILL.md`
- `.agent/skills/code-review/SKILL.md`
- Tất cả tài liệu 00–17.

---

## 1. Test pyramid

### Domain unit test

- Entity transitions.
- Quantity invariant.
- TimeRange/overlap.
- Lab status rules.
- Permission-independent business rules.

### Application test

- Use case với in-memory/mock repository.
- Authorization/data scope.
- Audit call.
- UnitOfWork behavior.

### Infrastructure integration test

- SQL repository.
- Migration.
- Transaction.
- RowVersion/concurrency.
- Query performance cơ bản.

### API test

- Route.
- Validation.
- Auth.
- Permission.
- Response format.
- Error mapping.

### Frontend test

- Form validation.
- Route guard.
- Role menu.
- Critical components.
- API error states.

---

## 2. Test case nghiệp vụ bắt buộc

```text
TC-01 Login thành công
TC-02 Login sai và user bị khóa
TC-03 Teacher tạo booking hợp lệ
TC-04 Student bị chặn tạo booking
TC-05 Vượt sức chứa
TC-06 FULL_LAB overlap
TC-07 COMPUTERS_ONLY cộng dồn vượt số máy
TC-08 Thiết bị không đủ
TC-09 Admin approve thành công
TC-10 Hai Admin approve đồng thời
TC-11 Reject thiếu lý do
TC-12 Cancel approved hoàn reservation
TC-13 Check-in booking chưa duyệt
TC-14 Check-in chuyển reserved sang borrowed
TC-15 Check-out bình thường
TC-16 Check-out có thiết bị hỏng
TC-17 Check-out có thiết bị mất
TC-18 Overdue flag
TC-19 Incident workflow
TC-20 Dashboard scope từng role
TC-21 AuditLog được ghi
TC-22 API không lộ dữ liệu bí mật
```

---

## 3. Security checklist

- Helmet.
- CORS whitelist.
- Rate limit login.
- Password hash mạnh.
- JWT secret đủ mạnh.
- Refresh cookie HTTP-only/Secure.
- Refresh token rotation/revocation.
- SQL parameterized queries.
- Zod validation.
- Không lộ stack/SQL.
- File upload whitelist.
- Authorization backend.
- Data scope.
- Không hard-code secret.
- Dependency audit.
- Log redaction.
- CSRF strategy nếu dùng cookie cho state-changing request.
- HTTPS production.
- Backup và restore test.

---

## 4. Code review bắt buộc

Review theo format:

| Vấn đề | Mức độ | File | Gợi ý sửa | Sửa ngay |
|---|---|---|---|---|

Block merge nếu:

- Domain import framework.
- Controller viết SQL.
- Thiếu permission.
- Thiếu transaction.
- Tồn kho có thể âm.
- Booking rule sai.
- Lộ secret.
- Test critical flow thất bại.

---

## 5. UAT theo vai trò

### Admin

- Login.
- Cập nhật LabProfile.
- CRUD tài sản.
- Duyệt/từ chối.
- Xem dashboard/audit.

### Teacher

- Login.
- Xem lịch.
- Check availability.
- Tạo/hủy booking.
- Theo dõi trạng thái.
- Báo sự cố.

### Lab Staff

- Xem lịch hôm nay.
- Check-in.
- Bàn giao.
- Check-out.
- Báo hỏng/mất.

### Collaborator

- Xem tài sản.
- Cập nhật trạng thái theo quyền.
- Xử lý incident được giao.

### Student

- Xem lịch/nội quy.
- Báo sự cố.
- Bị chặn booking.

### Manager

- Xem dashboard/báo cáo.
- Không có thao tác ghi.

---

## 6. Dữ liệu UAT

Tạo seed demo riêng:

- 1 Admin.
- 2 Teacher.
- 1 Collaborator.
- 2 Lab Staff.
- 2 Student.
- 1 Manager.
- 35 Computer với trạng thái đa dạng.
- Nhiều loại thiết bị.
- Booking trong quá khứ, hôm nay, tương lai.
- Incident đa trạng thái.

Không dùng tài khoản/password production.

---

## 7. Definition of Done

Một feature chỉ hoàn thành khi:

- Code đúng kiến trúc.
- Test đạt.
- Lint/typecheck/build đạt.
- Permission đúng.
- Audit đầy đủ.
- Tài liệu API cập nhật.
- UI có loading/error/empty.
- Không có lỗi Critical/Major chưa xử lý.

---

## Tiêu chí hoàn thành bước 18

- Test suite ổn định.
- Security review hoàn thành.
- UAT pass cho luồng chính.
- Có báo cáo lỗi còn lại và mức độ.
- Sẵn sàng triển khai staging.
