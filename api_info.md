# 🖥️ FIT PC Monitor

Hệ thống giám sát và quản lý tài nguyên máy tính thời gian thực (System Monitoring Agent) dành cho **Windows** và **Ubuntu**, phát triển trên nền tảng **Electron + React + Vite**.

---

## 📌 Tính năng chính

- 📊 **Giám sát thời gian thực**: Thu thập thông số CPU, RAM, Disk, Network và danh sách ứng dụng đã cài đặt trên hệ thống.
- ⚡ **Tự động đăng ký & Cấu hình môi trường**: Tải `SERVER_URL` và `API_KEY` từ file `.env`, tự động lưu `api_key` được cấp từ máy chủ sau khi đăng ký.
- 🚨 **Cảnh báo khẩn cấp thay đổi phần cứng**: Tự động phát hiện khi thiết bị bị tháo/thay thế linh kiện (CPU, GPU, RAM, MAC, UUID, OS, Hostname) mỗi khi khởi động và gửi cảnh báo khẩn cấp lên Server.
- 📥 **Khay hệ thống (System Tray / Hidden Icons)**: Tự động thu nhỏ xuống khay hệ thống ẩn khi nhấn nút Thu nhỏ hoặc Đóng.
- 🔒 **Khóa bảo mật**: Hỗ trợ thiết lập và đổi mật khẩu bảo vệ ứng dụng.

---

## 📡 Danh sách API Endpoints Hỗ Trợ (Server API Specification)

Tất cả các yêu cầu POST tới Server đều có header `Content-Type: application/json`. Khi có `API_KEY`, Client sẽ gửi kèm header `Authorization: Bearer <API_KEY>` và `X-API-Key: <API_KEY>`.

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/health` (hoặc `/`) | Kiểm tra trạng thái hoạt động của máy chủ (Health Check). |
| `POST` | `/api/devices/register` | Đăng ký thông tin thiết bị với máy chủ. Máy chủ trả về `device_id` và `api_key`. |
| `POST` | `/api/devices/metrics` | Gửi dữ liệu định kỳ gồm thông số tài nguyên (CPU, RAM, Disk, Network) và danh sách ứng dụng. |
| `POST` | `/api/devices/alert-hardware-change` | Báo cáo khẩn cấp khi phát hiện thông số phần cứng bị thay đổi lúc khởi động. |

---

### 🔍 Chi tiết Payload các Endpoint

#### 1. Đăng ký thiết bị — `POST /api/devices/register`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "hostname": "DESKTOP-SMTJA1Q",
  "os": "Microsoft Windows 11 Pro",
  "os_version": "10.0.26200",
  "platform": "Windows",
  "arch": "x64",
  "cpu_model": "Intel Core™ i5-10600KF",
  "cpu_cores": 6,
  "total_ram_gb": 31.9,
  "mac_address": "24:4b:fe:03:c4:03",
  "uuid": "b4de5f15-c674-4139-e7fd-244bfe03c403",
  "registered_at": "2026-08-06T16:25:40.807Z"
}
```

**Response (Success - 200 OK):**
```json
{
  "status": "success",
  "message": "Đăng ký thiết bị thành công",
  "device_id": "24:4b:fe:03:c4:03",
  "api_key": "sk_live_8q5a70ikbpb"
}
```

---

#### 2. Gửi dữ liệu giám sát định kỳ — `POST /api/devices/metrics`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "timestamp": "2026-08-06T16:25:42.499Z",
  "status": {
    "cpu": {
      "usage": 78.6,
      "cores": [75.2, 80.1, 72.4, 82.0, 79.5, 81.2],
      "temperature": 48
    },
    "ram": {
      "used": 14337,
      "total": 32672,
      "free": 18335,
      "usagePercent": 43.9
    },
    "disk": {
      "used": 399.2,
      "total": 911.9,
      "usagePercent": 43.8,
      "partitions": [
        { "mount": "C:", "used": 150.2, "size": 500, "usePercent": 30.0 }
      ]
    },
    "network": {
      "rxBytes": 1048576,
      "txBytes": 524288,
      "rxSec": 128,
      "txSec": 64
    }
  },
  "installed_apps": [
    { "name": "Google Chrome", "version": "127.0.6533.89", "publisher": "Google LLC" },
    { "name": "Visual Studio Code", "version": "1.92.0", "publisher": "Microsoft Corporation" }
  ]
}
```

**Response (Success - 200 OK):**
```json
{
  "status": "success",
  "message": "Đã nhận dữ liệu metrics thành công",
  "received_at": "2026-08-06T16:25:42.499Z"
}
```

---

#### 3. Báo cáo khẩn cấp thay đổi phần cứng — `POST /api/devices/alert-hardware-change`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "alert_type": "HARDWARE_CHANGED",
  "timestamp": "2026-08-06T16:35:10.350Z",
  "changes": [
    {
      "field": "RAM (GB)",
      "old": 16,
      "new": 31.9
    },
    {
      "field": "GPU Model",
      "old": "Intel HD Graphics 620",
      "new": "NVIDIA GeForce RTX 2080 Ti"
    }
  ],
  "previous_hardware": {
    "hostname": "DESKTOP-SMTJA1Q",
    "cpuModel": "Intel Core™ i5-10600KF",
    "gpuModel": "Intel HD Graphics 620",
    "totalRam": 16,
    "macAddress": "24:4b:fe:03:c4:03"
  },
  "current_hardware": {
    "hostname": "DESKTOP-SMTJA1Q",
    "cpuModel": "Intel Core™ i5-10600KF",
    "gpuModel": "NVIDIA GeForce RTX 2080 Ti",
    "totalRam": 31.9,
    "macAddress": "24:4b:fe:03:c4:03"
  }
}
```

**Response (Success - 200 OK):**
```json
{
  "status": "alert_received",
  "message": "Báo cáo thay đổi cấu hình phần cứng đã được ghi nhận thành công",
  "alert_time": "2026-08-06T16:35:10.350Z"
}
```

---

## ⚙️ Cấu hình Môi trường (`.env`)

Tạo file `.env` tại thư mục gốc dự án:

```env
# URL máy chủ quản lý
SERVER_URL=http://localhost:3000

# API Key mặc định (tùy chọn)
API_KEY=
```

---

## 🚀 Hướng dẫn Chạy & Kiểm thử

### 1. Khởi chạy ứng dụng Chế độ Phát triển (Dev Mode):
```bash
npm run dev
```

### 2. Thử nghiệm với Server Giả lập (Mock Server Local):
```bash
# Terminal 1: Chạy Mock Server (Cổng 3000)
npm run mock:server

# Terminal 2: Chạy script test tự động
npm run test:agent
```

### 3. Đóng gói bản cài đặt cho Windows (`.exe`):
```bash
npm run dist:win
```
Bản cài đặt sẽ được tạo tại thư mục `dist/FIT PC Monitor Setup 1.0.0.exe`.
