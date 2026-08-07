import { Result } from '../../../shared/result/Result';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IEquipmentCategoryRepository } from '../../../domain/repositories/IEquipmentCategoryRepository';
import { Equipment } from '../../../domain/entities/Equipment';

export interface CreateEquipmentInput {
  code?: string;
  name: string;
  categoryId: string;
  quantity?: number;
  location?: string;
  managerId?: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  imageUrl?: string;
  note?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export class CreateEquipmentUseCase {
  constructor(
    private equipmentRepo: IEquipmentRepository,
    private categoryRepo: IEquipmentCategoryRepository,
    private uow: IUnitOfWork,
    private auditLogRepo: IAuditLogRepository
  ) {}

  public async execute(input: CreateEquipmentInput): Promise<Result<Equipment>> {
    try {
      const requestedCode = input.code?.trim() || '';
      const code = requestedCode || await this.generateCodeFromCategory(input.categoryId);
      if (!code) {
        return Result.fail<Equipment>('Không thể tự sinh mã thiết bị từ danh mục đã chọn.');
      }

      const existing = await this.equipmentRepo.findByCode(code);
      if (existing) {
        return Result.fail<Equipment>(`Mã thiết bị '${code}' đã tồn tại.`);
      }

      const quantity = input.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        return Result.fail<Equipment>('Số lượng thiết bị phải là số nguyên lớn hơn 0.');
      }

      const equipment = Equipment.create({
        code,
        name: input.name,
        categoryId: input.categoryId,
        totalQuantity: quantity,
        availableQuantity: quantity,
        reservedQuantity: 0,
        borrowedQuantity: 0,
        brokenQuantity: 0,
        maintenanceQuantity: 0,
        lostQuantity: 0,
        location: input.location,
        managerId: input.managerId || undefined,
        status: input.status,
        imageUrl: input.imageUrl,
        note: input.note
      });

      await this.uow.complete(async () => {
        await this.equipmentRepo.save(equipment);

        await this.auditLogRepo.save({
          userId: input.userId,
          action: 'EQUIPMENT_CREATED',
          entityName: 'Equipments',
          entityId: equipment.id.toString(),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          correlationId: input.correlationId
        } as any);
      });

      return Result.ok<Equipment>(equipment);
    } catch (error) {
      return Result.fail<Equipment>((error as any).message || "Đã xảy ra lỗi khi tạo thiết bị.");
    }
  }

  private async generateCodeFromCategory(categoryId: string): Promise<string> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new Error('Danh mục thiết bị không tồn tại.');
    }

    const prefix = normalizeCodePrefix(category.code);
    const existing = await this.equipmentRepo.list({ categoryId, page: 1, pageSize: 10000 });
    const usedCodes = new Set(existing.data.map((item) => item.code.toUpperCase()));
    const sequencePattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`, 'i');
    let nextSequence = 1;

    for (const item of existing.data) {
      const match = item.code.match(sequencePattern);
      if (match) nextSequence = Math.max(nextSequence, Number(match[1]) + 1);
    }

    while (true) {
      const candidate = `${prefix}-${String(nextSequence).padStart(3, '0')}`;
      if (!usedCodes.has(candidate.toUpperCase()) && !(await this.equipmentRepo.findByCode(candidate))) {
        return candidate;
      }
      nextSequence += 1;
    }
  }
}

function normalizeCodePrefix(value: string): string {
  const prefix = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return prefix || 'EQUIPMENT';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
