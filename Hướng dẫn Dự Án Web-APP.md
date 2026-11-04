# Hướng dẫn chuẩn bị dự án từ Word đến docs rules và skills cho AI Agent

**Mục đích:** Bạn soạn một file Word mô tả hệ thống bằng ngôn ngữ dễ hiểu. Agent đọc file đó, phân tích thông tin, xây dựng bộ đặc tả Markdown, thiết lập hướng dẫn làm việc và các skill cần thiết. Sau đó bạn giao từng công việc để agent triển khai đúng phạm vi và kiến trúc đã chọn.

Áp dụng cho website, ứng dụng web, backend, mobile và hệ thống quản lý. Hướng dẫn này không cố định framework, cơ sở dữ liệu hay kiến trúc cho mọi dự án.

**Đầu vào bạn cần chuẩn bị:** Một file Word đủ rõ về người dùng, chức năng, quy trình, dữ liệu, quyền, quy tắc và kết quả mong muốn. Bạn có thể ghi chú theo các mục bên dưới; không cần tự viết toàn bộ API, schema hay tên file source.

**Đầu ra agent cần tạo:** Bộ `docs/` mô tả hệ thống; file hướng dẫn đầu vào như `AGENTS.md`; rules làm việc; skills thực hiện các quy trình kỹ thuật; danh sách task có thứ tự và tiêu chí nghiệm thu.

Các mẫu trong hướng dẫn là nội dung để copy khi áp dụng. Chúng chưa phải file hướng dẫn hay skill đã được cài vào dự án.

## 1. Cách sử dụng hướng dẫn này

Làm theo năm bước:

1. **Soạn Word:** Dùng checklist và mẫu ở mục 3–4. Ghi điều đã biết và đánh dấu điều chưa quyết định.
2. **Giao agent phân tích:** Dùng prompt ở mục 12.1. Agent lập bảng yêu cầu, phát hiện thiếu sót và mâu thuẫn.
3. **Xây dựng bộ Markdown:** Dùng mục 5–7 và prompt ở mục 12.2. Agent chuyển yêu cầu thành đặc tả và thiết kế có nguồn tham chiếu.
4. **Thiết lập cách agent làm việc:** Dùng mục 8–9 và prompt ở mục 12.3 để tạo entrypoint, rules, skills phù hợp công cụ.
5. **Triển khai từng task:** Dùng mục 10–11 và prompt ở mục 12.4. Agent đọc đúng context, lập kế hoạch theo rủi ro, code, kiểm thử và bàn giao.

Bạn có thể giao gộp các bước tạo tài liệu trong một lượt. Agent phải giữ trạng thái rõ ràng: phần đã xác nhận có thể dùng để triển khai; phần đề xuất chưa được chấp thuận chưa được coi là yêu cầu chính thức. Không cần đợi mọi chức năng tương lai được mô tả hoàn hảo mới bắt đầu chức năng đầu tiên.

## 2. Phân biệt các loại thông tin trước khi tạo thư mục

| Thành phần | Trả lời câu hỏi gì? | Ví dụ |
| --- | --- | --- |
| File Word | Tôi muốn hệ thống hoạt động thế nào? | Người dùng gửi yêu cầu, người có quyền duyệt kiểm tra và quyết định |
| `docs/` | Hệ thống cần làm gì và được thiết kế ra sao? | Luồng đăng ký, bảng dữ liệu, quyền duyệt, request/response |
| `AGENTS.md` | Agent phải tìm tài liệu ở đâu và bắt đầu thế nào? | Làm booking thì đọc đặc tả booking và các rule liên quan |
| `.agent/rules.md` | Trong dự án này, cách làm nào phải được tuân thủ? | Kiểm quyền ở server; không thay stack đã chốt trong task làm API |
| Skill | Khi gặp loại công việc này, cần thực hiện quy trình nào? | Khi thêm API: đọc contract, kiểm quyền, xử lý lỗi, viết test và cập nhật docs |
| Task | Lần này cần hoàn thành việc gì? | Thêm API gửi yêu cầu đăng ký |
| Execution plan | Task này sẽ được thực hiện bằng thay đổi kỹ thuật nào? | Sửa handler, use case, phần lưu dữ liệu và test liên quan |
| Source và tests | Hành vi đã được triển khai và kiểm chứng thế nào? | API chạy được; test xác nhận các trường hợp thành công và từ chối |

**Ba loại rule cũng cần tách:**

- **Business rule:** Điều đúng trong nghiệp vụ, ví dụ không vượt sức chứa. Lưu trong `docs/domain/business-rules.md`.
- **Architecture rule:** Ranh giới và hướng phụ thuộc, ví dụ tầng nghiệp vụ không phụ thuộc framework khi dự án đã chọn Clean Architecture. Lưu trong `docs/architecture/system-overview.md`.
- **Agent rule:** Cách agent thao tác, ví dụ phải kiểm migration trước khi chạy và báo đúng các kiểm tra chưa thực hiện. Lưu trong `.agent/rules.md`.

Skill tham chiếu các tài liệu trên và hướng dẫn cách kiểm tra chúng. Không chép toàn bộ nghiệp vụ vào từng skill.

## 3. File Word cần có những thông tin gì

Tên gợi ý: `DAC-TA-HE-THONG.docx`. Bên trong dùng Heading cho các mục, bảng cho dữ liệu/quyền và bullet cho ghi chú. Không cần trình bày như báo cáo tốt nghiệp.

**Mức yêu cầu trong mục này:**

- **Bắt buộc:** Cần có thông tin để triển khai phần việc liên quan; có thể ghi chung trong một mục.
- **Theo điều kiện:** Cần khi hệ thống có loại chức năng đó.
- **Tùy chọn:** Có thể bổ sung sau.

“Chưa biết” là thông tin hợp lệ. Ghi rõ để agent đề xuất hoặc hỏi, thay vì điền một lựa chọn chưa được chốt.

### 3.1. Thông tin chung và mục tiêu — Bắt buộc

Ghi:

- Tên dự án; người quyết định yêu cầu; ngày và phiên bản tài liệu.
- Vấn đề hiện tại; ai gặp vấn đề; hiện đang xử lý bằng cách nào.
- Hệ thống giúp giải quyết điều gì; kết quả nào chứng tỏ hữu ích.
- Web, mobile, desktop, API hay kết hợp; có hệ thống cũ không.

**Ví dụ ghi trong Word:**

> Hiện việc đăng ký sử dụng lab được trao đổi qua tin nhắn, khó kiểm tra lịch và tài nguyên. Tôi muốn một website để gửi yêu cầu, duyệt, xem lịch và theo dõi sử dụng. Bản đầu cần quản lý được quy trình từ đăng ký đến hoàn tất.

Không bắt buộc tự đặt KPI định lượng khi chưa có căn cứ. Agent không được tự thêm cam kết hiệu năng hoặc quy mô người dùng.

### 3.2. Phạm vi và mức ưu tiên — Bắt buộc

Ghi ba nhóm:

- **Làm trong bản đầu:** Các chức năng thật sự cần.
- **Làm sau:** Chức năng mong muốn nhưng chưa nằm trong bản đầu.
- **Không làm:** Những phần dễ bị agent tự mở rộng.

Ghi các giới hạn ảnh hưởng thiết kế: một hay nhiều đơn vị, một hay nhiều chi nhánh, dữ liệu riêng từng tổ chức hay dùng chung.

**Ví dụ:** Quản lý một phòng lab duy nhất. Bản đầu có đăng ký và duyệt; QR check-in làm sau; chưa quản lý nhiều cơ sở.

Agent không được tự tạo chức năng chọn nhiều phòng nếu phạm vi đã xác nhận chỉ có một phòng.

### 3.3. Người dùng và quyền — Bắt buộc khi có phân quyền

Ghi các nhóm người dùng và các hành động họ được phép làm. Đừng chỉ ghi tên role; cần ghi cả **phạm vi dữ liệu** và điều kiện.

| Nhóm | Hành động | Phạm vi | Điều kiện |
| --- | --- | --- | --- |
| Người đăng ký | Tạo và xem yêu cầu | Yêu cầu của mình | Có tài khoản hoạt động |
| Người duyệt | Duyệt hoặc từ chối | Theo phạm vi được giao | Yêu cầu đang chờ duyệt |
| Quản trị | Quản lý người dùng | Theo quyền quản trị | Cần ghi log thao tác quan trọng |

Các câu hỏi cần note: Người dùng có được tự đăng ký tài khoản không? Ai cấp quyền? Một người có nhiều vai trò không? Có khách không đăng nhập không? Người A có được xem hoặc sửa dữ liệu của người B không?

Quyền chưa rõ phải ghi chưa xác nhận; agent không được mặc định cho mọi người xem mọi dữ liệu.

### 3.4. Danh sách chức năng theo nhóm — Bắt buộc

Ghi tên nhóm và chức năng bên trong, chẳng hạn tài khoản, tài nguyên, đăng ký, duyệt, báo cáo. Với mỗi chức năng ghi người dùng, mục tiêu và mức ưu tiên.

Danh sách chức năng là bản đồ phạm vi. Chi tiết hành vi được ghi ở mục tiếp theo. Không cần tạo module kiến trúc riêng cho từng nút trên giao diện.

### 3.5. Mô tả từng chức năng — Bắt buộc với phần chuẩn bị làm

