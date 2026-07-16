import { AxiosError, type AxiosAdapter, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import {
  INITIAL_USERS,
  PERMISSION_GROUPS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_PRESETS,
  type RoleCode,
} from '@/features/access/access-control-data';
import type { UserApiRecord, UserStatus } from './user-api';
import type { RoleApiRecord, PermissionApiRecord } from './role-api';
import type { AuditLogRecord } from './audit-log-api';
import type { ComputerData, ComputerStatus } from './computer-api';
import type { EquipmentCategoryData, EquipmentData, EquipmentTxData } from './equipment-api';
import type { BookingData, BookingStatus, CalendarEvent, ComputerActivityRecord, CreateBookingPayload } from './booking-api';
import type { LabProfileData } from './lab-api';
import type { UserProfile } from './auth-api';
import type {
  MaintenanceOptions,
  MaintenanceOutcome,
  MaintenancePayload,
  MaintenanceRecord,
  MaintenanceSource,
  MaintenanceStatus,
  MaintenanceTargetType,
} from './maintenance-api';

type MockRequestConfig = InternalAxiosRequestConfig & { __mockHandled?: boolean };

const now = () => new Date().toISOString();
const id = (prefix: string, index: number) => `mock-${prefix}-${String(index).padStart(3, '0')}`;

const permissionCatalog: PermissionApiRecord[] = PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => ({
  id: `mock-permission-${permission.code}`,
  code: permission.code,
  name: permission.name,
  description: permission.description,
  group: group.id,
})));

const rolePermissionState: Record<string, string[]> = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.code, [...(ROLE_PERMISSION_PRESETS[role.code] || [])]]),
);

let users: UserApiRecord[] = INITIAL_USERS.map((user, index) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  username: user.username,
  phone: user.phone || null,
  department: user.department || null,
  status: user.status,
  roles: [...user.roles],
  mustChangePassword: false,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.createdAt,
}));

const computers: ComputerData[] = Array.from({ length: 20 }, (_, index) => {
  const status: ComputerStatus = index < 14 ? 'ACTIVE' : index < 17 ? 'IN_USE' : index === 17 ? 'MAINTENANCE' : index === 18 ? 'BROKEN' : 'LOCKED';
  const code = `PC-${String(index + 1).padStart(2, '0')}`;
  return {
    id: id('computer', index + 1), code, name: `Máy tính ${code}`,
    cpu: 'Intel Core i5-12400F', ram: '16GB', storage: '256GB SSD', gpu: 'Intel UHD',
    operatingSystem: 'Windows 11 Pro', installedSoftware: 'Office, VS Code',
    ipAddress: `192.168.1.${101 + index}`, macAddress: `00:1B:44:11:3A:${String(index + 1).padStart(2, '0')}`,
    position: `Bàn ${String(index + 1).padStart(2, '0')}`, status,
    note: status === 'BROKEN' ? 'Cần kiểm tra nguồn' : status === 'MAINTENANCE' ? 'Đang bảo trì định kỳ' : undefined,
    lastMaintenanceDate: '2026-06-20T08:00:00.000Z', createdAt: '2026-01-05T08:00:00.000Z', updatedAt: now(),
  };
});

const categories: EquipmentCategoryData[] = [
  { id: id('category', 1), code: 'NETWORK', name: 'Thiết bị mạng', description: 'Switch, router và phụ kiện mạng' },
  { id: id('category', 2), code: 'PERIPHERAL', name: 'Thiết bị ngoại vi', description: 'Chuột, bàn phím, webcam' },
  { id: id('category', 3), code: 'PRESENTATION', name: 'Thiết bị trình chiếu', description: 'Máy chiếu và màn hình' },
];

let equipment: EquipmentData[] = [
  { id: id('equipment', 1), code: 'SW-001', name: 'Switch Cisco 24 port', categoryId: categories[0].id, totalQuantity: 4, availableQuantity: 3, reservedQuantity: 1, borrowedQuantity: 0, brokenQuantity: 0, maintenanceQuantity: 0, lostQuantity: 0, location: 'Tủ mạng A', status: 'ACTIVE', createdAt: '2026-01-10T08:00:00.000Z', updatedAt: now() },
  { id: id('equipment', 2), code: 'PJ-001', name: 'Máy chiếu Epson', categoryId: categories[2].id, totalQuantity: 2, availableQuantity: 1, reservedQuantity: 0, borrowedQuantity: 0, brokenQuantity: 1, maintenanceQuantity: 0, lostQuantity: 0, location: 'Kho thiết bị', status: 'ACTIVE', createdAt: '2026-01-10T08:00:00.000Z', updatedAt: now() },
  { id: id('equipment', 3), code: 'KB-001', name: 'Bàn phím cơ', categoryId: categories[1].id, totalQuantity: 12, availableQuantity: 10, reservedQuantity: 0, borrowedQuantity: 2, brokenQuantity: 0, maintenanceQuantity: 0, lostQuantity: 0, location: 'Kho thiết bị', status: 'ACTIVE', createdAt: '2026-01-10T08:00:00.000Z', updatedAt: now() },
  { id: id('equipment', 4), code: 'CAM-001', name: 'Webcam Logitech', categoryId: categories[1].id, totalQuantity: 6, availableQuantity: 6, reservedQuantity: 0, borrowedQuantity: 0, brokenQuantity: 0, maintenanceQuantity: 0, lostQuantity: 0, location: 'Kho thiết bị', status: 'ACTIVE', createdAt: '2026-01-10T08:00:00.000Z', updatedAt: now() },
];

let equipmentTransactions: EquipmentTxData[] = [];

let lab: LabProfileData = {
  id: id('lab', 1), labCode: 'IT-LAB', labName: 'Phòng thực hành Công nghệ thông tin', location: 'Tòa A · Tầng 2', capacity: 40,
  description: 'Không gian thực hành và nghiên cứu công nghệ thông tin.', rules: 'Tuân thủ nội quy phòng Lab.', managerId: users[0]?.id,
  status: 'ACTIVE', createdAt: '2026-01-01T08:00:00.000Z', updatedAt: now(),
};

let bookings: BookingData[] = [
  { id: id('booking', 1), requestCode: 'BK-MOCK-001', requesterId: users[1]?.id, bookingType: 'FULL_LAB', purpose: 'Thực hành mạng máy tính', startTime: '2026-07-13T01:00:00.000Z', endTime: '2026-07-13T04:00:00.000Z', numberOfPeople: 25, numberOfComputers: 20, status: 'COMPLETED', isOverdue: false, hasIncident: false, note: 'Lớp CNTT K46', createdAt: '2026-07-10T08:00:00.000Z', checkInTime: '2026-07-13T01:10:00.000Z', checkOutTime: '2026-07-13T03:55:00.000Z', actualPeopleCount: 24, actualComputerCount: 20 },
  { id: id('booking', 2), requestCode: 'BK-MOCK-002', requesterId: users[2]?.id, bookingType: 'COMPUTERS_ONLY', purpose: 'Kiểm tra thiết bị', startTime: '2026-07-14T05:30:00.000Z', endTime: '2026-07-14T07:00:00.000Z', numberOfPeople: 8, numberOfComputers: 8, status: 'COMPLETED', isOverdue: false, hasIncident: false, note: null, createdAt: '2026-07-12T08:00:00.000Z', checkInTime: '2026-07-14T05:35:00.000Z', checkOutTime: '2026-07-14T06:50:00.000Z', actualPeopleCount: 8, actualComputerCount: 8 },
  { id: id('booking', 3), requestCode: 'BK-MOCK-003', requesterId: users[1]?.id, bookingType: 'FULL_LAB', purpose: 'Thực hành lập trình', startTime: '2026-07-16T08:00:00.000Z', endTime: '2026-07-16T10:00:00.000Z', numberOfPeople: 25, numberOfComputers: 20, status: 'APPROVED', isOverdue: false, hasIncident: false, note: 'Lớp CNTT K46', createdAt: '2026-07-10T08:00:00.000Z' },
  { id: id('booking', 4), requestCode: 'BK-MOCK-004', requesterId: users[2]?.id, bookingType: 'COMPUTERS_ONLY', purpose: 'Thực hành hệ điều hành', startTime: '2026-07-17T13:30:00.000Z', endTime: '2026-07-17T15:00:00.000Z', numberOfPeople: 8, numberOfComputers: 8, status: 'PENDING', isOverdue: false, hasIncident: false, note: null, createdAt: '2026-07-14T08:00:00.000Z' },
];

