import { describe, expect, it, vi } from 'vitest';
import { Computer } from '../../../domain/entities/Computer';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { RegisterDeviceUseCase } from './RegisterDeviceUseCase';

describe('RegisterDeviceUseCase', () => {
  it('tạo máy tính mới khi địa chỉ MAC khác nhau, kể cả khi trùng hostname', async () => {
    const computers: Computer[] = [];

    const computerRepo = {
      findIncludingDeletedByMacAddress: vi.fn(async (mac: string) => {
        return computers.find((c) => c.macAddress === mac) || null;
      }),
      findById: vi.fn(async (id: string) => {
        return computers.find((c) => c.id.toString() === id) || null;
      }),
      findByCode: vi.fn(async (code: string) => {
        return computers.find((c) => c.code === code) || null;
      }),
      findAnyMatching: vi.fn(async (ident: string) => {
        return computers.find((c) => c.code === ident || c.name === ident || c.macAddress === ident) || null;
      }),
      save: vi.fn(async (comp: Computer) => {
        const existingIdx = computers.findIndex((c) => c.id.equals(comp.id));
        if (existingIdx >= 0) {
          computers[existingIdx] = comp;
        } else {
          computers.push(comp);
        }
      }),
    } as unknown as IComputerRepository;

    const deviceAgentRepo = {
      findByDeviceId: vi.fn(async () => null),
      upsertRegistration: vi.fn(async () => undefined),
    } as unknown as IDeviceAgentRepository;

    const transaction = { id: 'test-trans' };
    const uow = {
      complete: async <T>(work: () => Promise<T>) => work(),
      getTransaction: () => transaction,
    } as unknown as IUnitOfWork;

    const useCase = new RegisterDeviceUseCase(computerRepo, deviceAgentRepo, uow);

    // 1. Đăng ký máy thứ 1 với MAC 11:22:33:44:55:66 và hostname LAB-PC-01
    const res1 = await useCase.execute({
      device_id: '11:22:33:44:55:66',
      mac_address: '11:22:33:44:55:66',
      hostname: 'LAB-PC-01',
      cpu_model: 'Intel Core i5',
      total_ram_gb: 16,
    });
    expect(res1.isSuccess).toBe(true);
    expect(computers.length).toBe(1);
    expect(computers[0].macAddress).toBe('11:22:33:44:55:66');
    expect(computers[0].name).toBe('LAB-PC-01');
    expect(computers[0].cpu).toBe('Intel Core i5');

    // 2. Đăng ký máy thứ 2 với MAC AA:BB:CC:DD:EE:FF nhưng TRÙNG hostname LAB-PC-01
    const res2 = await useCase.execute({
      device_id: 'AA:BB:CC:DD:EE:FF',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      hostname: 'LAB-PC-01',
      cpu_model: 'AMD Ryzen 7',
      total_ram_gb: 32,
    });
    expect(res2.isSuccess).toBe(true);
    // Phải tạo ra máy tính thứ 2 (không sửa máy thứ 1)
    expect(computers.length).toBe(2);

    const comp1 = computers.find((c) => c.macAddress === '11:22:33:44:55:66');
    const comp2 = computers.find((c) => c.macAddress === 'AA:BB:CC:DD:EE:FF');

    expect(comp1).toBeDefined();
    expect(comp1?.cpu).toBe('Intel Core i5');

    expect(comp2).toBeDefined();
    expect(comp2?.cpu).toBe('AMD Ryzen 7');
    expect(comp2?.ram).toBe('32GB');

    // 3. Đăng ký lại máy thứ 1 với MAC 11:22:33:44:55:66 (cập nhật RAM lên 64GB và danh sách phần mềm mới)
    const res3 = await useCase.execute({
      device_id: '11:22:33:44:55:66',
      mac_address: '11:22:33:44:55:66',
      hostname: 'LAB-PC-01',
      cpu_model: 'Intel Core i5',
      total_ram_gb: 64,
      installed_apps: [{ name: 'Visual Studio Code' }, { name: 'Node.js' }],
    });
    expect(res3.isSuccess).toBe(true);
    expect(computers.length).toBe(2);
    expect(comp1?.ram).toBe('64GB');
    expect(comp1?.installedSoftware).toBe('Visual Studio Code, Node.js');

    // 4. Đăng ký lại máy thứ 1 với danh sách ứng dụng mới (thay thế toàn bộ danh sách cũ)
    const res4 = await useCase.execute({
      device_id: '11:22:33:44:55:66',
      mac_address: '11:22:33:44:55:66',
      hostname: 'LAB-PC-01',
      installed_apps: [{ name: 'IntelliJ IDEA' }],
    });
    expect(res4.isSuccess).toBe(true);
    expect(comp1?.installedSoftware).toBe('IntelliJ IDEA');

    // 5. Đăng ký máy mới chỉ sử dụng địa chỉ UUID
    const res5 = await useCase.execute({
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      hostname: 'LAB-PC-UUID-01',
      cpu_model: 'Apple M3 Pro',
    });
    expect(res5.isSuccess).toBe(true);
    expect(computers.length).toBe(3);
    const uuidComp = computers.find((c) => c.macAddress === '550e8400-e29b-41d4-a716-446655440000');
    expect(uuidComp).toBeDefined();
    expect(uuidComp?.name).toBe('LAB-PC-UUID-01');
    expect(uuidComp?.cpu).toBe('Apple M3 Pro');

    // 6. Đăng ký máy mới với format ứng dụng đa dạng (displayName, version, installed_software)
    const res6 = await useCase.execute({
      uuid: '660e8400-e29b-41d4-a716-446655440000',
      hostname: 'LAB-PC-UUID-02',
      installed_software: [
        { displayName: 'Google Chrome', version: '120.0' },
        'Visual Studio Code',
        { title: 'Docker Desktop' },
      ],
    });
    expect(res6.isSuccess).toBe(true);
    expect(computers.length).toBe(4);
    const appComp = computers.find((c) => c.macAddress === '660e8400-e29b-41d4-a716-446655440000');
    expect(appComp?.installedSoftware).toBe('Google Chrome (v120.0), Visual Studio Code, Docker Desktop');

    // 7. Đăng ký máy mới với payload thực tế từ Agent (chứa mảng apps với name/version/publisher)
    const res7 = await useCase.execute({
      device_id: '849cd2a5-ef21-5620-942b-fcc4d745cbda',
      hostname: 'long-pc',
      os: 'Ubuntu',
      os_version: '26.04 LTS',
      mac_address: '98:e7:f4:bf:e0:de',
      uuid: '849cd2a5-ef21-5620-942b-fcc4d745cbda',
      apps: [
        { name: 'Advanced Network Configuration', version: '1.36.0-4ubuntu1', publisher: '...' },
        { name: 'Antigravity', version: '2.3.1', publisher: 'Snap' },
        { name: 'Google Chrome', version: '151.0.7922.108-1', publisher: 'Access the Internet' },
        { name: 'Visual Studio Code', version: '', publisher: 'Code Editing' },
      ],
    });
    expect(res7.isSuccess).toBe(true);
    const longPc = computers.find((c) => c.macAddress === '98:E7:F4:BF:E0:DE' || c.code === 'long-pc');
    expect(longPc).toBeDefined();
    expect(longPc?.installedSoftware).toContain('Google Chrome (v151.0.7922.108-1)');
    expect(longPc?.installedSoftware).toContain('Visual Studio Code');
  });
});
