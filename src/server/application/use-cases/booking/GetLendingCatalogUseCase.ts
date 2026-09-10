import { IEquipmentRepository } from "../../../domain/repositories/IEquipmentRepository";
import { IEquipmentCategoryRepository } from "../../../domain/repositories/IEquipmentCategoryRepository";
import { IComputerRepository } from "../../../domain/repositories/IComputerRepository";
import { ILabProfileRepository } from "../../../domain/repositories/ILabProfileRepository";
import { IAvailabilityQueryService } from "../../../domain/services/IAvailabilityQueryService";
import { lendableQuantity } from "../../../domain/services/lending-availability";
import { ValidationError } from "../../../shared/errors/AppError";
import { IComputerBookingRepository } from '../../../domain/repositories/IComputerBookingRepository';

export class GetLendingCatalogUseCase {
  constructor(
    private equipments: IEquipmentRepository,
    private categories: IEquipmentCategoryRepository,
    private computers: IComputerRepository,
    private lab: ILabProfileRepository,
    private availability: IAvailabilityQueryService,
    private computerBookings?: IComputerBookingRepository,
  ) {}
  async execute(input: {
    startTime: Date;
    endTime: Date;
    keyword?: string;
    page?: number;
  }) {
    if (
      !Number.isFinite(input.startTime.getTime()) ||
      !Number.isFinite(input.endTime.getTime()) ||
      input.startTime >= input.endTime ||
      input.startTime < new Date()
    )
      throw new ValidationError(
        "Chọn giờ bắt đầu trong tương lai và giờ kết thúc sau giờ bắt đầu.",
      );
    const page = input.page ?? 1;
    if (!Number.isInteger(page) || page < 1)
      throw new ValidationError("Trang không hợp lệ.");
    const [list, categories, active, profile, overlap, inUse] =
      await Promise.all([
        this.equipments.list({
          lendableOnly: true,
          status: "ACTIVE",
          keyword: input.keyword?.slice(0, 255),
          page,
          pageSize: 50,
        }),
        this.categories.list(),
        this.computers.countActive(),
        this.lab.get(),
        this.availability.getOverlappingBookings(
          input.startTime,
          input.endTime,
        ),
        this.computers.list({ status: "IN_USE", page: 1, pageSize: 1 }),
      ]);
    const open =
      profile?.status === "ACTIVE" && profile.canAcceptRegularBooking();
    const computerItems = this.computerBookings ? await this.computerBookings.listAvailability(input.startTime, input.endTime) : [];
    const count = open && !overlap.hasFullLabBooking ? Math.max(0, Math.min(active, active + inUse.total - overlap.totalReservedComputers, this.computerBookings ? computerItems.filter(c => c.available).length : active)) : 0;
    return {
      data: list.data
        .filter((eq) => eq.isLendable && eq.status === "ACTIVE")
        .map((eq) => ({
          id: eq.id.toString(),
          code: eq.code,
          name: eq.name,
          categoryId: eq.categoryId,
          categoryName:
            categories.find((cat) => cat.id.toString() === eq.categoryId)
              ?.name || "Thiết bị",
          availableQuantity: open
            ? lendableQuantity(
                eq,
                overlap.reservedEquipments[eq.id.toString()] || 0,
              )
            : 0,
        })),
      computers: {
        available: count,
        items: computerItems.map(c => ({ ...c, available: Boolean(open && count > 0 && c.available) })),
      },
      labAvailable: Boolean(open),
      meta: {
        page,
        pageSize: 50,
        totalItems: list.total,
        totalPages: Math.ceil(list.total / 50),
      },
    };
  }
}