Đây là phần quan trọng nhất. Mỗi chức năng nên trả lời:

1. **Ai sử dụng và để làm gì?**
2. **Trước khi làm phải có điều kiện gì?**
3. **Người dùng nhập hoặc chọn gì?** Trường nào bắt buộc, trường nào tùy chọn?
4. **Hệ thống xử lý theo bước nào?**
5. **Thành công thì hiện gì và dữ liệu đổi ra sao?**
6. **Khi nào phải từ chối và thông báo thế nào?**
7. **Ai được thực hiện trên dữ liệu nào?**
8. **Có ngoại lệ quan trọng nào?**
9. **Bạn sẽ kiểm tra thế nào để chấp nhận chức năng?**

**Mẫu ghi chú có thể lặp lại trong Word:**

> Chức năng: Gửi yêu cầu sử dụng.
>
> Người dùng: Người có quyền đăng ký.
>
> Đầu vào: Ngày, giờ bắt đầu, giờ kết thúc, mục đích, số người; các thông tin tài nguyên theo loại đăng ký.
>
> Luồng: Nhập thông tin → kiểm tra điều kiện → lưu yêu cầu chờ duyệt → báo đã gửi.
>
> Kết quả: Người gửi xem được yêu cầu trong danh sách của mình.
>
> Từ chối: Thiếu thông tin bắt buộc, giờ kết thúc không sau giờ bắt đầu, vượt giới hạn đã chốt.
>
> Chưa rõ: Yêu cầu chờ duyệt có giữ tài nguyên không?

Không cần bạn tự quyết HTTP status, tên controller hay transaction trong ghi chú này. Agent sẽ thiết kế phần kỹ thuật sau khi hiểu hành vi.

### 3.6. Quy trình và trạng thái — Bắt buộc với nghiệp vụ nhiều bước

Ghi toàn bộ luồng từ đầu đến cuối và ai chịu trách nhiệm từng bước. Với mỗi trạng thái, note khi nào vào, ai được đổi và khi nào kết thúc.

| Trạng thái hiện tại | Hành động | Người thực hiện | Trạng thái sau | Điều kiện |
| --- | --- | --- | --- | --- |
| Chờ duyệt | Duyệt | Người có quyền duyệt | Đã duyệt | Kiểm tra lại điều kiện tại lúc duyệt |
| Chờ duyệt | Từ chối | Người có quyền duyệt | Bị từ chối | Có lý do nếu yêu cầu nghiệp vụ quy định |
| Đã duyệt | Bắt đầu sử dụng | Người được giao xác nhận | Đang sử dụng | Điều kiện thời gian cần được chốt |

Đặc biệt ghi các trường hợp hủy, sửa, gửi lại, trả trễ, lỗi giữa chừng. Không suy ra rằng có trạng thái `CANCELLED` thì mọi người được hủy ở mọi thời điểm.

### 3.7. Quy tắc nghiệp vụ — Bắt buộc

Ghi các điều luôn phải đúng. Dùng câu có điều kiện rõ và kèm ví dụ khi cần.

- Giới hạn số lượng, sức chứa, thời gian.
- Quy tắc trùng lịch, tài nguyên và thứ tự ưu tiên.
- Điều kiện được duyệt, hủy, sửa, xóa.
- Cách tính giá, tổng, hạn, điểm hoặc phí nếu có.
- Quy tắc dành riêng cho loại đăng ký, đối tượng hoặc trạng thái.

**Ghi chưa đủ:** “Không được trùng lịch.”

**Ghi rõ hơn:** “Yêu cầu sử dụng toàn bộ phòng đã được duyệt không được xung đột với yêu cầu đã duyệt khác trong cùng khoảng thời gian.” Sau đó ghi thêm: yêu cầu dùng một phần tài nguyên có được cùng tồn tại không; hai lịch tiếp giáp có bị coi là trùng không; trạng thái nào chiếm tài nguyên.

Nếu chưa quyết định những điều đó, giữ chúng trong danh sách câu hỏi. Agent không được tự biến cách hiểu thông thường thành quy tắc của bạn.

### 3.8. Dữ liệu hệ thống — Bắt buộc nếu có lưu dữ liệu

Ghi các đối tượng cần quản lý, ý nghĩa và thông tin cần lưu. Ví dụ người dùng, tài nguyên, yêu cầu, dòng thiết bị đi kèm, lịch sử và sự cố.

| Đối tượng | Thông tin cần lưu | Quan hệ cần hiểu | Ghi chú |
| --- | --- | --- | --- |
| Yêu cầu | Người gửi, thời gian, mục đích, trạng thái | Thuộc một người gửi; có thể có nhiều tài nguyên | Cần lưu lịch sử xử lý |
| Tài nguyên | Mã, tên, tình trạng, số lượng nếu quản lý theo lô | Được dùng trong yêu cầu | Cần chốt quản lý từng món hay theo số lượng |

Note thêm: mã nào không được trùng; dữ liệu nào bắt buộc; đơn vị số lượng; múi giờ; dữ liệu được sửa/xóa hay phải giữ lịch sử; dữ liệu ban đầu nhập ở đâu; có import không.

Bạn có thể mô tả đối tượng bằng tiếng Việt. Agent chuyển thành entity và mô hình dữ liệu. Entity nghiệp vụ không mặc định tương ứng đúng một bảng.

### 3.9. Giao diện và trải nghiệm — Theo điều kiện

Ghi danh sách màn hình, người dùng, thông tin hiển thị và hành động chính:

- Điều hướng: Người dùng đi từ trang nào đến trang nào?
- Form: Các trường, nhãn, giá trị mặc định và thông báo cần có.
- Danh sách: Tìm kiếm, lọc, sắp xếp, phân trang, xem chi tiết.
- Trạng thái: Đang tải, không có dữ liệu, thành công, lỗi, không có quyền.
- Thiết bị: Desktop, điện thoại, tablet; ngôn ngữ; nhu cầu truy cập bằng bàn phím hoặc hỗ trợ tiếp cận.
- Hình mẫu: Đính kèm ảnh, wireframe hoặc link và ghi điểm nào muốn học theo.

Ảnh tham khảo là hướng dẫn giao diện; không tự quyết được nghiệp vụ, quyền hoặc dữ liệu còn thiếu.

### 3.10. Báo cáo thông báo và tích hợp — Theo điều kiện

Với báo cáo: ghi người xem, nguồn dữ liệu, chỉ số, bộ lọc và cách tính. “Dashboard tổng quan” chưa đủ để xác định từng chỉ số.

Với thông báo: ghi sự kiện gửi, người nhận, kênh, nội dung tối thiểu và cách xử lý khi gửi thất bại.

Với tích hợp: ghi hệ thống bên ngoài, dữ liệu vào/ra, ai quản lý, có tài liệu/API hay tài khoản thử nghiệm không. Nếu chưa tích hợp thật trong MVP, ghi rõ.

### 3.11. Bảo mật và vận hành — Theo điều kiện của hệ thống

Ghi:

- Cách đăng nhập mong muốn: tài khoản nội bộ, tài khoản tổ chức hoặc cơ chế khác.
- Dữ liệu nhạy cảm và ai được xem; yêu cầu log và lưu lịch sử.
- File upload: loại file, giới hạn, ai xem/tải/xóa nếu có.
- Hệ thống chạy ở đâu; ai quản trị; cần sao lưu/khôi phục như thế nào.
- Có môi trường dev/test/production không; dữ liệu thật có được dùng để test không.

Không đưa mật khẩu, token hay secret thật vào Word. Ghi tên thông tin cần cung cấp và cách cấp riêng.

### 3.12. Ràng buộc kỹ thuật và kiến trúc — Ghi điều đã quyết định

Ghi theo ba nhóm để agent biết quyền lựa chọn:

| Nhóm | Cách ghi | Agent được làm gì? |
| --- | --- | --- |
| Đã chốt | “Database bắt buộc dùng SQL Server” | Thiết kế theo ràng buộc này |
| Mong muốn | “Ưu tiên Clean Architecture nếu phù hợp” | Đánh giá và đề xuất; chưa coi là bắt buộc |
| Giao agent lựa chọn | “Chưa chọn frontend; hãy đề xuất phương án phù hợp” | So sánh và đề xuất lựa chọn, hoặc tự chọn trong quyền được giao rõ |

Nếu bạn yêu cầu Clean Architecture, ghi rõ đó là quyết định hay đề xuất. Agent phải mô tả trách nhiệm tầng và hướng phụ thuộc; cây thư mục có `domain/` chưa chứng minh code tuân thủ kiến trúc.

Bạn không cần biết phiên bản mọi thư viện. Agent kỹ thuật chọn phiên bản tương thích, kiểm tra với môi trường thực tế và ghi vào tài liệu/manifest. Dự án có sẵn thì trước hết đọc phiên bản đang dùng.

### 3.13. Quy mô hiệu năng và tiêu chí chất lượng — Theo điều kiện

Ghi thông tin bạn thật sự biết: số người dùng dự kiến, lượng dữ liệu, thời gian hệ thống cần hoạt động, mức phản hồi chấp nhận được, yêu cầu hỗ trợ thiết bị, nhu cầu sao lưu.

