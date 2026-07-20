export type UserStatus = 'ACTIVE' | 'LOCKED' | 'INACTIVE';

export type RoleCode =
  | 'ADMIN'
  | 'TEACHER'
  | 'COLLABORATOR'
  | 'LAB_STAFF'
  | 'STUDENT'
  | 'MANAGER';

export type RoleTone = 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'slate';

export type RoleDefinition = {
  code: RoleCode;
  name: string;
  shortName: string;
  description: string;
  tone: RoleTone;
  system: boolean;
};

export type PermissionDefinition = {
  code: string;
  name: string;
  description: string;
};

export type PermissionGroup = {
  id: string;
  name: string;
  description: string;
  permissions: PermissionDefinition[];
};

export type UserRecord = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  department: string;
  avatarUrl?: string | null;
  status: UserStatus;
  roles: RoleCode[];
  lastLoginAt: string | null;
  createdAt: string;
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: 'ADMIN',
    name: 'Quản trị viên',
    shortName: 'Admin',
    description: 'Toàn quyền cấu hình, vận hành và quản trị hệ thống.',
    tone: 'violet',
    system: true,
  },
  {
    code: 'TEACHER',
    name: 'Giảng viên',
    shortName: 'Giảng viên',
    description: 'Đăng ký phòng, quản lý lịch cá nhân và báo cáo sự cố.',
    tone: 'blue',
    system: true,
  },
  {
    code: 'LAB_STAFF',
    name: 'Nhân viên phòng Lab',
    shortName: 'Nhân viên Lab',
    description: 'Vận hành phòng, bàn giao thiết bị và kiểm soát lịch sử dụng.',
    tone: 'emerald',
    system: true,
  },
  {
    code: 'COLLABORATOR',
    name: 'Cộng tác viên',
    shortName: 'Cộng tác viên',
    description: 'Hỗ trợ kiểm tra thiết bị và xử lý sự cố được phân công.',
    tone: 'cyan',
    system: true,
  },
  {
    code: 'MANAGER',
    name: 'Quản lý',
    shortName: 'Quản lý',
    description: 'Theo dõi dashboard điều hành, báo cáo và số liệu tổng hợp.',
    tone: 'amber',
    system: true,
  },
  {
    code: 'STUDENT',
    name: 'Sinh viên',
    shortName: 'Sinh viên',
    description: 'Xem lịch phòng và gửi báo cáo sự cố cá nhân.',
    tone: 'slate',
    system: true,
  },
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'users',
    name: 'Người dùng & phân quyền',
    description: 'Tài khoản, vai trò và nhật ký quản trị.',
    permissions: [
      { code: 'USER_VIEW', name: 'Xem người dùng', description: 'Xem danh sách và hồ sơ tài khoản.' },
      { code: 'USER_CREATE', name: 'Tạo người dùng', description: 'Tạo mới tài khoản trong hệ thống.' },
      { code: 'USER_UPDATE', name: 'Cập nhật người dùng', description: 'Chỉnh sửa thông tin hồ sơ tài khoản.' },
      { code: 'USER_STATUS_UPDATE', name: 'Đổi trạng thái tài khoản', description: 'Khóa, mở khóa hoặc ngừng hoạt động.' },
      { code: 'ROLE_ASSIGN', name: 'Gán vai trò', description: 'Thêm hoặc thu hồi vai trò của người dùng.' },
      { code: 'PERMISSION_MANAGE', name: 'Quản lý phân quyền', description: 'Thay đổi ma trận quyền của vai trò.' },
      { code: 'AUDIT_LOG_VIEW', name: 'Xem nhật ký hệ thống', description: 'Theo dõi hoạt động quản trị quan trọng.' },
    ],
  },
  {
    id: 'lab',
    name: 'Phòng Lab',
    description: 'Thông tin, trạng thái và lịch phòng.',
    permissions: [
      { code: 'LAB_PROFILE_VIEW', name: 'Xem thông tin phòng', description: 'Xem hồ sơ và trạng thái phòng Lab.' },
      { code: 'LAB_PROFILE_UPDATE', name: 'Cập nhật thông tin phòng', description: 'Chỉnh sửa hồ sơ, sức chứa và mô tả.' },
      { code: 'LAB_STATUS_UPDATE', name: 'Cập nhật trạng thái phòng', description: 'Thay đổi trạng thái vận hành của phòng.' },
      { code: 'LAB_CALENDAR_VIEW', name: 'Xem lịch phòng', description: 'Xem lịch đăng ký và sử dụng phòng.' },
    ],
  },
  {
    id: 'computers',
    name: 'Máy tính',
    description: 'Cấu hình và vòng đời máy tính.',
    permissions: [
      { code: 'COMPUTER_VIEW', name: 'Xem máy tính', description: 'Xem danh sách và cấu hình máy.' },
      { code: 'COMPUTER_CREATE', name: 'Thêm máy tính', description: 'Thêm máy tính mới vào phòng Lab.' },
      { code: 'COMPUTER_UPDATE', name: 'Cập nhật máy tính', description: 'Chỉnh sửa cấu hình và thông tin máy.' },
      { code: 'COMPUTER_STATUS_UPDATE', name: 'Đổi trạng thái máy', description: 'Cập nhật trạng thái vận hành.' },
      { code: 'COMPUTER_DELETE', name: 'Xóa máy tính', description: 'Xóa mềm máy tính khỏi danh sách.' },
    ],
  },
  {
    id: 'equipment',
    name: 'Thiết bị',
    description: 'Tài sản, bàn giao và tiếp nhận.',
    permissions: [
      { code: 'EQUIPMENT_VIEW', name: 'Xem thiết bị', description: 'Xem danh sách và chi tiết thiết bị.' },
      { code: 'EQUIPMENT_CREATE', name: 'Thêm thiết bị', description: 'Tạo mới thiết bị hoặc tài sản.' },
      { code: 'EQUIPMENT_UPDATE', name: 'Cập nhật thiết bị', description: 'Chỉnh sửa thông tin thiết bị.' },
      { code: 'EQUIPMENT_STATUS_UPDATE', name: 'Đổi trạng thái thiết bị', description: 'Cập nhật trạng thái sử dụng.' },
      { code: 'EQUIPMENT_DELETE', name: 'Xóa thiết bị', description: 'Xóa mềm thiết bị khỏi danh sách.' },
      { code: 'EQUIPMENT_HANDOVER', name: 'Bàn giao thiết bị', description: 'Xác nhận giao thiết bị cho người nhận.' },
      { code: 'EQUIPMENT_RECEIVE', name: 'Tiếp nhận thiết bị', description: 'Xác nhận thu hồi hoặc tiếp nhận.' },
    ],
  },
  {
    id: 'maintenance',
    name: 'Bảo trì tài sản',
    description: 'Lập lịch, thực hiện và ghi nhận kết quả bảo trì.',
    permissions: [
      { code: 'MAINTENANCE_VIEW', name: 'Xem lịch bảo trì', description: 'Xem danh sách, chi tiết và thống kê bảo trì.' },
      { code: 'MAINTENANCE_CREATE', name: 'Tạo lịch bảo trì', description: 'Lập lịch bảo trì cho phòng, máy tính hoặc thiết bị.' },
      { code: 'MAINTENANCE_UPDATE', name: 'Cập nhật lịch bảo trì', description: 'Chỉnh sửa lịch bảo trì chưa bắt đầu.' },
      { code: 'MAINTENANCE_START', name: 'Bắt đầu bảo trì', description: 'Chuyển lịch và tài sản sang trạng thái bảo trì.' },
      { code: 'MAINTENANCE_COMPLETE', name: 'Hoàn tất bảo trì', description: 'Ghi nhận kết quả, chi phí và linh kiện thay thế.' },
      { code: 'MAINTENANCE_CANCEL', name: 'Hủy lịch bảo trì', description: 'Hủy lịch bảo trì chưa bắt đầu.' },
      { code: 'MAINTENANCE_DELETE', name: 'Xóa lịch bảo trì', description: 'Xóa mềm lịch bảo trì hợp lệ.' },
    ],
  },
  {
    id: 'bookings',
    name: 'Đăng ký sử dụng',
    description: 'Tạo, duyệt và quản lý lịch sử dụng.',
    permissions: [
      { code: 'BOOKING_CREATE', name: 'Tạo đăng ký', description: 'Tạo yêu cầu sử dụng phòng Lab.' },
      { code: 'BOOKING_CREATE_FOR_USER', name: 'Đăng ký thay người dùng', description: 'Tạo yêu cầu sử dụng thay cho một tài khoản đang hoạt động.' },
      { code: 'BOOKING_VIEW_OWN', name: 'Xem đăng ký cá nhân', description: 'Xem các yêu cầu do chính mình tạo.' },
      { code: 'BOOKING_VIEW_ALL', name: 'Xem tất cả đăng ký', description: 'Xem toàn bộ lịch và yêu cầu.' },
      { code: 'BOOKING_APPROVE', name: 'Phê duyệt đăng ký', description: 'Duyệt yêu cầu sử dụng phòng.' },
      { code: 'BOOKING_REJECT', name: 'Từ chối đăng ký', description: 'Từ chối yêu cầu không phù hợp.' },
      { code: 'BOOKING_CANCEL_OWN', name: 'Hủy đăng ký cá nhân', description: 'Hủy yêu cầu do chính mình tạo.' },
      { code: 'BOOKING_CANCEL_ANY', name: 'Hủy mọi đăng ký', description: 'Hủy yêu cầu của người dùng khác.' },
      { code: 'BOOKING_CHECK_IN', name: 'Xác nhận nhận phòng', description: 'Thực hiện check-in lịch sử dụng.' },
      { code: 'BOOKING_CHECK_OUT', name: 'Xác nhận trả phòng', description: 'Thực hiện check-out lịch sử dụng.' },
    ],
  },
  {
    id: 'incidents',
    name: 'Sự cố',
    description: 'Báo cáo, phân công và xử lý sự cố.',
    permissions: [
      { code: 'INCIDENT_CREATE', name: 'Báo cáo sự cố', description: 'Tạo báo cáo sự cố mới.' },
      { code: 'INCIDENT_VIEW', name: 'Xem tất cả sự cố', description: 'Xem toàn bộ sự cố của phòng Lab.' },
      { code: 'INCIDENT_VIEW_OWN', name: 'Xem sự cố cá nhân', description: 'Xem sự cố do chính mình báo cáo.' },
      { code: 'INCIDENT_VIEW_ASSIGNED', name: 'Xem sự cố được giao', description: 'Xem sự cố được phân công xử lý.' },
      { code: 'INCIDENT_ASSIGN', name: 'Phân công sự cố', description: 'Gán người phụ trách xử lý.' },
      { code: 'INCIDENT_UPDATE', name: 'Cập nhật sự cố', description: 'Cập nhật tiến độ và nội dung xử lý.' },
      { code: 'INCIDENT_RESOLVE', name: 'Xác nhận đã xử lý', description: 'Đánh dấu sự cố đã được khắc phục.' },
      { code: 'INCIDENT_CLOSE', name: 'Đóng sự cố', description: 'Kết thúc quy trình xử lý sự cố.' },
    ],
  },
  {
    id: 'reports',
    name: 'Dashboard & báo cáo',
    description: 'Số liệu điều hành và báo cáo tổng hợp.',
    permissions: [
      { code: 'DASHBOARD_VIEW', name: 'Xem dashboard chung', description: 'Xem số liệu tổng quan hệ thống.' },
      { code: 'DASHBOARD_VIEW_PERSONAL', name: 'Xem dashboard cá nhân', description: 'Xem dữ liệu liên quan đến tài khoản.' },
      { code: 'DASHBOARD_VIEW_OPERATION', name: 'Xem dashboard vận hành', description: 'Theo dõi hoạt động phòng Lab.' },
      { code: 'DASHBOARD_VIEW_ADMIN', name: 'Xem dashboard quản trị', description: 'Xem số liệu quản trị cấp cao.' },
      { code: 'REPORT_VIEW', name: 'Xem báo cáo', description: 'Xem báo cáo thống kê.' },
      { code: 'REPORT_EXPORT', name: 'Xuất báo cáo', description: 'Tải báo cáo ra tệp dữ liệu.' },
    ],
  },
];

