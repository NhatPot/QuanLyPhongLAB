# IT-LAB MANAGER — Website Quản Lý Phòng Lab CNTT

Dự án Website Quản Lý một Phòng Lab Công nghệ thông tin duy nhất cho Khoa/Trường, được xây dựng theo kiến trúc **Clean Architecture** sử dụng NodeJS + Express + SQL Server ở Backend, và React + Vite + Tailwind CSS ở Frontend.

---

## 1. Yêu Cầu Hệ Thống

* **Node.js**: Phiên bản 18 LTS trở lên.
* **SQL Server**: Phiên bản 2019 (Chạy cục bộ hoặc qua Docker).
* **Docker & Docker Compose** (Tùy chọn, để chạy nhanh SQL Server container).

---

## 2. Cài Đặt Ban Đầu

Dự án sử dụng cơ chế **NPM Workspaces** để quản lý đồng thời Backend và Frontend trong một Repository duy nhất.

1. Clone mã nguồn dự án.
2. Sao chép và cấu hình file môi trường:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Cài đặt toàn bộ dependencies cho cả hai workspace từ thư mục root:
   ```bash
   npm install
   ```

---

## 3. Khởi Chạy Cơ Sở Dữ Liệu SQL Server

### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
Khởi chạy container SQL Server 2019 có sẵn cấu hình bằng lệnh:

```bash
docker compose up -d
```

### Cách 2: Sử dụng SQL Server Cài Local
* Đảm bảo SQL Server đang hoạt động trên cổng `1433`.
* Tạo mới cơ sở dữ liệu có tên là `ItLabManagerDb`.
* Điều chỉnh các thông số kết nối trong tệp `backend/.env`.

---

## 4. Các Lệnh Thực Thi (Scripts)

Tất cả các lệnh dưới đây đều được chạy từ thư mục gốc (root) của dự án:

* **Chạy môi trường phát triển (Development)**:
  * Backend: `npm run dev:backend`
  * Frontend: `npm run dev:frontend`
* **Kiểm tra kiểu dữ liệu (TypeScript Type Check)**:
  * `npm run typecheck`
* **Kiểm tra cú pháp code (Linting)**:
  * `npm run lint`
* **Chạy kiểm thử (Testing)**:
  * `npm run test`
* **Định dạng code (Formatter)**:
  * `npm run format`
* **Biên dịch sản phẩm (Build Production)**:
  * `npm run build`

---

## 5. Kiến Trúc Backend

Ứng dụng Backend tuân thủ nghiêm ngặt **Clean Architecture** gồm 4 lớp chính:
1. **Domain Layer**: Thực thể nghiệp vụ (`Entities`), các đối tượng giá trị (`Value Objects`) và các giao diện lưu trữ (`Repositories`).
2. **Application Layer**: Điều phối luồng nghiệp vụ cụ thể (`Use Cases`), cấu trúc truyền tải (`DTOs`) và cổng dịch vụ ngoại vi (`Ports`).
3. **Infrastructure Layer**: Triển khai công nghệ chi tiết (kết nối SQL Server, Logger, Auth, Services...).
4. **Presentation Layer**: Nhận yêu cầu mạng và trả kết quả (Express Controllers, Routes, Middlewares).

Dòng phụ thuộc một chiều hướng vào lõi: `Presentation -> Application -> Domain` và `Infrastructure -> Application/Domain`.
---

## 6. Frontend mock data mode

SQL mode remains the default. To run the frontend without calling the backend or SQL Server:

```powershell
Copy-Item frontend/.env.mock.example frontend/.env.local
npm run dev:frontend
```

The mock login is `admin` / `admin123`. Mock users, roles, permissions, audit logs, computers, equipment, lab profile, bookings and maintenance schedules are kept in browser memory and reset after a full reload or restart. The dashboard shows an amber `Mock data` banner while this mode is active.

To return to SQL Server mode, set `NEXT_PUBLIC_DATA_MODE=sql` (or remove it) in `frontend/.env.local` and restart Next.js.

---

## 7. Module bảo trì tài sản

Module `/maintenance` quản lý bảo trì phòng Lab, máy tính và thiết bị theo vòng đời `PENDING -> SCHEDULED -> IN_PROGRESS -> COMPLETED`, đồng thời hỗ trợ hủy lịch chưa bắt đầu. Máy tính chuyển sang `BROKEN` sẽ tự sinh đề xuất `PENDING`; máy đã ở `MAINTENANCE` được liên kết với hồ sơ đang thực hiện; máy quá 270 ngày kể từ lần bảo trì gần nhất (hoặc ngày tạo nếu chưa từng bảo trì) được nhắc xếp lịch. Cơ chế đồng bộ chống tạo trùng hồ sơ đang mở.

Trạng thái `MAINTENANCE` của máy tính chỉ được điều khiển từ thao tác bắt đầu/hoàn tất lịch bảo trì. Khi hoàn tất, hệ thống lưu lại ngày bảo trì làm mốc cho chu kỳ 270 ngày tiếp theo. Trạng thái tài sản và số lượng tồn kho liên quan được cập nhật trong cùng transaction; mọi thao tác đều được ghi audit log.

Các API chính nằm dưới `/api/maintenances`, gồm danh sách, thống kê, dữ liệu lựa chọn, chi tiết, tạo/cập nhật/xóa lịch và các hành động `start`, `complete`, `cancel`. Chạy `npm run db:migrate --workspace backend` để tạo bảng `MaintenanceSchedules` và bảy quyền `MAINTENANCE_*` trên cơ sở dữ liệu mới.
