import { NextFunction, Request, Response } from 'express';
import {
  ApproveExpenseUseCase,
  CancelExpenseUseCase,
  CreateExpenseCategoryUseCase,
  CreateExpenseUseCase,
  DeleteExpenseUseCase,
  ExpenseInput,
  ExpenseOperationContext,
  GetExpenseOptionsUseCase,
  GetExpenseSummaryUseCase,
  GetExpenseUseCase,
  ListExpenseCategoriesUseCase,
  ListExpensesUseCase,
  MarkExpensePaidUseCase,
  RejectExpenseUseCase,
  SubmitExpenseUseCase,
  UpdateExpenseCategoryUseCase,
  UpdateExpenseUseCase,
} from '../../../application/use-cases/expense/ExpenseManagementUseCases';
import { ExpenseClass, ExpenseStatus, FundingSource } from '../../../domain/entities/Expense';
import { ExpenseDetail } from '../../../domain/repositories/IExpenseRepository';
import { ApiResponse } from '../presenters/ApiResponse';

export class ExpenseController {
  constructor(
    private readonly listUseCase: ListExpensesUseCase,
    private readonly summaryUseCase: GetExpenseSummaryUseCase,
    private readonly optionsUseCase: GetExpenseOptionsUseCase,
    private readonly getUseCase: GetExpenseUseCase,
    private readonly createUseCase: CreateExpenseUseCase,
    private readonly updateUseCase: UpdateExpenseUseCase,
    private readonly submitUseCase: SubmitExpenseUseCase,
    private readonly approveUseCase: ApproveExpenseUseCase,
    private readonly rejectUseCase: RejectExpenseUseCase,
    private readonly paidUseCase: MarkExpensePaidUseCase,
    private readonly cancelUseCase: CancelExpenseUseCase,
    private readonly deleteUseCase: DeleteExpenseUseCase,
    private readonly listCategoriesUseCase: ListExpenseCategoriesUseCase,
    private readonly createCategoryUseCase: CreateExpenseCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateExpenseCategoryUseCase,
  ) {}

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Number(req.query.page || 1);
      const pageSize = Number(req.query.pageSize || 20);
      const output = await this.listUseCase.execute({
        page,
        pageSize,
        keyword: req.query.keyword as string | undefined,
        status: req.query.status as ExpenseStatus | undefined,
        expenseClass: req.query.expenseClass as ExpenseClass | undefined,
        categoryId: req.query.categoryId as string | undefined,
        fundingSource: req.query.fundingSource as FundingSource | undefined,
        fromDate: req.query.fromDate ? new Date(String(req.query.fromDate)) : undefined,
        toDate: req.query.toDate ? new Date(String(req.query.toDate)) : undefined,
      });
      res.status(200).json(ApiResponse.paginated(output.data.map((item) => this.toDto(item)), {
        page, pageSize, totalItems: output.total, totalPages: Math.ceil(output.total / pageSize),
      }, 'Lấy danh sách chi phí thành công.'));
    } catch (error) { next(error); }
  };

  public summary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.summaryUseCase.execute(
        req.query.fromDate ? new Date(String(req.query.fromDate)) : undefined,
        req.query.toDate ? new Date(String(req.query.toDate)) : undefined,
      );
      res.status(200).json(ApiResponse.success(data));
    } catch (error) { next(error); }
  };

  public options = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(await this.optionsUseCase.execute())); }
    catch (error) { next(error); }
  };

  public get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(200).json(ApiResponse.success(this.toDto(await this.getUseCase.execute(req.params.id as string)))); }
    catch (error) { next(error); }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.createUseCase.execute(this.input(req), this.context(req));
      res.status(201).json(ApiResponse.created(this.toDto(detail), 'Đã tạo phiếu chi.'));
    } catch (error) { next(error); }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const detail = await this.updateUseCase.execute(req.params.id as string, this.input(req), this.context(req));
      res.status(200).json(ApiResponse.success(this.toDto(detail), 'Đã cập nhật phiếu chi.'));
    } catch (error) { next(error); }
  };

  public submit = this.action((req) => this.submitUseCase.execute(req.params.id as string, this.context(req)), 'Đã gửi phiếu chi để duyệt.');
  public approve = this.action((req) => this.approveUseCase.execute(req.params.id as string, this.context(req)), 'Đã duyệt phiếu chi.');
  public reject = this.action((req) => this.rejectUseCase.execute(req.params.id as string, req.body.reason, this.context(req)), 'Đã từ chối phiếu chi.');
  public cancel = this.action((req) => this.cancelUseCase.execute(req.params.id as string, req.body.reason, this.context(req)), 'Đã hủy phiếu chi.');
  public markPaid = this.action(
    (req) => this.paidUseCase.execute(req.params.id as string, req.body.paymentMethod, req.body.paymentDate, req.body.postInventory, this.context(req)),
    'Đã xác nhận thanh toán phiếu chi.',
  );

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.deleteUseCase.execute(req.params.id as string, this.context(req));
      res.status(200).json(ApiResponse.success(null, 'Đã xóa phiếu chi.'));
    } catch (error) { next(error); }
  };

  public listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json(ApiResponse.success(await this.listCategoriesUseCase.execute(req.query.includeInactive === 'true')));
    } catch (error) { next(error); }
  };

  public createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.createCategoryUseCase.execute(req.body, this.context(req));
      res.status(201).json(ApiResponse.created(result, 'Đã tạo danh mục chi phí.'));
    } catch (error) { next(error); }
  };

  public updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.updateCategoryUseCase.execute(req.params.id as string, req.body, this.context(req));
      res.status(200).json(ApiResponse.success(result, 'Đã cập nhật danh mục chi phí.'));
    } catch (error) { next(error); }
  };

  private action(work: (req: Request) => Promise<ExpenseDetail>, message: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try { res.status(200).json(ApiResponse.success(this.toDto(await work(req)), message)); }
      catch (error) { next(error); }
    };
  }

  private input(req: Request): ExpenseInput {
    return {
      expenseDate: req.body.expenseDate,
      categoryId: req.body.categoryId,
      title: req.body.title,
      description: req.body.description || undefined,
      vendorName: req.body.vendorName || undefined,
      invoiceNumber: req.body.invoiceNumber || undefined,
      fundingSource: req.body.fundingSource,
      paymentMethod: req.body.paymentMethod || undefined,
      currency: req.body.currency,
      attachmentUrl: req.body.attachmentUrl || undefined,
      items: req.body.items,
    };
  }

  private context(req: Request): ExpenseOperationContext {
    return {
      actorUserId: req.user!.userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.correlationId,
    };
  }

  private toDto(detail: ExpenseDetail) {
    const item = detail.expense;
    return {
      id: item.id.toString(),
      code: item.code,
      expenseDate: item.expenseDate,
      categoryId: item.categoryId,
      categoryCode: detail.categoryCode,
      categoryName: detail.categoryName,
      expenseClass: detail.expenseClass,
      title: item.title,
      description: item.description || null,
      vendorName: item.vendorName || null,
      invoiceNumber: item.invoiceNumber || null,
      fundingSource: item.fundingSource,
      status: item.status,
      paymentStatus: item.paymentStatus,
      paymentMethod: item.paymentMethod || null,
      paymentDate: item.paymentDate || null,
      subtotal: item.subtotal,
      discountAmount: item.discountAmount,
      taxAmount: item.taxAmount,
      totalAmount: item.totalAmount,
      currency: item.currency,
      attachmentUrl: item.attachmentUrl || null,
      sourceType: item.sourceType,
      sourceId: item.sourceId || null,
      createdBy: item.createdBy || null,
      createdByName: detail.createdByName,
      approvedBy: item.approvedBy || null,
      approvedByName: detail.approvedByName,
      approvedAt: item.approvedAt || null,
      rejectedAt: item.rejectedAt || null,
      rejectionReason: item.rejectionReason || null,
      cancelledAt: item.cancelledAt || null,
      cancellationReason: item.cancellationReason || null,
      inventoryPostedAt: item.inventoryPostedAt || null,
      items: item.items,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