const ALL_PERMISSION_CODES = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.code));

export const ROLE_PERMISSION_PRESETS: Record<RoleCode, string[]> = {
  ADMIN: ALL_PERMISSION_CODES,
  TEACHER: [
    'LAB_PROFILE_VIEW',
    'LAB_CALENDAR_VIEW',
    'COMPUTER_VIEW',
    'EQUIPMENT_VIEW',
    'BOOKING_CREATE',
    'BOOKING_VIEW_OWN',
    'BOOKING_CANCEL_OWN',
    'INCIDENT_CREATE',
    'INCIDENT_VIEW_OWN',
    'DASHBOARD_VIEW_PERSONAL',
  ],
  COLLABORATOR: [
    'LAB_PROFILE_VIEW',
    'LAB_CALENDAR_VIEW',
    'COMPUTER_VIEW',
    'COMPUTER_STATUS_UPDATE',
    'EQUIPMENT_VIEW',
    'EQUIPMENT_STATUS_UPDATE',
    'INCIDENT_CREATE',
    'INCIDENT_VIEW_ASSIGNED',
    'INCIDENT_UPDATE',
    'INCIDENT_RESOLVE',
    'DASHBOARD_VIEW_OPERATION',
    'MAINTENANCE_VIEW',
    'MAINTENANCE_START',
    'MAINTENANCE_COMPLETE',
  ],
  LAB_STAFF: [
    'LAB_PROFILE_VIEW',
    'LAB_CALENDAR_VIEW',
    'COMPUTER_VIEW',
    'EQUIPMENT_VIEW',
    'EQUIPMENT_HANDOVER',
    'EQUIPMENT_RECEIVE',
    'BOOKING_CREATE',
    'BOOKING_CREATE_FOR_USER',
    'BOOKING_VIEW_OWN',
    'BOOKING_VIEW_ALL',
    'BOOKING_CHECK_IN',
    'BOOKING_CHECK_OUT',
    'INCIDENT_CREATE',
    'INCIDENT_VIEW_ASSIGNED',
    'INCIDENT_UPDATE',
    'DASHBOARD_VIEW_OPERATION',
    'MAINTENANCE_VIEW',
    'MAINTENANCE_CREATE',
    'MAINTENANCE_UPDATE',
    'MAINTENANCE_START',
    'MAINTENANCE_COMPLETE',
    'MAINTENANCE_CANCEL',
  ],
  STUDENT: [
    'LAB_PROFILE_VIEW',
    'LAB_CALENDAR_VIEW',
    'INCIDENT_CREATE',
    'INCIDENT_VIEW_OWN',
    'DASHBOARD_VIEW_PERSONAL',
  ],
  MANAGER: [
    'LAB_PROFILE_VIEW',
    'LAB_CALENDAR_VIEW',
    'DASHBOARD_VIEW_ADMIN',
    'REPORT_VIEW',
    'REPORT_EXPORT',
    'MAINTENANCE_VIEW',
  ],
};

