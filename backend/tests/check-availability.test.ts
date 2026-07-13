import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckAvailabilityUseCase } from '../src/application/use-cases/booking/CheckAvailabilityUseCase';
import { ILabProfileRepository } from '../src/domain/repositories/ILabProfileRepository';
import { IComputerRepository } from '../src/domain/repositories/IComputerRepository';
import { IEquipmentRepository } from '../src/domain/repositories/IEquipmentRepository';
import { IAvailabilityQueryService } from '../src/domain/services/IAvailabilityQueryService';
import { LabProfile } from '../src/domain/entities/LabProfile';
import { Equipment } from '../src/domain/entities/Equipment';

describe('CheckAvailabilityUseCase', () => {
  let labRepo: any;
  let computerRepo: any;
  let equipmentRepo: any;
  let queryService: any;
  let useCase: CheckAvailabilityUseCase;

  beforeEach(() => {
    labRepo = { get: vi.fn() };
    computerRepo = { countActive: vi.fn() };
    equipmentRepo = { findById: vi.fn() };
    queryService = { getOverlappingBookings: vi.fn() };

    useCase = new CheckAvailabilityUseCase(
      labRepo as ILabProfileRepository,
      computerRepo as IComputerRepository,
      equipmentRepo as IEquipmentRepository,
      queryService as IAvailabilityQueryService
    );

    // Default mock data
    const futureStart = new Date();
    futureStart.setHours(futureStart.getHours() + 1);
    
    labRepo.get.mockResolvedValue(
      LabProfile.create({
        labCode: 'LAB-01',
        labName: 'Lab 1',
        location: 'Tầng 1',
        capacity: 30,
        status: 'ACTIVE',
        managerId: 'admin-id'
      })
    );

    queryService.getOverlappingBookings.mockResolvedValue({
      hasFullLabBooking: false,
      totalReservedComputers: 0,
      reservedEquipments: {},
      conflicts: []
    });
  });

  it('nên báo lỗi nếu thời gian không hợp lệ (start >= end)', async () => {
    const input = {
      bookingType: 'COMPUTERS_ONLY' as any,
      startTime: new Date('2025-01-01T10:00:00Z'),
      endTime: new Date('2025-01-01T09:00:00Z'),
      numberOfPeople: 1,
      numberOfComputers: 0,
      equipments: []
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(false);
    expect(result.reasons[0].code).toBe('INVALID_TIME');
  });

  it('nên báo lỗi nếu thời gian ở quá khứ', async () => {
    const pastTime = new Date();
    pastTime.setHours(pastTime.getHours() - 2);
    const endTime = new Date(pastTime);
    endTime.setHours(endTime.getHours() + 1);

    const input = {
      bookingType: 'COMPUTERS_ONLY' as any,
      startTime: pastTime,
      endTime: endTime,
      numberOfPeople: 1,
      numberOfComputers: 0,
      equipments: []
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(false);
    expect(result.reasons.some(r => r.code === 'PAST_TIME')).toBe(true);
  });

  it('nên báo lỗi nếu vượt quá sức chứa', async () => {
    const start = new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const input = {
      bookingType: 'FULL_LAB' as any,
      startTime: start,
      endTime: end,
      numberOfPeople: 50, // capacity is 30
      numberOfComputers: 0,
      equipments: []
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(false);
    expect(result.reasons.some(r => r.code === 'EXCEED_CAPACITY')).toBe(true);
  });

  it('nên báo lỗi nếu trùng lặp FULL_LAB', async () => {
    queryService.getOverlappingBookings.mockResolvedValue({
      hasFullLabBooking: true,
      totalReservedComputers: 0,
      reservedEquipments: {},
      conflicts: []
    });

    const start = new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const input = {
      bookingType: 'COMPUTERS_ONLY' as any,
      startTime: start,
      endTime: end,
      numberOfPeople: 10,
      numberOfComputers: 10,
      equipments: []
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(false);
    expect(result.reasons.some(r => r.code === 'FULL_LAB_CONFLICT')).toBe(true);
  });

  it('nên báo lỗi nếu không đủ máy tính', async () => {
    computerRepo.countActive.mockResolvedValue(20);
    queryService.getOverlappingBookings.mockResolvedValue({
      hasFullLabBooking: false,
      totalReservedComputers: 15,
      reservedEquipments: {},
      conflicts: []
    });

    const start = new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const input = {
      bookingType: 'COMPUTERS_ONLY' as any,
      startTime: start,
      endTime: end,
      numberOfPeople: 10,
      numberOfComputers: 10, // 20 active - 15 reserved = 5 available. 10 > 5 => fail
      equipments: []
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(false);
    expect(result.reasons.some(r => r.code === 'INSUFFICIENT_COMPUTERS')).toBe(true);
    expect(result.computers.available).toBe(5);
  });

  it('nên thành công nếu tài nguyên đủ', async () => {
    computerRepo.countActive.mockResolvedValue(20);
    equipmentRepo.findById.mockResolvedValue(
      Equipment.create({
        code: 'EQ01',
        name: 'Máy chiếu',
        categoryId: 'cat-1',
        totalQuantity: 5,
        availableQuantity: 5,
        status: 'ACTIVE'
      } as any, 'eq-1') // Available = 5 (all active)
    );

    queryService.getOverlappingBookings.mockResolvedValue({
      hasFullLabBooking: false,
      totalReservedComputers: 5, // 15 available
      reservedEquipments: { 'eq-1': 2 }, // 3 available
      conflicts: []
    });

    const start = new Date();
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    const input = {
      bookingType: 'COMPUTERS_ONLY' as any,
      startTime: start,
      endTime: end,
      numberOfPeople: 10,
      numberOfComputers: 10,
      equipments: [
        { equipmentId: 'eq-1', quantity: 2 } // requires 2, have 3 available => ok
      ]
    };
    
    const result = await useCase.execute(input);
    expect(result.available).toBe(true);
    expect(result.reasons.length).toBe(0);
    expect(result.computers.valid).toBe(true);
    expect(result.equipments[0].valid).toBe(true);
    expect(result.equipments[0].available).toBe(3);
  });
});