let maintenances: MaintenanceRecord[] = [
  {
    id: id('maintenance', 1), code: 'BT-202607-001', targetType: 'COMPUTER', targetId: computers[2].id,
    targetCode: computers[2].code, targetName: computers[2].name, title: 'Vệ sinh và kiểm tra PC-03',
    description: 'Kiểm tra quạt tản nhiệt, SSD và cập nhật hệ điều hành.', reason: 'Bảo trì định kỳ quý III',
    scheduledStartAt: '2026-07-20T01:00:00.000Z', expectedEndAt: '2026-07-20T03:00:00.000Z',
    startedAt: null, completedAt: null, cancelledAt: null, status: 'SCHEDULED', technicianId: users[1]?.id || null,
    technicianName: users[1]?.fullName || 'Kỹ thuật viên', technicianUsername: users[1]?.username || 'labstaff',
    quantity: 1, maintenanceSource: null, resultNote: null, partsNote: 'Keo tản nhiệt', estimatedCost: 150000,
    actualCost: null, completionOutcome: null, cancellationReason: null, triggerSource: 'MANUAL', triggeredAt: null, createdBy: users[0]?.id || null,
    createdByName: users[0]?.fullName || 'Administrator', createdAt: '2026-07-12T03:00:00.000Z', updatedAt: '2026-07-12T03:00:00.000Z', isOverdue: false,
  },
  {
    id: id('maintenance', 2), code: 'BT-202607-002', targetType: 'COMPUTER', targetId: computers[17].id,
    targetCode: computers[17].code, targetName: computers[17].name, title: 'Kiểm tra máy tính mất kết nối mạng',
    description: 'Chẩn đoán card mạng và cáp kết nối.', reason: 'Thiết bị hoạt động không ổn định',
    scheduledStartAt: '2026-07-15T02:00:00.000Z', expectedEndAt: '2026-07-17T04:00:00.000Z',
    startedAt: '2026-07-15T02:10:00.000Z', completedAt: null, cancelledAt: null, status: 'IN_PROGRESS',
    technicianId: users[2]?.id || null, technicianName: users[2]?.fullName || 'Cộng tác viên', technicianUsername: users[2]?.username || 'collaborator',
    quantity: 1, maintenanceSource: null, resultNote: null, partsNote: 'Dự kiến thay cáp mạng', estimatedCost: 250000,
    actualCost: null, completionOutcome: null, cancellationReason: null, triggerSource: 'MANUAL', triggeredAt: null, createdBy: users[0]?.id || null,
    createdByName: users[0]?.fullName || 'Administrator', createdAt: '2026-07-14T02:00:00.000Z', updatedAt: '2026-07-15T02:10:00.000Z', isOverdue: false,
  },
  {
    id: id('maintenance', 3), code: 'BT-202607-003', targetType: 'EQUIPMENT', targetId: equipment[1].id,
    targetCode: equipment[1].code, targetName: equipment[1].name, title: 'Bảo dưỡng máy chiếu', description: 'Làm sạch bộ lọc và cân chỉnh hình ảnh.',
    reason: 'Hình ảnh bị mờ', scheduledStartAt: '2026-07-08T01:00:00.000Z', expectedEndAt: '2026-07-08T05:00:00.000Z',
    startedAt: '2026-07-08T01:05:00.000Z', completedAt: '2026-07-08T04:30:00.000Z', cancelledAt: null, status: 'COMPLETED',
    technicianId: users[1]?.id || null, technicianName: users[1]?.fullName || 'Kỹ thuật viên', technicianUsername: users[1]?.username || 'labstaff',
    quantity: 1, maintenanceSource: 'BROKEN', resultNote: 'Đã vệ sinh và thay bộ lọc, hình ảnh ổn định.', partsNote: 'Bộ lọc máy chiếu',
    estimatedCost: 450000, actualCost: 420000, completionOutcome: 'AVAILABLE', cancellationReason: null, triggerSource: 'MANUAL', triggeredAt: null, createdBy: users[0]?.id || null,
    createdByName: users[0]?.fullName || 'Administrator', createdAt: '2026-07-06T01:00:00.000Z', updatedAt: '2026-07-08T04:30:00.000Z', isOverdue: false,
  },
  {
    id: id('maintenance', 4), code: 'BT-202607-004', targetType: 'LAB', targetId: lab.id, targetCode: lab.labCode,
    targetName: lab.labName, title: 'Kiểm tra hệ thống điện phòng Lab', description: null, reason: 'Kế hoạch kiểm tra an toàn điện',
    scheduledStartAt: '2026-07-10T06:00:00.000Z', expectedEndAt: '2026-07-10T08:00:00.000Z', startedAt: null, completedAt: null,
    cancelledAt: '2026-07-09T08:00:00.000Z', status: 'CANCELLED', technicianId: users[1]?.id || null,
    technicianName: users[1]?.fullName || 'Kỹ thuật viên', technicianUsername: users[1]?.username || 'labstaff', quantity: 1,
    maintenanceSource: null, resultNote: null, partsNote: null, estimatedCost: 0, actualCost: null, completionOutcome: null,
    cancellationReason: 'Phòng có lịch thi bù.', triggerSource: 'MANUAL', triggeredAt: null, createdBy: users[0]?.id || null, createdByName: users[0]?.fullName || 'Administrator',
    createdAt: '2026-07-05T01:00:00.000Z', updatedAt: '2026-07-09T08:00:00.000Z', isOverdue: false,
  },
];

type MockComputerActivity = Omit<ComputerActivityRecord, 'durationHours' | 'isActive'>;

let computerActivityLogs: MockComputerActivity[] = [
  ...bookings.filter((booking) => booking.checkInTime).flatMap((booking) => {
    const count = booking.actualComputerCount ?? booking.numberOfComputers;
    const requester = users.find((user) => user.id === booking.requesterId);
    return computers.slice(0, count).map((computer, index) => ({
      id: `mock-activity-${booking.id}-${index}`,
      computerId: computer.id,
      computerCode: computer.code,
      computerName: computer.name,
      activityType: 'IN_USE' as const,
      startedAt: booking.checkInTime!,
      endedAt: booking.checkOutTime || null,
      bookingRequestId: booking.id,
      bookingRequestCode: booking.requestCode,
      bookingPurpose: booking.purpose,
      requesterName: requester?.fullName || null,
      maintenanceScheduleId: null,
      maintenanceCode: null,
      performedBy: users[0]?.id || null,
      performedByName: users[0]?.fullName || null,
      note: booking.note || null,
    }));
  }),
  ...computers.map((computer, index) => {
    const maintenance = maintenances.find((item) => item.targetType === 'COMPUTER' && item.targetId === computer.id && item.status === 'IN_PROGRESS');
    return {
      id: `mock-activity-current-${index}`,
      computerId: computer.id,
      computerCode: computer.code,
      computerName: computer.name,
      activityType: computer.status,
      startedAt: maintenance?.startedAt || '2026-07-15T08:00:00.000Z',
      endedAt: null,
      bookingRequestId: null,
      bookingRequestCode: null,
      bookingPurpose: null,
      requesterName: null,
      maintenanceScheduleId: maintenance?.id || null,
      maintenanceCode: maintenance?.code || null,
      performedBy: users[0]?.id || null,
      performedByName: users[0]?.fullName || null,
      note: computer.note || null,
    };
  }),
];

let auditLogs: AuditLogRecord[] = [
  { id: id('audit', 1), userId: users[0]?.id || null, actorName: users[0]?.fullName || 'Administrator', actorUsername: users[0]?.username || 'admin', action: 'LOGIN_SUCCESS', entityName: 'AuthSession', entityId: null, oldValue: null, newValue: { mode: 'mock' }, ipAddress: '127.0.0.1', userAgent: 'Mock browser', correlationId: 'mock-correlation-001', createdAt: '2026-07-15T08:00:00.000Z' },
  { id: id('audit', 2), userId: users[0]?.id || null, actorName: users[0]?.fullName || 'Administrator', actorUsername: users[0]?.username || 'admin', action: 'USER_CREATED', entityName: 'User', entityId: users[8]?.id || null, oldValue: null, newValue: { source: 'fixture' }, ipAddress: '127.0.0.1', userAgent: 'Mock browser', correlationId: 'mock-correlation-002', createdAt: '2026-07-14T09:30:00.000Z' },
  { id: id('audit', 3), userId: users[0]?.id || null, actorName: users[0]?.fullName || 'Administrator', actorUsername: users[0]?.username || 'admin', action: 'ROLE_PERMISSIONS_UPDATED', entityName: 'Role', entityId: null, oldValue: { role: 'LAB_STAFF' }, newValue: { role: 'LAB_STAFF', source: 'fixture' }, ipAddress: '127.0.0.1', userAgent: 'Mock browser', correlationId: 'mock-correlation-003', createdAt: '2026-07-13T10:15:00.000Z' },
];

