export interface DeviceMetrics {
  timestamp: string;
  status?: {
    device_status?: string;
    is_in_use?: boolean;
    current_user?: string;
    user_token?: string;
    cpu?: { usage?: number; temperature?: number; cores?: number[] };
    ram?: { used?: number; total?: number; free?: number; usagePercent?: number };
    disk?: { used?: number; total?: number; usagePercent?: number; partitions?: unknown[] };
    network?: Record<string, unknown>;
    [key: string]: any;
  };
  installed_apps?: Array<{ name: string; version?: string; publisher?: string }>;
  ipAddress?: string;
}

export interface DeviceAgentRecord {
  computerId: string;
  deviceId: string;
  apiKeyHash: string;
  hostname: string;
  agentUuid?: string;
  platform?: string;
  architecture?: string;
  cpuCores?: number;
  registeredAt: Date;
  lastSeenAt?: Date;
  currentUserId?: string;
  currentUsername?: string;
  currentFullName?: string;
  boundAt?: Date;
  latestMetrics?: DeviceMetrics;
}

export interface RegisterDeviceAgentInput {
  computerId: string;
  deviceId: string;
  apiKeyHash: string;
  hostname: string;
  agentUuid?: string;
  platform?: string;
  architecture?: string;
  cpuCores?: number;
  registeredAt: Date;
}

export interface IDeviceAgentRepository {
  findByApiKeyHash(apiKeyHash: string): Promise<DeviceAgentRecord | null>;
  findByDeviceId(deviceId: string): Promise<DeviceAgentRecord | null>;
  upsertRegistration(input: RegisterDeviceAgentInput, transaction?: any): Promise<void>;
  updateMetrics(deviceId: string, metrics: DeviceMetrics, receivedAt: Date, transaction?: any): Promise<void>;
  updateBoundUser(
    deviceId: string,
    boundUser: { userId?: string; username?: string; fullName?: string; boundAt?: Date } | null,
    transaction?: any,
  ): Promise<void>;
  deleteByDeviceId(deviceId: string, transaction?: any): Promise<void>;
  getAllMetrics(): Promise<Record<string, DeviceMetrics>>;
  reconcileInactiveSessions(cutoffMinutes?: number): Promise<void>;
}
