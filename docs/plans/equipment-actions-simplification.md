# Kế hoạch tinh gọn thao tác trong danh sách thiết bị

Ngày: 05/11/2026. Trạng thái: **đã triển khai và kiểm tra local bằng API giả; chưa deploy**. Bằng chứng mới nhất tại §8.

Owner quyết định: chủ dự án. Phạm vi: bảng thiết bị tại `/equipments` và các modal mở từ một thiết bị. Chế độ sử dụng: Operate — quản trị viên/nhân viên Lab tra cứu tồn kho, điều chỉnh số lượng và cập nhật thiết bị.

## 1. Vấn đề và hiện trạng đã kiểm tra

- Mỗi dòng đang có tối đa 6 nút: Chi tiết, Kho, Hỏng, Lịch sử, Xóa, Sửa. Cột thao tác chiếm nhiều chiều ngang và làm các dữ liệu chính khó đọc.
- `EquipmentDetailDialog` đã đọc chi tiết qua `equipmentApi.get(id)` nhưng hiện chỉ xem thông tin/số lượng; lịch sử, chỉnh kho, báo hỏng và sửa dùng các modal khác trong `EquipmentsPage`.
- Có sẵn `EquipmentDialog` dùng Radix Dialog, portal, giới hạn chiều cao và quản lý focus; có dependency Radix Dropdown Menu. Ưu tiên tận dụng các phần này.
- **CONFIRMED — EQUIPMENT-ACTIONS-01, cập nhật:** chủ dự án ban đầu chọn “Kho và ⋯”, sau đó yêu cầu có thêm Xóa nhanh ngoài bảng. Mỗi dòng giữ thao tác điều chỉnh số lượng, Xóa và menu ⋯; xem chi tiết bằng tên/dòng. Chưa có số liệu tần suất sử dụng từng nút; không coi lựa chọn này là số liệu sử dụng thực tế.
- **CONFIRMED — EQUIPMENT-ACTIONS-LABEL-01:** chủ dự án yêu cầu triển khai theo phương án đổi nhãn Kho thành **Điều chỉnh số lượng**, mô tả chức năng tăng/giảm tổng số và số khả dụng. Ví dụ đang có 2 bộ, nhập thêm 2 bộ thì thành 4; giảm 1 bộ thì còn 3, theo ràng buộc tồn kho hiện tại. Giữ trường lý do và ghi lịch sử; giảm số lượng khác với xóa cả bản ghi thiết bị.

## 2. Hướng đã chọn

Giữ giao diện bảng sáng, màu trạng thái và dữ liệu hiện tại. Đổi cách mở chi tiết và phân bố thao tác:

```text
Mã             Tên thiết bị       Tổng  Khả dụng  Đang mượn  Hỏng  Vị trí  Thao tác
CATEGORY-...   Raspberry Pi 4     2     2        0           0     ...     [Điều chỉnh số lượng] [Xóa] [⋯]
               Cho phép mượn
```

- Tên thiết bị là nút văn bản có hover/focus rõ ràng, mở modal chi tiết. Bấm phần không chứa nút/liên kết của dòng cũng mở cùng modal.
- Mỗi dòng quản trị có tối đa **3 điều khiển**: `Điều chỉnh số lượng`, `Xóa` và menu `⋯`. Nút Xóa hiện trực tiếp để không phải mở menu, có biểu tượng thùng rác và nhãn chữ rõ ràng. Tài khoản chỉ xem không có menu thao tác rỗng; vẫn mở chi tiết qua tên/dòng.
- Giữ các cột tổng số, khả dụng, đang mượn, hỏng và vị trí để đối chiếu ngay, không bắt mở modal mới xem được số lượng cơ bản.
- Giữ bộ lọc, tìm kiếm, phân trang, thêm thiết bị và nhập Excel hiện tại. Chưa thay cách quản lý danh mục.

