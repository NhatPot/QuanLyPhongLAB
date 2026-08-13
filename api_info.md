# 📡 Server API Specification — FIT PC Monitor

Tài liệu mô tả chi tiết tất cả các REST API Endpoints được hỗ trợ bởi hệ thống **FIT PC Monitor Client** kết nối với Server quản lý **QuanLyPhongLAB**.

---

## 🔑 Nguyên tắc định danh thiết bị (Device Identification)

Hệ thống sử dụng **Địa chỉ MAC của Card Mạng Vật Lý Chính (Primary Physical MAC Address)** làm **Mã định danh duy nhất (Unique Hardware Identifier)** cho mỗi bộ máy tính.

### 🌟 Ưu điểm đồng bộ Windows ↔ Ubuntu:
- **Bất biến theo hệ điều hành**: Dù máy tính khởi động vào **Windows** hay **Ubuntu (Dual-Boot)**, hoặc cài lại Win/Linux, địa chỉ MAC vật lý ghi trên chip ROM của bo mạch chủ vẫn **100% giống nhau**.
- **Không cần quyền Admin/Root**: Cả Windows và Ubuntu (user thường) đều có thể đọc trực tiếp địa chỉ MAC vật lý.

### 📌 Quy tắc lấy Primary MAC chuẩn (Loại bỏ Card mạng ảo):
1. **Trên Ubuntu (Linux)**: 
   - Duyệt các interface trong `/sys/class/net/` có thư mục con `device` (biểu thị phần cứng thật).
   - Ưu tiên card mạng dây (`enp*`, `eth*`), sau đó đến card WiFi (`wlp*`, `wlan*`).
   - Bỏ qua các interface ảo: `lo`, `docker*`, `veth*`, `br-*`, `virbr*`, `tun*`, `tap*`.
2. **Trên Windows**: 
   - Lấy MAC từ Network Adapter vật lý chính.
   - Bỏ qua các adapter ảo: `Hyper-V`, `vEthernet`, `VirtualBox`, `VMware`, `WSL`, `TAP`, `Bluetooth`, `Loopback`.

---

## 🔒 Cấu trúc Header chung

Tất cả các API POST gửi lên Server sử dụng cấu trúc Header tiêu chuẩn:

```http
Content-Type: application/json
Authorization: Bearer <API_KEY>
X-API-Key: <API_KEY>
```

> **Lưu ý:** Khi `API_KEY` chưa được thiết lập (ở lần đăng ký đầu tiên), các header `Authorization` và `X-API-Key` có thể để trống. Sau khi đăng ký thành công, `api_key` nhận được sẽ dùng cố định vĩnh viễn cho đến khi hủy đăng ký.

---

## 📋 Danh sách API Endpoints

| STT | Phương thức | Endpoint | Mô tả ngắn |
| :---: | :--- | :--- | :--- |
| 1 | `GET` | `/api/health` (hoặc `/`) | Health Check — Kiểm tra kết nối máy chủ. |
| 2 | `POST` | `/api/devices/register` | Đăng ký thiết bị và nhận `device_id` (Primary MAC), `api_key`. |
| 3 | `POST` | `/api/devices/unregister` | Hủy đăng ký thiết bị khỏi máy chủ và thu hồi `api_key`. |
| 4 | `POST` | `/api/auth/login` | Xác thực tài khoản người dùng với máy chủ. |
| 5 | `POST` | `/api/devices/bind-user` | Liên kết thông tin người dùng với thiết bị (chuyển trạng thái `IN_USE`). |
| 6 | `POST` | `/api/devices/unbind-user` | Hủy liên kết người dùng khi đăng xuất (chuyển trạng thái `ACTIVE`). |
| 7 | `POST` | `/api/devices/metrics` | Gửi định kỳ thông số hệ thống (CPU, RAM, Disk, Network, Apps). |
| 8 | `POST` | `/api/devices/alert-hardware-change` | Cảnh báo khẩn cấp khi linh kiện phần cứng thay đổi lúc khởi động. |

---

## 🔍 Chi tiết API Payloads

### 1. Health Check — `GET /api/health`

* **Mô tả:** Kiểm tra trạng thái hoạt động và phản hồi từ Server.
* **Endpoint:** `GET /api/health` (hoặc `GET /`)
* **Headers:** `Content-Type: application/json`

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "message": "FIT PC Monitor Server Alive"
}
```

---

### 2. Đăng ký thiết bị — `POST /api/devices/register`

* **Mô tả:** Khởi tạo thông tin phần cứng lần đầu với máy chủ. Nhận dạng máy bằng Primary MAC và cấp `api_key` cố định.
* **Endpoint:** `POST /api/devices/register`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "mac_address": "24:4b:fe:03:c4:03",
  "hostname": "DESKTOP-SMTJA1Q",
  "os": "Microsoft Windows 11 Pro",
  "os_version": "10.0.26200",
  "platform": "Windows",
  "arch": "x64",
  "cpu_model": "Intel Core™ i5-10600KF",
  "cpu_cores": 6,
  "gpu_model": "NVIDIA GeForce RTX 2080 Ti",
  "gpu": "NVIDIA GeForce RTX 2080 Ti",
  "total_ram_gb": 31.9,
  "total_disk_gb": 911.9,
  "disk_size_gb": 911.9,
  "disk_info": [
    { "mount": "C:", "sizeGb": 500, "usedGb": 150.2, "usePercent": 30 }
  ],
  "ip_address": "192.168.1.100",
  "ip_addresses": [
    "192.168.1.100",
    "10.8.0.2",
    "fe80::1234:5678:9abc:def0"
  ],
  "uuid": "b4de5f15-c674-4139-e7fd-244bfe03c403",
  "status": "ACTIVE",
  "registered_at": "2026-08-06T16:25:40.807Z"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Đăng ký thiết bị thành công",
  "device_id": "24:4b:fe:03:c4:03",
  "api_key": "sk_live_8q5a70ikbpb"
}
```