Chưa có con số thì ghi chưa xác định. Những tuyên bố như “chịu 10.000 người dùng”, “đáp ứng dưới 100 ms” phải có quyết định và cách kiểm chứng, không để agent tự thêm cho đẹp tài liệu.

### 3.14. Tiêu chí nghiệm thu — Bắt buộc với phần chuẩn bị làm

Ghi các tình huống có thể kiểm được:

- Với dữ liệu hợp lệ, người đúng quyền hoàn thành được hành động.
- Với dữ liệu sai hoặc thiếu, hệ thống từ chối đúng và không lưu dữ liệu lỗi.
- Người không có quyền không thực hiện được hành động, kể cả gọi trực tiếp API.
- Các quy tắc quan trọng vẫn đúng sau thao tác.
- Người dùng thấy kết quả hoặc thông báo phù hợp.

**Acceptance Criteria (AC)** là điều kiện riêng của chức năng. **Definition of Done (DoD)** là chuẩn chất lượng chung, chẳng hạn kiểm tra liên quan đã chạy, docs đã đồng bộ và rủi ro đã báo. Không đồng nhất hai khái niệm này; không đặt số lượng test cố định như bằng chứng duy nhất.

### 3.15. Dữ liệu mẫu và ví dụ thực tế — Nên có

Ghi một tình huống đúng, một tình huống bị từ chối và một trường hợp biên cho nghiệp vụ quan trọng. Dùng dữ liệu giả hoặc đã ẩn thông tin nhạy cảm.

Ví dụ: một lịch kết thúc đúng lúc lịch khác bắt đầu. Hệ thống có cho phép không? Câu trả lời làm rõ quy tắc tốt hơn chỉ ghi “kiểm tra thời gian”.

### 3.16. Câu hỏi chưa chốt và nguồn tham khảo — Bắt buộc nếu còn thiếu

Với mỗi câu hỏi ghi: nội dung, ai quyết định, ảnh hưởng đến phần nào, có chặn triển khai không. Với tài liệu tham khảo ghi phiên bản hoặc ngày, mục liên quan và mức hiệu lực.

**Checklist Word tối thiểu trước khi giao agent:**

- [ ] Biết hệ thống phục vụ ai và mục tiêu là gì.
- [ ] Có phạm vi bản đầu và phần chưa làm.
- [ ] Có nhóm người dùng và quyền quan trọng.
- [ ] Có mô tả chức năng đầu tiên với đầu vào, luồng, kết quả và lỗi.
- [ ] Có quy tắc ảnh hưởng quyền, dữ liệu, tiền/tài sản hoặc tài nguyên.
- [ ] Có đối tượng dữ liệu cần lưu nếu áp dụng.
- [ ] Có ràng buộc kỹ thuật đã chốt và điều được phép đề xuất.
- [ ] Có cách nghiệm thu và danh sách câu hỏi còn thiếu.

## 4. Khung nội dung có thể copy sang Word

Copy khung sau vào Word. Điền bằng ghi chú ngắn; lặp mục 5 cho mỗi chức năng. Đây là khung của **một tài liệu tổng thể**, không phải yêu cầu tạo 16 tài liệu Word.

```text
ĐẶC TẢ HỆ THỐNG [TÊN DỰ ÁN]
Phiên bản:
Ngày cập nhật:
Người quyết định nghiệp vụ:
Trạng thái: Bản nháp / Đã xác nhận / Đang cập nhật

1. BỐI CẢNH VÀ MỤC TIÊU
- Vấn đề hiện tại:
- Người gặp vấn đề:
- Hệ thống cần giúp:
- Kết quả mong muốn:

2. PHẠM VI
- Chức năng bản đầu:
- Chức năng làm sau:
- Không làm:
- Giới hạn tổ chức/đơn vị/địa điểm:

3. NGƯỜI DÙNG VÀ QUYỀN
- Nhóm người dùng:
- Hành động được phép:
- Phạm vi dữ liệu:
- Điều kiện và ngoại lệ:

4. DANH SÁCH NHÓM CHỨC NĂNG
- Nhóm:
- Chức năng:
- Mức ưu tiên:

5. CHI TIẾT CHỨC NĂNG [LẶP CHO TỪNG CHỨC NĂNG]
- Tên và mục tiêu:
- Người dùng:
- Điều kiện trước khi thực hiện:
- Đầu vào, trường bắt buộc/tùy chọn:
- Các bước xử lý:
- Kết quả thành công:
- Dữ liệu được tạo/thay đổi:
- Trường hợp từ chối/lỗi:
- Quyền và phạm vi dữ liệu:
- Quy tắc liên quan:
- Trường hợp biên:
- Cách nghiệm thu:
- Câu hỏi chưa rõ:

6. QUY TRÌNH VÀ TRẠNG THÁI
- Luồng đầu đến cuối:
- Ai làm từng bước:
- Trạng thái và điều kiện chuyển:
- Sửa/hủy/thử lại/quá hạn:

7. QUY TẮC NGHIỆP VỤ
- Nội dung từng quy tắc:
- Điều kiện áp dụng:
- Ví dụ đúng/sai:
- Ngoại lệ đã xác nhận:

8. DỮ LIỆU
- Đối tượng và ý nghĩa:
- Thông tin cần lưu:
- Quan hệ:
- Mã duy nhất, giới hạn, đơn vị, múi giờ:
- Sửa/xóa/lịch sử:
- Dữ liệu ban đầu và import:

9. GIAO DIỆN
- Màn hình và người dùng:
- Thông tin và thao tác:
- Điều hướng:
- Loading/empty/error/success:
- Điện thoại/ngôn ngữ/hỗ trợ tiếp cận:
- Hình mẫu hoặc wireframe:

10. BÁO CÁO THÔNG BÁO TÍCH HỢP
- Chỉ số và cách tính:
- Sự kiện, người nhận, kênh thông báo:
- Hệ thống ngoài và dữ liệu trao đổi:

11. BẢO MẬT VÀ VẬN HÀNH
- Đăng nhập, dữ liệu nhạy cảm, audit:
- File upload:
- Môi trường chạy:
- Sao lưu, khôi phục, người quản trị:

12. KỸ THUẬT VÀ KIẾN TRÚC
- Bắt buộc:
- Mong muốn, cần đánh giá:
- Giao agent đề xuất hoặc lựa chọn:
- Hệ thống hiện có cần tương thích:

13. CHẤT LƯỢNG VÀ QUY MÔ
- Người dùng và lượng dữ liệu dự kiến:
- Yêu cầu hiệu năng/sẵn sàng nếu đã chốt:
- Cách đo hoặc kiểm chứng:

14. NGHIỆM THU
- Các tình huống phải đạt:
- Chuẩn hoàn thành chung:
- Ai kiểm tra/chấp nhận:

15. VÍ DỤ VÀ DỮ LIỆU MẪU
- Trường hợp thành công:
- Trường hợp từ chối:
- Trường hợp biên:

16. CÂU HỎI VÀ NGUỒN THAM KHẢO
- Chưa biết:
- Cần ai quyết định:
- Có chặn chức năng nào không:
- Nguồn, phiên bản, mục tham chiếu:
```

## 5. Agent chuyển Word thành bộ đặc tả như thế nào

### 5.1. Trích xuất thông tin trước khi thiết kế

Agent đọc cả đoạn văn, bảng và hình liên quan. Nếu công cụ chỉ trích xuất được chữ mà thiếu hình/bảng, phải ghi phần chưa đọc được. Không báo đã hiểu toàn bộ chỉ từ tiêu đề hoặc đoạn preview.

Agent lập danh mục yêu cầu với ID ổn định. ID không có ý nghĩa ưu tiên; thứ tự ưu tiên lấy từ quyết định của chủ dự án.

| ID | Loại | Nội dung | Nguồn trong Word | Trạng thái |
| --- | --- | --- | --- | --- |
| REQ-001 | Phạm vi | Chỉ quản lý một đơn vị | Mục 2, phiên bản 1 | CONFIRMED nếu đã được chủ dự án chốt |
| BR-001 | Nghiệp vụ | Điều kiện không xung đột | Mục 7 | NEEDS_CONFIRMATION nếu chưa rõ loại xung đột |
| DEC-001 | Kỹ thuật | Kiến trúc được đề xuất | Mục 12 | PROPOSED nếu chỉ là đề xuất |

Các trạng thái dùng thống nhất:

- `CONFIRMED`: Yêu cầu/quyết định đã được người có trách nhiệm xác nhận.
- `PROPOSED`: Phương án agent hoặc tài liệu đề xuất; chưa có hiệu lực như quyết định.
- `UNKNOWN`: Chưa có thông tin.
- `NEEDS_CONFIRMATION`: Có cách hiểu hoặc mâu thuẫn cần người có trách nhiệm giải quyết.
- `N/A`: Không áp dụng, kèm lý do.

Thông tin xuất hiện trong Word vẫn phải đọc theo cách diễn đạt: “bắt buộc” khác “đề xuất”, “có thể” và “làm sau”. Agent không tự đóng dấu CONFIRMED cho toàn bộ nội dung một bản nháp.

### 5.2. Làm rõ mâu thuẫn và khoảng trống

Agent ghi vào `docs/open-questions.md`:

```markdown
# Q-001 — Yêu cầu chờ duyệt có giữ tài nguyên không?
Nguồn: DAC-TA-HE-THONG.docx, phiên bản 1, mục 5 và 7.
Điều đã biết: Yêu cầu mới chuyển sang Chờ duyệt.
Điều chưa biết: Có giữ số lượng tài nguyên ngay lúc gửi không?
Ảnh hưởng: Khả dụng, mô hình dữ liệu, kiểm tra đồng thời và API.
Người quyết định: Chủ nghiệp vụ.
Chặn: Phần giữ tài nguyên; không chặn việc mô tả màn hình nhập.
Trạng thái: NEEDS_CONFIRMATION.
Phương án và hệ quả: Agent trình bày để người quyết định lựa chọn.
```

Chỉ dừng phần bị ảnh hưởng. Agent tiếp tục lập đặc tả và xử lý phần độc lập đã rõ. Không dùng “best practice” để tự quyết luật sử dụng, hạn hủy, quyền xem hay ưu tiên người dùng.

### 5.3. Chuyển yêu cầu thành thiết kế kỹ thuật

Từ phần đã rõ, agent xác định:

- Nhóm chức năng và luồng người dùng.
- Đối tượng nghiệp vụ, quan hệ và trạng thái.
- Các thành phần hệ thống và trách nhiệm.
- Mô hình dữ liệu, ràng buộc và cách giữ tính đúng khi nhiều thao tác đồng thời.
- API, giao diện và cơ chế quyền nếu áp dụng.
- Test scenarios và task theo phụ thuộc.

Thiết kế mới phải ghi `PROPOSED` khi chưa có quyết định hoặc chưa được giao quyền lựa chọn. Nếu bạn đã giao rõ quyền tự chọn kỹ thuật trong giới hạn, agent được quyết định trong giới hạn đó và ghi lý do; không phải hỏi lại mọi tên file hay cách tách hàm.

### 5.4. Kiểm tra bộ docs trước khi giao code

Agent đối chiếu:

- Mỗi yêu cầu trong phạm vi có file đặc tả tiếp nhận, hoặc có lý do hoãn.
- Mỗi feature có người dùng, đầu vào, luồng, quyền, kết quả và cách nghiệm thu.
- Dữ liệu/API/UI khớp cùng tên, trạng thái, đơn vị và quy tắc.
- Các quyết định chưa chốt được nhìn thấy và không lọt thành hành vi đã duyệt.
- Task triển khai được truy về feature và AC cụ thể.
- Không có lệnh, đường dẫn source hoặc phiên bản thư viện bị ghi là “đã có” khi chưa tồn tại.

## 6. Cấu trúc thư mục đầu ra

### 6.1. Bộ nhỏ cho dự án đơn giản

```text
my-project/
├── AGENTS.md
├── .agent/
│   └── rules.md
└── docs/
    ├── README.md
    ├── system-spec.md
    ├── architecture.md
    ├── open-questions.md
    └── tasks/
        └── TASK-001.md
```

`system-spec.md` có thể chứa phạm vi, vai trò, chức năng, dữ liệu và nghiệp vụ trong các mục riêng. Chỉ thêm skill khi có workflow đủ giá trị; không cần tạo thư mục skill trống để nhìn chuyên nghiệp. Với demo không có backend hoặc database, không tạo đặc tả API/database giả.

### 6.2. Bộ chuẩn khi có nhiều thành phần

Cấu trúc sau là bản đồ mở rộng. Chỉ tạo file có nội dung thực sự cần. `.agent/skills/` trong ví dụ là nơi bạn tổ chức nội dung; xem mục 9.4 để chọn vị trí mà công cụ thực sự nhận diện.

```text
my-project/
├── AGENTS.md
├── README.md
├── .agent/
│   ├── rules.md
│   └── skills/
│       ├── implement-feature/
│       │   └── SKILL.md
│       ├── change-database/
│       │   └── SKILL.md
│       └── verify-change/
│           └── SKILL.md
└── docs/
    ├── README.md
    ├── open-questions.md
    ├── source-map.md
    ├── product/
    │   └── overview.md
    ├── domain/
    │   ├── glossary.md
    │   ├── business-rules.md
    │   └── roles-permissions.md
    ├── features/
    │   ├── FEATURE-001-account.md
    │   └── FEATURE-002-registration.md
    ├── architecture/
    │   ├── system-overview.md
    │   ├── tech-stack.md
    │   ├── data-model.md
    │   └── api-contract.md
    ├── ui/
    │   └── screens-flows.md
    ├── quality/
    │   └── test-strategy.md
    ├── tasks/
    │   ├── README.md
    │   └── TASK-001.md
    ├── plans/
    │   └── TASK-001-plan.md
    ├── decisions/
    │   └── ADR-001.md
    └── operations/
        └── local-development.md
```

`plans/`, `decisions/` và một số skill là tùy chọn theo rủi ro. Source, tests, migrations và file cấu hình được tạo theo stack đã chọn ở giai đoạn triển khai; cây này chỉ mô tả hệ thống tài liệu.

Nếu cần Sprint, thêm `docs/sprints/SPRINT-001.md` với mục tiêu và link task/story. Không bắt dự án một người có đầy đủ Scrum ceremonies. Nếu dùng issue tracker làm nơi quản lý công việc, dùng link đến đó thay vì duy trì hai backlog độc lập.

## 7. Mỗi file docs cần chứa gì và lấy từ Word ở đâu

| File | Nguồn trong Word | Nội dung tối thiểu | Lúc agent đọc |
| --- | --- | --- | --- |
| `docs/README.md` | Toàn tài liệu | Mục lục, trạng thái, đường dẫn đọc theo loại task | Khi tìm context |
| `product/overview.md` | Mục 1–2 | Vấn đề, mục tiêu, phạm vi, MVP, non-goals, ưu tiên đã chốt | Khi xác định phạm vi |
| `domain/glossary.md` | Mục 3–8 | Thuật ngữ, định nghĩa, đơn vị và tên thống nhất | Khi gặp thuật ngữ nghiệp vụ |
| `domain/business-rules.md` | Mục 7, quy tắc rải trong chức năng | ID, điều kiện, nội dung, ngoại lệ, nguồn, trạng thái | Khi triển khai/sửa hành vi |
| `domain/roles-permissions.md` | Mục 3 và quyền từng chức năng | Actor/role, hành động, phạm vi dữ liệu, điều kiện | Khi sửa auth hoặc dữ liệu có quyền |
| `features/FEATURE-*.md` | Mục 4–7, 14–15 | Mục tiêu, luồng, input/output, trạng thái, quyền, rule IDs, AC, lỗi | Trước làm chức năng tương ứng |
| `architecture/system-overview.md` | Mục 12 và thiết kế đã chọn | Thành phần, trách nhiệm, luồng runtime, boundary, hướng phụ thuộc | Khi đặt logic hoặc thay ranh giới |
| `architecture/tech-stack.md` | Mục 12 | Stack, phiên bản/ràng buộc, trạng thái lựa chọn, lý do, manifest nguồn | Khi setup/cài dependency |
| `architecture/data-model.md` | Mục 8 và rule liên quan | Entity, bảng nếu áp dụng, trường, quan hệ, constraints, concurrency | Khi ghi/sửa dữ liệu |
| `architecture/api-contract.md` | Mục 5, 10 và thiết kế API | Route, auth, request, response, validation, errors, compatibility | Khi sửa API hoặc nối UI |
| `ui/screens-flows.md` | Mục 9 và feature | Màn hình, luồng, trường, hành động, các UI state, responsive | Khi làm UI |
| `quality/test-strategy.md` | Mục 13–15 | Loại kiểm tra theo rủi ro, môi trường, dữ liệu mẫu, DoD, commands đã có | Khi lập plan và verify |
| `tasks/README.md` | Mục 2, chức năng, dependency | Danh sách task, thứ tự, phụ thuộc, trạng thái, link feature | Khi chọn việc tiếp theo |
| `tasks/TASK-*.md` | Feature và kế hoạch phân rã | Mục tiêu hiện tại, phạm vi, AC IDs, context, skill, validation | Khi nhận task |
| `plans/TASK-*-plan.md` | Task + khảo sát repository | Tác động, file thật cần sửa, bước thực hiện, test, rủi ro | Sau khảo sát, trước sửa đáng kể |
| `decisions/ADR-*.md` | Quyết định kỹ thuật quan trọng | Bối cảnh, lựa chọn, phương án khác, hệ quả, trạng thái | Khi chạm quyết định liên quan |
| `operations/local-development.md` | Mục 11 và repository thật | Setup, môi trường, lệnh chạy, migration, seed, test | Khi setup hoặc debug môi trường |
| `open-questions.md` | Mục 16 + phát hiện mới | Thiếu/mâu thuẫn, tác động, người quyết định, phạm vi bị chặn | Khi có điểm chưa rõ |
| `source-map.md` | Word và tài liệu quyết định | Yêu cầu nguồn → nơi đặc tả → trạng thái và phiên bản | Khi kiểm đủ yêu cầu/đồng bộ |

Với dự án nhỏ, gộp các nội dung phù hợp. “Phải có thông tin quyền” không đồng nghĩa “luôn phải có một file quyền riêng”.

### 7.1. Mẫu đặc tả một thành phần

Không dừng ở file ghi “module booking có CRUD”. Mỗi thành phần phải mô tả hành vi đủ để agent triển khai và kiểm tra.