const currentProfile = (): UserProfile => ({
  id: users[0]?.id || 'mock-admin', fullName: users[0]?.fullName || 'Mock Administrator', email: users[0]?.email || 'admin@example.edu.vn', username: users[0]?.username || 'admin',
  roles: ['ADMIN'], permissions: permissionCatalog.map((permission) => permission.code), mustChangePassword: false,
});

const body = (data: unknown, meta?: unknown) => meta === undefined ? { data } : { data, meta };
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data, status, statusText: status >= 400 ? 'Mock error' : 'OK', headers: {}, config,
});

const errorResponse = (config: InternalAxiosRequestConfig, status: number, message: string): never => {
  throw new AxiosError(message, status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, undefined, response(config, { error: { code: 'MOCK_ERROR', message } }, status));
};

const methodOf = (config: AxiosRequestConfig) => (config.method || 'get').toUpperCase();
const pathOf = (config: AxiosRequestConfig) => {
  const raw = config.url || '';
  const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0];
  return path.replace(/^\/api/, '').replace(/\/$/, '') || '/';
};
const paramsOf = (config: AxiosRequestConfig): Record<string, unknown> => (config.params || {}) as Record<string, unknown>;
const stringParam = (params: Record<string, unknown>, key: string) => typeof params[key] === 'string' ? params[key] as string : undefined;
const numberParam = (params: Record<string, unknown>, key: string, fallback: number) => Number.isFinite(Number(params[key])) ? Number(params[key]) : fallback;
const paginate = <T>(items: T[], config: AxiosRequestConfig) => {
  const params = paramsOf(config); const page = Math.max(1, numberParam(params, 'page', 1)); const pageSize = Math.max(1, numberParam(params, 'pageSize', 20));
  return { data: items.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, totalItems: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } };
};

const matchUser = (idValue: string) => users.find((item) => item.id === idValue);
const matchComputer = (idValue: string) => computers.find((item) => item.id === idValue);
const matchEquipment = (idValue: string) => equipment.find((item) => item.id === idValue);

