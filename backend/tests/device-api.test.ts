import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';
import { Computer } from '../src/domain/entities/Computer';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';
import { hashDeviceApiKey } from '../src/shared/utils/deviceIdentity';

const app = createExpressApp();
const apiKey = 'sk_live_test-device-key';
const colonMac = '24:4b:fe:03:c4:03';
const normalizedMac = '244BFE03C403';

function mockTransaction(): void {
  vi.spyOn(container.uow, 'complete').mockImplementation(async (work: any) => work());
  vi.spyOn(container.uow, 'getTransaction').mockReturnValue({} as any);
}

function createComputer(): Computer {
  return Computer.create({
    code: 'DESKTOP-SMTJA1Q',
    name: 'DESKTOP-SMTJA1Q',
    macAddress: normalizedMac,
    status: 'ACTIVE',
  }, new UniqueEntityId('d4c728e8-d102-4c28-98e6-e17f7d1b326e'));
}

function mockValidDeviceKey(): void {
  vi.spyOn(container.deviceAgentRepo, 'findByApiKeyHash').mockImplementation(async (hash) => {
    if (hash !== hashDeviceApiKey(apiKey)) return null;
    return {
      computerId: 'd4c728e8-d102-4c28-98e6-e17f7d1b326e',
      deviceId: normalizedMac,
      apiKeyHash: hash,
      hostname: 'DESKTOP-SMTJA1Q',
      registeredAt: new Date(),
    };
  });
}

describe('Device Agent API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTransaction();
  });

  it('registers a device and returns the documented top-level response', async () => {
    vi.spyOn(container.computerRepo, 'findByMacAddress').mockResolvedValue(null);
    vi.spyOn(container.computerRepo, 'findByCode').mockResolvedValue(null);
    vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
    vi.spyOn(container.deviceAgentRepo, 'findByDeviceId').mockResolvedValue(null);
    const saveAgent = vi.spyOn(container.deviceAgentRepo, 'upsertRegistration').mockResolvedValue();

    const response = await request(app).post('/api/devices/register').send({
      device_id: colonMac,
      hostname: 'DESKTOP-SMTJA1Q',
      os: 'Microsoft Windows 11 Pro',
      os_version: '10.0.26200',
      platform: 'Windows',
      arch: 'x64',
      cpu_model: 'Intel Core i5-10600KF',
      cpu_cores: 6,
      total_ram_gb: 31.9,
      mac_address: colonMac,
      uuid: 'b4de5f15-c674-4139-e7fd-244bfe03c403',
      registered_at: '2026-08-06T16:25:40.807Z',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'success',
      message: 'Đăng ký thiết bị thành công',
      device_id: colonMac,
    });
    expect(response.body.api_key).toMatch(/^sk_live_[0-9a-f]{64}$/);
    expect(response.body).not.toHaveProperty('data');
    expect(saveAgent).toHaveBeenCalledWith(expect.objectContaining({
      deviceId: normalizedMac,
      apiKeyHash: hashDeviceApiKey(response.body.api_key),
    }), expect.anything());
  });

  it('does not let an unauthenticated caller rotate an existing device key', async () => {
    vi.spyOn(container.deviceAgentRepo, 'findByDeviceId').mockResolvedValue({
      computerId: 'd4c728e8-d102-4c28-98e6-e17f7d1b326e',
      deviceId: normalizedMac,
      apiKeyHash: hashDeviceApiKey(apiKey),
      hostname: 'DESKTOP-SMTJA1Q',
      registeredAt: new Date(),
    });

    const response = await request(app).post('/api/devices/register').send({
      device_id: colonMac,
      hostname: 'DESKTOP-SMTJA1Q',
      mac_address: colonMac,
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('API key hiện tại');
  });

  it('rejects a metrics request with an unknown API key', async () => {
    vi.spyOn(container.deviceAgentRepo, 'findByApiKeyHash').mockResolvedValue(null);

    const response = await request(app)
      .post('/api/devices/metrics')
      .set('X-API-Key', 'invalid-key')
      .send({ device_id: colonMac, status: { cpu: { usage: 25 } } });

    expect(response.status).toBe(401);
    expect(response.body.status).toBe('error');
  });

  it('accepts metrics only for the device bound to the API key and persists the snapshot', async () => {
    mockValidDeviceKey();
    vi.spyOn(container.computerRepo, 'findByMacAddress').mockResolvedValue(createComputer());
    vi.spyOn(container.computerRepo, 'save').mockResolvedValue();
    const updateMetrics = vi.spyOn(container.deviceAgentRepo, 'updateMetrics').mockResolvedValue();

    const response = await request(app)
      .post('/api/devices/metrics')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('X-API-Key', apiKey)
      .send({
        device_id: colonMac,
        timestamp: '2026-08-06T16:25:42.499Z',
        status: { cpu: { usage: 78.6 }, network: { rxBytes: 1048576 } },
        installed_apps: [{ name: 'Visual Studio Code', version: '1.92.0' }],
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'success',
      message: 'Đã nhận dữ liệu metrics thành công',
    });
    expect(response.body.received_at).toEqual(expect.any(String));
    expect(updateMetrics).toHaveBeenCalledWith(
      normalizedMac,
      expect.objectContaining({ timestamp: '2026-08-06T16:25:42.499Z' }),
      expect.any(Date),
      expect.anything(),
    );
  });

  it('records a hardware change with the hidden system reporter', async () => {
    mockValidDeviceKey();
    vi.spyOn(container.computerRepo, 'findByMacAddress').mockResolvedValue(createComputer());
    const saveIncident = vi.spyOn(container.incidentRepo, 'save').mockResolvedValue();

    const response = await request(app)
      .post('/api/devices/alert-hardware-change')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('X-API-Key', apiKey)
      .send({
        device_id: colonMac,
        alert_type: 'HARDWARE_CHANGED',
        timestamp: '2026-08-06T16:35:10.350Z',
        changes: [{ field: 'RAM (GB)', old: 16, new: 31.9 }],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'alert_received',
      message: 'Báo cáo thay đổi cấu hình phần cứng đã được ghi nhận thành công',
      alert_time: '2026-08-06T16:35:10.350Z',
    });
    expect(saveIncident).toHaveBeenCalledWith(
      expect.objectContaining({ reporterId: '00000000-0000-0000-0000-000000000000' }),
      expect.anything(),
    );
  });

  it('requires a signed-in user with COMPUTER_VIEW to read monitoring data', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId: 'admin-id',
      roles: ['ADMIN'],
      permissions: ['COMPUTER_VIEW'],
    });
    vi.spyOn(container.deviceAgentRepo, 'getAllMetrics').mockResolvedValue({
      [normalizedMac]: { timestamp: '2026-08-06T16:25:42.499Z' },
    });

    const response = await request(app)
      .get('/api/devices/metrics')
      .set('Authorization', 'Bearer valid-user-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty(normalizedMac);
  });
});