| Thao tác hiện tại | Vị trí đề xuất | Kết quả khi chọn |
| --- | --- | --- |
| Chi tiết | Tên thiết bị hoặc phần trống của dòng | Modal mở tab Thông tin; bỏ nút Chi tiết riêng |
| Kho | Đổi nhãn thành Điều chỉnh số lượng, hiện ngoài bảng | Mở biểu mẫu tăng/giảm số lượng kèm lý do cho đúng thiết bị |
| Hỏng | Menu `⋯` → Báo hỏng | Biểu mẫu báo hỏng, giữ nguồn khả dụng/đang mượn và ghi chú |
| Lịch sử | Menu `⋯` → Lịch sử; đồng thời có tab Lịch sử trong modal | Mở thẳng tab Lịch sử của đúng thiết bị |
| Sửa | Menu `⋯` → Sửa thông tin | Biểu mẫu sửa với dữ liệu hiện hành |
| Xóa | Nút Xóa trực tiếp ngoài bảng, màu đỏ | Mở ngay xác nhận có tên/mã thiết bị; chỉ xóa khi xác nhận |

Menu `⋯` trên bảng chỉ chứa Sửa thông tin, Báo hỏng và Lịch sử theo quyền. Không lặp lại Xóa trong menu của dòng vì đã có nút trực tiếp. Xóa nhanh nghĩa là truy cập nhanh bước xác nhận, không tự xóa ngay sau một lần bấm.

## 3. Modal chi tiết và cách chuyển thao tác

### Cấu trúc khi xem

- Header: tên thiết bị, mã và nút đóng. Tên dài được xuống dòng, không đẩy nút đóng ra ngoài.
- Hai tab: **Thông tin** và **Lịch sử**. Không tạo tab riêng cho từng thao tác ghi.
- Tab Thông tin: danh mục, vị trí, chế độ cho mượn/trạng thái, ghi chú, ngày cập nhật; số lượng theo 7 tình trạng hiện có (tổng, khả dụng, đặt trước, đang mượn, hỏng, bảo trì, thất lạc). Dữ liệu chưa có hiển thị rõ; giữ liên kết ảnh thiết bị nếu có.
- Tab Lịch sử: thời gian, loại biến động, các thay đổi số lượng và ghi chú từ API hiện có; có trạng thái tải, rỗng, lỗi và thử lại. Chỉ tải khi tab này được mở.
- **Cập nhật theo yêu cầu mới:** trong tab Thông tin, hiện trực tiếp các nút `Điều chỉnh số lượng`, `Sửa thông tin`, `Báo hỏng`, `Xóa` theo quyền, cùng nút `Đóng`; không dùng menu `⋯` trong modal. Lịch sử vẫn có tab riêng. Các nút tự xuống dòng trên màn hình hẹp.

### Khi chỉnh sửa hoặc cập nhật kho

- Dùng một modal đang hoạt động cho một thiết bị. Chọn thao tác chuyển nội dung/modal state sang biểu mẫu tương ứng; menu đóng trước khi form xuất hiện. Không để modal chi tiết nằm dưới một modal thao tác khác.
- Mỗi biểu mẫu chỉ giữ hành động xác nhận chính và Hủy/Quay lại; tên/mã thiết bị luôn rõ. Lưu lỗi giữ dữ liệu đã nhập và hiển thị lỗi ngay tại form.
- Mở thao tác từ modal chi tiết: lưu thành công quay về thông tin thiết bị và cập nhật số liệu. Mở trực tiếp từ bảng: lưu thành công đóng form, giữ vị trí bảng/bộ lọc/trang hiện tại và báo thành công.
- Hủy không gửi mutation. Khi biểu mẫu có thay đổi chưa lưu, việc đóng/quay lại phải cho người dùng xác nhận bỏ thay đổi; không âm thầm mất dữ liệu.
- Xóa giữ bước xác nhận hiện có và hành vi xóa mềm. Khi xóa thành công, đóng modal, làm mới bảng; nếu xóa dòng cuối của trang thì điều chỉnh trang để tránh trang rỗng giả. Nếu hủy xác nhận, quay về đúng ngữ cảnh trước đó.

## 4. Tương tác, phân quyền và kích thước màn hình

