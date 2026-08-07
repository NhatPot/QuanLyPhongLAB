import { IAvailabilityQueryService } from '../../../domain/services/IAvailabilityQueryService';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { BookingType } from '../../../domain/entities/BookingRequest';

export type CheckAvailabilityInput = {
  bookingType: BookingType;
  startTime: Date;
  endTime: Date;
  numberOfPeople: number;
  numberOfComputers: number;
  equipments: Array<{
    equipmentId: string;
    quantity: number;
  }>;
  excludeBookingId?: string;
};

export type AvailabilityResult = {
  available: boolean;
  lab: {
    available: boolean;
    status: string;
    capacity: number;
  };
  computers: {
    requested: number;
    available: number;
    valid: boolean;
  };
  equipments: Array<{
    equipmentId: string;
    requested: number;
    available: number;
    valid: boolean;
  }>;
  conflicts: Array<{
    type: string;
    startTime: Date;
    endTime: Date;
  }>;
  reasons: Array<{
    code: string;
    message: string;
  }>;
};

export class CheckAvailabilityUseCase {
  constructor(
    private labProfileRepo: ILabProfileRepository,
    private computerRepo: IComputerRepository,
    private equipmentRepo: IEquipmentRepository,
    private availabilityQuery: IAvailabilityQueryService
  ) {}

  public async execute(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    const reasons: Array<{ code: string; message: string }> = [];
    const equipmentsResult: AvailabilityResult['equipments'] = [];
    let isAvailable = true;

    // 1. Kiểm tra thời gian
    if (input.startTime >= input.endTime) {
      isAvailable = false;
      reasons.push({ code: 'INVALID_TIME', message: 'Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc' });
    }
    const now = new Date();
    if (input.startTime < now) {
      isAvailable = false;
      reasons.push({ code: 'PAST_TIME', message: 'Không thể đặt lịch trong quá khứ' });
    }

    // 2. Tải dữ liệu Lab
    const labProfile = await this.labProfileRepo.get();
    const labAvailable = labProfile?.status === 'ACTIVE' && labProfile.canAcceptRegularBooking();
    if (!labAvailable) {
      isAvailable = false;
      reasons.push({ code: 'LAB_UNAVAILABLE', message: 'Phòng Lab hiện không mở cửa hoặc đang bảo trì' });
    }

    if (labProfile && input.numberOfPeople > labProfile.capacity) {
      isAvailable = false;
      reasons.push({ code: 'EXCEED_CAPACITY', message: `Số người vượt quá sức chứa (${labProfile.capacity})` });
    }

    // 3. Truy vấn các booking bị trùng lịch
    let overlapping = {
      hasFullLabBooking: false,
      totalReservedComputers: 0,
      reservedEquipments: {} as Record<string, number>,
      conflicts: [] as Array<any>
    };

    if (input.startTime < input.endTime) {
      overlapping = await this.availabilityQuery.getOverlappingBookings(
        input.startTime,
        input.endTime,
        input.excludeBookingId
      );
    }

    // 4. Kiểm tra theo BookingType
    if (input.bookingType === 'FULL_LAB' || input.bookingType === 'COMPUTERS_ONLY') {
      if (overlapping.hasFullLabBooking) {
        isAvailable = false;
        reasons.push({ code: 'FULL_LAB_CONFLICT', message: 'Đã có người đặt trọn phòng trong thời gian này' });
      }
    }

    // 5. Kiểm tra máy tính
    let compValid = true;
    let availableComputersCount = 0;
    
    if (input.numberOfComputers > 0) {
      const totalActiveComputers = await this.computerRepo.countActive();
      availableComputersCount = totalActiveComputers - overlapping.totalReservedComputers;
      
      if (availableComputersCount < 0) availableComputersCount = 0;

      if (input.numberOfComputers > availableComputersCount) {
        compValid = false;
        isAvailable = false;
        reasons.push({ code: 'INSUFFICIENT_COMPUTERS', message: 'Không đủ máy tính trống trong khoảng thời gian này' });
      }
    }

    // 6. Kiểm tra thiết bị
    for (const eqReq of input.equipments) {
      const eq = await this.equipmentRepo.findById(eqReq.equipmentId);
      if (!eq) {
        equipmentsResult.push({
          equipmentId: eqReq.equipmentId,
          requested: eqReq.quantity,
          available: 0,
          valid: false
        });
        isAvailable = false;
        reasons.push({ code: 'EQUIPMENT_NOT_FOUND', message: `Không tìm thấy thiết bị có ID ${eqReq.equipmentId}` });
        continue;
      }

      const totalActive = eq.totalQuantity - eq.brokenQuantity - eq.maintenanceQuantity - eq.lostQuantity;
      const overlappingReserved = overlapping.reservedEquipments[eq.id.toString()] || 0;
      // Số lượng thực sự còn lại = Tổng hoạt động - max(số đang dùng ở các booking trùng lịch)
      // Chú ý: overlappingReserved ở đây là tổng mượn của các booking khác trong cùng thời điểm.
      let availableEq = totalActive - overlappingReserved;
      if (availableEq < 0) availableEq = 0;

      const valid = eqReq.quantity <= availableEq;
      if (!valid) {
        isAvailable = false;
        reasons.push({ code: 'INSUFFICIENT_EQUIPMENT', message: `Thiết bị ${eq.name} không đủ số lượng trống` });
      }

      equipmentsResult.push({
        equipmentId: eq.id.toString(),
        requested: eqReq.quantity,
        available: availableEq,
        valid
      });
    }

    return {
      available: isAvailable,
      lab: {
        available: labAvailable ?? false,
        status: labProfile?.status || 'UNKNOWN',
        capacity: labProfile?.capacity || 0
      },
      computers: {
        requested: input.numberOfComputers,
        available: availableComputersCount,
        valid: compValid
      },
      equipments: equipmentsResult,
      conflicts: overlapping.conflicts,
      reasons
    };
  }
}
