# 15 — Check-in và Check-out

## Mục tiêu

Hoàn thiện vòng đời sử dụng phòng và bàn giao/nhận lại thiết bị.

Đọc trước:

- `docs/14-booking-approval-reservation.md`
- `.agent/skills/booking-business-rules/SKILL.md`

---

## 1. Use case

```text
GetTodayOperationalBookingsUseCase
CheckInBookingUseCase
CheckOutBookingUseCase
MarkOverdueBookingsUseCase
```

Permission:

```text
BOOKING_VIEW_ALL
BOOKING_CHECK_IN
BOOKING_CHECK_OUT
EQUIPMENT_HANDOVER
EQUIPMENT_RECEIVE
```

Admin và Lab Staff có quyền.

---

## 2. Check-in

Điều kiện:

- Booking `APPROVED`.
- Chưa có CheckInTime.
- Nằm trong cửa sổ check-in cấu hình.
- Người thao tác có quyền.
- Số người/máy thực tế hợp lệ.
- Thiết bị bàn giao không vượt reserved.

Transaction:

1. Đọc booking + items.
2. Kiểm tra trạng thái/concurrency.
3. Với thiết bị:
   - Reserved giảm.
   - Borrowed tăng.
   - Booking item BorrowedQuantity tăng.
   - tạo inventory transaction.
4. Tạo/cập nhật CheckInOutLog.
5. Chuyển booking `CHECKED_IN`.
6. Ghi AuditLog.
7. Commit.

---

## 3. Check-out

Input phải ghi rõ từng thiết bị:

```json
{
  "roomCondition": "...",
  "computerCondition": "...",
  "equipmentReturns": [
    {
      "equipmentId": "...",
      "goodQuantity": 1,
      "brokenQuantity": 1,
      "lostQuantity": 0,
      "returnCondition": "..."
    }
  ],
  "note": "..."
}
```

Điều kiện:

- Booking `CHECKED_IN`.
- Chưa check-out.
- Tổng good + broken + lost bằng số đang mượn cho item.
- Nếu broken/lost > 0 phải có mô tả sự cố.

Transaction:

- Good: Borrowed giảm, Available tăng.
- Broken: Borrowed giảm, Broken tăng.
- Lost: Borrowed giảm, Lost tăng.
- Tạo IncidentReports cần thiết.
- Cập nhật CheckInOutLog.
- `IsOverdue` theo thời gian.
- `HasIncident` nếu có.
- Chuyển booking `COMPLETED`.
- Ghi AuditLog.
- Commit.

---

## 4. Máy tính

MVP đăng ký theo số lượng, không gán máy cụ thể. Check-in lưu `ActualComputerCount`.

Nếu Ban trực báo máy cụ thể hỏng:

- Tạo Incident liên kết ComputerId.
- Chuyển Computer sang `BROKEN`.
- Ghi AuditLog.

---

## 5. Overdue

Không dùng `OVERDUE` làm trạng thái cuối.

- Job định kỳ hoặc query vận hành đánh dấu `IsOverdue = 1` khi quá giờ và chưa completed.
- Check-out vẫn hoàn tất bình thường.
- Dashboard hiển thị cảnh báo.

---

## 6. API

```text
GET  /api/operations/today
POST /api/bookings/:id/check-in
POST /api/bookings/:id/check-out
POST /api/bookings/mark-overdue
```

Endpoint mark overdue có thể là job nội bộ thay vì public API.

---

## 7. Frontend Lab Staff

Trang:

```text
/lab-staff/today
/lab-staff/bookings/:id/check-in
/lab-staff/bookings/:id/check-out
```

Hiển thị:

- Sắp đến giờ.
- Đang sử dụng.
- Quá giờ.
- Đã hoàn tất.
- Dialog bàn giao/nhận.
- Cảnh báo thiết bị thiếu/hỏng.
- Confirm trước khi commit.

---

## 8. Test

- Check-in approved.
- Check-in pending.
- Check-in hai lần.
- Chuyển reserved → borrowed.
- Check-out good.
- Check-out broken/lost.
- Tổng trả sai.
- Overdue flag.
- Transaction rollback.
- Concurrent action.
- Permission/UI.

---

## Tiêu chí hoàn thành bước 15

- Toàn bộ vòng đời booking chạy.
- Tồn kho đúng.
- Sự cố được tạo trong cùng transaction.
- Không check-in/out lặp.
- UI vận hành rõ ràng.
