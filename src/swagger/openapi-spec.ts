import { selfServiceAuthPaths } from './self-service-auth-spec';
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Hệ Thống Quản Lý Phòng LAB - API Documentation",
    description: "Tài liệu API đầy đủ cho Hệ Thống Quản Lý Phòng LAB (Fullstack Next.js App Router Architecture). Bao gồm Xác thực, Quản lý Người dùng, Vai trò & Phân quyền, Quản lý Máy tính, Thiết bị, Đăng ký & Lịch mượn phòng LAB, Bảo trì, Sự cố, Tài chính Chi phí, Kiểm soát Audit Logs và Device Agent Monitoring API.",
    version: "1.0.0",
    contact: {
      name: "Đội ngũ phát triển Quản Lý Phòng LAB",
      email: "admin@labmanagement.edu.vn"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Next.js Local Server API Endpoint"
    }
  ],
  components: {
    securitySchemes: {
      CookieAuth: {
        type: "apiKey", in: "cookie", name: "accessToken",
        description: "Web dùng cookie HttpOnly. Thao tác ghi cần X-CSRF-Token từ GET /auth/csrf. Swagger tự dùng phiên hiện tại.",
      },
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Nhập JWT Access Token vào đây (ví dụ: eyJhbGciOiJKV1Qi...)"
      },
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "API Key cho Device Agent Client"
      }
    },
    schemas: {
      ApiResponseSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Thao tác thành công." },
          data: { type: "object" },
          meta: { type: "object", nullable: true }
        }
      },
      ApiResponseError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "UNAUTHORIZED" },
              message: { type: "string", example: "Vui lòng đăng nhập để tiếp tục." },
              details: { type: "object", nullable: true }
            }
          }
        }
      },
      PaginatedMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          pageSize: { type: "integer", example: 10 },
          totalItems: { type: "integer", example: 42 },
          totalPages: { type: "integer", example: 5 }
        }
      },
      LoginPayload: {
        type: "object",
        required: ["identifier", "password"],
        properties: {
          identifier: { type: "string", example: "admin" },
          password: { type: "string", example: "Admin@123" }
        }
      },
      ChangePasswordPayload: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", example: "OldPass@123" },
          newPassword: { type: "string", example: "NewPass@123" }
        }
      },
      UpdateProfilePayload: {
        type: "object",
        required: ["fullName", "email"],
        properties: {
          fullName: { type: "string", example: "Quản trị viên Hệ thống" },
          email: { type: "string", example: "admin@lab.edu.vn" },
          phone: { type: "string", example: "0912345678" },
          department: { type: "string", example: "Khoa CNTT" },
          avatarUrl: { type: "string", nullable: true }
        }
      },
      CreateUserPayload: {
        type: "object",
        required: ["fullName", "email", "username", "status", "roleCodes", "temporaryPassword"],
        properties: {
          fullName: { type: "string", example: "Nguyễn Văn A" },
          email: { type: "string", example: "nguyenvana@lab.edu.vn" },
          username: { type: "string", example: "nguyenvana" },
          phone: { type: "string", example: "0987654321" },
          department: { type: "string", example: "Khoa Điện tử" },
          status: { type: "string", enum: ["ACTIVE", "LOCKED", "INACTIVE"], example: "ACTIVE" },
          roleCodes: { type: "array", items: { type: "string" }, example: ["TEACHER"] },
          temporaryPassword: { type: "string", example: "Temp@123456" }
        }
      },
      CreateComputerPayload: {
        type: "object",
        required: ["code", "name", "status"],
        properties: {
          code: { type: "string", example: "PC-01" },
          name: { type: "string", example: "Máy trạm Lab 01" },
          position: { type: "string", example: "Dãy A · Bàn 01" },
          status: { type: "string", enum: ["ACTIVE", "IN_USE", "BROKEN", "MAINTENANCE", "LOCKED", "INACTIVE"], example: "ACTIVE" },
          note: { type: "string", example: "Máy trạm cấu hình cao" }
        }
      },
      CreateEquipmentPayload: {
        type: "object",
        required: ["code", "name", "categoryId", "totalQuantity", "location"],
        properties: {
          code: { type: "string", example: "PJ-01" },
          name: { type: "string", example: "Máy chiếu Panasonic" },
          categoryId: { type: "string", example: "guid-danh-muc" },
          totalQuantity: { type: "integer", example: 5 },
          location: { type: "string", example: "Tủ thiết bị B" },
          managerId: { type: "string", nullable: true },
          status: { type: "string", enum: ["ACTIVE", "MAINTENANCE", "LIQUIDATED", "INACTIVE"], example: "ACTIVE" },
          note: { type: "string", nullable: true }
        }
      },
      CreateBookingPayload: {
        type: "object",
        required: ["bookingType", "purpose", "startTime", "endTime"],
        properties: {
          requesterId: { type: "string", description: "ID người mượn (Dành cho Admin đăng ký hộ)" },
          bookingType: { type: "string", enum: ["FULL_LAB", "COMPUTERS_ONLY", "EQUIPMENTS_ONLY", "HYBRID"], example: "FULL_LAB" },
          purpose: { type: "string", example: "Thực hành môn Mạng máy tính" },
          purposeGroupId: { type: "string", example: "GIANG_DAY" },
          startTime: { type: "string", format: "date-time", example: "2026-08-10T08:00:00Z" },
          endTime: { type: "string", format: "date-time", example: "2026-08-10T11:30:00Z" },
          numberOfPeople: { type: "integer", example: 40 },
          numberOfComputers: { type: "integer", example: 40 },
          equipments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                equipmentId: { type: "string" },
                quantity: { type: "integer" }
              }
            }
          },
          note: { type: "string", nullable: true }
        }
      },
      CreateMaintenancePayload: {
        type: "object",
        required: ["targetType", "targetId", "title", "reason", "scheduledStartAt", "expectedEndAt", "quantity", "estimatedCost"],
        properties: {
          targetType: { type: "string", enum: ["COMPUTER", "EQUIPMENT", "LAB_ROOM"], example: "COMPUTER" },
          targetId: { type: "string", example: "guid-may-tinh" },
          title: { type: "string", example: "Thay keo tản nhiệt và dọn bụi định kỳ" },
          description: { type: "string", nullable: true },
          reason: { type: "string", example: "Bảo trì định kỳ 270 ngày" },
          scheduledStartAt: { type: "string", format: "date-time", example: "2026-08-15T08:00:00Z" },
          expectedEndAt: { type: "string", format: "date-time", example: "2026-08-15T12:00:00Z" },
          technicianId: { type: "string", nullable: true },
          quantity: { type: "integer", example: 1 },
          estimatedCost: { type: "number", example: 150000 },
          partsNote: { type: "string", nullable: true }
        }
      },
      CreateIncidentPayload: {
        type: "object",
        required: ["title", "description", "severity"],
        properties: {
          title: { type: "string", example: "Máy tính PC-05 không lên nguồn" },
          description: { type: "string", example: "Bật nút nguồn màn hình không sáng, có tiếng bíp liên tục." },
          severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], example: "HIGH" },
          computerId: { type: "string", nullable: true },
          equipmentId: { type: "string", nullable: true },
          bookingRequestId: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true }
        }
      },
      CreateExpensePayload: {
        type: "object",
        required: ["title", "expenseClass", "categoryId", "totalAmount", "fundingSource", "expenseDate"],
        properties: {
          title: { type: "string", example: "Mua bổ sung 10 chuột Logitech B100" },
          expenseClass: { type: "string", enum: ["CAPEX", "OPEX"], example: "OPEX" },
          categoryId: { type: "string", example: "guid-danh-muc-chi-phi" },
          totalAmount: { type: "number", example: 1200000 },
          fundingSource: { type: "string", enum: ["FACULTY_BUDGET", "LAB_REVENUE", "SPONSORSHIP", "OTHER"], example: "FACULTY_BUDGET" },
          expenseDate: { type: "string", format: "date", example: "2026-08-08" },
          vendorName: { type: "string", nullable: true },
          invoiceNumber: { type: "string", nullable: true },
          note: { type: "string", nullable: true }
        }
      },
      DeviceMetricsStatus: {
        type: "object",
        description: "Chi tiết trạng thái vận hành và tài nguyên máy tính",
        example: {
          "device_status": "IN_USE",
          "current_user": "long"
        },
        properties: {
          device_status: { type: "string", example: "IN_USE", description: "Trạng thái vận hành máy tính (IN_USE: Đang sử dụng, ACTIVE: Sẵn sàng, BROKEN: Hỏng, MAINTENANCE: Bảo trì)" },
          current_user: { type: "string", example: "long", description: "Tên đăng nhập người dùng hiện tại" },
          cpu: {
            type: "object",
            description: "Thông số CPU (Tùy chọn)",
            properties: {
              usage: { type: "number", example: 12.5, description: "Phần trăm sử dụng CPU toàn hệ thống (%)" },
              cores: { type: "array", items: { type: "number" }, example: [10.2, 14.5, 11.0, 13.8], description: "Phần trăm sử dụng từng lõi CPU" },
              temperature: { type: "number", example: 45, description: "Nhiệt độ CPU (°C)" }
            }
          },
          ram: {
            type: "object",
            description: "Thông số RAM (Tùy chọn)",
            properties: {
              used: { type: "number", example: 3.2, description: "Dung lượng RAM đã dùng (GB)" },
              total: { type: "number", example: 8.0, description: "Tổng dung lượng RAM (GB)" },
              free: { type: "number", example: 4.8, description: "Dung lượng RAM còn trống (GB)" },
              usagePercent: { type: "number", example: 45.2, description: "Phần trăm RAM đã dùng (%)" }
            }
          },
          disk: {
            type: "object",
            description: "Thông số ổ cứng (Tùy chọn)",
            properties: {
              used: { type: "number", example: 120, description: "Dung lượng ổ cứng đã dùng (GB)" },
              total: { type: "number", example: 256, description: "Tổng dung lượng ổ cứng (GB)" },
              usagePercent: { type: "number", example: 46.8, description: "Phần trăm ổ cứng đã dùng (%)" }
            }
          },
          network: {
            type: "object",
            description: "Thông số mạng (Tùy chọn)",
            properties: {
              download_kbps: { type: "number", example: 120, description: "Tốc độ tải xuống (KB/s)" },
              upload_kbps: { type: "number", example: 45, description: "Tốc độ tải lên (KB/s)" },
              ip_addresses: { type: "array", items: { type: "string" }, example: ["172.16.29.178"] }
            }
          }
        }
      },
      DeviceMetricsPayload: {
        type: "object",
        required: ["device_id"],
        description: "Payload thông số tài nguyên & trạng thái thiết bị đẩy từ Client Agent qua HTTP POST hoặc MQTT Topic `devices/{deviceId}/metrics`",
        example: {
          "device_id": "849cd2a5-ef21-5620-942b-fcc4d745cbda",
          "user_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          "timestamp": "2026-08-11T10:44:10.599Z",
          "status": {
            "device_status": "IN_USE",
            "current_user": "long"
          }
        },
        properties: {
          device_id: { type: "string", example: "849cd2a5-ef21-5620-942b-fcc4d745cbda", description: "Mã định danh duy nhất (UUID 36 ký tự hoặc MAC Address)" },
          timestamp: { type: "string", format: "date-time", example: "2026-08-11T10:44:10.599Z", description: "Thời gian ghi nhận thông số trên Client" },
          user_token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description: "JWT Access Token của người dùng đang đăng nhập" },
          status: { $ref: "#/components/schemas/DeviceMetricsStatus" }
        }
      }
    }
  },
  security: [{ CookieAuth: [] }, { BearerAuth: [] }],
  paths: {
    ...selfServiceAuthPaths,
    "/auth/csrf": {
      get: {
        tags: ["Xác Thực (Auth)"], summary: "Lấy mã bảo vệ CSRF", security: [],
        description: "Đặt csrfToken cookie và trả data.csrfToken. Web gửi giá trị này trong X-CSRF-Token khi ghi, gồm login/refresh/logout. Không cache.",
        responses: { 200: { description: "CSRF token, không phải token đăng nhập" } },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Xác Thực (Auth)"], summary: "Thu hồi tất cả phiên của tài khoản hiện tại",
        description: "Yêu cầu phiên hợp lệ và CSRF với cookie. Thu hồi cả access token qua kiểm tra session DB; xóa cookie trình duyệt.",
        responses: { 200: { description: "Đã đăng xuất tất cả thiết bị" }, 401: { description: "Phiên không hợp lệ" }, 403: { description: "CSRF không hợp lệ" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Xác Thực (Auth)"],
        summary: "Đăng nhập hệ thống",
        description: "Web: access/refresh token chỉ nằm trong cookie HttpOnly; JSON trả user/mustChangePassword/csrfToken. Cần CSRF trước đăng nhập. Native không cookie/Origin/Fetch Metadata gửi X-Auth-Mode: bearer để nhận token JSON.",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginPayload" } } }
        },
        responses: {
          200: { description: "Đăng nhập thành công", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponseSuccess" } } } },
          401: { description: "Sai tên đăng nhập hoặc mật khẩu", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponseError" } } } },
          403: { description: "Thiếu/sai CSRF hoặc Origin" },
          429: { description: "Vượt giới hạn thử đăng nhập; Retry-After: 900" },
        }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Xác Thực (Auth)"],
        summary: "Làm mới Access Token",
        description: "Web dùng refresh cookie + CSRF, đặt lại cookie HttpOnly và trả csrfToken mới, không trả access token JSON. Native gửi X-Auth-Mode: bearer và body refreshToken, không cookie/Origin/Fetch Metadata. Token cũ chỉ dùng được một lần, phiên tối đa 7 ngày.",
        security: [],
        responses: {
          200: { description: "Cấp lại token thành công" },
          401: { description: "Refresh token hết hạn hoặc không hợp lệ" }
        }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Xác Thực (Auth)"],
        summary: "Đăng xuất tài khoản",
        description: "Thu hồi refresh token active và xóa cookie khỏi trình duyệt.",
        security: [],
        responses: {
          200: { description: "Đăng xuất thành công" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Xác Thực (Auth)"],
        summary: "Lấy thông tin tài khoản hiện tại",
        description: "Trả về hồ sơ thông tin cá nhân, danh sách vai trò và quyền hạn của người dùng đang đăng nhập.",
        responses: {
          200: { description: "Lấy thông tin thành công" }
        }
      },
      put: {
        tags: ["Xác Thực (Auth)"],
        summary: "Cập nhật hồ sơ cá nhân",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProfilePayload" } } }
        },
        responses: {
          200: { description: "Cập nhật thành công" }
        }
      }
    },
    "/auth/change-password": {
      post: {
        tags: ["Xác Thực (Auth)"],
        summary: "Đổi mật khẩu tài khoản",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordPayload" } } }
        },
        responses: {
          200: { description: "Đổi mật khẩu thành công" }
        }
      }
    },
    "/users": {
      get: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Lấy danh sách người dùng",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "LOCKED", "INACTIVE"] } },
          { name: "roleCode", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Lấy danh sách thành công" }
        }
      },
      post: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Tạo tài khoản người dùng mới",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUserPayload" } } }
        },
        responses: {
          201: { description: "Tạo thành công" }
        }
      }
    },
    "/users/summary": {
      get: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Thống kê người dùng theo trạng thái",
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/users/{id}": {
      get: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Xem chi tiết người dùng",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Cập nhật thông tin người dùng",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Cập nhật thành công" } }
      },
      delete: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Xóa tài khoản người dùng",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Xóa thành công" } }
      }
    },
    "/users/{id}/status": {
      patch: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Cập nhật trạng thái người dùng (Khóa/Mở khóa)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["ACTIVE", "LOCKED", "INACTIVE"] } } } } }
        },
        responses: { 200: { description: "Cập nhật trạng thái thành công" } }
      }
    },
    "/users/{id}/roles": {
      put: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Phân vai trò cho người dùng",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { roleCodes: { type: "array", items: { type: "string" } } } } } }
        },
        responses: { 200: { description: "Gán vai trò thành công" } }
      }
    },
    "/users/{id}/reset-password": {
      post: {
        tags: ["Quản Lý Người Dùng (Users)"],
        summary: "Đặt lại mật khẩu tạm thời cho người dùng",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { temporaryPassword: { type: "string" } } } } }
        },
        responses: { 200: { description: "Đặt lại mật khẩu thành công" } }
      }
    },
    "/roles": {
      get: {
        tags: ["Vai Trò & Phân Quyền (Roles)"],
        summary: "Lấy danh sách tất cả các vai trò",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/roles/catalog": {
      get: {
        tags: ["Vai Trò & Phân Quyền (Roles)"],
        summary: "Lấy ma trận vai trò và danh sách tất cả các quyền hạn trong hệ thống",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/roles/{code}": {
      get: {
        tags: ["Vai Trò & Phân Quyền (Roles)"],
        summary: "Lấy thông tin chi tiết một vai trò",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Vai Trò & Phân Quyền (Roles)"],
        summary: "Cập nhật danh sách mã quyền hạn (permissions) cho vai trò",
        parameters: [{ name: "code", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { permissionCodes: { type: "array", items: { type: "string" } } } } } }
        },
        responses: { 200: { description: "Cập nhật thành công" } }
      }
    },
    "/labs": {
      get: {
        tags: ["Thông Tin Phòng LAB (Labs)"],
        summary: "Lấy thông tin cấu hình và quy định phòng LAB",
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Thông Tin Phòng LAB (Labs)"],
        summary: "Cập nhật cấu hình và nội quy phòng LAB",
        responses: { 200: { description: "Cập nhật thành công" } }
      }
    },
    "/labs/status": {
      patch: {
        tags: ["Thông Tin Phòng LAB (Labs)"],
        summary: "Đổi trạng thái vận hành phòng LAB",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["ACTIVE", "MAINTENANCE", "LOCKED", "INACTIVE"] } } } } }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/computers": {
      get: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Lấy danh sách máy tính trong phòng LAB",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "position", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Lấy danh sách thành công" } }
      },
      post: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Thêm máy tính mới",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateComputerPayload" } } }
        },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/computers/availability-summary": {
      get: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Lấy tóm tắt thống kê trạng thái khả dụng máy tính",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/computers/{id}": {
      get: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Xem chi tiết thông tin máy tính",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Cập nhật thông tin máy tính",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Cập nhật thành công" } }
      },
      delete: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Xóa máy tính khỏi danh sách",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Xóa thành công" } }
      }
    },
    "/computers/{id}/status": {
      patch: {
        tags: ["Quản Lý Máy Tính (Computers)"],
        summary: "Cập nhật trạng thái vận hành máy tính",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } }
        },
        responses: { 200: { description: "Cập nhật thành công" } }
      }
    },
    "/equipments": {
      get: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Lấy danh sách thiết bị",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Tạo thiết bị mới",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateEquipmentPayload" } } }
        },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/equipments/categories": {
      get: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Danh sách danh mục thiết bị",
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Tạo danh mục thiết bị mới",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["code", "name"], properties: { code: { type: "string" }, name: { type: "string" }, description: { type: "string" } } } } }
        },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/equipments/categories/{id}": {
      delete: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Xóa danh mục thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Xóa danh mục thành công" },
          422: { description: "Không thể xóa danh mục đang có thiết bị sử dụng" }
        }
      }
    },
    "/equipments/{id}": {
      get: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Xem chi tiết thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Cập nhật thông tin thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      delete: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Xóa thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/equipments/{id}/adjust": {
      post: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Điều chỉnh số lượng kho thiết bị (Nhập/Xuất kho)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["delta"], properties: { delta: { type: "integer", example: 5 }, note: { type: "string" } } } } }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/equipments/{id}/report-broken": {
      post: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Báo hỏng thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["quantity", "from"], properties: { quantity: { type: "integer", example: 1 }, from: { type: "string", enum: ["AVAILABLE", "BORROWED"] }, note: { type: "string" } } } } }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/equipments/{id}/transactions": {
      get: {
        tags: ["Quản Lý Thiết Bị (Equipments)"],
        summary: "Lịch sử giao dịch biến động kho thiết bị",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Tạo phiếu đăng ký sử dụng phòng LAB / Máy tính / Thiết bị",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBookingPayload" } } }
        },
        responses: { 201: { description: "Đăng ký thành công" } }
      }
    },
    "/bookings/my-bookings": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Lấy danh sách phiếu mượn của cá nhân tôi",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/calendar": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Lấy dữ liệu sự kiện lịch phòng LAB theo khoảng thời gian",
        parameters: [
          { name: "start", in: "query", required: true, schema: { type: "string", format: "date-time" } },
          { name: "end", in: "query", required: true, schema: { type: "string", format: "date-time" } }
        ],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/admin/pending": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Danh sách phiếu đăng ký chờ quản trị viên phê duyệt",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/purpose-options": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Danh sách các lựa chọn nhóm mục đích đăng ký",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/requester-options": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Danh sách lựa chọn người đại diện đăng ký (Search người mượn)",
        parameters: [{ name: "keyword", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/usage-statistics": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Báo cáo thống kê tỷ lệ sử dụng phòng LAB theo tháng",
        parameters: [{ name: "month", in: "query", schema: { type: "string", example: "2026-08" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/{id}": {
      get: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Xem chi tiết một phiếu đăng ký",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/bookings/{id}/approve": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Phê duyệt phiếu đăng ký mượn LAB",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Phê duyệt thành công" } }
      }
    },
    "/bookings/{id}/reject": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Từ chối phiếu đăng ký mượn LAB",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
        responses: { 200: { description: "Từ chối thành công" } }
      }
    },
    "/bookings/{id}/cancel": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Hủy phiếu đăng ký mượn LAB",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
        responses: { 200: { description: "Hủy thành công" } }
      }
    },
    "/bookings/{id}/check-in": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Điểm danh nhận phòng / thiết bị (Check-in)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Check-in thành công" } }
      }
    },
    "/bookings/{id}/check-out": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Bàn giao trả phòng / thiết bị (Check-out)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Check-out thành công" } }
      }
    },
    "/availability/check": {
      post: {
        tags: ["Đăng Ký & Lịch LAB (Bookings)"],
        summary: "Kiểm tra xung đột thời gian & tính khả dụng của phòng LAB / Máy tính / Thiết bị",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bookingType", "startTime", "endTime"],
                properties: {
                  bookingType: { type: "string", enum: ["FULL_LAB", "COMPUTERS_ONLY", "EQUIPMENTS_ONLY", "HYBRID"] },
                  startTime: { type: "string", format: "date-time" },
                  endTime: { type: "string", format: "date-time" },
                  numberOfPeople: { type: "integer", default: 1 },
                  numberOfComputers: { type: "integer", default: 0 },
                  equipments: { type: "array", items: { type: "object", properties: { equipmentId: { type: "string" }, quantity: { type: "integer" } } } },
                  excludeBookingId: { type: "string" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances": {
      get: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Danh sách lịch bảo trì",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] } },
          { name: "targetType", in: "query", schema: { type: "string", enum: ["COMPUTER", "EQUIPMENT", "LAB_ROOM"] } }
        ],
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Tạo lịch bảo trì mới",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateMaintenancePayload" } } } },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/maintenances/summary": {
      get: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Thống kê tổng quan trạng thái bảo trì",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/options": {
      get: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Dữ liệu gợi ý khởi tạo lịch bảo trì (Danh sách kỹ thuật viên, máy tính, thiết bị)",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/sync-reminders": {
      post: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Đồng bộ tự động đề xuất bảo trì định kỳ 270 ngày & máy hỏng",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/{id}": {
      get: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Xem chi tiết một lịch bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Cập nhật thông tin lịch bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      delete: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Xóa lịch bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/{id}/start": {
      post: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Bắt đầu thực hiện công việc bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/{id}/complete": {
      post: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Xác nhận hoàn tất công việc bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["resultNote", "actualCost", "outcome"],
                properties: {
                  resultNote: { type: "string" },
                  actualCost: { type: "number" },
                  partsNote: { type: "string" },
                  outcome: { type: "string", enum: ["FULLY_FIXED", "PARTIALLY_FIXED", "REPLACEMENT_REQUIRED", "UNREPAIRABLE"] }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/maintenances/{id}/cancel": {
      post: {
        tags: ["Lịch Bảo Trì (Maintenance)"],
        summary: "Hủy lịch bảo trì",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["reason"], properties: { reason: { type: "string" } } } } } },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents": {
      get: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Danh sách báo cáo sự cố",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"] } },
          { name: "severity", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] } }
        ],
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Báo cáo sự cố mới",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateIncidentPayload" } } } },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/incidents/summary": {
      get: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Thống kê tổng quan tình hình sự cố",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/options": {
      get: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Danh sách tài sản (Máy tính, thiết bị, lượt mượn) gợi ý báo sự cố",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/{id}": {
      get: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Xem chi tiết một báo cáo sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Cập nhật thông tin phiếu sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/{id}/assign": {
      post: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Phân công kỹ thuật viên phụ trách xử lý sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["assignedTo"], properties: { assignedTo: { type: "string" } } } } } },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/{id}/start": {
      post: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Bắt đầu xử lý sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/{id}/resolve": {
      post: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Xác nhận xử lý xong sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["resultNote"], properties: { resultNote: { type: "string" } } } } } },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/incidents/{id}/close": {
      post: {
        tags: ["Sự Cố (Incidents)"],
        summary: "Đóng hồ sơ sự cố",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses": {
      get: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Danh sách phiếu chi",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"] } },
          { name: "expenseClass", in: "query", schema: { type: "string", enum: ["CAPEX", "OPEX"] } }
        ],
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Tạo phiếu chi mới (Nháp)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateExpensePayload" } } } },
        responses: { 201: { description: "Tạo nháp thành công" } }
      }
    },
    "/expenses/summary": {
      get: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Báo cáo thống kê chi phí phòng LAB (CAPEX/OPEX, Thanh toán, Danh mục)",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/options": {
      get: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Danh sách danh mục & tùy chọn khởi tạo phiếu chi",
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/categories": {
      get: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Danh sách danh mục chi phí",
        responses: { 200: { description: "Thành công" } }
      },
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Tạo danh mục chi phí mới",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["code", "name", "expenseClass"], properties: { code: { type: "string" }, name: { type: "string" }, expenseClass: { type: "string", enum: ["CAPEX", "OPEX"] }, description: { type: "string" } } } } } },
        responses: { 201: { description: "Tạo thành công" } }
      }
    },
    "/expenses/{id}": {
      get: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Xem chi tiết một phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      put: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Cập nhật thông tin phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      },
      delete: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Xóa phiếu chi nháp",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/{id}/submit": {
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Trình duyệt phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/{id}/approve": {
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Phê duyệt phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/{id}/reject": {
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Từ chối phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["reason"], properties: { reason: { type: "string" } } } } } },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/{id}/mark-paid": {
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Xác nhận đã chi tiền / thanh toán phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["paymentMethod", "paymentDate", "postInventory"],
                properties: {
                  paymentMethod: { type: "string", example: "CHUYEN_KHOAN" },
                  paymentDate: { type: "string", format: "date", example: "2026-08-08" },
                  postInventory: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/expenses/{id}/cancel": {
      post: {
        tags: ["Tài Chính & Chi Phí (Expenses)"],
        summary: "Hủy phiếu chi",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/audit-logs": {
      get: {
        tags: ["Kiểm Soát Systems (Audit Logs)"],
        summary: "Lấy nhật ký thao tác và audit log của toàn hệ thống",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "entityName", in: "query", schema: { type: "string" } }
        ],
        responses: { 200: { description: "Thành công" } }
      }
    },
    "/devices/metrics": {
      get: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Lấy thông số giám sát realtime (CPU, RAM, Disk, Traffic) của tất cả máy tính",
        description: "Thông số giám sát realtime được push tự động qua MQTT Broker (Topic: `devices/{deviceId}/metrics`). WebSocket Client kết nối qua SSL WebSocket WSS để nhận dữ liệu đẩy tức thì.",
        responses: {
          200: {
            description: "Thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Lấy dữ liệu metrics thiết bị thành công." },
                    data: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        properties: {
                          timestamp: { type: "string", format: "date-time", example: "2026-08-11T10:44:10.599Z" },
                          isOffline: { type: "boolean", example: false },
                          status: { $ref: "#/components/schemas/DeviceMetricsStatus" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Client Device Agent đẩy thông số tài nguyên, trạng thái và người dùng định kỳ về Server (HTTP Fallback hoặc MQTT)",
        description: "Hỗ trợ đẩy dữ liệu qua HTTP POST hoặc qua MQTT Topic `devices/{deviceId}/metrics`. Định danh `device_id` chấp nhận định dạng UUID hoặc MAC Address.",
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DeviceMetricsPayload" },
              example: {
                "device_id": "849cd2a5-ef21-5620-942b-fcc4d745cbda",
                "user_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "timestamp": "2026-08-11T10:44:10.599Z",
                "status": {
                  "device_status": "IN_USE",
                  "current_user": "long"
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Đã nhận dữ liệu metrics thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Đã nhận dữ liệu metrics thành công" },
                    received_at: { type: "string", format: "date-time", example: "2026-08-11T10:44:10.627Z" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/devices/register": {
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Đăng ký thiết bị Device Agent mới vào hệ thống",
        description: "Hỗ trợ định danh thiết bị bằng UUID hoặc MAC address. Chấp nhận danh sách phần mềm đã cài đặt theo dạng apps, installed_apps, hoặc installed_software.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["device_id", "hostname"],
                properties: {
                  device_id: { type: "string", example: "849cd2a5-ef21-5620-942b-fcc4d745cbda", description: "Mã định danh duy nhất của thiết bị (UUID hoặc MAC)" },
                  uuid: { type: "string", example: "849cd2a5-ef21-5620-942b-fcc4d745cbda" },
                  mac_address: { type: "string", example: "98:e7:f4:bf:e0:de" },
                  hostname: { type: "string", example: "long-pc" },
                  os: { type: "string", example: "Ubuntu" },
                  os_version: { type: "string", example: "26.04 LTS" },
                  platform: { type: "string", example: "linux" },
                  arch: { type: "string", example: "x64" },
                  cpu_model: { type: "string", example: "Intel Core™ i5-7500T" },
                  cpu_cores: { type: "integer", example: 4 },
                  gpus: { type: "array", items: { type: "string" }, example: ["Kaby Lake-S GT2 [HD Graphics 630]"] },
                  total_ram_gb: { type: "number", example: 7.1 },
                  total_disk_gb: { type: "number", example: 238.5 },
                  ip_address: { type: "string", example: "172.16.29.178" },
                  ip_addresses: { type: "array", items: { type: "string" }, example: ["172.16.29.178", "100.66.100.63"] },
                  status: { type: "string", example: "IN_USE" },
                  registered_at: { type: "string", format: "date-time", example: "2026-08-11T10:48:15.629Z" },
                  apps: {
                    type: "array",
                    description: "Danh sách phần mềm đã cài đặt (chấp nhận mảng object hoặc mảng string)",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", example: "Google Chrome" },
                        displayName: { type: "string", example: "Google Chrome" },
                        version: { type: "string", example: "151.0.7922.108-1" },
                        publisher: { type: "string", example: "Access the Internet" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "Đăng ký thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Đăng ký thiết bị thành công" },
                    device_id: { type: "string", example: "849cd2a5-ef21-5620-942b-fcc4d745cbda" },
                    api_key: { type: "string", example: "sk_live_756345ba789f194d9e94f96133d30bef8956f9c5c44b452c319001d8b7825d43" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/devices/unregister": {
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Hủy đăng ký thiết bị khỏi máy chủ, tự động xóa máy tính và gửi thông báo tới Admin",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["device_id"],
                properties: {
                  device_id: { type: "string", example: "24:4b:fe:03:c4:03" },
                  unregistered_at: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Hủy đăng ký thành công" } }
      }
    },
    "/devices/bind-user": {
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Xác nhận và liên kết tài khoản người dùng đang đăng nhập sử dụng máy tính",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["device_id", "username"],
                properties: {
                  device_id: { type: "string", example: "24:4b:fe:03:c4:03" },
                  user_id: { type: "string", example: "USR-1234" },
                  username: { type: "string", example: "user@example.com" },
                  full_name: { type: "string", example: "Nguyễn Văn A" },
                  login_at: { type: "string", format: "date-time" },
                  hostname: { type: "string", example: "DESKTOP-SMTJA1Q" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Đã liên kết tài khoản thành công" } }
      }
    },
    "/devices/unbind-user": {
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Báo cáo máy chủ khi người dùng đăng xuất khỏi máy tính",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["device_id"],
                properties: {
                  device_id: { type: "string", example: "24:4b:fe:03:c4:03" },
                  user_id: { type: "string", example: "USR-1234" },
                  username: { type: "string", example: "user@example.com" },
                  logout_at: { type: "string", format: "date-time" }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Đã hủy phiên sử dụng thành công" } }
      }
    },
    "/devices/alert-hardware-change": {
      post: {
        tags: ["Thiết Bị Agent & Realtime Monitoring (Devices)"],
        summary: "Cảnh báo tự động khi phát hiện linh kiện phần cứng bị tháo/thay đổi",
        security: [{ ApiKeyAuth: [] }],
        responses: { 200: { description: "Đã nhận cảnh báo" } }
      }
    },
    "/health": {
      get: {
        tags: ["Hệ Thống (System Health)"],
        summary: "Kiểm tra tình trạng sức khỏe dịch vụ & kết nối CSDL",
        security: [],
        responses: { 200: { description: "Dịch vụ đang hoạt động bình thường" } }
      }
    }
  }
};