export const INITIAL_USERS: UserRecord[] = [
  {
    id: 'usr-001',
    fullName: 'Nguyễn Minh Quân',
    username: 'administrator',
    email: 'admin@lhu.edu.vn',
    phone: '0901 234 567',
    department: 'Phòng Công nghệ thông tin',
    status: 'ACTIVE',
    roles: ['ADMIN'],
    lastLoginAt: '2026-07-14T08:42:00+07:00',
    createdAt: '2026-01-05T08:00:00+07:00',
  },
  {
    id: 'usr-002',
    fullName: 'Trần Thị Thu Hà',
    username: 'hattt',
    email: 'hattt@lhu.edu.vn',
    phone: '0918 125 630',
    department: 'Khoa Công nghệ thông tin',
    status: 'ACTIVE',
    roles: ['TEACHER'],
    lastLoginAt: '2026-07-14T07:55:00+07:00',
    createdAt: '2026-02-12T09:20:00+07:00',
  },
  {
    id: 'usr-003',
    fullName: 'Lê Hoàng Nam',
    username: 'namlh',
    email: 'namlh@lhu.edu.vn',
    phone: '0933 402 718',
    department: 'Trung tâm Thông tin',
    status: 'ACTIVE',
    roles: ['LAB_STAFF'],
    lastLoginAt: '2026-07-13T16:28:00+07:00',
    createdAt: '2026-02-18T13:15:00+07:00',
  },
  {
    id: 'usr-004',
    fullName: 'Phạm Gia Bảo',
    username: 'baopg',
    email: 'baopg@lhu.edu.vn',
    phone: '0976 221 940',
    department: 'Khoa Công nghệ thông tin',
    status: 'ACTIVE',
    roles: ['COLLABORATOR'],
    lastLoginAt: '2026-07-12T14:05:00+07:00',
    createdAt: '2026-03-01T10:30:00+07:00',
  },
  {
    id: 'usr-005',
    fullName: 'Võ Ngọc Anh',
    username: 'anhvn',
    email: 'anhvn@lhu.edu.vn',
    phone: '0987 442 111',
    department: 'Phòng Đào tạo',
    status: 'ACTIVE',
    roles: ['MANAGER'],
    lastLoginAt: '2026-07-11T09:41:00+07:00',
    createdAt: '2026-03-14T11:45:00+07:00',
  },
  {
    id: 'usr-006',
    fullName: 'Đặng Quốc Huy',
    username: 'huydq23',
    email: 'huydq23@lhu.edu.vn',
    phone: '0328 190 622',
    department: 'Khoa Công nghệ thông tin',
    status: 'ACTIVE',
    roles: ['STUDENT'],
    lastLoginAt: '2026-07-10T20:16:00+07:00',
    createdAt: '2026-04-02T08:10:00+07:00',
  },
  {
    id: 'usr-007',
    fullName: 'Bùi Khánh Linh',
    username: 'linhbk22',
    email: 'linhbk22@lhu.edu.vn',
    phone: '0369 542 819',
    department: 'Khoa Cơ điện - Điện tử',
    status: 'LOCKED',
    roles: ['STUDENT'],
    lastLoginAt: '2026-07-02T10:22:00+07:00',
    createdAt: '2026-04-12T14:00:00+07:00',
  },
  {
    id: 'usr-008',
    fullName: 'Hoàng Đức Long',
    username: 'longhd',
    email: 'longhd@lhu.edu.vn',
    phone: '0908 773 452',
    department: 'Khoa Công nghệ thông tin',
    status: 'INACTIVE',
    roles: ['TEACHER'],
    lastLoginAt: '2026-06-18T15:38:00+07:00',
    createdAt: '2026-05-05T09:45:00+07:00',
  },
  {
    id: 'usr-009',
    fullName: 'Nguyễn Thảo My',
    username: 'mynt',
    email: 'mynt@lhu.edu.vn',
    phone: '0937 118 604',
    department: 'Trung tâm Thông tin',
    status: 'ACTIVE',
    roles: ['LAB_STAFF', 'COLLABORATOR'],
    lastLoginAt: null,
    createdAt: '2026-07-12T08:30:00+07:00',
  },
];

export const roleByCode = (code: RoleCode) => ROLE_DEFINITIONS.find((role) => role.code === code);
