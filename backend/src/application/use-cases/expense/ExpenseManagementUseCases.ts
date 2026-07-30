import {
  Expense,
  ExpenseClass,
  ExpenseContentInput,
  ExpenseItemProps,
  ExpenseStatus,
  FundingSource,
} from '../../../domain/entities/Expense';
import { EquipmentInventoryTransaction } from '../../../domain/entities/EquipmentInventoryTransaction';
import { MaintenanceSchedule } from '../../../domain/entities/MaintenanceSchedule';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { IEquipmentInventoryTransactionRepository } from '../../../domain/repositories/IEquipmentInventoryTransactionRepository';
import { IEquipmentRepository } from '../../../domain/repositories/IEquipmentRepository';
import {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListFilters,
  IExpenseRepository,
} from '../../../domain/repositories/IExpenseRepository';
import { ILabProfileRepository } from '../../../domain/repositories/ILabProfileRepository';
import { IComputerRepository } from '../../../domain/repositories/IComputerRepository';
import { IUnitOfWork } from '../../../domain/repositories/IUnitOfWork';
import { UniqueEntityId } from '../../../domain/value-objects/UniqueEntityId';
import { IIdGenerator } from '../../ports/IIdGenerator';
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/AppError';

export interface ExpenseOperationContext {
  actorUserId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface ExpenseInput extends Omit<ExpenseContentInput, 'items'> {
  items: Array<Omit<ExpenseItemProps, 'id' | 'lineTotal'> & { id?: string; lineTotal?: number }>;
}

interface ExpenseDependencies {
  expenseRepo: IExpenseRepository;
  equipmentRepo: IEquipmentRepository;
  equipmentTxRepo: IEquipmentInventoryTransactionRepository;
  computerRepo: IComputerRepository;
  labRepo: ILabProfileRepository;
  uow: IUnitOfWork;
  auditLogRepo: IAuditLogRepository;
  idGenerator: IIdGenerator;
}

export class ListExpensesUseCase {
  constructor(private readonly repo: IExpenseRepository) {}
  public execute(filters: ExpenseListFilters) { return this.repo.list(filters); }
}

export class GetExpenseSummaryUseCase {
  constructor(private readonly repo: IExpenseRepository) {}
  public execute(fromDate?: Date, toDate?: Date) { return this.repo.getSummary(fromDate, toDate); }
}

export class GetExpenseOptionsUseCase {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly equipmentRepo: IEquipmentRepository,
    private readonly computerRepo: IComputerRepository,
    private readonly labRepo: ILabProfileRepository,
  ) {}

  public async execute() {
    const [categories, equipmentResult, computerResult, lab] = await Promise.all([
      this.expenseRepo.listCategories(false),
      this.equipmentRepo.list({ page: 1, pageSize: 500 }),
      this.computerRepo.list({ page: 1, pageSize: 500 }),
      this.labRepo.get(),
    ]);
    return {
      categories,
      equipments: equipmentResult.data.map((item) => ({ id: item.id.toString(), code: item.code, name: item.name, status: item.status })),
      computers: computerResult.data.map((item) => ({ id: item.id.toString(), code: item.code, name: item.name, status: item.status })),
      lab: lab ? { id: lab.id.toString(), code: lab.labCode, name: lab.labName, status: lab.status } : null,
    };
  }
}

export class GetExpenseUseCase {
  constructor(private readonly repo: IExpenseRepository) {}
  public async execute(id: string): Promise<ExpenseDetail> {
    const detail = await this.repo.getDetailById(id);
    if (!detail) throw new NotFoundError('Không tìm thấy phiếu chi.');
    return detail;
  }
}

export class CreateExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(input: ExpenseInput, context: ExpenseOperationContext): Promise<ExpenseDetail> {
    await validateInput(input, this.deps);
    const now = new Date();
    const id = this.deps.idGenerator.generate();
    const expense = Expense.create({
      ...input,
      code: expenseCode(id, now),
      items: materializeItems(input.items, this.deps.idGenerator),
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      sourceType: 'MANUAL',
      createdBy: context.actorUserId,
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      createdAt: now,
      updatedAt: now,
    }, new UniqueEntityId(id));
    await saveWithAudit(this.deps, expense, context, 'EXPENSE_CREATED', null);
    return (await this.deps.expenseRepo.getDetailById(id))!;
  }
}