```markdown
# FEATURE-002 — Gửi yêu cầu đăng ký
Status: DRAFT / CONFIRMED
Owner: <người quyết định>
Source: DAC-TA-HE-THONG.docx, phiên bản <...>, mục <...>

## Mục tiêu và phạm vi
Người dùng cần đạt điều gì? Lần này chưa làm phần nào?

## Người dùng và điều kiện trước
Ai được dùng? Trên dữ liệu nào? Điều kiện nào phải có trước?

## Đầu vào
| Trường | Ý nghĩa | Bắt buộc | Validation | Nguồn/quyết định |
| --- | --- | --- | --- | --- |

## Luồng thành công
1. Người dùng ...
2. Hệ thống ...
3. Kết quả ...

## Trạng thái và dữ liệu thay đổi
Trước → hành động → sau; dữ liệu nào được tạo/cập nhật.

## Quy tắc và quyền
Link BR-...; link mục quyền. Không chép một bản rule thứ hai.

## Lỗi và trường hợp biên
Dữ liệu sai; thiếu quyền; trạng thái không hợp lệ;
gửi lặp; cạnh tranh tài nguyên nếu liên quan.

## Acceptance Criteria
AC-01: <tình huống và kết quả kiểm được>
AC-02: <tình huống từ chối và dữ liệu không bị thay đổi sai>

## Liên kết thiết kế
Dữ liệu: <link>
API: <link>
UI: <link>
Dependencies: <ID/link>

## Câu hỏi chưa chốt
Q-...; phần nào bị chặn.
```

### 7.2. Thiết kế dữ liệu API và UI đến mức nào

**Dữ liệu:** Ghi ý nghĩa trước rồi mới chọn kiểu/trường/bảng. Cần rõ PK/FK, unique, nullability, trạng thái, dữ liệu lịch sử và giới hạn. Index dựa trên truy vấn dự kiến; không thêm hàng loạt index vô căn cứ. Nếu nhiều request có thể tranh cùng tài nguyên, phải thiết kế cơ chế giữ invariant, không chỉ “kiểm tra rồi ghi” ngoài transaction/constraint phù hợp.

**API:** Với mỗi endpoint ghi method/path, quyền và ownership, request, response, lỗi, validation và rule áp dụng. HTTP status là quyết định contract kỹ thuật; không suy ra tất cả từ Word. Hệ thống không có HTTP API thì dùng contract tương ứng, không ép tạo REST.

**UI:** Mô tả thông tin, hành động và trạng thái. Nút ẩn/disable hỗ trợ trải nghiệm; quyền thực thi vẫn được kiểm ở phía có thẩm quyền, thường là server.

**Kiến trúc:** Ghi logic nằm ở đâu, thành phần nào được gọi thành phần nào, ai sở hữu dữ liệu và request chạy qua đâu. Clean Architecture, MVC hoặc framework-native đều có thể phù hợp; chọn theo yêu cầu và ràng buộc thực tế.

## 8. AGENTS.md và rules cần có gì

### 8.1. AGENTS.md là điểm vào ngắn

Agent cần đọc được file này khi bắt đầu. File chỉ đường đến kiến thức và quy trình liên quan; không chứa cả đặc tả hệ thống.

```markdown
# Hướng dẫn làm việc trong <tên dự án>

## Bắt đầu
- Đọc `.agent/rules.md` và task được giao.
- Dùng `docs/README.md` để tìm context liên quan.
- Chỉ triển khai phạm vi đã được giao và đủ rõ.

## Bản đồ
- Đặc tả chức năng: `docs/features/`
- Nghiệp vụ và quyền: `docs/domain/`
- Kiến trúc, dữ liệu, API: `docs/architecture/`
- UI: `docs/ui/`
- Task: `docs/tasks/`
- Lệnh chạy và kiểm tra: `docs/operations/local-development.md`
- Skill: <đường dẫn thực tế công cụ đã được cấu hình nhận diện>

## Đọc theo công việc
- Backend/API: feature → rule/quyền → API → kiến trúc liên quan.
- Database: feature/rule → data model → workflow migration.
- Frontend: feature → UI → API/quyền → workflow frontend nếu có.
- Không load toàn bộ docs/skills nếu task không cần.

## Thực hiện
- Khảo sát source/tests liên quan trước khi sửa.
- Ghi plan cho thay đổi nhiều thành phần, dữ liệu, quyền hoặc contract.
- Dùng skill khi trigger phù hợp; không cần gọi mọi skill cho mọi task.
- Kiểm AC, chạy validation liên quan và đồng bộ docs.
- Thiếu/mâu thuẫn quan trọng: ghi Q-...; hỏi đúng người và tiếp tục phần độc lập.

## Bàn giao
Nêu thay đổi, AC đạt/chưa đạt, kiểm tra thực chạy,
kiểm tra chưa chạy, docs đã cập nhật và vấn đề còn lại.
```

Đường dẫn trong mẫu phải được agent sửa thành đường dẫn có thật. Nếu file được gộp cho dự án nhỏ, router cũng phải được chỉnh theo cấu trúc đó.

### 8.2. Rules chung là các quy định có thể thực hiện và kiểm tra

Nên có:

- Phạm vi quyền tự quyết của agent.
- Stack và kiến trúc đã chọn, bằng link đến tài liệu chính.
- Quy ước code quan trọng, theo ngôn ngữ/công cụ thực tế.
- Quy tắc dependency, migration, secret và thay đổi contract.
- Cách xử lý unknown, planning, test và báo hoàn thành.

```markdown
# Quy tắc làm việc

## Nghiệp vụ
MUST không tự thêm quyền, trạng thái hoặc business rule.
MUST dùng rule đã xác nhận ở `docs/domain/business-rules.md`.
Nếu có mâu thuẫn, ghi nguồn và câu hỏi; không chọn ngầm một bản.

## Kiến trúc
MUST tuân thủ boundary và hướng phụ thuộc đã chốt trong system-overview.
SHOULD dùng pattern hiện có khi đáp ứng được yêu cầu.
Không đổi kiến trúc trong một task không có phạm vi đó.

## Stack và dependency
MUST đọc tech-stack và manifest trước khi thêm thư viện.
SHOULD dùng khả năng hiện có trước khi thêm dependency.
Nếu thêm, ghi lý do, khả năng tương thích và thay đổi lockfile.

## Quyền và dữ liệu
MUST kiểm permission và ownership ở phía thực thi có thẩm quyền.
MUST không đưa secret thật vào source, client, docs hoặc log.
MUST có migration khi đổi schema được quản lý bằng migration.
Không sửa migration đã áp dụng chỉ để che lỗi lịch sử.

## Cách làm
SHOULD lập plan cho thay đổi nhiều thành phần hoặc rủi ro đáng kể.
MUST làm rõ unknown có thể đảo thiết kế trước khi triển khai phần đó.
MAY tự quyết chi tiết nhỏ, đảo ngược được trong phạm vi đã giao.
Không cần xin phép lại hành động đã được giao quyền rõ ràng.

## Kiểm chứng
MUST kiểm AC và chạy kiểm tra phù hợp thay đổi.
Không xóa hoặc làm yếu test để che lỗi.
MUST báo NOT_RUN nếu chưa thực hiện; không giả kết quả PASS.
MUST đồng bộ docs bị ảnh hưởng bởi thay đổi đã được chấp thuận.
```

`MUST` là bắt buộc khi điều kiện áp dụng xuất hiện; `SHOULD` là nên làm mặc định; `MAY` là tùy chọn. Không thêm điều cấm không liên quan stack, chẳng hạn cấm TypeScript `any` trong dự án Python.

**Không thay mọi quyết định bằng “phải hỏi trước”.** Có thể giao agent tự sửa code, thêm test hoặc cấu hình dev trong task. Những thay đổi vượt phạm vi sản phẩm, kiến trúc hoặc môi trường thật cần xử lý theo quyền đã cấp và quy định của dự án.

## 9. Skill cần có gì để agent đi đúng kiến trúc

### 9.1. Skill là quy trình có trigger và bằng chứng

Một skill tốt cần:

1. Tên và mô tả rõ khi nào dùng.
2. Điều kiện trước khi chạy; quyền và môi trường cần có.
3. Đầu vào: task, feature, rule IDs, contract và tài liệu liên quan.
4. Các bước thao tác; vị trí đặt logic theo kiến trúc dự án.
5. Cách validation; dùng lệnh thật hoặc nơi tìm lệnh.
6. Cách xử lý thất bại; điều gì chưa được tự quyết.
7. Đầu ra; điều kiện hoàn thành.

Dùng cấu trúc `ten-skill/SKILL.md`, có metadata `name` và `description`. `references/`, `scripts/` hoặc `assets/` chỉ thêm khi thật sự cần. Không gọi một file note ngắn là native skill đã kích hoạt nếu công cụ chưa nhận diện nó.

### 9.2. Chọn vài skill có ích trước

| Skill | Khi dùng | Nội dung quan trọng |
| --- | --- | --- |
| `implement-feature` | Triển khai một hành vi gồm nhiều bước | Đọc feature/rule/quyền, map vào kiến trúc, implement, kiểm AC |
| `change-database` | Sửa schema, migration hoặc cách ghi dữ liệu | Kiểm tác động dữ liệu, migration, transaction/concurrency, DB test |
| `verify-change` | Kiểm tra và bàn giao thay đổi | Chọn checks theo rủi ro, chạy lệnh, xử lý lỗi, báo bằng chứng |
| `create-api` | Dự án có nhiều task API lặp lại | Contract, validation, auth, placement logic, error mapping, test |
| `build-ui` | Dự án có workflow UI cần ổn định | Screens/states, component reuse, API integration, responsive, kiểm UI |

