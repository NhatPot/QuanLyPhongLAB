import { describe, expect, it, vi } from 'vitest';
import { Expense } from '../src/domain/entities/Expense';
import { MaintenanceSchedule } from '../src/domain/entities/MaintenanceSchedule';
import { UniqueEntityId } from '../src/domain/value-objects/UniqueEntityId';
import { recordMaintenanceExpense } from '../src/application/use-cases/expense/ExpenseManagementUseCases';

const expenseId = '20b1864b-6c75-4db7-9820-84df06790653';
const categoryId = '22126c46-c486-4f83-b80b-fd020e4266dd';
const equipmentId = 'abbe5e70-f88e-4594-8ccb-f5a830481c0d';
const actorId = '91b82069-76d4-480e-898c-e367f4fd50c2';

function draftExpense() {
  return Expense.create({
    code: 'CP-2026-20B1864B',
    expenseDate: new Date('2026-07-30T00:00:00.000Z'),
    categoryId,
    title: 'Mua bàn phím phòng Lab',
    fundingSource: 'CENTER',
    status: 'DRAFT',
    paymentStatus: 'UNPAID',
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'VND',
    sourceType: 'MANUAL',
    createdBy: actorId,
    items: [{
      id: '2bba48ef-ec7a-4acd-8041-620685961819',
      description: 'Bàn phím cơ',
      quantity: 2,
      unit: 'cái',
      unitPrice: 500000,
      discountAmount: 50000,
      taxAmount: 95000,
      lineTotal: 0,
      targetType: 'EQUIPMENT',
      targetId: equipmentId,
    }],
  }, new UniqueEntityId(expenseId));
}

describe('Expense domain', () => {
  it('calculates subtotal, discount, tax and total from line items', () => {
    const expense = draftExpense();

    expect(expense.subtotal).toBe(1_000_000);
    expect(expense.discountAmount).toBe(50_000);
    expect(expense.taxAmount).toBe(95_000);
    expect(expense.totalAmount).toBe(1_045_000);
    expect(expense.items[0].lineTotal).toBe(1_045_000);
  });

  it('follows submit, approve and paid lifecycle', () => {
    const expense = draftExpense();

    expense.submit();
    expense.approve(actorId, new Date('2026-07-30T02:00:00.000Z'));
    expense.markPaid('Chuyển khoản', new Date('2026-07-31T00:00:00.000Z'));

    expect(expense.status).toBe('PAID');
    expect(expense.paymentStatus).toBe('PAID');
    expect(expense.paymentMethod).toBe('Chuyển khoản');
    expect(expense.approvedBy).toBe(actorId);
  });

  it('returns a rejected expense to draft when edited', () => {
    const expense = draftExpense();
    expense.submit();
    expense.reject('Thiếu hóa đơn');

    expense.updateContent({
      expenseDate: expense.expenseDate,
      categoryId,
      title: 'Mua bàn phím phòng Lab có hóa đơn',
      fundingSource: 'CENTER',
      currency: 'VND',
      items: expense.items,
    });

    expect(expense.status).toBe('DRAFT');
    expect(expense.rejectionReason).toBeUndefined();
  });

  it('does not allow editing an approved expense', () => {
    const expense = draftExpense();
    expense.submit();
    expense.approve(actorId);

    expect(() => expense.updateContent({
      expenseDate: expense.expenseDate,
      categoryId,
      title: 'Nội dung đã sửa',
      fundingSource: 'CENTER',
      currency: 'VND',
      items: expense.items,
    })).toThrow('Chỉ được chỉnh sửa phiếu nháp hoặc phiếu bị từ chối.');
  });

  it('requires a target id when an item links to an asset', () => {
    expect(() => Expense.create({
      code: 'CP-2026-INVALID',
      expenseDate: new Date(),
      categoryId,
      title: 'Mua thiết bị',
      fundingSource: 'CENTER',
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: 'VND',
      sourceType: 'MANUAL',
      items: [{
        id: '20f8ca51-b352-4325-af14-60a53b9b117e',
        description: 'Thiết bị',
        quantity: 1,
        unit: 'cái',
        unitPrice: 100000,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 100000,
        targetType: 'EQUIPMENT',
      }],
    })).toThrow('Dòng chi phí liên kết tài sản phải có đối tượng cụ thể.');
  });

  it('does not allow cancellation after payment', () => {
    const expense = draftExpense();
    expense.submit();
    expense.approve(actorId);
    expense.markPaid('Tiền mặt', new Date());

    expect(() => expense.cancel('Hủy nhầm')).toThrow('Phiếu đã thanh toán hoặc đã hủy không thể hủy lại.');
  });

  it('records one approved outstanding expense from completed maintenance', async () => {
    const maintenanceId = '3d6f77d9-f152-43d1-88f1-e0ea1b0d570f';
    const maintenance = MaintenanceSchedule.create({
      code: 'MT-20260730-3D6F77',
      targetType: 'COMPUTER',
      targetId: equipmentId,
      targetCode: 'PC-01',
      targetName: 'Máy tính PC-01',
      title: 'Bảo trì PC-01',
      reason: 'Bảo trì định kỳ',
      scheduledStartAt: new Date('2026-07-30T01:00:00.000Z'),
      expectedEndAt: new Date('2026-07-30T03:00:00.000Z'),
      status: 'SCHEDULED',
      quantity: 1,
      estimatedCost: 250000,
      triggerSource: 'MANUAL',
    }, new UniqueEntityId(maintenanceId));
    maintenance.start(new Date('2026-07-30T01:00:00.000Z'));
    maintenance.complete({ resultNote: 'Đã thay quạt tản nhiệt', actualCost: 220000, outcome: 'AVAILABLE' });

    const save = vi.fn();
    const auditSave = vi.fn();
    const ids = [
      '64bf31e3-f2f8-45e1-bfe4-f26ae63bda6a',
      '751bf260-455f-4633-9b83-cc554f045542',
    ];
    const result = await recordMaintenanceExpense(maintenance, { actorUserId: actorId }, {
      expenseRepo: {
        findBySource: vi.fn().mockResolvedValue(null),
        findCategoryByCode: vi.fn().mockResolvedValue({
          id: categoryId, code: 'MAINTENANCE_REPAIR', name: 'Bảo trì, sửa chữa',
          expenseClass: 'OPEX', description: null, isActive: true, isSystem: true,
        }),
        save,
      } as any,
      auditLogRepo: { save: auditSave } as any,
      idGenerator: { generate: () => ids.shift()! },
    }, {});

    expect(result).not.toBeNull();
    expect(result?.status).toBe('APPROVED');
    expect(result?.paymentStatus).toBe('UNPAID');
    expect(result?.totalAmount).toBe(220000);
    expect(result?.sourceId).toBe(maintenanceId);
    expect(save).toHaveBeenCalledOnce();
    expect(auditSave).toHaveBeenCalledWith(expect.objectContaining({ action: 'EXPENSE_CREATED_FROM_MAINTENANCE' }), {});
  });
});
