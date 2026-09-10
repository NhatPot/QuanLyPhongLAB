# Danh sách máy và thiết bị cho mượn

## Cách sử dụng

1. Vào **Đăng ký sử dụng → Chọn máy & thiết bị**.
2. Chọn giờ bắt đầu/kết thúc, bấm **Xem khả dụng**. Nút **Từ 5 phút nữa** đặt khung giờ sắp tới, không tự tạo hay duyệt yêu cầu.
3. Chọn từng thẻ máy và tăng/nhập số lượng thiết bị. Có tìm kiếm, lọc trạng thái máy, sắp xếp và khung tóm tắt để bỏ từng lựa chọn. Có thể mượn nhiều loại thiết bị cùng máy tính hoặc chỉ mượn thiết bị.
4. Bấm **Tiếp tục đăng ký**. Form nhận sẵn mã máy, thiết bị, số lượng và thời gian; người dùng kiểm tra lại, điền mục đích rồi gửi. Đổi thời gian trong danh sách cần bấm **Xem khả dụng** và chọn lại tài sản.
5. Yêu cầu vẫn ở trạng thái **PENDING**, không đồng nghĩa đã được nhận thiết bị.

Máy tính được chọn **theo từng mã máy**. Danh sách hiển thị mã, tên, vị trí và khả dụng theo khung giờ đã chọn. Chỉ lịch được duyệt mới giữ máy; nhiều yêu cầu chờ có thể cùng chọn một máy nhưng hệ thống kiểm tra lại khi duyệt để tránh cấp trùng.

Nhân viên vào **Lịch phòng Lab → Check-in** để bàn giao đúng các mã đã đăng ký. Có thể nhận từ 15 phút trước giờ bắt đầu đến trước giờ kết thúc, nếu không chiếm phiên khác. Phải ghi tình trạng máy/phụ kiện lúc nhận và trả. Phiên chưa check-out vẫn giữ máy kể cả quá giờ hoặc mất tín hiệu phần mềm giám sát.

Để tra cứu: **Máy tính → bấm vào máy → Lịch sử đăng ký & bàn giao máy**. Nhân sự quản lý có quyền xem máy được xem người đứng tên, tài khoản/email tại thời điểm đăng ký, mã máy, giờ dự kiến/thực tế và tình trạng nhận/trả. Với phiếu nhiều máy, người đứng tên đại diện nhận cả danh sách; tính năng chưa định danh từng thành viên trong nhóm. Lịch sử hỗ trợ đối chiếu sự cố, không tự kết luận người dùng gây ra hỏng/mất.

Lịch cũ chưa có liên kết từng máy vẫn được giữ; nếu chưa nhận, nhân viên chọn đủ máy tại check-in và hệ thống lưu liên kết từ lần bàn giao đó. Không tạo lại thông tin người dùng/máy cho các lượt cũ đã hoàn tất.

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

Cấu hình đã kiểm tra trên database ngày 10/09/2026:

| Vai trò | Đăng ký / mượn cho mình | Duyệt yêu cầu | Bàn giao / nhận trả |
| --- | --- | --- | --- |
| STUDENT, TEACHER | Có; xem và hủy yêu cầu của mình trước khi nhận | Không | Không tự xác nhận |
| COLLABORATOR, MANAGER | Có | Chưa được cấp | Chưa được cấp |
| LAB_STAFF | Có, được tạo thay người dùng | Chưa được cấp | Có |
| ADMIN | Có, được tạo thay người dùng | Có | Có |

Giao diện và API dùng quyền thực tế của tài khoản, không suy luận quyền duyệt từ tên vai trò. Đợt chỉnh giao diện không tự thay đổi các quyền quản trị. Sinh viên/giảng viên chỉ thấy tài sản cho mượn; lịch sử người nhận máy chỉ dành cho nhân sự vận hành có quyền COMPUTER_VIEW.

Migration bổ sung BOOKING_CREATE, BOOKING_VIEW_OWN và BOOKING_CANCEL_OWN cho sáu vai trò hiện có. Không bổ sung quyền duyệt, giao nhận, sửa tài sản hoặc đăng ký thay người khác. Cấu hình quyền khác của trung tâm được giữ nguyên. Đăng xuất/đăng nhập lại sau khi áp dụng để nhận quyền mới.

## Cập nhật database

Migration: `database/migrations/029_EquipmentLending.sql`.

Chức năng chọn từng máy cần thêm `030_BookingComputers.sql`. Nếu tài khoản ứng dụng chưa có quyền tạo bảng, người quản trị mở **database/scripts/enable-computer-bookings.sql** và Execute toàn bộ trong SSMS. Script tạo bảng `BookingComputerItems`, cấp SELECT/INSERT/UPDATE trên đúng bảng đó cho `itlabmanager` và ghi nhận migration. Không cần đưa thông tin đăng nhập quản trị vào ứng dụng.

Nếu tài khoản ứng dụng không có quyền ALTER, mở **database/scripts/enable-equipment-lending.sql** bằng SSMS, kiểm tra database đích `ItLabManagerDb`, rồi Execute bằng tài khoản quản trị database. Script này chạy độc lập, có transaction và ghi nhận migration, không chạy các migration khác đang chờ. Không cấp sysadmin cho tài khoản ứng dụng chỉ để chạy tính năng.

Không chạy nguyên file migration có cả phần DOWN trong SSMS. Script `enable-equipment-lending.sql` là bản dành cho thao tác Execute toàn bộ.

Để tạo dữ liệu thử nghiệm, chạy **database/scripts/seed-lending-test-data.sql**. Script thêm các mã `DEMO-` (5 máy đang hoạt động, 1 máy bảo trì, 3 thiết bị cho mượn và 1 thiết bị nội bộ), có thể chạy lại mà không nhân bản bản ghi. Các mã này giúp kiểm tra cả danh sách người mượn và việc ẩn tài sản nội bộ.

## API và kiểm tra

`GET /api/bookings/catalog?startTime=<ISO>&endTime=<ISO>&keyword=<text>&page=1`

Yêu cầu đăng nhập và BOOKING_CREATE. Trả danh sách cho mượn phân trang 50 dòng, tên danh mục, số lượng còn theo lịch, số máy đáp ứng và trạng thái nhận đăng ký của Lab; không trả ghi chú nội bộ, người quản lý, lịch của người khác hoặc cấu hình mạng máy tính.

`POST /api/bookings` giữ luồng cũ. API kiểm tra lại quyền, người đăng ký, thời gian, số lượng và chế độ cho mượn. Duyệt lịch được tuần tự hóa bằng khóa giao dịch để hai lượt duyệt không cùng lấy một phần khả dụng.

Đăng ký máy gửi thêm `computerIds: ["<UUID máy>"]`; `numberOfComputers` phải bằng số mã đã chọn. Response danh sách/chi tiết có `computerItems` và `selectedComputerIds`. `GET /api/computers/:id/bookings?page=1` trả lịch sử 20 dòng/trang, yêu cầu COMPUTER_VIEW và vai trò vận hành. API danh sách máy cho mượn không trả thông tin người đặt khác.

Kiểm thử tự động không ghi dữ liệu thật:

```powershell
npx vitest run --pool=threads --maxWorkers=1 src/server/application/use-cases/booking/lending.test.ts
npm run typecheck
```