Không nhất thiết cần cả `implement-feature` và `create-api` nếu phần lớn quy trình trùng nhau và không có giá trị riêng. Một rule một dòng nên nằm trong rules; một quyết định dành cho một feature nên nằm trong docs/plan.

### 9.3. Mẫu skill triển khai chức năng

```markdown
---
name: implement-feature
description: Triển khai hoặc thay đổi chức năng có nghiệp vụ, quyền hoặc nhiều thành phần; dùng khi task đã có mục tiêu và tiêu chí nghiệm thu rõ.
---

# Mục đích
Hiện thực đúng feature trong boundary của dự án và tạo bằng chứng cho AC.

## Khi dùng
Task thêm hoặc sửa hành vi sản phẩm. Không cần cho typo thuần văn bản.

## Điều kiện trước
- Task được giao và có scope.
- Các luật/quyền ảnh hưởng phần triển khai đã được xác nhận.
- Có quyền truy cập repository và môi trường kiểm tra phù hợp.

## Đầu vào và tài liệu
- Task hiện tại và feature được link trong task.
- Các mục business-rules và roles-permissions liên quan.
- Phần system-overview điều khiển ranh giới đang sửa.
- Data model, API, UI khi task có tác động tương ứng.
- Lệnh thật trong local-development và manifest/config của repository.

## Quy trình
1. Đọc task, AC và các rule được tham chiếu.
2. Xác định entrypoint, logic nghiệp vụ, persistence và consumer liên quan.
3. Tìm source/tests thật; không đoán tên file rồi xem đó là hiện trạng.
4. Map phần thay đổi vào kiến trúc đã chọn.
   - Nếu Clean Architecture: HTTP parsing ở adapter;
     orchestration ở application; invariant nghiệp vụ ở nơi phù hợp
     trong domain/application; DB/framework implementation ở infrastructure;
     dependency đi theo tài liệu kiến trúc.
   - Nếu kiến trúc khác: dùng boundary của kiến trúc đó.
5. Ghi impact/plan khi task có rủi ro hoặc nhiều thành phần.
6. Implement lát cắt nhỏ; giữ scope, contract và quyền đã chốt.
7. Kiểm input, lỗi, ownership và các trạng thái liên quan.
8. Với ghi tài nguyên đồng thời, kiểm cơ chế giữ invariant;
   không suy ra an toàn chỉ từ một lần check trước khi ghi.
9. Viết/chỉnh test cho hành vi mới và hồi quy quan trọng.
10. Chạy validation liên quan; đọc lỗi và sửa nguyên nhân trong scope.
11. Đồng bộ docs và xem diff để loại thay đổi ngoài phạm vi.

## Validation
- Đối chiếu từng AC với test hoặc bằng chứng thực hiện.
- Chọn unit/integration/API/UI/DB checks theo phần đã đổi.
- Không khẳng định DB concurrency từ test mock nếu chưa kiểm DB thật.
- Thiếu môi trường: báo NOT_RUN và giới hạn bằng chứng.

## Khi thất bại
- Lỗi kỹ thuật trong scope: phân tích và sửa rồi chạy lại checks liên quan.
- Thiếu quyết định nghiệp vụ: ghi câu hỏi và dừng phần bị ảnh hưởng.
- Không tự sửa luật/contract đã chốt chỉ để làm test pass.

## Đầu ra
Code/test phù hợp, docs được cập nhật, báo cáo AC và validation.

## Không làm
Không tự đổi stack, thêm module không được yêu cầu,
chép nghiệp vụ vào skill, xóa test che lỗi hoặc báo hoàn thành giả.

## Hoàn thành khi
AC trong scope đạt, checks áp dụng có bằng chứng,
unknown còn lại đã được ghi rõ và diff đúng phạm vi.
```

Skill này hỗ trợ tuân thủ kiến trúc nhưng không tự bảo đảm mọi thay đổi đúng. Cần review dependency thực tế và kiểm tra tự động khi phù hợp; không chỉ kiểm tên folder.

**Với skill migration:** Đọc data model và công cụ migration thực tế → tạo migration → xem tác động drop/rename/data conversion → thử trên database dev/test → kiểm constraint và dữ liệu → đồng bộ model/contract. Không bịa `npm run db:migrate:dev` nếu script chưa tồn tại. Production migration chỉ thực hiện trong quyền đã cấp, với quy trình vận hành của dự án.

### 9.4. Đặt skill ở đâu để công cụ thực sự đọc được

`.agent/` trong hướng dẫn là **quy ước tổ chức của bạn**. Không giả định mọi công cụ tự nạp `.agent/rules.md` hoặc `.agent/skills/`.

Các vị trí được tài liệu chính thức mô tả tại thời điểm biên soạn:

| Công cụ | Điểm vào hướng dẫn | Vị trí skill cấp dự án |
| --- | --- | --- |
| Codex | `AGENTS.md` | `.agents/skills/<name>/SKILL.md` — lưu ý có chữ **s** trong `.agents` |
| Claude Code | `CLAUDE.md`; hỗ trợ `AGENTS.md` tùy phiên bản/cấu hình và sự hiện diện của CLAUDE files | `.claude/skills/<name>/SKILL.md` |
| Cursor | `AGENTS.md` hoặc project rules `.cursor/rules/*.mdc` | `.cursor/skills/<name>/SKILL.md`; có hỗ trợ `.agents/skills/` theo docs hiện hành |
| Agent khác | Kiểm tra cơ chế nạp hướng dẫn của công cụ | Kiểm tra cơ chế discovery/configuration của công cụ |

**Cách áp dụng:** Giữ `.agent/rules.md` nếu muốn một nơi chung; entrypoint chỉ rõ phải đọc file đó. Với skills, chọn một nguồn chính ở đường dẫn công cụ hỗ trợ. Nếu cần xuất sang nhiều công cụ, dùng adapter hoặc cơ chế đồng bộ có kiểm tra, không duy trì nhiều bản chỉnh tay độc lập.

Một file chỉ có link đến `.agent/skills/` có thể hướng dẫn agent đọc thủ công; nó không chứng minh native skill discovery đã hoạt động. Kiểm tra danh sách skill/cơ chế nhận diện của công cụ và thử một task nhỏ trước khi giao cả dự án.

