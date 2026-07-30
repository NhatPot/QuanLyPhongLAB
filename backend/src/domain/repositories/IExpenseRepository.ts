import {
  Expense,
  ExpenseClass,
  ExpenseStatus,
  FundingSource,
} from '../entities/Expense';

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  expenseClass: ExpenseClass;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
}

export interface ExpenseDetail {
  expense: Expense;
  categoryCode: string;
  categoryName: string;
  expenseClass: ExpenseClass;
  createdByName: string | null;
  approvedByName: string | null;
}

export interface ExpenseListFilters {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: ExpenseStatus;
  expenseClass?: ExpenseClass;
  categoryId?: string;
  fundingSource?: FundingSource;
  fromDate?: Date;
  toDate?: Date;
}

export interface ExpenseSummary {
  totalSpending: number;
  capex: number;
  opex: number;
  paid: number;
  outstanding: number;
  thisMonth: number;
  count: number;
  monthly: Array<{ month: string; capex: number; opex: number }>;
  byCategory: Array<{ categoryId: string; categoryName: string; expenseClass: ExpenseClass; amount: number }>;
}

export interface IExpenseRepository {
  findById(id: string, transaction?: any): Promise<Expense | null>;
  getDetailById(id: string): Promise<ExpenseDetail | null>;
  findBySource(sourceType: string, sourceId: string, transaction?: any): Promise<Expense | null>;
  list(filters: ExpenseListFilters): Promise<{ data: ExpenseDetail[]; total: number }>;
  getSummary(fromDate?: Date, toDate?: Date): Promise<ExpenseSummary>;
  listCategories(includeInactive?: boolean): Promise<ExpenseCategory[]>;
  findCategoryById(id: string, transaction?: any): Promise<ExpenseCategory | null>;
  findCategoryByCode(code: string, transaction?: any): Promise<ExpenseCategory | null>;
  createCategory(category: ExpenseCategory, transaction?: any): Promise<void>;
  updateCategory(category: ExpenseCategory, transaction?: any): Promise<void>;
  save(expense: Expense, transaction?: any): Promise<void>;
}
