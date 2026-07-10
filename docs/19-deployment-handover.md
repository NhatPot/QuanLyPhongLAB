# 19 — Deployment và bàn giao

## Mục tiêu

Đóng gói, triển khai staging/production, cấu hình SQL Server, backup, monitoring và tài liệu bàn giao.

Đọc trước:

- `docs/18-testing-security-uat.md`
- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`

---

## 1. Môi trường

Tách:

```text
development
test
staging
production
```

Mỗi môi trường có:

- Database riêng.
- Secret riêng.
- Log level riêng.
- CORS config riêng.
- URL frontend/backend riêng.

Không dùng `.env` development cho production.

---

## 2. Build

Backend:

```text
npm run build --workspace backend
```

Frontend:

```text
npm run build --workspace frontend
```

Yêu cầu:

- Build reproducible.
- Không bundle secret vào frontend.
- Source map production được quản lý phù hợp.
- Có version/commit hash.

---

## 3. Container hóa

Tạo Dockerfile:

```text
backend/Dockerfile
frontend/Dockerfile
```

Yêu cầu:

- Multi-stage build.
- Chạy non-root nếu có thể.
- Image nhỏ.
- Healthcheck.
- Không copy `.env`.
- Không chạy migration nguy hiểm tự động mà không kiểm soát.

Có compose cho staging local:

```text
SQL Server
Backend
Frontend
```

---

## 4. Migration production

Quy trình:

1. Backup database.
2. Chạy migration dry-run/staging.
3. Kiểm tra phiên bản.
4. Chạy migration production.
5. Verify schema.
6. Có kế hoạch rollback.
7. Không chạy `db:reset`.

Seed production chỉ seed role/permission và Admin theo quy trình bảo mật; không seed dữ liệu demo.

---

## 5. SQL Server

- Tài khoản ứng dụng có quyền tối thiểu.
- Không dùng `sa` cho ứng dụng.
- Encrypt connection nếu môi trường hỗ trợ.
- Connection pool.
- Timeout.
- Index.
- Backup full/differential/log phù hợp.
- Kiểm tra restore định kỳ.
- Theo dõi dung lượng.

---

## 6. Reverse proxy và HTTPS

Dùng IIS, Nginx hoặc nền tảng phù hợp.

Yêu cầu:

- HTTPS.
- Redirect HTTP → HTTPS.
- Security headers.
- Giới hạn body/upload.
- Proxy timeout hợp lý.
- Static cache cho frontend.
- Không cache response auth nhạy cảm.

---

## 7. Monitoring và logging

- Structured logs.
- Correlation ID.
- Error tracking nếu có.
- Health endpoint.
- Readiness check database.
- Cảnh báo lỗi 5xx.
- Cảnh báo database unavailable.
- Log retention.
- Không log secret.

---

## 8. Tài liệu bàn giao

Tạo:

```text
README.md
docs/operations/installation.md
docs/operations/environment-variables.md
docs/operations/database-backup-restore.md
docs/operations/deployment.md
docs/operations/troubleshooting.md
docs/user-guides/admin.md
docs/user-guides/teacher.md
docs/user-guides/lab-staff.md
docs/user-guides/collaborator.md
docs/user-guides/student.md
docs/user-guides/manager.md
```

---

## 9. Checklist bàn giao

- Source code.
- Database migration.
- Seed an toàn.
- Tài khoản Admin bàn giao qua kênh riêng.
- Sơ đồ kiến trúc.
- ERD.
- API docs.
- Hướng dẫn vận hành.
- Backup/restore.
- Danh sách secret và chủ sở hữu.
- Danh sách issue còn lại.
- Kế hoạch hỗ trợ.

---

## 10. Smoke test production

- Login.
- `/auth/me`.
- Xem LabProfile.
- Xem lịch.
- Teacher tạo booking test.
- Admin approve.
- Lab Staff check-in/out.
- Incident.
- Dashboard.
- Audit.
- Logout/refresh.
- Backup job.

Xóa dữ liệu smoke test hoặc đánh dấu rõ.

---

## 11. Tiêu chí hoàn thành toàn dự án MVP

Luồng sau chạy end-to-end:

```text
Teacher login
→ calendar
→ availability
→ create booking
→ Admin approve
→ equipment reserved
→ Lab Staff check-in
→ reserved chuyển borrowed
→ Lab Staff check-out
→ thiết bị về kho hoặc incident
→ booking completed
→ dashboard cập nhật
→ AuditLog đầy đủ
```

Tất cả Critical/Major issue phải được xử lý hoặc có xác nhận chấp nhận rủi ro.

---

## Kết quả báo cáo cuối cùng

Antigravity phải cung cấp:

1. Phiên bản triển khai.
2. URL staging/production.
3. Kết quả migration.
4. Kết quả test.
5. Kết quả smoke test.
6. Cách rollback.
7. Lỗi còn lại.
8. Tài liệu bàn giao.
