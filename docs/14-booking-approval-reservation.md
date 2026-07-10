# 14 — Booking Approval, Rejection và Reservation

## Mục tiêu

Xây quy trình Admin duyệt/từ chối booking và giữ tài nguyên thiết bị an toàn trong transaction.

Đọc trước:

- `docs/11-crud-equipment.md`
- `docs/12-check-availability-use-case.md`
- `docs/13-create-booking-and-calendar.md`

---

## 1. Use case

```text
ListPendingBookingsUseCase
ApproveBookingUseCase
RejectBookingUseCase
AdminCancelApprovedBookingUseCase
```

Permission:

```text
BOOKING_VIEW_ALL
BOOKING_APPROVE
BOOKING_REJECT
BOOKING_CANCEL_ANY
```

MVP chỉ Admin được gán approve/reject.

---

## 2. ApproveBookingUseCase

Luồng bắt buộc:

1. Bắt đầu transaction.
2. Đọc booking kèm lock/concurrency token.
3. Kiểm tra `PENDING`.
4. Gọi lại CheckAvailability tại thời điểm duyệt.
5. Kiểm tra tài nguyên bằng dữ liệu mới nhất.
6. Với từng thiết bị:
   - `AvailableQuantity -= requested`.
   - `ReservedQuantity += requested`.
   - cập nhật BookingEquipmentItem.ReservedQuantity.
   - tạo EquipmentInventoryTransaction.
7. Chuyển booking `APPROVED`.
8. Ghi ApprovedBy/ApprovedAt.
9. Ghi AuditLog.
10. Commit.
11. Rollback toàn bộ nếu bất kỳ bước nào lỗi.

Không tăng BorrowedQuantity ở bước duyệt.

---

## 3. Chống duyệt đồng thời

Dùng một hoặc kết hợp:

- SQL transaction.
- Lock phù hợp.
- `RowVersion`.
- Update có điều kiện `AvailableQuantity >= requested`.
- Kiểm tra affected rows.

Không cho kho âm hoặc hai Admin duyệt cùng booking.

---

## 4. RejectBookingUseCase

- Booking phải `PENDING`.
- Lý do bắt buộc.
- Chuyển `REJECTED`.
- Không đổi tồn kho.
- Ghi AuditLog.
- Không để client sửa RejectedReason sau đó.

---

## 5. Admin cancel approved

Trong transaction:

1. Kiểm tra `APPROVED`.
2. Hoàn trả:
   - Reserved giảm.
   - Available tăng.
3. Reset reserved item.
4. Chuyển `CANCELLED`.
5. Lưu lý do.
6. Ghi inventory transaction.
7. Ghi AuditLog.

Không hủy booking đang `CHECKED_IN` bằng use case này.

---

## 6. API

```text
GET  /api/bookings/pending
POST /api/bookings/:id/approve
POST /api/bookings/:id/reject
POST /api/bookings/:id/admin-cancel
```

---

## 7. Frontend Admin

Trang:

```text
/admin/bookings
/admin/bookings/:id
```

Hiển thị:

- Người đăng ký.
- Thời gian.
- Mục đích.
- Số người/máy.
- Thiết bị.
- Kết quả kiểm tra khả dụng hiện tại.
- Lịch xung quanh.
- Nút Approve/Reject.
- Reject dialog bắt buộc lý do.
- Warning nếu dữ liệu đã thay đổi.

---

## 8. Audit

```text
BOOKING_APPROVED
BOOKING_REJECTED
BOOKING_ADMIN_CANCELLED
EQUIPMENT_RESERVED
EQUIPMENT_RESERVATION_RELEASED
```

---

## 9. Test bắt buộc

- Approve hợp lệ.
- Approve booking không PENDING.
- Recheck phát hiện conflict mới.
- Thiết bị không còn đủ.
- Hai request approve đồng thời.
- Reject thiếu lý do.
- Admin cancel hoàn reservation.
- Rollback khi audit/inventory update lỗi.
- Permission.
- UI.

---

## Tiêu chí hoàn thành bước 14

- Duyệt/từ chối hoạt động.
- Reservation đúng.
- Không âm kho.
- Concurrency được kiểm soát.
- Audit đầy đủ.
- Admin UI sử dụng dữ liệu thật.