const mockAdapter: AxiosAdapter = async (config) => {
  const request = config as MockRequestConfig; const method = methodOf(request); const path = pathOf(request);
  const payload = typeof request.data === 'string' ? JSON.parse(request.data || '{}') as Record<string, unknown> : (request.data || {}) as Record<string, unknown>;
  const params = paramsOf(request);

  if (path === '/auth/login' && method === 'POST') {
    const identifier = String(payload.identifier || '').toLowerCase(); const password = String(payload.password || '');
    if (!['admin', 'administrator', 'admin@example.edu.vn'].includes(identifier) || !['admin123', 'Admin@123456'].includes(password)) return errorResponse(request, 401, 'Tài khoản mock: admin / admin123');
    return response(request, body({ accessToken: 'mock-access-token', mustChangePassword: false }));
  }
  if (path === '/auth/me' && method === 'GET') return response(request, body(currentProfile()));
  if (path === '/auth/refresh' && method === 'POST') return response(request, body({ accessToken: 'mock-access-token' }));
  if (path === '/auth/logout' && method === 'POST') return response(request, body(null));
  if (path === '/auth/change-password' && method === 'POST') return response(request, body(null));

  if (path === '/users/summary' && method === 'GET') return response(request, body({ total: users.length, active: users.filter((item) => item.status === 'ACTIVE').length, locked: users.filter((item) => item.status === 'LOCKED').length, inactive: users.filter((item) => item.status === 'INACTIVE').length }));
  if (path === '/users' && method === 'GET') {
    const keyword = stringParam(params, 'keyword')?.toLocaleLowerCase('vi'); const status = stringParam(params, 'status'); const roleCode = stringParam(params, 'roleCode');
    const filtered = users.filter((item) => (!keyword || [item.fullName, item.email, item.username].some((value) => value.toLocaleLowerCase('vi').includes(keyword))) && (!status || item.status === status) && (!roleCode || item.roles.includes(roleCode)));
    return response(request, paginate(filtered, request));
  }
  const userMatch = path.match(/^\/users\/([^/]+)$/); const userIdMatch = path.match(/^\/users\/([^/]+)\/(status|roles|reset-password)$/);
  if (userMatch && method === 'GET') { const item = matchUser(userMatch[1]); return item ? response(request, body(item)) : errorResponse(request, 404, 'Không tìm thấy người dùng mock.'); }
  if (userIdMatch && method === 'PATCH' && userIdMatch[2] === 'status') { const item = matchUser(userIdMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy người dùng mock.'); item.status = String(payload.status) as UserStatus; item.updatedAt = now(); return response(request, body(item)); }
  if (userIdMatch && method === 'PUT' && userIdMatch[2] === 'roles') { const item = matchUser(userIdMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy người dùng mock.'); item.roles = Array.isArray(payload.roleCodes) ? payload.roleCodes.map(String) : []; item.updatedAt = now(); return response(request, body(item)); }
  if (userIdMatch && method === 'POST' && userIdMatch[2] === 'reset-password') { const item = matchUser(userIdMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy người dùng mock.'); item.mustChangePassword = true; item.updatedAt = now(); return response(request, body(item)); }
  if (userMatch && method === 'PUT') { const item = matchUser(userMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy người dùng mock.'); Object.assign(item, { fullName: payload.fullName, email: payload.email, username: payload.username, phone: payload.phone || null, department: payload.department || null, updatedAt: now() }); return response(request, body(item)); }
  if (path === '/users' && method === 'POST') { const created: UserApiRecord = { id: `mock-user-${Date.now()}`, fullName: String(payload.fullName || 'Người dùng mock'), email: String(payload.email || ''), username: String(payload.username || `mock${Date.now()}`), phone: payload.phone ? String(payload.phone) : null, department: payload.department ? String(payload.department) : null, status: String(payload.status || 'ACTIVE') as UserStatus, roles: Array.isArray(payload.roleCodes) ? payload.roleCodes.map(String) : [], mustChangePassword: true, lastLoginAt: null, createdAt: now(), updatedAt: now() }; users = [created, ...users]; return response(request, body(created), 201); }

  if (path === '/roles' && method === 'GET') return response(request, body(roleRecords()));
  if (path === '/roles/catalog' && method === 'GET') return response(request, body({ roles: roleRecords(), permissions: permissionCatalog }));
  const roleMatch = path.match(/^\/roles\/([^/]+)$/); const rolePermissionMatch = path.match(/^\/roles\/([^/]+)\/permissions$/);
  if (roleMatch && method === 'GET') { const role = roleRecords().find((item) => item.code === roleMatch[1]); return role ? response(request, body(role)) : errorResponse(request, 404, 'Không tìm thấy vai trò mock.'); }
  if (rolePermissionMatch && method === 'PUT') { const code = rolePermissionMatch[1]; if (code === 'ADMIN') return errorResponse(request, 422, 'Vai trò ADMIN được bảo vệ trong chế độ mock.'); if (!ROLE_DEFINITIONS.some((item) => item.code === code)) return errorResponse(request, 404, 'Không tìm thấy vai trò mock.'); rolePermissionState[code] = Array.isArray(payload.permissionCodes) ? payload.permissionCodes.map(String) : []; const role = roleRecords().find((item) => item.code === code)!; auditLogs = [createMockAudit('ROLE_PERMISSIONS_UPDATED', 'Role', role.id, { code }, role), ...auditLogs]; return response(request, body(role)); }

  if (path === '/audit-logs' && method === 'GET' || path === '/audit-log' && method === 'GET') {
    const keyword = stringParam(params, 'keyword')?.toLocaleLowerCase('vi'); const action = stringParam(params, 'action'); const entityName = stringParam(params, 'entityName');
    const filtered = auditLogs.filter((item) => (!keyword || `${item.actorName} ${item.actorUsername} ${item.entityName} ${item.action}`.toLocaleLowerCase('vi').includes(keyword)) && (!action || item.action === action) && (!entityName || item.entityName === entityName));
    return response(request, paginate(filtered, request));
  }

  if (path === '/computers/availability-summary' && method === 'GET') return response(request, body(computerSummary()));
  if (path === '/computers' && method === 'GET') { const keyword = stringParam(params, 'keyword')?.toLocaleLowerCase('vi'); const status = stringParam(params, 'status'); const position = stringParam(params, 'position'); const filtered = computers.filter((item) => (!keyword || `${item.code} ${item.name} ${item.ipAddress || ''}`.toLocaleLowerCase('vi').includes(keyword)) && (!status || item.status === status) && (!position || item.position === position)); return response(request, paginate(filtered, request)); }
  const computerMatch = path.match(/^\/computers\/([^/]+)$/); const computerStatusMatch = path.match(/^\/computers\/([^/]+)\/status$/);
  if (computerMatch && method === 'GET') { const item = matchComputer(computerMatch[1]); return item ? response(request, body(item)) : errorResponse(request, 404, 'Không tìm thấy máy tính mock.'); }
  if (computerMatch && method === 'DELETE') { const index = computers.findIndex((item) => item.id === computerMatch[1]); if (index < 0) return errorResponse(request, 404, 'Không tìm thấy máy tính mock.'); closeMockComputerActivity(computers[index].id, now()); computers.splice(index, 1); return response(request, body(null)); }
  if (computerStatusMatch && method === 'PATCH') { const item = matchComputer(computerStatusMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy máy tính mock.'); const nextStatus = String(payload.status) as ComputerStatus; if (item.status !== nextStatus && (item.status === 'MAINTENANCE' || nextStatus === 'MAINTENANCE')) return errorResponse(request, 422, 'Trạng thái bảo trì chỉ được thay đổi từ lịch bảo trì.'); const previousStatus = item.status; item.status = nextStatus; item.updatedAt = now(); if (previousStatus !== nextStatus) transitionMockComputerActivity(item, nextStatus, item.updatedAt, { note: `Chuyển từ ${previousStatus} sang ${nextStatus}` }); if (nextStatus === 'BROKEN') ensureMockComputerProposal(item, 'BROKEN_STATUS'); return response(request, body(item)); }
  if (computerMatch && method === 'PUT') { const item = matchComputer(computerMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy máy tính mock.'); const nextStatus = String(payload.status || item.status) as ComputerStatus; if (item.status !== nextStatus && (item.status === 'MAINTENANCE' || nextStatus === 'MAINTENANCE')) return errorResponse(request, 422, 'Trạng thái bảo trì chỉ được thay đổi từ lịch bảo trì.'); const previousStatus = item.status; const wasBroken = item.status === 'BROKEN'; Object.assign(item, payload, { id: item.id, updatedAt: now() }); if (previousStatus !== item.status) transitionMockComputerActivity(item, item.status, item.updatedAt!, { note: `Chuyển từ ${previousStatus} sang ${item.status}` }); if (!wasBroken && item.status === 'BROKEN') ensureMockComputerProposal(item, 'BROKEN_STATUS'); return response(request, body(item)); }
  if (path === '/computers' && method === 'POST') { const item = { ...(payload as unknown as ComputerData), id: `mock-computer-${Date.now()}`, createdAt: now(), updatedAt: now() }; if (item.status === 'MAINTENANCE') return errorResponse(request, 422, 'Không thể tạo máy trực tiếp ở trạng thái bảo trì.'); computers.unshift(item); transitionMockComputerActivity(item, item.status, item.createdAt!, { note: 'Khởi tạo máy tính' }); if (item.status === 'BROKEN') ensureMockComputerProposal(item, 'BROKEN_STATUS'); return response(request, body(item), 201); }

  if (path === '/equipments/categories' && method === 'GET') return response(request, body(categories));
  if (path === '/equipments/categories' && method === 'POST') { const category = { ...(payload as unknown as EquipmentCategoryData), id: `mock-category-${Date.now()}` }; categories.push(category); return response(request, body(category), 201); }
  if (path === '/equipments' && method === 'GET') { const keyword = stringParam(params, 'keyword')?.toLocaleLowerCase('vi'); const categoryId = stringParam(params, 'categoryId'); const filtered = equipment.filter((item) => (!keyword || `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(keyword)) && (!categoryId || item.categoryId === categoryId)); return response(request, paginate(filtered, request)); }
  const equipmentMatch = path.match(/^\/equipments\/([^/]+)(?:\/(adjust|report-broken|transactions))?$/);
  if (equipmentMatch && method === 'GET') { const item = matchEquipment(equipmentMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy thiết bị mock.'); if (equipmentMatch[2] === 'transactions') return response(request, body(equipmentTransactions.filter((tx) => tx.equipmentId === item.id))); return response(request, body(item)); }
  if (equipmentMatch && method === 'PUT') { const item = matchEquipment(equipmentMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy thiết bị mock.'); Object.assign(item, payload, { id: item.id, updatedAt: now() }); return response(request, body(item)); }
  if (equipmentMatch && method === 'POST' && equipmentMatch[2] === 'adjust') { const item = matchEquipment(equipmentMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy thiết bị mock.'); const delta = Number(payload.delta || 0); item.totalQuantity += delta; item.availableQuantity += delta; item.updatedAt = now(); return response(request, body(item)); }
  if (equipmentMatch && method === 'POST' && equipmentMatch[2] === 'report-broken') { const item = matchEquipment(equipmentMatch[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy thiết bị mock.'); const quantity = Number(payload.quantity || 0); item.brokenQuantity += quantity; item.availableQuantity = Math.max(0, item.availableQuantity - quantity); item.updatedAt = now(); return response(request, body(item)); }
  if (path === '/equipments' && method === 'POST') { const item: EquipmentData = { ...(payload as unknown as EquipmentData), id: `mock-equipment-${Date.now()}`, totalQuantity: 0, availableQuantity: 0, reservedQuantity: 0, borrowedQuantity: 0, brokenQuantity: 0, maintenanceQuantity: 0, lostQuantity: 0, createdAt: now(), updatedAt: now() }; equipment.unshift(item); return response(request, body(item), 201); }

  if (path === '/lab-profile' && method === 'GET') return response(request, body(lab));
  if (path === '/lab-profile' && method === 'PUT') { lab = { ...lab, ...(payload as Partial<LabProfileData>), updatedAt: now() }; return response(request, body(lab)); }
  if (path === '/lab-profile/status' && method === 'PATCH') { lab.status = String(payload.status) as LabProfileData['status']; lab.updatedAt = now(); return response(request, body({ id: lab.id, status: lab.status, updatedAt: lab.updatedAt })); }

  if (path === '/maintenances/summary' && method === 'GET') return response(request, body(maintenanceSummary()));
  if (path === '/maintenances/options' && method === 'GET') return response(request, body(maintenanceOptions()));
  if (path === '/maintenances/sync-reminders' && method === 'POST') {
    let created = 0;
    for (const computer of computers) {
      const base = computer.lastMaintenanceDate || computer.createdAt;
      const periodicDue = Boolean(base && Date.now() - new Date(base).getTime() >= 270 * 24 * 60 * 60 * 1000);
      if (computer.status === 'BROKEN' || computer.status === 'MAINTENANCE' || periodicDue) created += ensureMockComputerProposal(computer, computer.status === 'BROKEN' ? 'BROKEN_STATUS' : computer.status === 'MAINTENANCE' ? 'MAINTENANCE_STATUS' : 'PERIODIC_270') ? 1 : 0;
    }
    return response(request, body({ created, intervalDays: 270 }));
  }
  if (path === '/maintenances' && method === 'GET') {
    const keyword = stringParam(params, 'keyword')?.toLocaleLowerCase('vi');
    const status = stringParam(params, 'status'); const targetType = stringParam(params, 'targetType'); const technicianId = stringParam(params, 'technicianId');
    const fromDate = stringParam(params, 'fromDate'); const toDate = stringParam(params, 'toDate');
    const filtered = maintenances
      .filter((item) => (!keyword || `${item.code} ${item.title} ${item.targetCode} ${item.targetName}`.toLocaleLowerCase('vi').includes(keyword))
        && (!status || item.status === status) && (!targetType || item.targetType === targetType) && (!technicianId || item.technicianId === technicianId)
        && (!fromDate || item.expectedEndAt >= fromDate) && (!toDate || item.scheduledStartAt <= toDate))
      .map(refreshMaintenanceOverdue)
      .sort((a, b) => b.scheduledStartAt.localeCompare(a.scheduledStartAt));
    return response(request, paginate(filtered, request));
  }
  if (path === '/maintenances' && method === 'POST') {
    const input = payload as unknown as MaintenancePayload;
    const validationError = validateMockMaintenancePayload(input);
    if (validationError) return errorResponse(request, 422, validationError);
    const target = maintenanceTarget(input.targetType, input.targetId);
    if (!target) return errorResponse(request, 404, 'Không tìm thấy tài sản bảo trì mock.');
    if (hasMaintenanceConflict(input.targetType, input.targetId, input.scheduledStartAt, input.expectedEndAt)) return errorResponse(request, 409, 'Tài sản đã có lịch bảo trì trùng thời gian.');
    const technician = users.find((user) => user.id === input.technicianId);
    const timestamp = now();
    const item: MaintenanceRecord = {
      id: `mock-maintenance-${Date.now()}`, code: nextMaintenanceCode(), targetType: input.targetType, targetId: input.targetId,
      targetCode: target.code, targetName: target.name, title: input.title.trim(), description: input.description?.trim() || null,
      reason: input.reason.trim(), scheduledStartAt: input.scheduledStartAt, expectedEndAt: input.expectedEndAt,
      startedAt: null, completedAt: null, cancelledAt: null, status: 'SCHEDULED', technicianId: technician?.id || null,
      technicianName: technician?.fullName || null, technicianUsername: technician?.username || null, quantity: input.targetType === 'EQUIPMENT' ? input.quantity : 1,
      maintenanceSource: input.targetType === 'EQUIPMENT' ? input.maintenanceSource || 'AVAILABLE' : null, resultNote: null,
      partsNote: input.partsNote?.trim() || null, estimatedCost: Number(input.estimatedCost || 0), actualCost: null,
      completionOutcome: null, cancellationReason: null, triggerSource: 'MANUAL', triggeredAt: null, createdBy: users[0]?.id || null, createdByName: users[0]?.fullName || 'Administrator',
      createdAt: timestamp, updatedAt: timestamp, isOverdue: false,
    };
    maintenances = [item, ...maintenances];
    auditLogs = [createMockAudit('MAINTENANCE_CREATED', 'MaintenanceSchedule', item.id, null, item), ...auditLogs];
    return response(request, body(item), 201);
  }
  const maintenanceAction = path.match(/^\/maintenances\/([^/]+)\/(start|complete|cancel)$/);
  if (maintenanceAction && method === 'POST') {
    const item = maintenances.find((maintenance) => maintenance.id === maintenanceAction[1]);
    if (!item) return errorResponse(request, 404, 'Không tìm thấy lịch bảo trì mock.');
    const before = { ...item };
    if (maintenanceAction[2] === 'start') {
      if (item.status !== 'SCHEDULED') return errorResponse(request, 422, 'Chỉ lịch đã lên kế hoạch mới có thể bắt đầu.');
      const startError = startMockMaintenanceTarget(item);
      if (startError) return errorResponse(request, 422, startError);
      item.status = 'IN_PROGRESS'; item.startedAt = now(); item.updatedAt = item.startedAt;
      if (item.targetType === 'COMPUTER') { const computer = matchComputer(item.targetId); if (computer) transitionMockComputerActivity(computer, 'MAINTENANCE', item.startedAt, { maintenance: item, note: item.reason }); }
      auditLogs = [createMockAudit('MAINTENANCE_STARTED', 'MaintenanceSchedule', item.id, before, item), ...auditLogs];
    } else if (maintenanceAction[2] === 'complete') {
      if (item.status !== 'IN_PROGRESS') return errorResponse(request, 422, 'Chỉ lịch đang thực hiện mới có thể hoàn tất.');
      const resultNote = String(payload.resultNote || '').trim(); const actualCost = Number(payload.actualCost || 0);
      const outcome = String(payload.outcome || 'AVAILABLE') as MaintenanceOutcome;
      if (!resultNote) return errorResponse(request, 422, 'Kết quả bảo trì không được để trống.');
      if (actualCost < 0 || !['AVAILABLE', 'BROKEN'].includes(outcome)) return errorResponse(request, 422, 'Thông tin hoàn tất bảo trì không hợp lệ.');
      const completeError = completeMockMaintenanceTarget(item, outcome);
      if (completeError) return errorResponse(request, 422, completeError);
      item.status = 'COMPLETED'; item.completedAt = now(); item.updatedAt = item.completedAt; item.resultNote = resultNote;
      item.actualCost = actualCost; item.completionOutcome = outcome; item.partsNote = String(payload.partsNote || '').trim() || item.partsNote;
      if (item.targetType === 'COMPUTER') { const computer = matchComputer(item.targetId); if (computer) transitionMockComputerActivity(computer, outcome === 'BROKEN' ? 'BROKEN' : 'ACTIVE', item.completedAt, { maintenance: item, note: resultNote }); }
      auditLogs = [createMockAudit('MAINTENANCE_COMPLETED', 'MaintenanceSchedule', item.id, before, item), ...auditLogs];
    } else {
      if (!['PENDING', 'SCHEDULED'].includes(item.status)) return errorResponse(request, 422, 'Chỉ lịch chưa bắt đầu mới có thể hủy.');
      const reason = String(payload.reason || '').trim(); if (!reason) return errorResponse(request, 422, 'Lý do hủy không được để trống.');
      item.status = 'CANCELLED'; item.cancellationReason = reason; item.cancelledAt = now(); item.updatedAt = item.cancelledAt;
      auditLogs = [createMockAudit('MAINTENANCE_CANCELLED', 'MaintenanceSchedule', item.id, before, item), ...auditLogs];
    }
    return response(request, body(refreshMaintenanceOverdue(item)));
  }
  const maintenanceMatch = path.match(/^\/maintenances\/([^/]+)$/);
  if (maintenanceMatch && method === 'GET') {
    const item = maintenances.find((maintenance) => maintenance.id === maintenanceMatch[1]);
    return item ? response(request, body(refreshMaintenanceOverdue(item))) : errorResponse(request, 404, 'Không tìm thấy lịch bảo trì mock.');
  }
  if (maintenanceMatch && method === 'PUT') {
    const item = maintenances.find((maintenance) => maintenance.id === maintenanceMatch[1]);
    if (!item) return errorResponse(request, 404, 'Không tìm thấy lịch bảo trì mock.');
    if (!['PENDING', 'SCHEDULED'].includes(item.status)) return errorResponse(request, 422, 'Chỉ được chỉnh sửa lịch bảo trì chưa bắt đầu.');
    const input = payload as unknown as MaintenancePayload; const validationError = validateMockMaintenancePayload(input);
    if (validationError) return errorResponse(request, 422, validationError);
    const target = maintenanceTarget(input.targetType, input.targetId); if (!target) return errorResponse(request, 404, 'Không tìm thấy tài sản bảo trì mock.');
    if (hasMaintenanceConflict(input.targetType, input.targetId, input.scheduledStartAt, input.expectedEndAt, item.id)) return errorResponse(request, 409, 'Tài sản đã có lịch bảo trì trùng thời gian.');
    const before = { ...item }; const technician = users.find((user) => user.id === input.technicianId);
    Object.assign(item, {
      targetType: input.targetType, targetId: input.targetId, targetCode: target.code, targetName: target.name,
      title: input.title.trim(), description: input.description?.trim() || null, reason: input.reason.trim(),
      scheduledStartAt: input.scheduledStartAt, expectedEndAt: input.expectedEndAt, technicianId: technician?.id || null,
      technicianName: technician?.fullName || null, technicianUsername: technician?.username || null,
      quantity: input.targetType === 'EQUIPMENT' ? input.quantity : 1,
      maintenanceSource: input.targetType === 'EQUIPMENT' ? input.maintenanceSource || 'AVAILABLE' : null,
      estimatedCost: Number(input.estimatedCost || 0), partsNote: input.partsNote?.trim() || null, updatedAt: now(),
      status: 'SCHEDULED',
    });
    auditLogs = [createMockAudit('MAINTENANCE_UPDATED', 'MaintenanceSchedule', item.id, before, item), ...auditLogs];
    return response(request, body(refreshMaintenanceOverdue(item)));
  }
  if (maintenanceMatch && method === 'DELETE') {
    const index = maintenances.findIndex((maintenance) => maintenance.id === maintenanceMatch[1]);
    if (index < 0) return errorResponse(request, 404, 'Không tìm thấy lịch bảo trì mock.');
    if (!['PENDING', 'SCHEDULED', 'CANCELLED'].includes(maintenances[index].status)) return errorResponse(request, 422, 'Không thể xóa lịch đang thực hiện hoặc đã hoàn tất.');
    const [deleted] = maintenances.splice(index, 1); auditLogs = [createMockAudit('MAINTENANCE_DELETED', 'MaintenanceSchedule', deleted.id, deleted, null), ...auditLogs];
    return response(request, body(null));
  }

  if (path === '/bookings/my-bookings' && method === 'GET') return response(request, bookings.filter((item) => item.requesterId === users[0]?.id || item.requesterId === users[1]?.id));
  if (path === '/bookings/admin/pending' && method === 'GET') return response(request, bookings.filter((item) => item.status === 'PENDING'));
  if (path === '/bookings/usage-statistics' && method === 'GET') {
    const month = stringParam(params, 'month') || new Date().toISOString().slice(0, 7);
    try { return response(request, body(mockUsageStatistics(month))); } catch (error: any) { return errorResponse(request, 400, error.message); }
  }
  if (path === '/bookings/calendar' && method === 'GET') { const start = new Date(String(params.start || 0)); const end = new Date(String(params.end || 8640000000000000)); return response(request, bookings.filter((item) => new Date(item.startTime) < end && new Date(item.endTime) > start).map((item) => ({ id: item.id, title: item.purpose, start: item.startTime, end: item.endTime, type: item.bookingType, status: item.status, requesterId: item.requesterId, numberOfPeople: item.numberOfPeople, numberOfComputers: item.numberOfComputers })) as CalendarEvent[]); }
  if (path === '/bookings' && method === 'POST') { const input = payload as unknown as CreateBookingPayload; const item: BookingData = { id: `mock-booking-${Date.now()}`, requestCode: `BK-MOCK-${String(bookings.length + 1).padStart(3, '0')}`, requesterId: users[0]?.id, bookingType: input.bookingType, purpose: input.purpose, startTime: input.startTime, endTime: input.endTime, expectedReturnTime: input.expectedReturnTime, numberOfPeople: input.numberOfPeople, numberOfComputers: input.numberOfComputers, status: 'PENDING', isOverdue: false, hasIncident: false, note: input.note || null, createdAt: now() }; bookings = [item, ...bookings]; return response(request, item, 201); }
  const bookingAction = path.match(/^\/bookings\/([^/]+)\/(approve|reject|cancel|check-in|check-out)$/);
  if (bookingAction && method === 'POST') {
    const item = bookings.find((booking) => booking.id === bookingAction[1]); if (!item) return errorResponse(request, 404, 'Không tìm thấy lịch mock.');
    const action = bookingAction[2];
    if (action === 'check-in') {
      if (item.status !== 'APPROVED') return errorResponse(request, 422, 'Chỉ lịch đã duyệt mới có thể check-in.');
      const computerIds = Array.isArray(payload.computerIds) ? Array.from(new Set(payload.computerIds.map(String))) : [];
      if (item.numberOfComputers > 0 && computerIds.length === 0) return errorResponse(request, 422, 'Cần chọn cụ thể các máy tính được sử dụng.');
      const selectedComputers = computerIds.map((computerId) => matchComputer(computerId));
      if (selectedComputers.some((computer) => !computer || computer.status !== 'ACTIVE')) return errorResponse(request, 422, 'Một máy được chọn không còn ở trạng thái sẵn sàng.');
      item.status = 'CHECKED_IN'; item.checkInTime = now(); item.actualPeopleCount = Number(payload.actualPeopleCount ?? item.numberOfPeople); item.actualComputerCount = computerIds.length; item.selectedComputerIds = computerIds;
      selectedComputers.forEach((computer) => { if (!computer) return; computer.status = 'IN_USE'; computer.updatedAt = item.checkInTime!; transitionMockComputerActivity(computer, 'IN_USE', item.checkInTime!, { booking: item, note: item.purpose }); });
      auditLogs = [createMockAudit('BOOKING_CHECKED_IN', 'BookingRequest', item.id, null, item), ...auditLogs];
      return response(request, { success: true, status: item.status, checkInTime: item.checkInTime, actualPeopleCount: item.actualPeopleCount, actualComputerCount: item.actualComputerCount, computerIds });
    }
    if (action === 'check-out') {
      if (item.status !== 'CHECKED_IN') return errorResponse(request, 422, 'Booking chưa check-in nên không thể check-out.');
      item.status = 'COMPLETED'; item.checkOutTime = now();
      const activeMachineActivities = computerActivityLogs.filter((activity) => activity.bookingRequestId === item.id && activity.activityType === 'IN_USE' && !activity.endedAt);
      activeMachineActivities.forEach((activity) => { const computer = matchComputer(activity.computerId); if (!computer || computer.status !== 'IN_USE') return; computer.status = 'ACTIVE'; computer.updatedAt = item.checkOutTime!; transitionMockComputerActivity(computer, 'ACTIVE', item.checkOutTime!, { note: `Hoàn tất phiên ${item.requestCode}` }); });
      auditLogs = [createMockAudit('BOOKING_CHECKED_OUT', 'BookingRequest', item.id, null, item), ...auditLogs];
      return response(request, { success: true, status: item.status, checkOutTime: item.checkOutTime, computerIds: activeMachineActivities.map((activity) => activity.computerId) });
    }
    item.status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'CANCELLED'; return response(request, item);
  }

  return errorResponse(request, 404, `Mock API chưa có endpoint ${method} ${path}.`);
};

function roleRecords(): RoleApiRecord[] {
  return ROLE_DEFINITIONS.map((role) => ({ id: `mock-role-${role.code}`, code: role.code, name: role.name, description: role.description, userCount: users.filter((user) => user.roles.includes(role.code)).length, permissionCodes: [...(rolePermissionState[role.code] || [])] }));
}

function computerSummary() {
  return { total: computers.length, active: computers.filter((item) => item.status === 'ACTIVE').length, inUse: computers.filter((item) => item.status === 'IN_USE').length, broken: computers.filter((item) => item.status === 'BROKEN').length, maintenance: computers.filter((item) => item.status === 'MAINTENANCE').length, locked: computers.filter((item) => item.status === 'LOCKED').length, inactive: computers.filter((item) => item.status === 'INACTIVE').length };
}

function closeMockComputerActivity(computerId: string, occurredAt: string) {
  const current = computerActivityLogs.find((activity) => activity.computerId === computerId && !activity.endedAt);
  if (current) current.endedAt = occurredAt;
}

function transitionMockComputerActivity(computer: ComputerData, activityType: ComputerStatus, occurredAt: string, options: { booking?: BookingData; maintenance?: MaintenanceRecord; note?: string } = {}) {
  closeMockComputerActivity(computer.id, occurredAt);
  const requester = options.booking ? users.find((user) => user.id === options.booking?.requesterId) : null;
  computerActivityLogs.unshift({
    id: `mock-activity-${Date.now()}-${computer.id}`,
    computerId: computer.id,
    computerCode: computer.code,
    computerName: computer.name,
    activityType,
    startedAt: occurredAt,
    endedAt: null,
    bookingRequestId: options.booking?.id || null,
    bookingRequestCode: options.booking?.requestCode || null,
    bookingPurpose: options.booking?.purpose || null,
    requesterName: requester?.fullName || null,
    maintenanceScheduleId: options.maintenance?.id || null,
    maintenanceCode: options.maintenance?.code || null,
    performedBy: users[0]?.id || null,
    performedByName: users[0]?.fullName || null,
    note: options.note || null,
  });
}

function mockUsageStatistics(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Tháng thống kê phải có dạng YYYY-MM.');
  const [year, monthIndex] = month.split('-').map(Number);
  const labTimezoneOffsetMs = 7 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(year, monthIndex - 1, 1) - labTimezoneOffsetMs);
  const end = new Date(Date.UTC(year, monthIndex, 1) - labTimezoneOffsetMs);
  const nowDate = new Date();
  const round = (value: number) => Math.round(value * 100) / 100;
  const labDayKey = (date: Date) => new Date(date.getTime() + labTimezoneOffsetMs).toISOString().slice(0, 10);
  const nextLabDay = (date: Date) => {
    const labDate = new Date(date.getTime() + labTimezoneOffsetMs);
    return new Date(Date.UTC(labDate.getUTCFullYear(), labDate.getUTCMonth(), labDate.getUTCDate() + 1) - labTimezoneOffsetMs);
  };
  const overlapHours = (from: string, to: string | null) => Math.max(0, Math.min(new Date(to || nowDate).getTime(), end.getTime()) - Math.max(new Date(from).getTime(), start.getTime())) / 3_600_000;
  const daily = new Map<string, { date: string; usageHours: number; computerHours: number; checkInCount: number; checkOutCount: number }>();
  for (let cursor = new Date(start); cursor < end; cursor = nextLabDay(cursor)) {
    const key = labDayKey(cursor);
    daily.set(key, { date: key, usageHours: 0, computerHours: 0, checkInCount: 0, checkOutCount: 0 });
  }
  const accumulate = (from: string, to: string | null, onHours: (row: { date: string; usageHours: number; computerHours: number; checkInCount: number; checkOutCount: number }, hours: number) => void) => {
    let cursor = new Date(Math.max(new Date(from).getTime(), start.getTime()));
    const intervalEnd = new Date(Math.min(new Date(to || nowDate).getTime(), end.getTime()));
    while (cursor < intervalEnd) {
      const nextDay = nextLabDay(cursor);
      const segmentEnd = new Date(Math.min(nextDay.getTime(), intervalEnd.getTime()));
      const row = daily.get(labDayKey(cursor));
      if (row) onHours(row, (segmentEnd.getTime() - cursor.getTime()) / 3_600_000);
      cursor = segmentEnd;
    }
  };

  const activities = computerActivityLogs.filter((activity) => new Date(activity.startedAt) < end && new Date(activity.endedAt || nowDate) > start);
  const usageActivities = activities.filter((activity) => activity.activityType === 'IN_USE');
  const bookingsWithMachineLogs = new Set(usageActivities.map((activity) => activity.bookingRequestId).filter(Boolean));
  const sessions = bookings.filter((booking) => booking.checkInTime && new Date(booking.checkInTime) < end && new Date(booking.checkOutTime || nowDate) > start);
  sessions.forEach((booking) => {
    const computerCount = booking.actualComputerCount ?? booking.numberOfComputers;
    accumulate(booking.checkInTime!, booking.checkOutTime || null, (row, hours) => {
      row.usageHours += hours;
      if (!bookingsWithMachineLogs.has(booking.id)) row.computerHours += hours * computerCount;
    });
    const checkIn = new Date(booking.checkInTime!);
    const checkOut = booking.checkOutTime ? new Date(booking.checkOutTime) : null;
    if (checkIn >= start && checkIn < end) daily.get(labDayKey(checkIn))!.checkInCount += 1;
    if (checkOut && checkOut >= start && checkOut < end) daily.get(labDayKey(checkOut))!.checkOutCount += 1;
  });
  usageActivities.forEach((activity) => accumulate(activity.startedAt, activity.endedAt, (row, hours) => { row.computerHours += hours; }));

  const rows = Array.from(daily.values()).map((item) => ({ ...item, usageHours: round(item.usageHours), computerHours: round(item.computerHours) }));
  const currentActivities = computerActivityLogs.filter((activity) => !activity.endedAt);
  const computerSummaries = computers.map((computer) => {
    const machineActivities = activities.filter((activity) => activity.computerId === computer.id);
    const current = currentActivities.find((activity) => activity.computerId === computer.id);
    const hoursOf = (status: ComputerStatus) => round(machineActivities.filter((activity) => activity.activityType === status).reduce((sum, activity) => sum + overlapHours(activity.startedAt, activity.endedAt), 0));
    return {
      computerId: computer.id, computerCode: computer.code, computerName: computer.name,
      usageSessionCount: machineActivities.filter((activity) => activity.activityType === 'IN_USE').length,
      usageHours: hoursOf('IN_USE'), readyHours: hoursOf('ACTIVE'), maintenanceHours: hoursOf('MAINTENANCE'),
      brokenHours: hoursOf('BROKEN'), lockedHours: hoursOf('LOCKED'), inactiveHours: hoursOf('INACTIVE'),
      currentActivityType: current?.activityType || null, currentActivityStartedAt: current?.startedAt || null,
      currentBookingCode: current?.bookingRequestCode || null, currentPurpose: current?.bookingPurpose || null,
      currentRequesterName: current?.requesterName || null,
    };
  });

  return {
    month, rangeStart: start.toISOString(), rangeEnd: end.toISOString(),
    totalUsageHours: round(rows.reduce((sum, item) => sum + item.usageHours, 0)),
    totalComputerHours: round(rows.reduce((sum, item) => sum + item.computerHours, 0)),
    totalCheckIns: sessions.filter((booking) => { const date = new Date(booking.checkInTime!); return date >= start && date < end; }).length,
    totalCheckOuts: sessions.filter((booking) => { const date = booking.checkOutTime ? new Date(booking.checkOutTime) : null; return !!date && date >= start && date < end; }).length,
    activeSessions: sessions.filter((booking) => !booking.checkOutTime).length,
    daily: rows,
    sessions: sessions.map((booking) => {
      const machineLogs = usageActivities.filter((activity) => activity.bookingRequestId === booking.id);
      const usageHours = round(overlapHours(booking.checkInTime!, booking.checkOutTime || null));
      const actualComputerCount = booking.actualComputerCount ?? booking.numberOfComputers;
      return {
        bookingId: booking.id, requestCode: booking.requestCode, purpose: booking.purpose, bookingType: booking.bookingType,
        checkInTime: booking.checkInTime, checkOutTime: booking.checkOutTime || null,
        actualPeopleCount: booking.actualPeopleCount ?? booking.numberOfPeople, actualComputerCount, usageHours,
        computerHours: machineLogs.length ? round(machineLogs.reduce((sum, activity) => sum + overlapHours(activity.startedAt, activity.endedAt), 0)) : round(usageHours * actualComputerCount),
        computerHoursSource: machineLogs.length ? 'MACHINE_LOGS' as const : 'ESTIMATED_COUNT' as const,
        computerCodes: machineLogs.map((activity) => activity.computerCode), isActive: !booking.checkOutTime,
      };
    }),
    computerSummaries,
    computerActivities: activities.map((activity) => ({ ...activity, durationHours: round(overlapHours(activity.startedAt, activity.endedAt)), isActive: !activity.endedAt })),
  };
}

function maintenanceSummary() {
  const records = maintenances.map(refreshMaintenanceOverdue);
  return {
    total: records.length,
    pending: records.filter((item) => item.status === 'PENDING').length,
    scheduled: records.filter((item) => item.status === 'SCHEDULED').length,
    inProgress: records.filter((item) => item.status === 'IN_PROGRESS').length,
    completed: records.filter((item) => item.status === 'COMPLETED').length,
    cancelled: records.filter((item) => item.status === 'CANCELLED').length,
    overdue: records.filter((item) => item.isOverdue).length,
    totalActualCost: records.reduce((sum, item) => sum + (item.actualCost || 0), 0),
  };
}

function maintenanceOptions(): MaintenanceOptions {
  return {
    lab: { id: lab.id, code: lab.labCode, name: lab.labName, status: lab.status },
    computers: computers.map((item) => ({ id: item.id, code: item.code, name: item.name, status: item.status })),
    equipments: equipment.map((item) => ({
      id: item.id, code: item.code, name: item.name, status: item.status,
      availableQuantity: item.availableQuantity, brokenQuantity: item.brokenQuantity, maintenanceQuantity: item.maintenanceQuantity,
    })),
    technicians: users
      .filter((user) => user.status === 'ACTIVE' && user.roles.some((role) => ['ADMIN', 'LAB_STAFF', 'COLLABORATOR'].includes(role)))
      .map((user) => ({ id: user.id, fullName: user.fullName, username: user.username, roles: [...user.roles] })),
  };
}

function maintenanceTarget(targetType: MaintenanceTargetType, targetId: string): { code: string; name: string } | null {
  if (targetType === 'LAB') return targetId === lab.id ? { code: lab.labCode, name: lab.labName } : null;
  if (targetType === 'COMPUTER') {
    const computer = matchComputer(targetId); return computer ? { code: computer.code, name: computer.name } : null;
  }
  const item = matchEquipment(targetId); return item ? { code: item.code, name: item.name } : null;
}

function validateMockMaintenancePayload(input: MaintenancePayload): string | null {
  if (!input || !['LAB', 'COMPUTER', 'EQUIPMENT'].includes(input.targetType) || !input.targetId) return 'Đối tượng bảo trì không hợp lệ.';
  if (!input.title?.trim() || !input.reason?.trim()) return 'Tiêu đề và lý do bảo trì không được để trống.';
  const start = new Date(input.scheduledStartAt); const end = new Date(input.expectedEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return 'Thời gian kết thúc phải sau thời gian bắt đầu.';
  if (Number(input.estimatedCost) < 0) return 'Chi phí dự kiến không được âm.';
  if (input.targetType === 'EQUIPMENT') {
    if (!Number.isInteger(Number(input.quantity)) || Number(input.quantity) <= 0) return 'Số lượng bảo trì phải là số nguyên lớn hơn 0.';
    if (!['AVAILABLE', 'BROKEN'].includes(input.maintenanceSource || '')) return 'Cần chọn nguồn số lượng thiết bị.';
  }
  if (input.technicianId) {
    const technician = users.find((user) => user.id === input.technicianId);
    if (!technician || technician.status !== 'ACTIVE' || !technician.roles.some((role) => ['ADMIN', 'LAB_STAFF', 'COLLABORATOR'].includes(role))) return 'Người xử lý bảo trì không hợp lệ.';
  }
  return null;
}

function hasMaintenanceConflict(targetType: MaintenanceTargetType, targetId: string, startAt: string, endAt: string, excludedId?: string): boolean {
  const start = new Date(startAt).getTime(); const end = new Date(endAt).getTime();
  return maintenances.some((item) => item.id !== excludedId && item.targetType === targetType && item.targetId === targetId
    && ['SCHEDULED', 'IN_PROGRESS'].includes(item.status) && new Date(item.scheduledStartAt).getTime() < end && new Date(item.expectedEndAt).getTime() > start);
}

function nextMaintenanceCode(): string {
  const date = new Date(); const prefix = `BT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-`;
  const sequence = maintenances.filter((item) => item.code.startsWith(prefix)).length + 1;
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

function refreshMaintenanceOverdue(item: MaintenanceRecord): MaintenanceRecord {
  item.isOverdue = ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(item.status) && new Date(item.expectedEndAt).getTime() < Date.now();
  return item;
}

function ensureMockComputerProposal(computer: ComputerData, source: 'BROKEN_STATUS' | 'MAINTENANCE_STATUS' | 'PERIODIC_270'): boolean {
  if (maintenances.some((item) => item.targetType === 'COMPUTER' && item.targetId === computer.id && ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(item.status))) return false;
  const timestamp = now(); const base = computer.lastMaintenanceDate || computer.createdAt || timestamp;
  const dueAt = source === 'BROKEN_STATUS' || source === 'MAINTENANCE_STATUS' ? new Date() : new Date(new Date(base).getTime() + 270 * 24 * 60 * 60 * 1000);
  const expectedEndAt = new Date(dueAt.getTime() + 2 * 60 * 60 * 1000);
  const item: MaintenanceRecord = {
    id: `mock-maintenance-${Date.now()}-${computer.id}`, code: nextMaintenanceCode(), targetType: 'COMPUTER', targetId: computer.id,
    targetCode: computer.code, targetName: computer.name,
    title: source === 'BROKEN_STATUS' ? `Kiểm tra và sửa chữa ${computer.code}` : source === 'MAINTENANCE_STATUS' ? `Tiếp nhận máy đang bảo trì ${computer.code}` : `Bảo trì định kỳ ${computer.code}`,
    description: source === 'BROKEN_STATUS' ? computer.note || 'Đề xuất tự động khi máy bị hỏng.' : source === 'MAINTENANCE_STATUS' ? 'Hồ sơ đồng bộ máy đã ở trạng thái bảo trì.' : 'Đề xuất tự động theo chu kỳ 270 ngày.',
    reason: source === 'BROKEN_STATUS' ? 'Máy tính được ghi nhận bị hỏng và cần được kiểm tra.' : source === 'MAINTENANCE_STATUS' ? 'Đồng bộ máy tính đang bảo trì với danh sách bảo trì.' : 'Máy tính đã đến hạn bảo trì định kỳ 270 ngày.',
    scheduledStartAt: dueAt.toISOString(), expectedEndAt: expectedEndAt.toISOString(), startedAt: source === 'MAINTENANCE_STATUS' ? timestamp : null, completedAt: null, cancelledAt: null,
    status: source === 'MAINTENANCE_STATUS' ? 'IN_PROGRESS' : 'PENDING', technicianId: null, technicianName: null, technicianUsername: null, quantity: 1, maintenanceSource: null,
    resultNote: null, partsNote: null, estimatedCost: 0, actualCost: null, completionOutcome: null, cancellationReason: null,
    triggerSource: source, triggeredAt: timestamp, createdBy: users[0]?.id || null, createdByName: users[0]?.fullName || 'Administrator',
    createdAt: timestamp, updatedAt: timestamp, isOverdue: expectedEndAt.getTime() < Date.now(),
  };
  maintenances = [item, ...maintenances];
  auditLogs = [createMockAudit('MAINTENANCE_PROPOSAL_CREATED', 'MaintenanceSchedule', item.id, null, item), ...auditLogs];
  return true;
}

function startMockMaintenanceTarget(item: MaintenanceRecord): string | null {
  const timestamp = now();
  if (item.targetType === 'LAB') {
    if (lab.status !== 'ACTIVE') return 'Phòng Lab phải đang hoạt động trước khi bắt đầu bảo trì.';
    lab.status = 'MAINTENANCE'; lab.updatedAt = timestamp; return null;
  }
  if (item.targetType === 'COMPUTER') {
    const computer = matchComputer(item.targetId); if (!computer) return 'Không tìm thấy máy tính mock.';
    if (!['ACTIVE', 'BROKEN'].includes(computer.status)) return 'Máy tính không ở trạng thái có thể bắt đầu bảo trì.';
    computer.status = 'MAINTENANCE'; computer.updatedAt = timestamp; return null;
  }
  const asset = matchEquipment(item.targetId); if (!asset) return 'Không tìm thấy thiết bị mock.';
  if (asset.status !== 'ACTIVE') return 'Thiết bị phải đang hoạt động trước khi bảo trì.';
  const source = (item.maintenanceSource || 'AVAILABLE') as MaintenanceSource;
  const sourceQuantity = source === 'AVAILABLE' ? asset.availableQuantity : asset.brokenQuantity;
  if (sourceQuantity < item.quantity) return `Không đủ số lượng ${source === 'AVAILABLE' ? 'sẵn sàng' : 'bị hỏng'} để bảo trì.`;
  if (source === 'AVAILABLE') asset.availableQuantity -= item.quantity; else asset.brokenQuantity -= item.quantity;
  asset.maintenanceQuantity += item.quantity; asset.updatedAt = timestamp;
  equipmentTransactions = [{
    id: `mock-equipment-tx-${Date.now()}`, equipmentId: asset.id, transactionType: 'MAINTENANCE_START', deltaTotal: 0,
    deltaAvailable: source === 'AVAILABLE' ? -item.quantity : 0, deltaReserved: 0, deltaBorrowed: 0,
    deltaBroken: source === 'BROKEN' ? -item.quantity : 0, deltaMaintenance: item.quantity, deltaLost: 0,
    referenceType: 'MAINTENANCE', referenceId: item.id, performedBy: users[0]?.id, note: item.reason, createdAt: timestamp,
  }, ...equipmentTransactions];
  return null;
}

function completeMockMaintenanceTarget(item: MaintenanceRecord, outcome: MaintenanceOutcome): string | null {
  const timestamp = now();
  if (item.targetType === 'LAB') { lab.status = 'ACTIVE'; lab.updatedAt = timestamp; return null; }
  if (item.targetType === 'COMPUTER') {
    const computer = matchComputer(item.targetId); if (!computer) return 'Không tìm thấy máy tính mock.';
    if (computer.status !== 'MAINTENANCE') return 'Máy tính không ở trạng thái bảo trì.';
    computer.status = outcome === 'BROKEN' ? 'BROKEN' : 'ACTIVE'; computer.lastMaintenanceDate = timestamp; computer.updatedAt = timestamp; return null;
  }
  const asset = matchEquipment(item.targetId); if (!asset) return 'Không tìm thấy thiết bị mock.';
  if (asset.maintenanceQuantity < item.quantity) return 'Số lượng đang bảo trì không đủ để hoàn tất.';
  asset.maintenanceQuantity -= item.quantity;
  if (outcome === 'AVAILABLE') asset.availableQuantity += item.quantity; else asset.brokenQuantity += item.quantity;
  asset.updatedAt = timestamp;
  equipmentTransactions = [{
    id: `mock-equipment-tx-${Date.now()}`, equipmentId: asset.id, transactionType: 'MAINTENANCE_COMPLETE', deltaTotal: 0,
    deltaAvailable: outcome === 'AVAILABLE' ? item.quantity : 0, deltaReserved: 0, deltaBorrowed: 0,
    deltaBroken: outcome === 'BROKEN' ? item.quantity : 0, deltaMaintenance: -item.quantity, deltaLost: 0,
    referenceType: 'MAINTENANCE', referenceId: item.id, performedBy: users[0]?.id, note: item.resultNote || undefined, createdAt: timestamp,
  }, ...equipmentTransactions];
  return null;
}

function createMockAudit(action: string, entityName: string, entityId: string | null, oldValue: unknown, newValue: unknown): AuditLogRecord {
  return { id: `mock-audit-${Date.now()}`, userId: users[0]?.id || null, actorName: users[0]?.fullName || 'Mock Administrator', actorUsername: users[0]?.username || 'admin', action, entityName, entityId, oldValue, newValue, ipAddress: '127.0.0.1', userAgent: 'Mock browser', correlationId: `mock-${Date.now()}`, createdAt: now() };
}

export function createMockApiAdapter(): AxiosAdapter {
  return mockAdapter;
}
