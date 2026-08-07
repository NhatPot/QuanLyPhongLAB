export interface DeviceMetrics {
  timestamp: string;
  status?: {
    cpu?: { usage?: number; temperature?: number; cores?: number[] };
    ram?: { used?: number; total?: number; free?: number; usagePercent?: number };
    disk?: { used?: number; total?: number; usagePercent?: number; partitions?: any[] };
    network?: { rxBytes?: number; txBytes?: number; rxSec?: number; txSec?: number };
  };
  installed_apps?: Array<{ name: string; version?: string; publisher?: string }>;
  ipAddress?: string;
}

export class DeviceMetricsCache {
  private static instance: DeviceMetricsCache;
  private cache: Map<string, DeviceMetrics> = new Map();

  private constructor() {}

  public static getInstance(): DeviceMetricsCache {
    if (!DeviceMetricsCache.instance) {
      DeviceMetricsCache.instance = new DeviceMetricsCache();
    }
    return DeviceMetricsCache.instance;
  }

  public setMetrics(deviceId: string, metrics: DeviceMetrics): void {
    this.cache.set(deviceId, metrics);
  }

  public getMetrics(deviceId: string): DeviceMetrics | undefined {
    return this.cache.get(deviceId);
  }

  public getAllMetrics(): Record<string, DeviceMetrics> {
    const result: Record<string, DeviceMetrics> = {};
    for (const [key, value] of this.cache.entries()) {
      result[key] = value;
    }
    return result;
  }
}
