import mssql from 'mssql';
import {
  Expense,
  ExpenseClass,
  ExpenseItemProps,
  ExpenseSourceType,
  ExpenseStatus,
  ExpenseTargetType,
  FundingSource,
  PaymentStatus,
} from '../../../../domain/entities/Expense';
import {
  ExpenseCategory,
  ExpenseDetail,
  ExpenseListFilters,
  ExpenseSummary,
  IExpenseRepository,
} from '../../../../domain/repositories/IExpenseRepository';
import { UniqueEntityId } from '../../../../domain/value-objects/UniqueEntityId';
import { SqlConnectionFactory } from '../connection';

const detailSelect = `
  SELECT e.*, c.Code AS CategoryCode, c.Name AS CategoryName, c.ExpenseClass,
         creator.FullName AS CreatedByName, approver.FullName AS ApprovedByName
  FROM Expenses e
  INNER JOIN ExpenseCategories c ON c.Id = e.CategoryId
  LEFT JOIN Users creator ON creator.Id = e.CreatedBy
  LEFT JOIN Users approver ON approver.Id = e.ApprovedBy
`;

export class SqlExpenseRepository implements IExpenseRepository {
  public async findById(id: string, transaction?: mssql.Transaction): Promise<Expense | null> {
    const request = await this.request(transaction);
    const result = await request.input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM Expenses WHERE Id = @id AND DeletedAt IS NULL');
    if (!result.recordset[0]) return null;
    return this.toDomain(result.recordset[0], await this.loadItems(id, transaction));
  }