export class UpdateExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, input: ExpenseInput, context: ExpenseOperationContext): Promise<ExpenseDetail> {
    const expense = await requireExpense(this.deps.expenseRepo, id);
    if (expense.sourceType !== 'MANUAL') throw new BusinessRuleError('Phiếu chi tự động không được chỉnh sửa thủ công.', 'EXPENSE_SOURCE_LOCKED');
    await validateInput(input, this.deps);
    const oldValue = snapshot(expense);
    transition(() => expense.updateContent({ ...input, items: materializeItems(input.items, this.deps.idGenerator) }));
    await saveWithAudit(this.deps, expense, context, 'EXPENSE_UPDATED', oldValue);
    return (await this.deps.expenseRepo.getDetailById(id))!;
  }
}

export class SubmitExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, context: ExpenseOperationContext) {
    return updateStatus(this.deps, id, context, 'EXPENSE_SUBMITTED', (expense) => expense.submit());
  }
}

export class ApproveExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, context: ExpenseOperationContext) {
    return updateStatus(this.deps, id, context, 'EXPENSE_APPROVED', (expense) => expense.approve(context.actorUserId));
  }
}

export class RejectExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, reason: string, context: ExpenseOperationContext) {
    return updateStatus(this.deps, id, context, 'EXPENSE_REJECTED', (expense) => expense.reject(reason));
  }
}

export class CancelExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, reason: string, context: ExpenseOperationContext) {
    return updateStatus(this.deps, id, context, 'EXPENSE_CANCELLED', (expense) => expense.cancel(reason));
  }
}

export class MarkExpensePaidUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, paymentMethod: string, paymentDate: Date, postInventory: boolean, context: ExpenseOperationContext) {
    const expense = await requireExpense(this.deps.expenseRepo, id);
    const category = await this.deps.expenseRepo.findCategoryById(expense.categoryId);
    if (!category) throw new NotFoundError('Không tìm thấy danh mục chi phí.');
    const oldValue = snapshot(expense);
    transition(() => expense.markPaid(paymentMethod, paymentDate));

    await this.deps.uow.complete(async () => {
      const transaction = this.deps.uow.getTransaction();
      if (postInventory) {
        if (category.code !== 'EQUIPMENT_PURCHASE') {
          throw new ValidationError('Chỉ phiếu mua thiết bị mới có thể ghi tăng tồn kho.');
        }
        await postEquipmentInventory(expense, this.deps, context, transaction);
        expense.markInventoryPosted();
      }
      await this.deps.expenseRepo.save(expense, transaction);
      await audit(this.deps.auditLogRepo, transaction, context, 'EXPENSE_PAID', expense, oldValue);
    });
    return (await this.deps.expenseRepo.getDetailById(id))!;
  }
}

export class DeleteExpenseUseCase {
  constructor(private readonly deps: ExpenseDependencies) {}
  public async execute(id: string, context: ExpenseOperationContext): Promise<void> {
    const expense = await requireExpense(this.deps.expenseRepo, id);
    if (expense.sourceType !== 'MANUAL') throw new BusinessRuleError('Phiếu chi tự động không được xóa.', 'EXPENSE_SOURCE_LOCKED');
    const oldValue = snapshot(expense);
    transition(() => expense.markDeleted());
    await saveWithAudit(this.deps, expense, context, 'EXPENSE_DELETED', oldValue);
  }
}

export class ListExpenseCategoriesUseCase {
  constructor(private readonly repo: IExpenseRepository) {}
  public execute(includeInactive = false) { return this.repo.listCategories(includeInactive); }
}

export class CreateExpenseCategoryUseCase {
  constructor(
    private readonly repo: IExpenseRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
  ) {}
  public async execute(input: { code: string; name: string; expenseClass: ExpenseClass; description?: string }, context: ExpenseOperationContext) {
    const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!code || !input.name.trim()) throw new ValidationError('Mã và tên danh mục không được để trống.');
    if (await this.repo.findCategoryByCode(code)) throw new ConflictError('Mã danh mục chi phí đã tồn tại.');
    const category: ExpenseCategory = {
      id: this.idGenerator.generate(), code, name: input.name.trim(), expenseClass: input.expenseClass,
      description: input.description?.trim() || null, isActive: true, isSystem: false,
    };
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.repo.createCategory(category, transaction);
      await this.auditLogRepo.save({
        userId: context.actorUserId, action: 'EXPENSE_CATEGORY_CREATED', entityName: 'ExpenseCategory',
        entityId: category.id, newValueJson: JSON.stringify(category),
        ipAddress: context.ipAddress, userAgent: context.userAgent, correlationId: context.correlationId,
      }, transaction);
    });
    return category;
  }
}

