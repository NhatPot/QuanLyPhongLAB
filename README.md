# LHU IT LAB — Website Quản Lý Phòng Lab CNTT

Dự án Website Quản Lý một Phòng Lab Công nghệ thông tin duy nhất cho Khoa/Trường, được xây dựng theo kiến trúc **Unified Fullstack Next.js** (Next.js App Router + Clean Architecture + SQL Server).

---

## 1. Yêu Cầu Hệ Thống

* **Node.js**: Phiên bản 18 LTS trở lên.
* **SQL Server**: Phiên bản 2019 (Chạy cục bộ hoặc qua Docker).
* **Docker & Docker Compose** (Tùy chọn, để chạy nhanh SQL Server container).

---

## 2. Cài Đặt Ban Đầu

Ứng dụng chạy trực tiếp ở thư mục gốc (root) dự án:

1. Clone mã nguồn dự án.
2. Sao chép và cấu hình file môi trường:
   ```bash
   cp .env.example .env
   ```
3. Cài đặt dependencies từ thư mục root:
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
* Điều chỉnh các thông số kết nối trong tệp `.env`.

### Migration & Seeding Data:
```bash
npm run db:migrate
npm run db:seed
```

---

## 4. Các Lệnh Thực Thi (Scripts)

Tất cả các lệnh dưới đây đều được chạy từ thư mục gốc (root) của dự án:

* **Chạy môi trường phát triển (Development)**:
  * `npm run dev` (Truy cập ứng dụng tại `http://localhost:3000`)
* **Kiểm tra kiểu dữ liệu (TypeScript Type Check)**:
  * `npm run typecheck`
* **Định dạng code (Formatter)**:
  * `npm run format`
* **Biên dịch sản phẩm (Build Production)**:
  * `npm run build`

---

## 5. Kiến Trúc Ứng Dụng (Unified Fullstack Next.js)

Hệ thống được thiết kế theo kiến trúc **Clean Architecture** được tích hợp trực tiếp vào **Next.js App Router Route Handlers**:
1. **Domain Layer (`src/server/domain`)**: Thực thể nghiệp vụ (`Entities`), các đối tượng giá trị (`Value Objects`) và các giao diện lưu trữ (`Repositories`).
2. **Application Layer (`src/server/application`)**: Điều phối luồng nghiệp vụ cụ thể (`Use Cases`), cấu trúc truyền tải (`DTOs`) và cổng dịch vụ ngoại vi (`Ports`).
3. **Infrastructure Layer (`src/server/infrastructure`)**: Triển khai công nghệ chi tiết (kết nối SQL Server, Logger, Auth, Services...).
4. **API Route Handlers (`src/app/api/...`)**: Nhận HTTP request từ Next.js App Router và xử lý thông qua Container use-cases.

---

## 6. Frontend Mock Data Mode

Mặc định ứng dụng sẽ sử dụng SQL Server. Nếu muốn chạy giao diện thử nghiệm độc lập mà không cần kết nối SQL Server:

1. Mở `.env` và đổi `NEXT_PUBLIC_DATA_MODE=sql` thành `NEXT_PUBLIC_DATA_MODE=mock`.
2. Khởi chạy `npm run dev`.

Tài khoản mock mặc định: `admin` / `admin123`.

---

## 7. Module Bảo Trì & Chi Phí

- `/maintenance`: Quản lý bảo trì phòng Lab, máy tính và thiết bị theo vòng đời `PENDING -> SCHEDULED -> IN_PROGRESS -> COMPLETED`.
- `/expenses`: Quản lý chi phí đầu tư (CAPEX) và vận hành (OPEX), phiếu chi tiết, duyệt, thanh toán, audit log, biểu đồ và xuất Excel.
