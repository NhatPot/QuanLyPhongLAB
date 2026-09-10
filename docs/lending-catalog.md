# Danh sách máy và thiết bị cho mượn

## Cách sử dụng

1. Vào **Đăng ký sử dụng → Máy & thiết bị có thể mượn**.
2. Chọn giờ bắt đầu/kết thúc, bấm **Xem khả dụng**. Nút **Từ 5 phút nữa** đặt khung giờ sắp tới, không tự tạo hay duyệt yêu cầu.
3. Chọn số lượng rồi bấm **Đăng ký máy** hoặc **Đăng ký mượn**. Form sẽ nhận sẵn thiết bị, số lượng và thời gian.
4. Điền mục đích và gửi. Yêu cầu vẫn ở trạng thái **PENDING**, không đồng nghĩa đã được nhận thiết bị.

Máy tính đăng ký theo **số lượng**, phân máy cụ thể lúc check-in. Không đặt một máy có mã cụ thể và không mang máy ra ngoài.

Số lượng hiển thị trừ các lịch đã duyệt/đang sử dụng trùng khoảng giờ, loại trừ hỏng, bảo trì, thất lạc và thiết bị bị khóa. Lịch đang sử dụng nhưng chưa trả vẫn chiếm số lượng; không giả định sẽ trả đúng giờ. Máy/thiết bị hiện chưa sẵn sàng không được hứa khả dụng trong tương lai. Đây là chính sách bảo thủ, có thể đặt thêm sau khi tài sản được trả hoặc sửa xong.

## Thiết bị nội bộ

Vào **Thiết bị → Sửa → Cho phép mượn thiết bị**:

- Bật: thiết bị xuất hiện trong danh sách mượn nếu đang ACTIVE. Số lượng 0 vẫn hiển thị nhưng không cho chọn.
- Tắt: nội bộ Lab, ẩn với người mượn và không thể đăng ký, duyệt hoặc bàn giao để mượn.
- Mặc định **tắt** cho thiết bị cũ chưa phân loại, thiết bị thêm mới và thiết bị nhập CSV/Excel. Không tự bật thiết bị dựa trên tên hoặc danh mục.

Không xóa thiết bị, số lượng hay lịch sử cũ. Nếu có yêu cầu đang chờ/đã duyệt từ trước, cần xác nhận thiết bị được cho mượn trước khi duyệt hoặc bàn giao tiếp.

Sinh viên và giảng viên không thấy tài sản nội bộ qua danh sách, chi tiết theo ID, danh mục không có thiết bị cho mượn, lịch sử kho hoặc danh sách chọn thiết bị báo sự cố. Gửi ID nội bộ trực tiếp để đăng ký/báo sự cố cũng bị từ chối. Lịch sử yêu cầu/sự cố hợp lệ trước đây vẫn được giữ, không xóa hồi tố.

Tài khoản có vai trò ADMIN, MANAGER, LAB_STAFF hoặc COLLABORATOR là nhân sự quản lý/vận hành, có thể thấy nội bộ nếu có quyền truy cập chức năng tương ứng. Tài khoản gán cả STUDENT/TEACHER **và** vai trò vận hành được xét theo vai trò vận hành; không gán vai trò cao cho tài khoản chỉ dùng để mượn.

## Phân quyền

Migration bổ sung BOOKING_CREATE, BOOKING_VIEW_OWN và BOOKING_CANCEL_OWN cho sáu vai trò hiện có. Không bổ sung quyền duyệt, giao nhận, sửa tài sản hoặc đăng ký thay người khác. Cấu hình quyền khác của trung tâm được giữ nguyên. Đăng xuất/đăng nhập lại sau khi áp dụng để nhận quyền mới.

## Cập nhật database

Migration: `database/migrations/029_EquipmentLending.sql`.

Nếu tài khoản ứng dụng không có quyền ALTER, mở **database/scripts/enable-equipment-lending.sql** bằng SSMS, kiểm tra database đích `ItLabManagerDb`, rồi Execute bằng tài khoản quản trị database. Script này chạy độc lập, có transaction và ghi nhận migration, không chạy các migration khác đang chờ. Không cấp sysadmin cho tài khoản ứng dụng chỉ để chạy tính năng.

Không chạy nguyên file migration có cả phần DOWN trong SSMS. Script `enable-equipment-lending.sql` là bản dành cho thao tác Execute toàn bộ.

## API và kiểm tra

`GET /api/bookings/catalog?startTime=<ISO>&endTime=<ISO>&keyword=<text>&page=1`

Yêu cầu đăng nhập và BOOKING_CREATE. Trả danh sách cho mượn phân trang 50 dòng, tên danh mục, số lượng còn theo lịch, số máy đáp ứng và trạng thái nhận đăng ký của Lab; không trả ghi chú nội bộ, người quản lý, lịch của người khác hoặc cấu hình mạng máy tính.

`POST /api/bookings` giữ luồng cũ. API kiểm tra lại quyền, người đăng ký, thời gian, số lượng và chế độ cho mượn. Duyệt lịch được tuần tự hóa bằng khóa giao dịch để hai lượt duyệt không cùng lấy một phần khả dụng.

Kiểm thử tự động không ghi dữ liệu thật:

```powershell
npx vitest run --pool=threads --maxWorkers=1 src/server/application/use-cases/booking/lending.test.ts
npm run typecheck
```
