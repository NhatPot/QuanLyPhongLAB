# 02 — Khởi tạo dự án từ repository trống

## Mục tiêu

Tạo bộ khung chạy được cho một repository mới hoàn toàn. Không triển khai nghiệp vụ booking ở bước này.

Đọc trước:

- `docs/00-chot-yeu-cau-va-quyet-dinh-ky-thuat.md`
- `docs/01-dac-ta-vai-tro-va-phan-quyen.md`
- `.agent/AGENTS.md`
- `.agent/skills/clean-architecture-nodejs/SKILL.md`

---

## 1. Kiểm tra trước khi tạo

Antigravity phải:

1. Liệt kê thư mục gốc.
2. Xác nhận chưa có `backend`, `frontend`, `package.json`.
3. Không xóa `.agent`, `docs`, ảnh giao diện, Word hoặc TXT.
4. Không ghi đè file người dùng nếu đã tồn tại.
5. Ghi lại phiên bản Node và npm đang dùng.

---

## 2. Cấu trúc cần tạo

```text
QuanLyPhongLAB/
├── backend/
├── frontend/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── README.md
├── docs/
├── .agent/
├── .editorconfig
├── .gitignore
├── package.json
├── docker-compose.yml
└── README.md
```

---

## 3. Root workspace

Tạo `package.json` root với npm workspaces:

```json
{
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ]
}
```

Scripts root đề xuất:

```text
dev
dev:backend
dev:frontend
build
lint
typecheck
test
format
```

Không dùng script phụ thuộc Unix nếu có thể; dự án phải chạy trên Windows PowerShell.

---

## 4. Backend bootstrap

Khởi tạo:

```text
backend/
├── src/
│   ├── app.ts
│   └── main.ts
├── tests/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.js
├── .env.example
└── README.md
```

Yêu cầu:

- TypeScript `strict: true`.
- Express app tách khỏi `main.ts` để test được.
- `GET /api/health` trả response chuẩn.
- Có graceful shutdown cơ bản.
- Không kết nối database thật trong health check ở bước này.
- Port lấy từ `PORT`.

Response:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "service": "quan-ly-phong-lab-api"
  }
}
```

---

## 5. Frontend bootstrap

Khởi tạo React + Vite + TypeScript:

```text
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── styles/
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .env.example
└── README.md
```

Yêu cầu:

- Chỉ tạo trang khởi động tối giản.
- Chưa tạo dashboard giả.
- Cấu hình alias `@/`.
- Cấu hình Tailwind.
- Biến môi trường `VITE_API_BASE_URL`.

---

## 6. Docker SQL Server

Tạo `docker-compose.yml` cho SQL Server, nhưng không bắt buộc user phải dùng Docker.

Yêu cầu:

- Password lấy từ `.env`, không ghi cứng.
- Expose port mặc định hoặc port cấu hình.
- Có volume.
- Có healthcheck.
- Ghi hướng dẫn thay bằng SQL Server cài local.

Không commit file `.env`.

---

## 7. Git ignore

Bỏ qua:

```text
node_modules
dist
coverage
.env
.env.*
!.env.example
*.log
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
```

Không ignore `.agent`, `docs` hoặc migration.

---

## 8. README gốc

README phải có:

- Mục tiêu dự án.
- Công nghệ.
- Yêu cầu môi trường.
- Cách cài package.
- Cách chạy backend/frontend.
- Cách chạy SQL Server bằng Docker.
- Cách chạy lint, typecheck, test, build.
- Cấu trúc thư mục.
- Ghi rõ project đang ở giai đoạn khởi tạo.

---

## 9. Kiểm tra bắt buộc

Chạy:

```text
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Nếu test chưa có, tạo test health endpoint tối thiểu.

---

## Không được làm trong bước này

- Không tạo migration nghiệp vụ.
- Không tạo JWT.
- Không seed role.
- Không tạo màn hình dashboard hoàn chỉnh.
- Không triển khai booking.
- Không tự thêm ORM.

---

## Tiêu chí hoàn thành bước 02

- Backend và frontend đều build được.
- Health endpoint chạy.
- Root workspace scripts hoạt động.
- Có Docker SQL Server và hướng dẫn fallback.
- Không làm mất tài liệu nguồn.
- Báo cáo rõ cây thư mục và lệnh đã chạy.