  public async getDetailById(id: string): Promise<ExpenseDetail | null> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().input('id', mssql.UniqueIdentifier, id)
      .query(`${detailSelect} WHERE e.Id = @id AND e.DeletedAt IS NULL`);
    if (!result.recordset[0]) return null;
    return this.toDetail(result.recordset[0], await this.loadItems(id));
  }

  public async findBySource(sourceType: string, sourceId: string, transaction?: mssql.Transaction): Promise<Expense | null> {
    const request = await this.request(transaction);
    const result = await request
      .input('sourceType', mssql.NVarChar, sourceType)
      .input('sourceId', mssql.UniqueIdentifier, sourceId)
      .query(`
        SELECT TOP 1 * FROM Expenses
        WHERE SourceType = @sourceType AND SourceId = @sourceId AND DeletedAt IS NULL
      `);
    if (!result.recordset[0]) return null;
    return this.toDomain(result.recordset[0], await this.loadItems(String(result.recordset[0].Id), transaction));
  }

  public async list(filters: ExpenseListFilters): Promise<{ data: ExpenseDetail[]; total: number }> {
    const pool = await SqlConnectionFactory.getPool();
    const values = {
      keyword: filters.keyword?.trim() || null,
      status: filters.status || null,
      expenseClass: filters.expenseClass || null,
      categoryId: filters.categoryId || null,
      fundingSource: filters.fundingSource || null,
      fromDate: filters.fromDate || null,
      toDate: filters.toDate || null,
    };
    const where = `
      e.DeletedAt IS NULL
      AND (@keyword IS NULL OR e.Code LIKE '%' + @keyword + '%' OR e.Title LIKE '%' + @keyword + '%'
           OR e.VendorName LIKE '%' + @keyword + '%' OR e.InvoiceNumber LIKE '%' + @keyword + '%')
      AND (@status IS NULL OR e.Status = @status)
      AND (@expenseClass IS NULL OR c.ExpenseClass = @expenseClass)
      AND (@categoryId IS NULL OR e.CategoryId = @categoryId)
      AND (@fundingSource IS NULL OR e.FundingSource = @fundingSource)
      AND (@fromDate IS NULL OR e.ExpenseDate >= @fromDate)
      AND (@toDate IS NULL OR e.ExpenseDate <= @toDate)
    `;
    const countResult = await this.bindFilters(pool.request(), values)
      .query(`SELECT COUNT(*) AS Total FROM Expenses e INNER JOIN ExpenseCategories c ON c.Id=e.CategoryId WHERE ${where}`);

    const page = Math.max(1, filters.page);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize));
    const result = await this.bindFilters(pool.request(), values)
      .input('offset', mssql.Int, (page - 1) * pageSize)
      .input('pageSize', mssql.Int, pageSize)
      .query(`
        ${detailSelect}
        WHERE ${where}
        ORDER BY e.ExpenseDate DESC, e.CreatedAt DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
    const details = await Promise.all(result.recordset.map(async (row) =>
      this.toDetail(row, await this.loadItems(String(row.Id)))));
    return { data: details, total: Number(countResult.recordset[0]?.Total || 0) };
  }

  public async getSummary(fromDate?: Date, toDate?: Date): Promise<ExpenseSummary> {
    const pool = await SqlConnectionFactory.getPool();
    const bindDates = (request: mssql.Request) => request
      .input('fromDate', mssql.Date, fromDate || null)
      .input('toDate', mssql.Date, toDate || null);
    const dateWhere = `
      e.DeletedAt IS NULL AND e.Status IN ('APPROVED', 'PAID')
      AND (@fromDate IS NULL OR e.ExpenseDate >= @fromDate)
      AND (@toDate IS NULL OR e.ExpenseDate <= @toDate)
    `;
    const [totalsResult, monthlyResult, categoryResult] = await Promise.all([
      bindDates(pool.request()).query(`
        SELECT
          COUNT(*) AS [Count],
          SUM(e.TotalAmount) AS TotalSpending,
          SUM(CASE WHEN c.ExpenseClass='CAPEX' THEN e.TotalAmount ELSE 0 END) AS Capex,
          SUM(CASE WHEN c.ExpenseClass='OPEX' THEN e.TotalAmount ELSE 0 END) AS Opex,
          SUM(CASE WHEN e.PaymentStatus='PAID' THEN e.TotalAmount ELSE 0 END) AS Paid,
          SUM(CASE WHEN e.PaymentStatus='UNPAID' THEN e.TotalAmount ELSE 0 END) AS Outstanding,
          SUM(CASE WHEN YEAR(e.ExpenseDate)=YEAR(GETDATE()) AND MONTH(e.ExpenseDate)=MONTH(GETDATE())
                   THEN e.TotalAmount ELSE 0 END) AS ThisMonth
        FROM Expenses e INNER JOIN ExpenseCategories c ON c.Id=e.CategoryId
        WHERE ${dateWhere}
      `),
      bindDates(pool.request()).query(`
        SELECT CONVERT(char(7), e.ExpenseDate, 126) AS [Month],
          SUM(CASE WHEN c.ExpenseClass='CAPEX' THEN e.TotalAmount ELSE 0 END) AS Capex,
          SUM(CASE WHEN c.ExpenseClass='OPEX' THEN e.TotalAmount ELSE 0 END) AS Opex
        FROM Expenses e INNER JOIN ExpenseCategories c ON c.Id=e.CategoryId
        WHERE ${dateWhere}
        GROUP BY CONVERT(char(7), e.ExpenseDate, 126)
        ORDER BY [Month]
      `),
      bindDates(pool.request()).query(`
        SELECT c.Id AS CategoryId, c.Name AS CategoryName, c.ExpenseClass, SUM(e.TotalAmount) AS Amount
        FROM Expenses e INNER JOIN ExpenseCategories c ON c.Id=e.CategoryId
        WHERE ${dateWhere}
        GROUP BY c.Id, c.Name, c.ExpenseClass
        ORDER BY Amount DESC
      `),
    ]);
    const row = totalsResult.recordset[0] || {};
    return {
      totalSpending: Number(row.TotalSpending || 0),
      capex: Number(row.Capex || 0),
      opex: Number(row.Opex || 0),
      paid: Number(row.Paid || 0),
      outstanding: Number(row.Outstanding || 0),
      thisMonth: Number(row.ThisMonth || 0),
      count: Number(row.Count || 0),
      monthly: monthlyResult.recordset.map((item) => ({
        month: String(item.Month), capex: Number(item.Capex || 0), opex: Number(item.Opex || 0),
      })),
      byCategory: categoryResult.recordset.map((item) => ({
        categoryId: String(item.CategoryId), categoryName: String(item.CategoryName),
        expenseClass: item.ExpenseClass as ExpenseClass, amount: Number(item.Amount || 0),
      })),
    };
  }

  public async listCategories(includeInactive = false): Promise<ExpenseCategory[]> {
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().input('includeInactive', mssql.Bit, includeInactive).query(`
      SELECT * FROM ExpenseCategories
      WHERE @includeInactive = 1 OR IsActive = 1
      ORDER BY CASE ExpenseClass WHEN 'CAPEX' THEN 0 ELSE 1 END, Name
    `);
    return result.recordset.map((row) => this.toCategory(row));
  }

  public async findCategoryById(id: string, transaction?: mssql.Transaction): Promise<ExpenseCategory | null> {
    const request = await this.request(transaction);
    const result = await request.input('id', mssql.UniqueIdentifier, id)
      .query('SELECT * FROM ExpenseCategories WHERE Id=@id');
    return result.recordset[0] ? this.toCategory(result.recordset[0]) : null;
  }

  public async findCategoryByCode(code: string, transaction?: mssql.Transaction): Promise<ExpenseCategory | null> {
    const request = await this.request(transaction);
    const result = await request.input('code', mssql.NVarChar, code)
      .query('SELECT * FROM ExpenseCategories WHERE Code=@code');
    return result.recordset[0] ? this.toCategory(result.recordset[0]) : null;
  }

  public async createCategory(category: ExpenseCategory, transaction?: mssql.Transaction): Promise<void> {
    const request = await this.request(transaction);
    await request
      .input('id', mssql.UniqueIdentifier, category.id)
      .input('code', mssql.NVarChar, category.code)
      .input('name', mssql.NVarChar, category.name)
      .input('expenseClass', mssql.NVarChar, category.expenseClass)
      .input('description', mssql.NVarChar, category.description)
      .input('isActive', mssql.Bit, category.isActive)
      .input('isSystem', mssql.Bit, category.isSystem)
      .query(`
        INSERT INTO ExpenseCategories (Id, Code, Name, ExpenseClass, Description, IsActive, IsSystem)
        VALUES (@id, @code, @name, @expenseClass, @description, @isActive, @isSystem)
      `);
  }

  public async updateCategory(category: ExpenseCategory, transaction?: mssql.Transaction): Promise<void> {
    const request = await this.request(transaction);
    await request
      .input('id', mssql.UniqueIdentifier, category.id)
      .input('name', mssql.NVarChar, category.name)
      .input('expenseClass', mssql.NVarChar, category.expenseClass)
      .input('description', mssql.NVarChar, category.description)
      .input('isActive', mssql.Bit, category.isActive)
      .query(`
        UPDATE ExpenseCategories SET Name=@name, ExpenseClass=@expenseClass, Description=@description,
          IsActive=@isActive, UpdatedAt=SYSUTCDATETIME()
        WHERE Id=@id
      `);
  }

  public async save(expense: Expense, transaction?: mssql.Transaction): Promise<void> {
    const request = await this.request(transaction);
    await request
      .input('id', mssql.UniqueIdentifier, expense.id.toString())
      .input('code', mssql.NVarChar, expense.code)
      .input('expenseDate', mssql.Date, expense.expenseDate)
      .input('categoryId', mssql.UniqueIdentifier, expense.categoryId)
      .input('title', mssql.NVarChar, expense.title)
      .input('description', mssql.NVarChar, expense.description || null)
      .input('vendorName', mssql.NVarChar, expense.vendorName || null)
      .input('invoiceNumber', mssql.NVarChar, expense.invoiceNumber || null)
      .input('fundingSource', mssql.NVarChar, expense.fundingSource)
      .input('status', mssql.NVarChar, expense.status)
      .input('paymentStatus', mssql.NVarChar, expense.paymentStatus)
      .input('paymentMethod', mssql.NVarChar, expense.paymentMethod || null)
      .input('paymentDate', mssql.Date, expense.paymentDate || null)
      .input('subtotal', mssql.Decimal(18, 2), expense.subtotal)
      .input('discountAmount', mssql.Decimal(18, 2), expense.discountAmount)
      .input('taxAmount', mssql.Decimal(18, 2), expense.taxAmount)
      .input('totalAmount', mssql.Decimal(18, 2), expense.totalAmount)
      .input('currency', mssql.NVarChar, expense.currency)
      .input('attachmentUrl', mssql.NVarChar, expense.attachmentUrl || null)
      .input('sourceType', mssql.NVarChar, expense.sourceType)
      .input('sourceId', mssql.UniqueIdentifier, expense.sourceId || null)
      .input('createdBy', mssql.UniqueIdentifier, expense.createdBy || null)
      .input('approvedBy', mssql.UniqueIdentifier, expense.approvedBy || null)
      .input('approvedAt', mssql.DateTime2, expense.approvedAt || null)
      .input('rejectedAt', mssql.DateTime2, expense.rejectedAt || null)
      .input('rejectionReason', mssql.NVarChar, expense.rejectionReason || null)
      .input('cancelledAt', mssql.DateTime2, expense.cancelledAt || null)
      .input('cancellationReason', mssql.NVarChar, expense.cancellationReason || null)
      .input('inventoryPostedAt', mssql.DateTime2, expense.inventoryPostedAt || null)
      .input('createdAt', mssql.DateTime2, expense.createdAt || new Date())
      .input('updatedAt', mssql.DateTime2, expense.updatedAt || new Date())
      .input('deletedAt', mssql.DateTime2, expense.deletedAt || null)
      .query(`
        MERGE Expenses AS target
        USING (SELECT @id AS Id) AS source ON target.Id=source.Id
        WHEN MATCHED THEN UPDATE SET
          ExpenseDate=@expenseDate, CategoryId=@categoryId, Title=@title, Description=@description,
          VendorName=@vendorName, InvoiceNumber=@invoiceNumber, FundingSource=@fundingSource,
          Status=@status, PaymentStatus=@paymentStatus, PaymentMethod=@paymentMethod, PaymentDate=@paymentDate,
          Subtotal=@subtotal, DiscountAmount=@discountAmount, TaxAmount=@taxAmount, TotalAmount=@totalAmount,
          Currency=@currency, AttachmentUrl=@attachmentUrl, SourceType=@sourceType, SourceId=@sourceId,
          CreatedBy=@createdBy, ApprovedBy=@approvedBy, ApprovedAt=@approvedAt, RejectedAt=@rejectedAt,
          RejectionReason=@rejectionReason, CancelledAt=@cancelledAt, CancellationReason=@cancellationReason,
          InventoryPostedAt=@inventoryPostedAt, UpdatedAt=@updatedAt, DeletedAt=@deletedAt
        WHEN NOT MATCHED THEN INSERT (
          Id, Code, ExpenseDate, CategoryId, Title, Description, VendorName, InvoiceNumber, FundingSource,
          Status, PaymentStatus, PaymentMethod, PaymentDate, Subtotal, DiscountAmount, TaxAmount, TotalAmount,
          Currency, AttachmentUrl, SourceType, SourceId, CreatedBy, ApprovedBy, ApprovedAt, RejectedAt,
          RejectionReason, CancelledAt, CancellationReason, InventoryPostedAt, CreatedAt, UpdatedAt, DeletedAt
        ) VALUES (
          @id, @code, @expenseDate, @categoryId, @title, @description, @vendorName, @invoiceNumber, @fundingSource,
          @status, @paymentStatus, @paymentMethod, @paymentDate, @subtotal, @discountAmount, @taxAmount, @totalAmount,
          @currency, @attachmentUrl, @sourceType, @sourceId, @createdBy, @approvedBy, @approvedAt, @rejectedAt,
          @rejectionReason, @cancelledAt, @cancellationReason, @inventoryPostedAt, @createdAt, @updatedAt, @deletedAt
        );
      `);

    const deleteRequest = await this.request(transaction);
    await deleteRequest.input('expenseId', mssql.UniqueIdentifier, expense.id.toString())
      .query('DELETE FROM ExpenseItems WHERE ExpenseId=@expenseId');
    for (const item of expense.items) {
      const itemRequest = await this.request(transaction);
      await itemRequest
        .input('id', mssql.UniqueIdentifier, item.id)
        .input('expenseId', mssql.UniqueIdentifier, expense.id.toString())
        .input('description', mssql.NVarChar, item.description)
        .input('quantity', mssql.Decimal(18, 2), item.quantity)
        .input('unit', mssql.NVarChar, item.unit)
        .input('unitPrice', mssql.Decimal(18, 2), item.unitPrice)
        .input('discountAmount', mssql.Decimal(18, 2), item.discountAmount)
        .input('taxAmount', mssql.Decimal(18, 2), item.taxAmount)
        .input('lineTotal', mssql.Decimal(18, 2), item.lineTotal)
        .input('targetType', mssql.NVarChar, item.targetType)
        .input('targetId', mssql.UniqueIdentifier, item.targetId || null)
        .input('note', mssql.NVarChar, item.note || null)
        .query(`
          INSERT INTO ExpenseItems (
            Id, ExpenseId, Description, Quantity, Unit, UnitPrice, DiscountAmount, TaxAmount,
            LineTotal, TargetType, TargetId, Note
          ) VALUES (
            @id, @expenseId, @description, @quantity, @unit, @unitPrice, @discountAmount, @taxAmount,
            @lineTotal, @targetType, @targetId, @note
          )
        `);
    }
  }

  private async request(transaction?: mssql.Transaction): Promise<mssql.Request> {
    return transaction ? new mssql.Request(transaction) : (await SqlConnectionFactory.getPool()).request();
  }

  private bindFilters(request: mssql.Request, values: Record<string, any>): mssql.Request {
    return request
      .input('keyword', mssql.NVarChar, values.keyword)
      .input('status', mssql.NVarChar, values.status)
      .input('expenseClass', mssql.NVarChar, values.expenseClass)
      .input('categoryId', mssql.UniqueIdentifier, values.categoryId)
      .input('fundingSource', mssql.NVarChar, values.fundingSource)
      .input('fromDate', mssql.Date, values.fromDate)
      .input('toDate', mssql.Date, values.toDate);
  }

  private async loadItems(expenseId: string, transaction?: mssql.Transaction): Promise<ExpenseItemProps[]> {
    const request = await this.request(transaction);
    const result = await request.input('expenseId', mssql.UniqueIdentifier, expenseId).query(`
      SELECT * FROM ExpenseItems WHERE ExpenseId=@expenseId ORDER BY CreatedAt, Id
    `);
    return result.recordset.map((row) => ({
      id: String(row.Id),
      description: String(row.Description),
      quantity: Number(row.Quantity),
      unit: String(row.Unit),
      unitPrice: Number(row.UnitPrice),
      discountAmount: Number(row.DiscountAmount),
      taxAmount: Number(row.TaxAmount),
      lineTotal: Number(row.LineTotal),
      targetType: row.TargetType as ExpenseTargetType,
      targetId: row.TargetId ? String(row.TargetId) : undefined,
      note: row.Note ? String(row.Note) : undefined,
    }));
  }

  private toDomain(row: any, items: ExpenseItemProps[]): Expense {
    return Expense.create({
      code: String(row.Code),
      expenseDate: new Date(row.ExpenseDate),
      categoryId: String(row.CategoryId),
      title: String(row.Title),
      description: row.Description ? String(row.Description) : undefined,
      vendorName: row.VendorName ? String(row.VendorName) : undefined,
      invoiceNumber: row.InvoiceNumber ? String(row.InvoiceNumber) : undefined,
      fundingSource: row.FundingSource as FundingSource,
      status: row.Status as ExpenseStatus,
      paymentStatus: row.PaymentStatus as PaymentStatus,
      paymentMethod: row.PaymentMethod ? String(row.PaymentMethod) : undefined,
      paymentDate: row.PaymentDate ? new Date(row.PaymentDate) : undefined,
      subtotal: Number(row.Subtotal),
      discountAmount: Number(row.DiscountAmount),
      taxAmount: Number(row.TaxAmount),
      totalAmount: Number(row.TotalAmount),
      currency: String(row.Currency),
      attachmentUrl: row.AttachmentUrl ? String(row.AttachmentUrl) : undefined,
      sourceType: row.SourceType as ExpenseSourceType,
      sourceId: row.SourceId ? String(row.SourceId) : undefined,
      createdBy: row.CreatedBy ? String(row.CreatedBy) : undefined,
      approvedBy: row.ApprovedBy ? String(row.ApprovedBy) : undefined,
      approvedAt: row.ApprovedAt ? new Date(row.ApprovedAt) : undefined,
      rejectedAt: row.RejectedAt ? new Date(row.RejectedAt) : undefined,
      rejectionReason: row.RejectionReason ? String(row.RejectionReason) : undefined,
      cancelledAt: row.CancelledAt ? new Date(row.CancelledAt) : undefined,
      cancellationReason: row.CancellationReason ? String(row.CancellationReason) : undefined,
      inventoryPostedAt: row.InventoryPostedAt ? new Date(row.InventoryPostedAt) : undefined,
      items,
      createdAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
      updatedAt: row.UpdatedAt ? new Date(row.UpdatedAt) : undefined,
      deletedAt: row.DeletedAt ? new Date(row.DeletedAt) : undefined,
      rowVersion: row.RowVersion,
    }, new UniqueEntityId(String(row.Id)));
  }

  private toDetail(row: any, items: ExpenseItemProps[]): ExpenseDetail {
    return {
      expense: this.toDomain(row, items),
      categoryCode: String(row.CategoryCode),
      categoryName: String(row.CategoryName),
      expenseClass: row.ExpenseClass as ExpenseClass,
      createdByName: row.CreatedByName ? String(row.CreatedByName) : null,
      approvedByName: row.ApprovedByName ? String(row.ApprovedByName) : null,
    };
  }

  private toCategory(row: any): ExpenseCategory {
    return {
      id: String(row.Id),
      code: String(row.Code),
      name: String(row.Name),
      expenseClass: row.ExpenseClass as ExpenseClass,
      description: row.Description ? String(row.Description) : null,
      isActive: Boolean(row.IsActive),
      isSystem: Boolean(row.IsSystem),
    };
  }
}
