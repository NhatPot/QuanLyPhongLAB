import mssql from 'mssql';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig: mssql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrongPassword123!',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'ItLabManagerDb',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

const roles = [
  { code: 'ADMIN', name: 'Quản trị viên', desc: 'Quản trị viên hệ thống có toàn quyền' },
  { code: 'TEACHER', name: 'Giảng viên', desc: 'Giảng viên đăng ký sử dụng phòng và thiết bị' },
  { code: 'COLLABORATOR', name: 'Cộng tác viên', desc: 'Cộng tác viên hỗ trợ kỹ thuật và sự cố' },
  { code: 'LAB_STAFF', name: 'Ban trực phòng', desc: 'Ban trực phòng check-in/out và vận hành ca trực' },
  { code: 'STUDENT', name: 'Sinh viên', desc: 'Sinh viên thực hành, tự học (hạn chế)' },
  { code: 'MANAGER', name: 'Cấp quản lý', desc: 'Xem dashboard và xuất báo cáo thống kê' }
];

const permissions = [
  // User
  { code: 'USER_VIEW', name: 'Xem người dùng', desc: 'Xem danh sách tài khoản' },
  { code: 'USER_CREATE', name: 'Tạo người dùng', desc: 'Thêm tài khoản mới' },
  { code: 'USER_UPDATE', name: 'Sửa người dùng', desc: 'Cập nhật tài khoản' },
  { code: 'USER_STATUS_UPDATE', name: 'Cập nhật trạng thái người dùng', desc: 'Khóa/mở khóa tài khoản' },
  { code: 'ROLE_ASSIGN', name: 'Gán vai trò', desc: 'Gán vai trò cho tài khoản' },
  { code: 'PERMISSION_MANAGE', name: 'Quản lý quyền', desc: 'Cấp quyền chi tiết' },
  // Lab
  { code: 'LAB_PROFILE_VIEW', name: 'Xem hồ sơ phòng Lab', desc: 'Xem nội quy, cấu hình phòng Lab' },
  { code: 'LAB_PROFILE_UPDATE', name: 'Sửa hồ sơ phòng Lab', desc: 'Cập nhật cấu hình phòng Lab' },
  { code: 'LAB_STATUS_UPDATE', name: 'Cập nhật trạng thái phòng Lab', desc: 'Chuyển trạng thái phòng Lab' },
  { code: 'LAB_CALENDAR_VIEW', name: 'Xem lịch phòng Lab', desc: 'Xem lịch sử dụng dạng calendar' },
  // Computer
  { code: 'COMPUTER_VIEW', name: 'Xem máy tính', desc: 'Xem danh sách, sơ đồ máy tính' },
  { code: 'COMPUTER_CREATE', name: 'Tạo máy tính', desc: 'Thêm máy tính mới' },
  { code: 'COMPUTER_UPDATE', name: 'Sửa máy tính', desc: 'Cập nhật máy tính' },
  { code: 'COMPUTER_STATUS_UPDATE', name: 'Cập nhật trạng thái máy tính', desc: 'Đổi trạng thái máy tính' },
  { code: 'COMPUTER_DELETE', name: 'Xóa máy tính', desc: 'Xóa máy tính khỏi sơ đồ' },
  // Equipment
  { code: 'EQUIPMENT_VIEW', name: 'Xem thiết bị', desc: 'Xem danh mục, tồn kho thiết bị' },
  { code: 'EQUIPMENT_CREATE', name: 'Tạo thiết bị', desc: 'Thêm thiết bị mới' },
  { code: 'EQUIPMENT_UPDATE', name: 'Sửa thiết bị', desc: 'Cập nhật thông tin thiết bị' },
  { code: 'EQUIPMENT_STATUS_UPDATE', name: 'Cập nhật trạng thái thiết bị', desc: 'Đổi trạng thái thiết bị' },
  { code: 'EQUIPMENT_DELETE', name: 'Xóa thiết bị', desc: 'Xóa thiết bị' },
  { code: 'EQUIPMENT_HANDOVER', name: 'Bàn giao thiết bị', desc: 'Bàn giao thiết bị khi check-in' },
  { code: 'EQUIPMENT_RECEIVE', name: 'Nhận lại thiết bị', desc: 'Nhận lại thiết bị khi check-out' },
  // Maintenance
  { code: 'MAINTENANCE_VIEW', name: 'Xem lịch bảo trì', desc: 'Xem danh sách, chi tiết và thống kê bảo trì' },
  { code: 'MAINTENANCE_CREATE', name: 'Tạo lịch bảo trì', desc: 'Lập lịch bảo trì tài sản' },
  { code: 'MAINTENANCE_UPDATE', name: 'Cập nhật lịch bảo trì', desc: 'Chỉnh sửa lịch bảo trì chưa bắt đầu' },
  { code: 'MAINTENANCE_START', name: 'Bắt đầu bảo trì', desc: 'Chuyển lịch và tài sản sang trạng thái bảo trì' },
  { code: 'MAINTENANCE_COMPLETE', name: 'Hoàn tất bảo trì', desc: 'Ghi nhận kết quả bảo trì' },
  { code: 'MAINTENANCE_CANCEL', name: 'Hủy lịch bảo trì', desc: 'Hủy lịch bảo trì chưa bắt đầu' },
  { code: 'MAINTENANCE_DELETE', name: 'Xóa lịch bảo trì', desc: 'Xóa mềm lịch bảo trì hợp lệ' },
  // Booking
  { code: 'BOOKING_CREATE', name: 'Tạo booking', desc: 'Tạo yêu cầu sử dụng phòng/thiết bị' },
  { code: 'BOOKING_CREATE_FOR_USER', name: 'Đăng ký thay người dùng', desc: 'Tạo yêu cầu sử dụng phòng Lab thay cho tài khoản đang hoạt động' },
  { code: 'BOOKING_VIEW_OWN', name: 'Xem booking cá nhân', desc: 'Xem booking của chính mình' },
  { code: 'BOOKING_VIEW_ALL', name: 'Xem tất cả booking', desc: 'Xem tất cả booking hệ thống' },
  { code: 'BOOKING_APPROVE', name: 'Duyệt booking', desc: 'Phê duyệt booking' },
  { code: 'BOOKING_REJECT', name: 'Từ chối booking', desc: 'Từ chối booking kèm lý do' },
  { code: 'BOOKING_CANCEL_OWN', name: 'Hủy booking cá nhân', desc: 'Hủy booking của chính mình' },
  { code: 'BOOKING_CANCEL_ANY', name: 'Hủy booking bất kỳ', desc: 'Hủy booking bất kỳ của hệ thống' },
  { code: 'BOOKING_CHECK_IN', name: 'Check-in booking', desc: 'Xác nhận check-in sử dụng' },
  { code: 'BOOKING_CHECK_OUT', name: 'Check-out booking', desc: 'Xác nhận check-out bàn giao' },
  // Incident
  { code: 'INCIDENT_CREATE', name: 'Báo cáo sự cố', desc: 'Tạo báo cáo sự cố kỹ thuật' },
  { code: 'INCIDENT_VIEW', name: 'Xem sự cố', desc: 'Xem danh sách sự cố' },
  { code: 'INCIDENT_VIEW_OWN', name: 'Xem sự cố cá nhân', desc: 'Xem sự cố do mình báo cáo' },
  { code: 'INCIDENT_VIEW_ASSIGNED', name: 'Xem sự cố được phân công', desc: 'Xem sự cố được giao xử lý' },
  { code: 'INCIDENT_ASSIGN', name: 'Phân công sự cố', desc: 'Giao sự cố cho người xử lý' },
  { code: 'INCIDENT_UPDATE', name: 'Cập nhật sự cố', desc: 'Cập nhật tiến trình xử lý sự cố' },
  { code: 'INCIDENT_RESOLVE', name: 'Xử lý xong sự cố', desc: 'Đánh dấu sự cố đã khắc phục' },
  { code: 'INCIDENT_CLOSE', name: 'Đóng sự cố', desc: 'Đóng hồ sơ sự cố' },
  // Dashboard/Report
  { code: 'DASHBOARD_VIEW', name: 'Xem dashboard', desc: 'Xem dashboard tổng' },
  { code: 'DASHBOARD_VIEW_PERSONAL', name: 'Xem dashboard cá nhân', desc: 'Dashboard cho GV/SV' },
  { code: 'DASHBOARD_VIEW_OPERATION', name: 'Xem dashboard vận hành', desc: 'Dashboard cho CTV/Staff' },
  { code: 'DASHBOARD_VIEW_ADMIN', name: 'Xem dashboard quản lý', desc: 'Dashboard cho Admin/Manager' },
  { code: 'REPORT_VIEW', name: 'Xem báo cáo', desc: 'Xem báo cáo tổng hợp' },
  { code: 'REPORT_EXPORT', name: 'Xuất báo cáo', desc: 'Xuất Excel/PDF báo cáo' },
  { code: 'AUDIT_LOG_VIEW', name: 'Xem Audit Log', desc: 'Xem nhật ký hệ thống' }
];