export class UpdateExpenseCategoryUseCase {
  constructor(
    private readonly repo: IExpenseRepository,
    private readonly uow: IUnitOfWork,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}
  public async execute(id: string, input: { name: string; expenseClass: ExpenseClass; description?: string; isActive: boolean }, context: ExpenseOperationContext) {
    const category = await this.repo.findCategoryById(id);
    if (!category) throw new NotFoundError('Không tìm thấy danh mục chi phí.');
    if (!input.name.trim()) throw new ValidationError('Tên danh mục không được để trống.');
    const before = { ...category };
    const updated = {
      ...category, name: input.name.trim(), expenseClass: input.expenseClass,
      description: input.description?.trim() || null, isActive: input.isActive,
    };
    await this.uow.complete(async () => {
      const transaction = this.uow.getTransaction();
      await this.repo.updateCategory(updated, transaction);
      await this.auditLogRepo.save({
        userId: context.actorUserId, action: 'EXPENSE_CATEGORY_UPDATED', entityName: 'ExpenseCategory',
        entityId: id, oldValueJson: JSON.stringify(before), newValueJson: JSON.stringify(updated),
        ipAddress: context.ipAddress, userAgent: context.userAgent, correlationId: context.correlationId,
      }, transaction);
    });
    return updated;
  }
}

export async function recordMaintenanceExpense(
  maintenance: MaintenanceSchedule,
  context: ExpenseOperationContext,
  deps: Pick<ExpenseDependencies, 'expenseRepo' | 'auditLogRepo' | 'idGenerator'>,
  transaction: any,
): Promise<Expense | null> {
  const actualCost = maintenance.actualCost || 0;
  if (actualCost <= 0) return null;
  const existing = await deps.expenseRepo.findBySource('MAINTENANCE', maintenance.id.toString(), transaction);
  if (existing) return existing;
  const category = await deps.expenseRepo.findCategoryByCode('MAINTENANCE_REPAIR', transaction);
  if (!category) throw new NotFoundError('Thiếu danh mục chi phí bảo trì mặc định.');
  const now = new Date();
  const id = deps.idGenerator.generate();
  const expense = Expense.create({
    code: expenseCode(id, now),
    expenseDate: maintenance.completedAt || now,
    categoryId: category.id,
    title: `Chi phí ${maintenance.title}`,
    description: maintenance.resultNote,
    fundingSource: 'CENTER',
    status: 'APPROVED',
    paymentStatus: 'UNPAID',
    subtotal: actualCost,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: actualCost,
    currency: 'VND',
    sourceType: 'MAINTENANCE',
    sourceId: maintenance.id.toString(),
    createdBy: context.actorUserId,
    approvedBy: context.actorUserId,
    approvedAt: now,
    items: [{
      id: deps.idGenerator.generate(),
      description: maintenance.title,
      quantity: 1,
      unit: 'lần',
      unitPrice: actualCost,
      discountAmount: 0,
      taxAmount: 0,
      lineTotal: actualCost,
      targetType: 'MAINTENANCE',
      targetId: maintenance.id.toString(),
      note: maintenance.partsNote,
    }],
    createdAt: now,
    updatedAt: now,
  }, new UniqueEntityId(id));
  await deps.expenseRepo.save(expense, transaction);
  await audit(deps.auditLogRepo, transaction, context, 'EXPENSE_CREATED_FROM_MAINTENANCE', expense, null);
  return expense;
}

async function validateInput(input: ExpenseInput, deps: ExpenseDependencies): Promise<void> {
  const category = await deps.expenseRepo.findCategoryById(input.categoryId);
  if (!category || !category.isActive) throw new ValidationError('Danh mục chi phí không tồn tại hoặc đã bị khóa.');
  if (!input.items.length) throw new ValidationError('Phiếu chi phải có ít nhất một dòng chi tiết.');
  const lab = input.items.some((item) => item.targetType === 'LAB') ? await deps.labRepo.get() : null;
  for (const item of input.items) {
    if (item.targetType === 'EQUIPMENT' && (!item.targetId || !(await deps.equipmentRepo.findById(item.targetId)))) {
      throw new ValidationError(`Không tìm thấy thiết bị liên kết: ${item.description}.`);
    }
    if (item.targetType === 'COMPUTER' && (!item.targetId || !(await deps.computerRepo.findById(item.targetId)))) {
      throw new ValidationError(`Không tìm thấy máy tính liên kết: ${item.description}.`);
    }
    if (item.targetType === 'LAB' && (!item.targetId || !lab || lab.id.toString() !== item.targetId)) {
      throw new ValidationError(`Không tìm thấy phòng Lab liên kết: ${item.description}.`);
    }
    if (item.targetType === 'MAINTENANCE') {
      throw new ValidationError('Liên kết bảo trì chỉ được hệ thống tạo tự động khi hoàn tất bảo trì.');
    }
  }
}

