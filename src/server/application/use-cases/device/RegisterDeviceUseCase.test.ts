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

    // 3. Đăng ký lại máy thứ 1 với MAC 11:22:33:44:55:66 (cập nhật RAM lên 64GB)
    const res3 = await useCase.execute({
      device_id: '11:22:33:44:55:66',
      mac_address: '11:22:33:44:55:66',
      hostname: 'LAB-PC-01',
      cpu_model: 'Intel Core i5',
      total_ram_gb: 64,
    });
    expect(res3.isSuccess).toBe(true);
    expect(computers.length).toBe(2);
    expect(comp1?.ram).toBe('64GB');
  });
});