- Tên thiết bị là button thực, Enter/Space mở modal; giữ semantics của bảng, không biến cả `tr` thành button bọc các button khác.
- Click `Điều chỉnh số lượng`, `Xóa`, menu, menu item hoặc liên kết không đồng thời kích hoạt click dòng. Bôi chọn/copy mã hoặc tên không tự mở modal.
- Menu dùng portal để không bị cắt bởi vùng cuộn của bảng; có tên truy cập như `Thao tác cho Raspberry Pi 4`, hỗ trợ phím mũi tên/Escape và trả focus đúng nút.
- Modal giữ focus bên trong, Escape/đóng trả focus về tên hoặc nút đã mở. Trong lúc lưu chặn submit lặp và các thao tác đóng gây trạng thái không rõ ràng; lỗi xử lý xong cho phép thử lại.
- Giữ đúng quyền hiện tại: VIEW để xem/lịch sử; INVENTORY_ADJUST để chỉnh kho; DAMAGE_REPORT để báo hỏng; UPDATE để sửa; DELETE để xóa. Ẩn mục không có quyền và giữ kiểm quyền server. Quyền thay đổi khi modal đang mở phải hiển thị lỗi phù hợp.
- Desktop: modal thông tin rộng khoảng 860–960px tối đa, cuộn trong nội dung, header dễ thấy. Mobile: modal chiếm gần hết viewport, nội dung một cột, vùng hành động dễ bấm; lịch sử cuộn ngang trong vùng riêng nếu cần.
- Bảng không gây cuộn ngang toàn trang; giữ vùng cuộn bảng trên màn hẹp. Thu gọn cột thao tác để dành chỗ cho tên và số lượng, không giảm cỡ chữ để nhét đủ nút.

## 5. Phạm vi mã nguồn dự kiến

| File/khu vực | Việc dự kiến |
| --- | --- |
| `src/features/equipments/EquipmentsPage.tsx` | Rút hàng nút thành thao tác ưu tiên + menu; mở qua tên/dòng; gom trạng thái modal để không chồng cửa sổ |
| `src/features/equipments/EquipmentDetailDialog.tsx` | Thông tin/lịch sử trong cùng ngữ cảnh; liên kết thao tác được cấp quyền |
| `src/features/equipments/EquipmentDialog.tsx` | Hỗ trợ kích thước phù hợp từng loại form và hành vi focus/đóng cần thiết; kiểm các dialog đang dùng chung |
| Component nhỏ trong `src/features/equipments/` nếu cần | Tách menu thao tác và nội dung lịch sử để tái sử dụng, tránh nhân đôi form/handler |
| `src/services/equipment-api.ts` | Dùng lại get/listTransactions/update/adjust/reportBroken/delete; chưa có yêu cầu đổi contract |

Sau mutation thành công, làm mới query danh sách, chi tiết và lịch sử của đúng thiết bị theo các khóa đang dùng; không để modal hiển thị số lượng cũ. Không tải lịch sử của mọi dòng ngay khi mở bảng.

Phạm vi này chưa cần migration, đổi API, sửa luật tồn kho/cho mượn, thay role/permission hoặc ghi dữ liệu thật để thử nghiệm.

## 6. Thứ tự triển khai sau khi duyệt

1. Áp dụng yêu cầu đã xác nhận có thao tác `Điều chỉnh số lượng`, `Xóa` và `⋯` ngoài bảng.
2. Gom mở/đóng và điều hướng modal theo thiết bị + chế độ; bảo đảm một modal hoạt động.
3. Thêm tab Lịch sử và menu theo quyền, tận dụng query/form/validation hiện có.
4. Thay hàng 6 nút bằng hai nút trực tiếp và menu; nối click tên/dòng và bảo vệ sự kiện từ các nút con, đặc biệt nút Xóa không mở kèm chi tiết.
5. Đồng bộ dữ liệu sau lưu/xóa, trạng thái loading/error và hành vi bàn phím/mobile.
6. Kiểm tra trong phạm vi thay đổi, chụp trước/sau để chủ dự án rà soát. Ảnh và báo cáo local đặt trong thư mục đã ignore theo yêu cầu trước đó.

## 7. Tiêu chí nghiệm thu dự kiến