Nguồn: [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude instructions](https://code.claude.com/docs/en/memory), [Claude skills](https://code.claude.com/docs/en/skills), [Cursor rules](https://cursor.com/docs/rules), [Cursor skills](https://cursor.com/docs/skills). Kiểm tra lại khi áp dụng vì cơ chế hỗ trợ có thể thay đổi theo phiên bản.

## 10. Từ đặc tả đến task để giao agent triển khai

### 10.1. Chia theo kết quả có thể nghiệm thu

Không giao “làm toàn bộ hệ thống theo Word” rồi để agent tự chọn mọi ưu tiên. Agent đề xuất các lát cắt có phụ thuộc rõ; bạn chốt hoặc giao quyền sắp thứ tự trong phạm vi xác định.

Ví dụ thứ tự tham khảo: setup chạy được → tài khoản/quyền tối thiểu → dữ liệu nền cần cho chức năng → một luồng nghiệp vụ hoàn chỉnh → chức năng tiếp theo. Thứ tự phải dựa trên dependency của dự án, không mặc định hoàn thành toàn bộ database/backend trước UI.

Nếu dùng Agile: Feature là khả năng sản phẩm; Story diễn đạt nhu cầu người dùng; Task là công việc triển khai cụ thể. Skill dùng được cho nhiều task; Plan chỉ dành cho một task. Sprint là nhịp lựa chọn và kiểm tra kết quả, không phải loại tài liệu bắt buộc.

### 10.2. Mẫu task

```markdown
# TASK-003 — Tạo luồng gửi yêu cầu đăng ký
Status: TODO / IN_PROGRESS / BLOCKED / READY_FOR_REVIEW / DONE
Feature: FEATURE-002
Story: <ID nếu dùng story>

## Mục tiêu
Người có quyền gửi được yêu cầu hợp lệ và xem kết quả.

## Phạm vi và phần chưa làm
<Những hành vi/API/UI nằm trong task; phần duyệt/hủy nếu chưa làm>

## Context cần đọc
- Feature và các mục AC được giao.
- Rule IDs liên quan, quyền và phạm vi dữ liệu.
- Data model/API/UI/architecture sections liên quan.

## Skill
<Skill thật đã được nhận diện; dùng khi trigger phù hợp>

## Acceptance Criteria
Link AC-...; tiêu chí bổ sung riêng của task nếu có.

## Dependencies
Task hoặc dữ liệu nền cần có trước. Không suy ra thứ tự chỉ từ tên file.

## Ràng buộc
Stack/kiến trúc đã chốt; quyền tự quyết; hạn chế môi trường.

## Validation
Các hành vi cần kiểm, loại test cần thiết và nơi tìm lệnh thật.

## Đầu ra
Code, tests, tài liệu bị ảnh hưởng và báo cáo kiểm chứng.

## Câu hỏi hoặc blocker
Link Q-... và phần bị chặn.
```

Không bắt bạn điền “Files bị ảnh hưởng” chính xác. Agent khảo sát repository để tìm file. Với dự án chưa có source, danh sách file là **dự kiến tạo**, không phải file đã tồn tại.

### 10.3. Plan chỉ cần khi có giá trị

Task nhỏ, rõ và đảo ngược được có thể dùng plan ngắn trong phiên làm việc. Thay đổi database, authorization, public contract hoặc nhiều module cần ghi plan đủ để review.

```markdown
# Plan cho TASK-003
## Hiện trạng và mục tiêu
## Thành phần và consumer bị ảnh hưởng
## Files thật cần sửa hoặc files dự kiến tạo
## Tác động dữ liệu API UI quyền
## Các bước thực hiện
## Test scenarios và lệnh validation đã xác minh
## Rủi ro câu hỏi và cách phục hồi khi áp dụng
## Docs cần đồng bộ
```

Không yêu cầu người dùng duyệt mọi plan nếu task đã được giao quyền triển khai rõ. Chỉ cần xin quyết định khi có vấn đề vượt phạm vi hoặc chưa được cấp quyền.

## 11. Agent đọc gì vào thời điểm nào

| Thời điểm | Đọc gì? | Mục đích |
| --- | --- | --- |
| Phân tích ban đầu | Word, tài liệu tham chiếu, ràng buộc được cung cấp | Hiểu hệ thống và trích xuất yêu cầu |
| Tạo docs | Yêu cầu đã trích xuất, quyết định, câu hỏi | Thiết kế nhất quán và giữ nguồn |
| Bắt đầu một task | Entrypoint, rules chung ngắn, task | Biết phạm vi và cách làm |
| Hiểu chức năng | Feature, rule/quyền liên quan | Biết hành vi cần hiện thực |
| Chọn vị trí thay đổi | Kiến trúc, contract/model/UI liên quan | Đặt logic đúng boundary |
| Thực hiện quy trình | Skill phù hợp | Có workflow và validation |
| Code và test | Source/tests liên quan, consumer/dependency cần thiết | Sửa đúng đường chạy và kiểm hồi quy |
| Bàn giao | AC, DoD, diff, docs bị ảnh hưởng | Chứng minh và cập nhật kết quả |

Word được đọc rộng một lần khi phân tích hoặc khi có phiên bản thay đổi. Mỗi task thường dùng bộ Markdown hiện hành; không đọc lại toàn bộ Word, mọi module và mọi skill.

**Mẫu bàn giao tối thiểu:**

```markdown
Task: TASK-003
Thay đổi: <hành vi và thành phần chính>
AC: <đạt/chưa đạt, kèm bằng chứng>
Validation thực chạy: <lệnh, môi trường, kết quả>
Validation chưa chạy: <NOT_RUN và lý do>
Docs cập nhật: <link>
Vấn đề còn lại: <blocker/rủi ro hoặc không có>
Trạng thái đề xuất: READY_FOR_REVIEW hoặc BLOCKED
```

Nếu quy trình cho phép agent tự đánh dấu DONE, vẫn phải có bằng chứng đáp ứng DoD. Việc tạo docs không đồng nghĩa đã hoàn thành sản phẩm; build pass cũng không tự chứng minh đúng nghiệp vụ.

## 12. Các prompt có thể copy để giao Codex hoặc agent

### 12.1. Prompt phân tích file Word

```text
Đọc file Word [đường dẫn/tên file] để chuẩn bị triển khai dự án.

Mục tiêu lượt này: phân tích đầu vào và đề xuất bộ đặc tả Markdown.
Chưa triển khai source, chưa cài dependency, chưa sửa database.

1. Đọc nội dung, bảng và hình liên quan; báo phần không đọc được.
2. Trích xuất mục tiêu, scope/MVP/non-goals, người dùng/quyền,
   chức năng, luồng/trạng thái, nghiệp vụ, dữ liệu, UI,
   tích hợp, bảo mật và ràng buộc kỹ thuật.
3. Gán ID cho yêu cầu quan trọng và ghi nguồn theo phiên bản/mục Word.
4. Phân loại CONFIRMED / PROPOSED / UNKNOWN / NEEDS_CONFIRMATION / N/A.
   Không coi mọi nội dung bản nháp là đã được xác nhận.
5. Phát hiện thiếu và mâu thuẫn; nêu ảnh hưởng và phần bị chặn.
6. Đề xuất cấu trúc docs đủ dùng theo độ lớn của dự án.
   Không bắt tạo mọi file trong cấu trúc mẫu.
7. Nếu repository đã có: đọc hướng dẫn áp dụng và khảo sát docs,
   manifest, cấu trúc liên quan; giữ những phần đang tổ chức hợp lý.

Đầu ra: bảng yêu cầu có nguồn, câu hỏi cần quyết định,
cấu trúc docs dự kiến và phần đủ rõ để viết đặc tả ngay.
Không tự bổ sung business rule, quyền, trạng thái hoặc scope.
Tiếp tục phân tích phần độc lập khi một phần còn thiếu quyết định.
```

### 12.2. Prompt tạo bộ đặc tả Markdown

```text
Từ Word [file, phiên bản] và các quyết định đã xác nhận [nội dung/link],
hãy tạo bộ docs Markdown cho dự án [tên].

Viết đủ nội dung để agent triển khai từng phần, không chỉ tạo tiêu đề.
Cấu trúc được điều chỉnh theo nhu cầu; dự án nhỏ có thể gộp file.

Bộ docs cần thể hiện:
- Mục tiêu, scope, MVP, non-goals.
- Thuật ngữ, nghiệp vụ có ID, quyền và phạm vi dữ liệu.
- Đặc tả từng chức năng: actor, input, luồng, trạng thái,
  output, lỗi/edge cases, AC và rule liên quan.
- Kiến trúc, trách nhiệm thành phần và hướng phụ thuộc.
- Data model nếu có lưu dữ liệu; API contract nếu có API;
  màn hình/luồng nếu có UI.
- Test strategy/DoD phù hợp rủi ro.
- Danh sách task có dependency và link AC.
- README chỉ đường đọc; source-map và open-questions khi cần.

Với kiến trúc/stack:
- Tuân thủ phần đã chốt.
- Phần được giao quyền tự chọn: chọn trong giới hạn và ghi lý do.
- Phần chưa được giao quyền: ghi PROPOSED cùng phương án/hệ quả.

Giữ nguồn tham chiếu Word và trạng thái từng quyết định.
Không tự coi route/schema/phiên bản mới đề xuất là đã được duyệt.
Không bịa lệnh đã có, kết quả test hay tên file hiện có.
Kiểm chéo feature, dữ liệu, API, UI và quyền trước bàn giao.
Chưa triển khai code trong lượt này.

Báo cáo: files tạo, yêu cầu đã bao phủ, phần chưa rõ,
quyết định kỹ thuật cần chốt và task đầu tiên có thể triển khai.
```

### 12.3. Prompt tạo entrypoint rules và skills

```text
Dựa trên bộ docs hiện hành của dự án, thiết lập hướng dẫn cho agent.
Công cụ dùng: [Codex / Claude Code / Cursor / công cụ khác và phiên bản nếu biết].

1. Tạo entrypoint được công cụ hỗ trợ.
   Giữ ngắn: project map, context routing, commands thật,
   workflow và cách bàn giao; link kiến thức thay vì chép toàn bộ.
2. Tạo rules chung cho scope, unknown, kiến trúc, dependency,
   dữ liệu/quyền, validation và báo kết quả.
3. Chỉ tạo skills cho workflow lặp lại, có bước không hiển nhiên
   và có cách kiểm chứng. Bắt đầu bằng vài skill thực sự cần.
4. Mỗi skill có name/description, trigger, prerequisites, inputs,
   docs liên quan, workflow, validation, failure handling, output,
   điều không được làm và điều kiện hoàn thành.
5. Đặt skill vào đường dẫn công cụ thực sự nhận diện;
   không giả định .agent/skills là native path cho mọi công cụ.
6. Không chép business rules hoặc quyền cụ thể vào nhiều skill.
7. Commands phải lấy từ repository thực tế. Chưa có môi trường/source
   thì ghi chưa xác minh và cách hoàn thiện sau setup.
8. Kiểm entrypoint link đúng và skill discovery theo khả năng công cụ.
   Ghi rõ kiểm tra nào chưa thực hiện được.

Không triển khai feature, không đổi kiến trúc/source/database
ngoài phạm vi thiết lập hướng dẫn được giao.
Báo những file tạo, cơ chế nạp, skills sẵn dùng và phần cần hoàn thiện.
```

### 12.4. Prompt triển khai một task

```text
Triển khai task [đường dẫn/ID] theo bộ docs hiện hành.

Đọc entrypoint và rules áp dụng, task, feature/AC,
rule/quyền liên quan và phần kiến trúc/contract/model cần thiết.
Load skill khi trigger khớp; mở rộng context khi có dependency.

Khảo sát source/tests thật. Ghi impact và plan theo mức rủi ro;
không bắt đọc toàn repository cho mỗi task.

Triển khai trong scope đã giao, kiểm tra các AC và regression liên quan,
đồng bộ docs và tự review diff.
Nếu thiếu quyết định nghiệp vụ quan trọng, ghi câu hỏi,
dừng phần phụ thuộc quyết định đó và tiếp tục phần độc lập.
Tự xử lý chi tiết kỹ thuật nhỏ trong quyền đã giao.

Bàn giao: hành vi thay đổi, AC đạt/chưa đạt,
checks thực chạy/kết quả, NOT_RUN/lý do,
docs cập nhật, blocker/rủi ro và trạng thái task.
Không báo Done khi chưa có bằng chứng đáp ứng chuẩn hoàn thành.
```

## 13. Ví dụ áp dụng từ file Word phòng Lab của bạn

Ví dụ này minh họa chuyển đổi tài liệu, không chốt thêm nghiệp vụ hay triển khai dự án Lab.

File **Website Quản Lý Phòng Lab CNTT.docx** đã có: mục tiêu/phạm vi một phòng lab, nhóm người dùng, tài nguyên, các loại đăng ký, quy trình duyệt, trạng thái, dữ liệu SQL Server, API/UI đề xuất, rules, transaction và MVP. Đây là nền đầu vào phù hợp.

Một số phần kỹ thuật mang từ “đề xuất”, như mục Clean Architecture và API, cần giữ trạng thái đề xuất nếu bạn chưa xác nhận. SQL Server được nêu như ràng buộc sử dụng; agent cần ghi nhận khác với lựa chọn còn mở.

| Nội dung Word | File Markdown tiếp nhận | Agent cần làm thêm |
| --- | --- | --- |
| Mục 2–3: Một phòng lab | `product/overview.md` và rule phạm vi | Giữ scope; không tự sinh chọn nhiều phòng |
| Mục 4 và 16: Người dùng/quyền | `domain/roles-permissions.md` | Làm rõ quyền theo hành động và phạm vi dữ liệu |
| Mục 8–10: Đăng ký và duyệt | Feature đăng ký, duyệt và luồng liên quan | Tách từng hành vi, AC, trạng thái và trường hợp từ chối |
| Mục 17–18: Dữ liệu/index | `architecture/data-model.md` | Kiểm quan hệ, constraints, lịch sử và query thực tế |
| Mục 19–20: Kiến trúc đề xuất | `architecture/system-overview.md` | Ghi trạng thái lựa chọn, trách nhiệm và dependency |
| Mục 22–23: API và UI đề xuất | `api-contract.md`, `ui/screens-flows.md` | Bổ sung request/response/errors/UI states phù hợp |
| Mục 24–25: Rules và transaction | `business-rules.md` và thiết kế dữ liệu | Chuẩn hóa rule IDs; kiểm invariants và concurrency |
| Mục 26: MVP/làm sau | `product/overview.md`, `tasks/README.md` | Giữ ưu tiên, chia task theo dependency |

**Các điểm đáng làm rõ trước phần triển khai liên quan:**

- Đăng ký số máy tính có thể cùng tồn tại trong một khoảng giờ nếu tổng không vượt khả dụng không? Rule “không trùng lịch” phải phân biệt xung đột nguyên phòng và dùng tài nguyên chung.
- Có yêu cầu giữ tài nguyên khi chờ duyệt không? Nếu chỉ giữ lúc duyệt, cả data model, kiểm khả dụng và test cần theo cách đó.
- Số lượng thiết bị khả dụng tính theo thời gian hay chỉ theo số đang mượn hiện tại? Hai khái niệm ảnh hưởng đăng ký tương lai khác nhau.
- Chức năng lịch định kỳ nói Admin có thể bỏ qua/điều chỉnh từng buổi: bỏ qua buổi bị xung đột hay được phép vượt quy tắc xung đột? Không tự suy ra quyền override.
- Quá hạn là trạng thái chính hay cờ bên cạnh trạng thái sử dụng/hoàn tất? Các đoạn về check-out và quá hạn cần được đối chiếu để tránh diễn giải không nhất quán.

### Một task đi xuyên suốt

**Ghi chú Word:** Người dùng gửi yêu cầu, hệ thống kiểm tra điều kiện, lưu Chờ duyệt và báo kết quả.

**Đặc tả:** Feature đăng ký có actor, fields, quyền, luồng, trạng thái và AC. Rule “chỉ một phòng lab” được link; không thêm trường chọn phòng.

**Thiết kế:** Agent đối chiếu mô hình dữ liệu và API đề xuất; bổ sung contract trong trạng thái phù hợp. Các câu hỏi giữ tài nguyên/chồng lịch được giải quyết trước phần logic phụ thuộc.

**Task:** Tạo API gửi yêu cầu đăng ký, link đến AC của feature và quyền liên quan. Không bao gồm duyệt, QR hay email nếu không nằm trong scope.

**Skill:** Dùng workflow tạo API/implement feature để xác định adapter, application/domain, persistence và kiểm chứng theo kiến trúc đã chốt.

**Plan:** Sau khi đọc source thật, xác định nơi xử lý input, kiểm nghiệp vụ, lưu yêu cầu và các test cần thay đổi.

**Code:** Hiện thực đúng hành vi đã xác nhận. Giữ logic ở boundary đã chọn và kiểm permission tại server.

**Test:** Kiểm gửi hợp lệ, trường thiếu/sai, người không có quyền, điều kiện tài nguyên đã chốt và các boundary liên quan. Concurrency được kiểm ở thao tác có thể giữ/chiếm tài nguyên theo thiết kế thực tế.

**Bàn giao:** Đối chiếu AC, nêu lệnh đã chạy và kết quả, ghi phần chưa kiểm chứng, đồng bộ contract/feature nếu có thay đổi được chấp thuận.

## 14. Giữ Word và Markdown nhất quán sau này

**Chọn cách quản lý rõ ngay khi chuyển đổi:**

- Word là bản đầu vào được lưu theo phiên bản, dùng để truy nguồn và trao đổi.
- Khi bộ Markdown được xác nhận, docs trở thành đặc tả làm việc hiện hành cho agent.
- Thay đổi sau đó phải có quyết định và được cập nhật ở docs chính; nếu vẫn dùng Word để duyệt, cập nhật Word cùng phiên bản hoặc ghi rõ Word đang là baseline lịch sử.

Nếu bạn muốn Word tiếp tục là đặc tả chính thức, agent phải đồng bộ các mục thay đổi về Word và ghi phiên bản Markdown được sinh từ bản Word nào. Không để hai bản cùng được gọi “mới nhất” nhưng khác nội dung.

Khi nhận Word mới: agent so sánh với baseline → liệt kê yêu cầu thay đổi → phân tích tác động → cập nhật docs/task đã được chấp thuận → triển khai trong phạm vi được giao. Không sinh lại toàn bộ Markdown rồi ghi đè các quyết định mới đã có trong repository.

Khi source, tests và docs mâu thuẫn, agent điều tra ý định và nguồn quyết định. Source có thể đang lỗi; docs có thể cũ; test có thể sai. Không tự chọn một bên làm chân lý trong mọi trường hợp.

Người phụ trách sản phẩm quyết định nghiệp vụ/phạm vi; người phụ trách kỹ thuật quyết định thiết kế trong quyền được giao; agent hỗ trợ phân tích, soạn, triển khai và cập nhật. Một người có thể đảm nhiệm cả hai vai trò.

## 15. Kiểm tra trước khi giao agent chạy dự án

### Đặc tả đã đủ dùng cho task đầu tiên

- [ ] Word có nội dung theo khung; những phần không áp dụng được ghi rõ.
- [ ] Docs đã tiếp nhận yêu cầu với nguồn và trạng thái.
- [ ] Feature đầu tiên có đủ input, luồng, output, quyền, rule và AC.
- [ ] Unknown có thể thay đổi thiết kế phần đó đã được giải quyết hoặc task được giới hạn để tránh phụ thuộc.
- [ ] Kiến trúc/stack cần cho phần đầu đã được chọn hoặc giao quyền chọn rõ.
- [ ] Data/API/UI khớp nhau ở phần chuẩn bị làm.

### Hướng dẫn cho agent hoạt động được

- [ ] Entrypoint được công cụ đọc và link đến rules/docs có thật.
- [ ] Rules ngắn, áp dụng được và không trùng bản đặc tả.
- [ ] Skills có trigger/workflow/validation và ở vị trí nhận diện đúng.
- [ ] Không có nhiều bản nghiệp vụ/quyền chỉnh tay trong docs và skills.
- [ ] Task chỉ rõ mục tiêu, scope, dependency, AC và validation.
- [ ] Commands đã xác minh; lệnh chưa có được ghi rõ, không trình bày như đã chạy được.

### Cách hoàn thành có bằng chứng

- [ ] Agent kiểm hành vi, quyền và trường hợp lỗi liên quan.
- [ ] Có review source/diff theo kiến trúc, không chỉ nhìn folder.
- [ ] PASS/FAIL/NOT_RUN được báo đúng.
- [ ] Docs được đồng bộ và phần còn lại được bàn giao rõ.

**Cách bắt đầu thực tế:** Điền Word cho toàn hệ thống ở mức tổng quan, mô tả kỹ chức năng đầu tiên, giao agent phân tích và tạo docs, chốt các câu hỏi ảnh hưởng chức năng đó, thiết lập rules/skills phù hợp rồi giao task đầu tiên. Các chức năng tiếp theo được làm rõ dần trong cùng hệ thống tài liệu.
