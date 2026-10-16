import { test, expect } from '@playwright/test';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

test.describe('ExpenseBuilder component', () => {
  test('CMP-01 produces valid isolated defaults', () => {
    const first = new ExpenseBuilder().build();
    const second = new ExpenseBuilder().build();
    expect(first.description).not.toBe(second.description);
    expect(first.amount).toBe(10);
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('CMP-02 fluent overrides do not leak to a new builder', () => {
    const custom = new ExpenseBuilder().withAmount(50).withVendor('QA Vendor').build();
    const fresh = new ExpenseBuilder().build();
    expect(custom).toMatchObject({ amount: 50, vendor: 'QA Vendor' });
    expect(fresh.vendor).toBeUndefined();
    expect(fresh.amount).toBe(10);
  });

  test('CMP-03 client-controlled attack fields are explicit', () => {
    const body = new ExpenseBuilder().withClientControlled('status', 'Approved').build();
    expect(body.status).toBe('Approved');
  });
});