- Dòng đủ quyền giảm từ 6 nút còn tối đa 3 điều khiển: Điều chỉnh số lượng, Xóa, ⋯; tên và số liệu dễ quét hơn. Xóa mở được ngay ngoài bảng, không phải qua menu, và vẫn cần xác nhận trước khi gửi request.
- Mở cùng một thiết bị bằng tên hoặc phần trống của dòng cho kết quả giống nhau; mọi thao tác trên menu/nút không mở thêm modal chi tiết.
- Lịch sử đọc được trong modal chi tiết, chỉ tải khi cần; không tải được có retry, không có lịch sử có thông báo rỗng.
- Sửa/kho/báo hỏng/xóa vẫn hoạt động như nghiệp vụ hiện tại; số lượng và lịch sử đồng bộ sau thành công; hủy không ghi dữ liệu.
- Quyền chỉ xem và các tổ hợp quyền cập nhật được kiểm; không thấy menu trống hoặc thao tác không được phép.
- Một overlay/modal tại một thời điểm; hỗ trợ Escape, focus, chọn/copy text và bàn phím; tên/mã dài, trang cuối sau xóa và API lỗi không làm mất ngữ cảnh.
- Kiểm desktop 1440/1024px và mobile 375/320px bằng API giả; không tràn ngang toàn trang. Kiểm typecheck/build và các kiểm thử phù hợp khi triển khai; không coi bản kế hoạch là kết quả PASS.

**Lịch sử lập kế hoạch:** đã đối chiếu ảnh chủ dự án cung cấp, source bảng/detail/dialog, API và quyền hiện có trước khi triển khai.

## 8. Kết quả triển khai local — 05/11/2026

- Mỗi dòng đủ quyền có `Điều chỉnh số lượng`, `Xóa` và menu `⋯`; menu có Sửa thông tin, Báo hỏng, Lịch sử theo quyền. Tên thiết bị và phần trống của dòng mở chi tiết; nút con không kích hoạt thêm click dòng.
- Chi tiết dùng modal Radix rộng hơn, có tab Thông tin và Lịch sử. Lịch sử chỉ tải khi mở tab, lỗi có Thử lại; các loại biến động đã biết hiển thị tiếng Việt. Trong thông tin có thao tác theo quyền. Chuyển sang form điều chỉnh/sửa/báo hỏng/xác nhận xóa chỉ có một modal hoạt động và quay về chi tiết khi hủy hoặc lưu từ chi tiết.
- Giữ bước xác nhận xóa, cập nhật query danh sách/chi tiết/lịch sử sau thao tác, xử lý lỗi tại form và xác nhận bỏ thay đổi chưa lưu. Xóa dòng cuối của trang sẽ quay về trang trước. Không đổi API, schema hay quyền backend.
- `npm run typecheck`: **PASS**; `npm run build`: **PASS**; hai file test nhập thiết bị hiện có: **PASS — 10 tests**. `git diff --check`: **PASS**.
- Browser local dùng API giả: **PASS** tại 1440/1024/375/320px, không tràn ngang toàn trang hoặc runtime exception; đã kiểm 3 nút, tên/dòng, Escape/focus, lịch sử tải khi cần và lỗi/thử lại, lưu/lỗi điều chỉnh số lượng, sửa và xác nhận bỏ thay đổi, báo hỏng, xác nhận/hủy/xóa, quyền chỉ xem và luồng quay về chi tiết. [Ảnh bảng desktop](../../designs/equipment-actions/table-desktop.png), [ảnh chi tiết mobile](../../designs/equipment-actions/detail-320.png), [báo cáo](../../designs/equipment-actions/checks.json). Các ảnh và script kiểm tra được Git ignore theo yêu cầu trước đó.
- Giới hạn: kiểm browser thay toàn bộ API bằng dữ liệu giả, không ghi/xóa dữ liệu DB thật và không chứng minh giao dịch SQL thực. Chưa deploy lên server production.

### Hiển thị trực tiếp thao tác trong modal — 05/11/2026

Chủ dự án yêu cầu tận dụng chiều rộng modal để hiện các nút thay vì dùng menu. Đã hiện `Điều chỉnh số lượng`, `Sửa thông tin`, `Báo hỏng`, `Xóa` theo quyền; tab `Lịch sử` giữ ở đầu modal. Nút Xóa vẫn mở xác nhận và các form vẫn quay về chi tiết sau khi hủy.

`npm run typecheck`: **PASS**. Kiểm browser với API giả: **PASS** cho thao tác trực tiếp trong modal, xác nhận/hủy xóa và quyền chỉ xem; không tràn ngang toàn trang ở 1440/1024/375/320px, 0 runtime exception. [Ảnh desktop](../../designs/equipment-actions/detail-actions-desktop.png), [ảnh mobile](../../designs/equipment-actions/detail-actions-320.png), [báo cáo](../../designs/equipment-actions/checks.json). Chưa chạy lại build trong lần đổi bố trí nút này; không thao tác DB thật.
