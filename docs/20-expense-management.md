# Module chi phí phòng Lab

## Mục tiêu

Module `/expenses` là sổ chi phí tập trung của phòng Lab, tách:

- `CAPEX`: mua sắm tài sản sử dụng lâu dài.
- `OPEX`: chi phí vận hành, bảo trì, dịch vụ và vật tư tiêu hao.

Các phiếu đã duyệt hoặc đã thanh toán mới được cộng vào báo cáo tài chính.

## Vòng đời

`DRAFT -> SUBMITTED -> APPROVED -> PAID`

Nhánh phụ:

- `SUBMITTED -> REJECTED -> DRAFT` sau khi chỉnh sửa.
- `DRAFT | SUBMITTED | APPROVED | REJECTED -> CANCELLED`.
- Phiếu `PAID` không được sửa hoặc hủy trực tiếp.

## Liên kết nghiệp vụ

- Khi hoàn tất bảo trì có `ActualCost > 0`, hệ thống tự tạo đúng một phiếu `APPROVED` chưa thanh toán với `SourceType=MAINTENANCE`.
- Phiếu thuộc danh mục `EQUIPMENT_PURCHASE` có thể ghi tăng tồn kho khi xác nhận thanh toán.
- Dòng mua thiết bị phải liên kết `TargetType=EQUIPMENT`, có số lượng nguyên và thiết bị đã tồn tại.
- Ghi tăng tồn kho, giao dịch tồn kho, cập nhật phiếu chi và audit log được thực hiện trong cùng transaction.

## API

- `GET /api/expenses`, `/summary`, `/options`, `/:id`
- `POST /api/expenses`
- `PUT /api/expenses/:id`
- `POST /api/expenses/:id/submit|approve|reject|mark-paid|cancel`
- `DELETE /api/expenses/:id`
- `GET|POST /api/expenses/categories`
- `PUT /api/expenses/categories/:id`

## Phân quyền

- `EXPENSE_VIEW`
- `EXPENSE_CREATE`
- `EXPENSE_UPDATE`
- `EXPENSE_SUBMIT`
- `EXPENSE_APPROVE`
- `EXPENSE_MARK_PAID`
- `EXPENSE_CANCEL`
- `EXPENSE_DELETE`
- `EXPENSE_EXPORT`
- `EXPENSE_CATEGORY_MANAGE`

## Cài đặt database

Chạy:

```powershell
npm run db:migrate
```

Tài khoản trong `backend/.env` phải có quyền tạo bảng và chỉ mục, tạo ràng buộc, đồng thời được `SELECT/INSERT/UPDATE/DELETE` trên các bảng nghiệp vụ liên quan.

Nếu nhận lỗi:

```text
CREATE TABLE permission denied in database 'ItLabManagerDb'
```

DBA cần chạy migration `024_CreateLabExpenses.sql` bằng tài khoản có quyền DDL, hoặc tạm cấp quyền phù hợp rồi thu hồi sau khi migration hoàn tất. Migration runner thực thi từng migration trong transaction.

## Kiểm thử

```powershell
npm run typecheck
npm run test
npm run build
```

Chế độ mock đã có dữ liệu mẫu và hỗ trợ đủ vòng đời nháp, gửi duyệt, duyệt, thanh toán, hủy, danh mục và chi phí tự sinh từ bảo trì.