const rolePermissionsMap: Record<string, string[]> = {
  ADMIN: permissions.map(p => p.code),
  TEACHER: [
    'LAB_PROFILE_VIEW', 'LAB_CALENDAR_VIEW', 'COMPUTER_VIEW', 'EQUIPMENT_VIEW',
    'BOOKING_CREATE', 'BOOKING_VIEW_OWN', 'BOOKING_CANCEL_OWN',
    'INCIDENT_CREATE', 'INCIDENT_VIEW_OWN', 'DASHBOARD_VIEW_PERSONAL'
  ],
  COLLABORATOR: [
    'LAB_PROFILE_VIEW', 'LAB_CALENDAR_VIEW', 'COMPUTER_VIEW', 'COMPUTER_STATUS_UPDATE',
    'EQUIPMENT_VIEW', 'EQUIPMENT_STATUS_UPDATE', 'INCIDENT_CREATE',
    'INCIDENT_VIEW_ASSIGNED', 'INCIDENT_UPDATE', 'INCIDENT_RESOLVE', 'DASHBOARD_VIEW_OPERATION',
    'MAINTENANCE_VIEW', 'MAINTENANCE_START', 'MAINTENANCE_COMPLETE'
  ],
  LAB_STAFF: [
    'LAB_PROFILE_VIEW', 'LAB_CALENDAR_VIEW', 'COMPUTER_VIEW', 'EQUIPMENT_VIEW',
    'EQUIPMENT_HANDOVER', 'EQUIPMENT_RECEIVE', 'BOOKING_CREATE',
    'BOOKING_CREATE_FOR_USER', 'BOOKING_VIEW_OWN', 'BOOKING_VIEW_ALL',
    'BOOKING_CHECK_IN', 'BOOKING_CHECK_OUT', 'INCIDENT_CREATE',
    'INCIDENT_VIEW_ASSIGNED', 'INCIDENT_UPDATE', 'DASHBOARD_VIEW_OPERATION',
    'MAINTENANCE_VIEW', 'MAINTENANCE_CREATE', 'MAINTENANCE_UPDATE',
    'MAINTENANCE_START', 'MAINTENANCE_COMPLETE', 'MAINTENANCE_CANCEL'
  ],
  STUDENT: [
    'LAB_PROFILE_VIEW', 'LAB_CALENDAR_VIEW', 'INCIDENT_CREATE',
    'INCIDENT_VIEW_OWN', 'DASHBOARD_VIEW_PERSONAL'
  ],
  MANAGER: [
    'LAB_PROFILE_VIEW', 'LAB_CALENDAR_VIEW', 'DASHBOARD_VIEW_ADMIN',
    'REPORT_VIEW', 'REPORT_EXPORT', 'MAINTENANCE_VIEW'
  ]
};

