import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../src/app';
import { container } from '../src/container/dependency-container';

const userId = 'bfce8dad-5123-4cee-8bc3-d71b05198ea5';

describe('Expense API authorization and reporting', () => {
  const app = createExpressApp();

  beforeEach(() => vi.clearAllMocks());

  it('requires authentication for expense data', async () => {
    const response = await request(app).get('/api/expenses/summary');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects users without expense or report permission', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId, roles: ['TEACHER'], permissions: ['LAB_CALENDAR_VIEW'],
    });

    const response = await request(app)
      .get('/api/expenses/summary')
      .set('Authorization', 'Bearer teacher-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows REPORT_VIEW to read the expense summary', async () => {
    vi.spyOn(container.tokenService, 'verifyAccessToken').mockReturnValue({
      userId, roles: ['MANAGER'], permissions: ['REPORT_VIEW'],
    });
    vi.spyOn(container.expenseRepo, 'getSummary').mockResolvedValue({
      totalSpending: 2_000_000,
      capex: 1_500_000,
      opex: 500_000,
      paid: 1_000_000,
      outstanding: 1_000_000,
      thisMonth: 2_000_000,
      count: 2,
      monthly: [{ month: '2026-07', capex: 1_500_000, opex: 500_000 }],
      byCategory: [],
    });

    const response = await request(app)
      .get('/api/expenses/summary?fromDate=2026-07-01&toDate=2026-07-31')
      .set('Authorization', 'Bearer manager-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      totalSpending: 2_000_000,
      capex: 1_500_000,
      opex: 500_000,
    });
  });
});