---

### 3. Hủy đăng ký thiết bị — `POST /api/devices/unregister`

* **Mô tả:** Báo cáo máy chủ hủy đăng ký thiết bị hiện tại khỏi hệ thống, thu hồi API Key và tạm ẩn máy tính.
* **Endpoint:** `POST /api/devices/unregister`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "unregistered_at": "2026-08-08T14:30:00.000Z"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Hủy đăng ký thiết bị thành công",
  "device_id": "24:4b:fe:03:c4:03",
  "unregistered_at": "2026-08-08T14:30:00.000Z"
}
```

---

### 4. Đăng nhập người dùng — `POST /api/auth/login`

* **Mô tả:** Gửi tài khoản & mật khẩu người dùng lên Server để xác thực đăng nhập.
* **Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "your_password_here",
  "device_id": "24:4b:fe:03:c4:03"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Đăng nhập người dùng thành công",
  "user": {
    "user_id": "USR-1234",
    "username": "user@example.com",
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "user_jwt_token_1770000000000"
}
```

---

### 5. Liên kết người dùng với thiết bị — `POST /api/devices/bind-user`

* **Mô tả:** Đăng ký phiên hoạt động của người dùng cụ thể trên máy tính. Trạng thái máy tính lập tức chuyển sang `IN_USE` ("Đang sử dụng").
* **Endpoint:** `POST /api/devices/bind-user`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "user_id": "USR-1234",
  "username": "user@example.com",
  "full_name": "Nguyễn Văn A",
  "login_at": "2026-08-06T16:30:00.000Z",
  "hostname": "DESKTOP-SMTJA1Q",
  "ip_address": "192.168.1.100"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Đã liên kết tài khoản user@example.com với máy tính 24:4b:fe:03:c4:03. Trạng thái đang sử dụng.",
  "bound_at": "2026-08-06T16:30:00.000Z"
}
```

---

### 6. Hủy liên kết người dùng — `POST /api/devices/unbind-user`

* **Mô tả:** Báo cáo máy chủ kết thúc phiên đăng nhập của người dùng. Trạng thái máy tính trở về `ACTIVE` ("Sẵn sàng").
* **Endpoint:** `POST /api/devices/unbind-user`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "user_id": "USR-1234",
  "username": "user@example.com",
  "logout_at": "2026-08-06T17:00:00.000Z"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Đã hủy phiên sử dụng máy tính thành công"
}
```

---

### 7. Gửi dữ liệu giám sát định kỳ — `POST /api/devices/metrics`

* **Mô tả:** Gửi định kỳ các thông số tải CPU, RAM, Disk, Traffic mạng và danh sách phần mềm cài đặt. Nếu quá 5 phút không có metrics, Server sẽ tự động đăng xuất phiên làm việc.
* **Endpoint:** `POST /api/devices/metrics`

**Request Body:**
```json
{
  "device_id": "24:4b:fe:03:c4:03",
  "timestamp": "2026-08-06T16:25:42.499Z",
  "status": {
    "device_status": "IN_USE",
    "is_in_use": true,
    "current_user": "user@example.com",
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
      "txSec": 64,
      "ip_address": "192.168.1.100"
    }
  },
  "installed_apps": [
    { "name": "Google Chrome", "version": "127.0.6533.89", "publisher": "Google LLC" },
    { "name": "Visual Studio Code", "version": "1.92.0", "publisher": "Microsoft Corporation" }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Đã nhận dữ liệu metrics thành công",
  "received_at": "2026-08-06T16:25:42.499Z"
}
```

---

### 8. Báo cáo khẩn cấp thay đổi phần cứng — `POST /api/devices/alert-hardware-change`

* **Mô tả:** Phát hiện linh kiện (RAM, GPU, CPU, MAC, ...) thay đổi so với cấu hình ban đầu và tự động tạo Incident Report mức HIGH.
* **Endpoint:** `POST /api/devices/alert-hardware-change`

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

**Response (`200 OK`):**
```json
{
  "status": "alert_received",
  "message": "Báo cáo thay đổi cấu hình phần cứng đã được ghi nhận thành công",
  "alert_time": "2026-08-06T16:35:10.350Z"
}
```
