# Nhập thiết bị từ CSV / Excel

Vào **Thiết bị → tab Thiết bị → Nhập từ file**. Chức năng dùng quyền `EQUIPMENT_CREATE` (ADMIN được phép theo cơ chế phân quyền hiện tại).

1. Tải **Mẫu Excel** hoặc **Mẫu CSV**.
2. Điền dữ liệu. Excel nhập ở sheet `Nhap thiet bi`, bắt đầu dòng 7. Sheet `Danh muc` chứa danh mục đang có khi tải mẫu; sheet `Huong dan` chứa giải thích và ví dụ, không được nhập vào database.
3. Chọn file, xem trước mã thiết bị và sửa hết lỗi theo số dòng.
4. Bấm **Nhập thiết bị**. Danh sách và số lượng tồn kho cập nhật sau khi lưu thành công.

| Cột          | Quy tắc                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------- |
| Mã danh mục  | Bắt buộc; chọn mã danh mục có sẵn. Cũng nhận tên danh mục nếu khớp duy nhất.             |
| Mã thiết bị  | Tùy chọn, tối đa 50 ký tự. Để trống sẽ cấp mã theo danh mục. Mã tự nhập được giữ nguyên. |
| Tên thiết bị | Bắt buộc, tối đa 255 ký tự.                                                              |
| Số lượng     | Số nguyên từ 1; để trống lấy 1. Đây là số lượng ban đầu của loại thiết bị mới.           |
| Vị trí       | Tùy chọn, tối đa 255 ký tự.                                                              |
| Trạng thái   | ACTIVE, LOCKED hoặc INACTIVE; để trống lấy ACTIVE.                                       |
| Ghi chú      | Tùy chọn, tối đa 2.000 ký tự.                                                            |

Giới hạn: 500 dòng / file, tối đa 5 MB. Hỗ trợ `.xlsx` và CSV UTF-8 (phân cách bằng dấu phẩy, chấm phẩy hoặc tab). File `.xls` cần lưu lại thành `.xlsx`. Giữ mã ở dạng Text để bảo toàn số 0 đầu. Không dùng công thức hoặc ô ngày tháng trong dữ liệu nhập.

Chức năng **chỉ thêm mới**, không ghi đè, không tạo danh mục và không cộng tồn kho vào thiết bị đã có. Mã trùng trong file hoặc database (kể cả mã thiết bị đã xóa mềm) sẽ bị báo lỗi. Để tăng số lượng thiết bị cũ, dùng thao tác **Kho**. File có lỗi không lưu dòng nào. Lưu thiết bị và nhật ký nhập cùng một transaction SQL Server. Không thay đổi tài khoản, vai trò hoặc cấu hình quản trị.

Nếu mất kết nối lúc lưu, tải lại danh sách kiểm tra trước khi thử lại. Giao diện gửi lại các mã đã xem trước, tránh tự cấp mã mới khi thử lại cùng lượt nhập.

## API

`POST /api/equipments/import`, xác thực như các API thiết bị hiện có, `Content-Type: application/json`.

```json
{
  "commit": false,
  "rows": [
    {
      "row": 7,
      "category": "IOT",
      "code": "",
      "name": "Kit phát triển ESP32",
      "quantity": 1,
      "location": "Tủ A",
      "status": "ACTIVE",
      "note": ""
    }
  ]
}
```

`IOT` là ví dụ, phải thay bằng mã danh mục thật. `commit: false` kiểm tra, không ghi dữ liệu; phản hồi `data` gồm `rows` đã chuẩn hóa/cấp mã, `errors: [{row, message}]`, `imported: 0`. Muốn lưu, gửi lại các `rows` của bước xem trước với `commit: true`. Server luôn kiểm tra lại và trả số dòng đã nhập trong `imported`. HTTP 200 có thể chứa lỗi từng dòng: luôn kiểm tra `errors` trước khi coi lượt nhập là thành công.

Không cần migration hay thư viện mới. ExcelJS chỉ được tải khi người dùng đọc file/tải mẫu.

## Kiểm thử

```powershell
npm run typecheck
npx vitest run --pool=threads --maxWorkers=1 src/lib/equipment-import.test.ts src/features/equipments/equipment-import-file.test.ts src/server/application/use-cases/equipment/ImportEquipments.test.ts
```

Các kiểm thử dùng dữ liệu giả lập, không kết nối hoặc ghi vào database thật.
