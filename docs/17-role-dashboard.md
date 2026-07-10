# 17 — Dashboard theo vai trò

## Mục tiêu

Xây dashboard dùng dữ liệu thật, phù hợp từng vai trò và bám bố cục ảnh nguồn.

Đọc trước:

- `docs/08-frontend-shell-login-role-layout.md`
- `docs/13-create-booking-and-calendar.md`
- `docs/15-checkin-checkout.md`
- `docs/16-incident-management.md`

---

## 1. Nguyên tắc

- Dashboard là read model/query, không chứa nghiệp vụ ghi.
- Tính toán ở backend/SQL query service.
- Frontend chỉ hiển thị.
- Tôn trọng permission và data scope.
- Query được index.
- Có khoảng thời gian mặc định rõ.
- Múi giờ Asia/Ho_Chi_Minh.

---

## 2. Admin dashboard

Chỉ số:

- Trạng thái phòng.
- Booking chờ duyệt.
- Booking hôm nay.
- Booking đang sử dụng.
- Booking quá giờ.
- Tổng máy.
- Máy ACTIVE/BROKEN/MAINTENANCE.
- Tổng thiết bị.
- Available/Reserved/Borrowed/Broken.
- Sự cố chưa xử lý.
- Lịch hôm nay.

Biểu đồ MVP:

- Booking theo ngày trong 7/30 ngày.
- Trạng thái máy tính.
- Tình trạng thiết bị.
- Sự cố theo mức độ.

---

## 3. Teacher dashboard

- Booking sắp tới của tôi.
- Booking PENDING.
- Booking bị từ chối gần đây.
- Thiết bị đang mượn.
- Nút tạo booking.
- Calendar rút gọn.

Chỉ dữ liệu `OWN`.

---

## 4. Lab Staff dashboard

- Ca/ngày hiện tại.
- Booking sắp check-in.
- Booking đang sử dụng.
- Booking quá giờ.
- Thiết bị cần bàn giao/nhận.
- Sự cố cần chú ý.
- Máy hỏng.

---

## 5. Collaborator dashboard

- Sự cố được giao.
- Máy BROKEN/MAINTENANCE.
- Thiết bị cần kiểm tra.
- Công việc gần đây.

---

## 6. Student dashboard

- Trạng thái phòng.
- Lịch công khai.
- Nội quy.
- Sự cố đã báo.
- Không có nút tạo booking trong MVP.

---

## 7. Manager dashboard

Read-only:

- Tỷ lệ sử dụng.
- Booking theo tháng.
- Tài sản hoạt động/hỏng.
- Sự cố theo mức độ/trạng thái.
- Xu hướng sử dụng.
- Không có nút ghi dữ liệu.

---

## 8. API

Có thể tách:

```text
GET /api/dashboard/admin
GET /api/dashboard/teacher
GET /api/dashboard/operations
GET /api/dashboard/student
GET /api/dashboard/manager
```

Hoặc một endpoint theo current user. Chọn phương án rõ và test permission.

---

## 9. UI

Bám ảnh nguồn:

- Hàng stat cards.
- Khu biểu đồ.
- Bảng/lịch hôm nay.
- Sidebar navy.
- Badge màu.
- Skeleton khi tải.
- Empty state.
- Responsive.

Không vẽ chart nếu dữ liệu rỗng; hiển thị empty state.

---

## 10. Hiệu năng

- Query aggregate riêng.
- Không N+1.
- Index theo tài liệu 04.
- Có cache ngắn nếu cần, nhưng không tối ưu sớm.
- Giới hạn date range.
- Test query bằng dữ liệu mẫu đủ lớn.

---

## 11. Test

- Mỗi role nhận đúng schema.
- Không lộ dữ liệu role khác.
- Chỉ số khớp dữ liệu seed.
- Timezone/day boundary.
- Empty state.
- API/UI.
- Manager read-only.

---

## Tiêu chí hoàn thành bước 17

- Dashboard cho 6 role.
- Dữ liệu thật.
- Scope đúng.
- UI bám nguồn.
- Query đủ nhanh với dữ liệu test.
