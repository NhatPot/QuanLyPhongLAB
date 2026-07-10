# 13 — Create Booking, My Bookings và Calendar

## Mục tiêu

Xây luồng tạo booking, xem chi tiết, danh sách của tôi, hủy booking và calendar.

Đọc trước:

- `docs/12-check-availability-use-case.md`
- `.agent/skills/booking-business-rules/SKILL.md`
- `.agent/skills/test-case-clean-architecture/SKILL.md`

---

## 1. Domain BookingRequest

Thuộc tính theo migration.

Hành vi:

```text
submit()
cancelByRequester(...)
approve(...)
reject(...)
checkIn(...)
complete(...)
markOverdue()
markIncident()
```

State transition:

```text
DRAFT → PENDING
PENDING → APPROVED | REJECTED | CANCELLED
APPROVED → CHECKED_IN | CANCELLED
CHECKED_IN → COMPLETED
```

Không cho transition khác.

---

## 2. Use case

```text
CreateBookingUseCase
GetBookingUseCase
GetMyBookingsUseCase
GetBookingCalendarUseCase
CancelBookingUseCase
```

### CreateBookingUseCase

1. Kiểm tra user có `BOOKING_CREATE`.
2. Requester là user hiện tại, không nhận RequesterId từ client thường.
3. Validate loại booking.
4. Gọi CheckAvailability.
5. Tạo RequestCode.
6. Tạo BookingRequest `PENDING`.
7. Tạo BookingEquipmentItems.
8. Lưu trong transaction.
9. Ghi AuditLog.
10. Không reserve thiết bị ở trạng thái PENDING.

### CancelBookingUseCase

- Teacher chỉ hủy booking của mình ở `PENDING`.
- Admin có thể hủy `PENDING` hoặc `APPROVED`.
- Booking approved phải giải phóng reservation trong transaction.
- Bắt buộc lý do khi Admin hủy approved.
- Ghi AuditLog.

---

## 3. API

```text
POST /api/bookings
GET  /api/bookings/:id
GET  /api/bookings/my-bookings
GET  /api/bookings/calendar
POST /api/bookings/:id/cancel
```

Query list:

```text
status
bookingType
from
to
page
pageSize
```

Data scope:

- Teacher: booking của mình.
- Admin: tất cả.
- Lab Staff: booking cần vận hành.
- Student: chỉ dữ liệu calendar công khai.
- Manager: read-only aggregate/calendar.

---

## 4. Calendar privacy

Calendar công khai chỉ trả:

- Mã hiển thị hoặc tiêu đề chung.
- Start/end.
- Booking type.
- Status phù hợp.
- Không trả email/số điện thoại.
- Có thể hiển thị mục đích rút gọn nếu chính sách cho phép.

Admin/Lab Staff được xem chi tiết hơn.

---

## 5. Frontend form

Trang:

```text
/teacher/bookings/new
```

Các bước:

1. Chọn loại booking.
2. Chọn thời gian.
3. Nhập số người.
4. Nhập số máy.
5. Chọn thiết bị.
6. Kiểm tra khả dụng.
7. Nhập mục đích và ghi chú.
8. Xác nhận và gửi.

Không có trường chọn phòng.

---

## 6. Frontend list/calendar

```text
/teacher/bookings
/calendar
```

- List có filter.
- Calendar ngày/tuần/tháng.
- Badge màu trạng thái.
- Click event mở drawer/modal chi tiết theo permission.
- Hủy booking có confirm.

---

## 7. Audit

```text
BOOKING_CREATED
BOOKING_CANCELLED
```

---

## 8. Test

- Booking hợp lệ.
- Vượt sức chứa.
- Trùng FULL_LAB.
- Vượt máy cộng dồn.
- Thiết bị thiếu.
- Student bị 403.
- Requester spoof bị bỏ qua.
- Hủy own pending.
- Không hủy checked-in.
- Privacy calendar.
- API/UI.

---

## Tiêu chí hoàn thành bước 13

- Teacher tạo booking được.
- Booking mới PENDING.
- My bookings/calendar hoạt động.
- Permission/scope đúng.
- Không reserve thiết bị sớm.
- Test nghiệp vụ đạt.