async function seed() {
  console.log('[Seed] Starting database seeding...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminUsername = process.env.SEED_ADMIN_USERNAME;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminFullName = process.env.SEED_ADMIN_FULL_NAME;

  if (!adminEmail || !adminUsername || !adminPassword || !adminFullName) {
    console.error('[Seed] Error: Missing one or more required Admin environment variables:');
    console.error(`- SEED_ADMIN_EMAIL: ${adminEmail ? 'OK' : 'MISSING'}`);
    console.error(`- SEED_ADMIN_USERNAME: ${adminUsername ? 'OK' : 'MISSING'}`);
    console.error(`- SEED_ADMIN_PASSWORD: ${adminPassword ? 'OK' : 'MISSING'}`);
    console.error(`- SEED_ADMIN_FULL_NAME: ${adminFullName ? 'OK' : 'MISSING'}`);
    process.exit(1);
  }

  let pool: mssql.ConnectionPool | null = null;
  try {
    pool = await new mssql.ConnectionPool(dbConfig).connect();

    // 1. Seed Roles
    console.log('[Seed] Seeding Roles...');
    for (const role of roles) {
      await pool.request()
        .input('code', mssql.NVarChar, role.code)
        .input('name', mssql.NVarChar, role.name)
        .input('description', mssql.NVarChar, role.desc)
        .query(`
          MERGE INTO Roles AS target
          USING (SELECT @code AS Code) AS source
          ON target.Code = source.Code
          WHEN MATCHED THEN
            UPDATE SET Name = @name, Description = @description, UpdatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (Code, Name, Description) VALUES (@code, @name, @description);
        `);
    }

    // 2. Seed Permissions
    console.log('[Seed] Seeding Permissions...');
    for (const perm of permissions) {
      await pool.request()
        .input('code', mssql.NVarChar, perm.code)
        .input('name', mssql.NVarChar, perm.name)
        .input('description', mssql.NVarChar, perm.desc)
        .query(`
          MERGE INTO Permissions AS target
          USING (SELECT @code AS Code) AS source
          ON target.Code = source.Code
          WHEN MATCHED THEN
            UPDATE SET Name = @name, Description = @description, UpdatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (Code, Name, Description) VALUES (@code, @name, @description);
        `);
    }

    // 3. Seed RolePermissions
    console.log('[Seed] Mapping Role Permissions...');
    for (const [roleCode, permCodes] of Object.entries(rolePermissionsMap)) {
      const roleResult = await pool.request()
        .input('code', mssql.NVarChar, roleCode)
        .query('SELECT Id FROM Roles WHERE Code = @code');
      const roleId = roleResult.recordset[0].Id;

      await pool.request()
        .input('roleId', mssql.UniqueIdentifier, roleId)
        .query('DELETE FROM RolePermissions WHERE RoleId = @roleId');

      for (const permCode of permCodes) {
        const permResult = await pool.request()
          .input('code', mssql.NVarChar, permCode)
          .query('SELECT Id FROM Permissions WHERE Code = @code');
        const permId = permResult.recordset[0].Id;

        await pool.request()
          .input('roleId', mssql.UniqueIdentifier, roleId)
          .input('permId', mssql.UniqueIdentifier, permId)
          .query('INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@roleId, @permId)');
      }
    }

    // 4. Seed Admin User
    console.log('[Seed] Seeding Admin User...');
    const emailNormalized = adminEmail.toLowerCase().trim();
    const usernameNormalized = adminUsername.toLowerCase().trim();

    const userResult = await pool.request()
      .input('email', mssql.NVarChar, emailNormalized)
      .query('SELECT Id FROM Users WHERE EmailNormalized = @email');

    let adminUserId: string;
    if (userResult.recordset.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const insertResult = await pool.request()
        .input('fullName', mssql.NVarChar, adminFullName)
        .input('email', mssql.NVarChar, adminEmail)
        .input('emailNorm', mssql.NVarChar, emailNormalized)
        .input('username', mssql.NVarChar, adminUsername)
        .input('usernameNorm', mssql.NVarChar, usernameNormalized)
        .input('pwd', mssql.NVarChar, passwordHash)
        .query(`
          INSERT INTO Users (FullName, Email, EmailNormalized, Username, UsernameNormalized, PasswordHash, Status, MustChangePassword)
          OUTPUT INSERTED.Id
          VALUES (@fullName, @email, @emailNorm, @username, @usernameNorm, @pwd, 'ACTIVE', 1)
        `);
      adminUserId = insertResult.recordset[0].Id;
      console.log('[Seed] Admin User created successfully.');
    } else {
      adminUserId = userResult.recordset[0].Id;
      console.log('[Seed] Admin User already exists. Skipping user creation.');
    }

    const adminRoleResult = await pool.request()
      .query("SELECT Id FROM Roles WHERE Code = 'ADMIN'");
    const adminRoleId = adminRoleResult.recordset[0].Id;

    await pool.request()
      .input('userId', mssql.UniqueIdentifier, adminUserId)
      .input('roleId', mssql.UniqueIdentifier, adminRoleId)
      .query(`
        IF NOT EXISTS (SELECT * FROM UserRoles WHERE UserId = @userId AND RoleId = @roleId)
        BEGIN
          INSERT INTO UserRoles (UserId, RoleId) VALUES (@userId, @roleId);
        END
      `);

    // 5. Seed LabProfile (Singleton)
    console.log('[Seed] Seeding Lab Profile...');
    const labResult = await pool.request()
      .query('SELECT 1 FROM LabProfile WHERE SingletonKey = 1');

    if (labResult.recordset.length === 0) {
      await pool.request()
        .input('managerId', mssql.UniqueIdentifier, adminUserId)
        .query(`
          INSERT INTO LabProfile (LabCode, LabName, Location, Capacity, ManagerId, Status, Description, Rules)
          VALUES ('IT-LAB', N'Phòng Lab Công nghệ thông tin', N'Khoa Công nghệ thông tin', 40, @managerId, 'ACTIVE', N'Mô tả phòng lab', N'Nội quy phòng lab');
        `);
      console.log('[Seed] Lab Profile created successfully.');
    } else {
      console.log('[Seed] Lab Profile already exists. Skipping creation.');
    }

    console.log('[Seed] Seeding completed successfully!');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

seed();
