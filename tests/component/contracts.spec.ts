import { test, expect } from '@playwright/test';
import { expenseSchema, loginSchema } from '../../src/contracts/schemas.js';

test.describe('Consumer schema components', () => {
  test('CMP-04 rejects expense identifiers that are not UUID', () => {
    const result = expenseSchema.safeParse({
      id: 'not-a-guid', expenseNumber: 'EXP-2026-0001', description: 'QA', vendor: null,
      amount: 1, date: '2026-10-16', categoryId: null, categoryName: null,
      status: 'AutoApproved', notes: null, receiptUrl: null, createdAt: '2026-10-16T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  test('CMP-05 rejects login payload without access token', () => {
    expect(loginSchema.safeParse({ expiresAt: '2026-10-16T13:00:00Z', user: {} }).success).toBe(false);
  });
});