async function postEquipmentInventory(expense: Expense, deps: ExpenseDependencies, context: ExpenseOperationContext, transaction: any) {
  if (expense.inventoryPostedAt) throw new BusinessRuleError('Phiếu chi đã được ghi tăng tồn kho trước đó.', 'EXPENSE_INVENTORY_ALREADY_POSTED');
  const quantities = new Map<string, number>();
  for (const item of expense.items.filter((line) => line.targetType === 'EQUIPMENT')) {
    if (!item.targetId || !Number.isInteger(item.quantity)) {
      throw new ValidationError('Dòng mua thiết bị phải liên kết thiết bị và có số lượng nguyên.');
    }
    quantities.set(item.targetId, (quantities.get(item.targetId) || 0) + item.quantity);
  }
  if (quantities.size === 0) throw new ValidationError('Phiếu mua thiết bị chưa có dòng nào liên kết thiết bị.');
  for (const [equipmentId, quantity] of quantities) {
    const equipment = await deps.equipmentRepo.findById(equipmentId, transaction);
    if (!equipment) throw new NotFoundError('Không tìm thấy thiết bị cần ghi tăng tồn kho.');
    equipment.adjustInventory(quantity);
    await deps.equipmentRepo.save(equipment, transaction);
    await deps.equipmentTxRepo.save(EquipmentInventoryTransaction.create({
      equipmentId,
      transactionType: 'ADJUSTMENT',
      deltaTotal: quantity,
      deltaAvailable: quantity,
      deltaReserved: 0,
      deltaBorrowed: 0,
      deltaBroken: 0,
      deltaMaintenance: 0,
      deltaLost: 0,
      referenceType: 'EXPENSE',
      referenceId: expense.id.toString(),
      performedBy: context.actorUserId,
      note: `Nhập kho từ phiếu chi ${expense.code}`,
    }), transaction);
  }
}

async function updateStatus(
  deps: ExpenseDependencies,
  id: string,
  context: ExpenseOperationContext,
  action: string,
  change: (expense: Expense) => void,
) {
  const expense = await requireExpense(deps.expenseRepo, id);
  const oldValue = snapshot(expense);
  transition(() => change(expense));
  await saveWithAudit(deps, expense, context, action, oldValue);
  return (await deps.expenseRepo.getDetailById(id))!;
}

async function saveWithAudit(
  deps: ExpenseDependencies,
  expense: Expense,
  context: ExpenseOperationContext,
  action: string,
  oldValue: unknown,
) {
  await deps.uow.complete(async () => {
    const transaction = deps.uow.getTransaction();
    await deps.expenseRepo.save(expense, transaction);
    await audit(deps.auditLogRepo, transaction, context, action, expense, oldValue);
  });
}

function audit(
  repo: IAuditLogRepository,
  transaction: any,
  context: ExpenseOperationContext,
  action: string,
  expense: Expense,
  oldValue: unknown,
) {
  return repo.save({
    userId: context.actorUserId,
    action,
    entityName: 'Expense',
    entityId: expense.id.toString(),
    oldValueJson: oldValue ? JSON.stringify(oldValue) : null,
    newValueJson: JSON.stringify(snapshot(expense)),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    correlationId: context.correlationId,
  }, transaction);
}

async function requireExpense(repo: IExpenseRepository, id: string): Promise<Expense> {
  const expense = await repo.findById(id);
  if (!expense) throw new NotFoundError('Không tìm thấy phiếu chi.');
  return expense;
}

function materializeItems(input: ExpenseInput['items'], idGenerator: IIdGenerator): ExpenseItemProps[] {
  return input.map((item) => ({
    ...item,
    id: item.id || idGenerator.generate(),
    lineTotal: item.lineTotal || 0,
  }));
}

function transition(change: () => void): void {
  try { change(); }
  catch (error) { throw new BusinessRuleError((error as Error).message, 'INVALID_EXPENSE_TRANSITION'); }
}

function expenseCode(id: string, date: Date): string {
  return `CP-${date.getUTCFullYear()}-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function snapshot(expense: Expense) {
  return {
    code: expense.code,
    expenseDate: expense.expenseDate,
    categoryId: expense.categoryId,
    title: expense.title,
    fundingSource: expense.fundingSource,
    status: expense.status,
    paymentStatus: expense.paymentStatus,
    subtotal: expense.subtotal,
    discountAmount: expense.discountAmount,
    taxAmount: expense.taxAmount,
    totalAmount: expense.totalAmount,
    sourceType: expense.sourceType,
    sourceId: expense.sourceId || null,
    inventoryPostedAt: expense.inventoryPostedAt || null,
    items: expense.items,
  };
}
