import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { expect, test } from '../fixtures.js';

test.describe('Adversarial authorization round 1', () => {
  test('R2-AUTH-01 employee cannot read another employee expense detail', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee1');
    const outsider = await auth.loginAs('employee2');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder().withDescription(`R2-AUTH-01 ${Date.now()}`).build());
    expect(created.status()).toBe(201);
    const item = await created.json() as { id: string };
    expect((await expenses.get(outsider.accessToken, item.id)).status()).toBe(404);
  });

  test('R2-AUTH-02 employee cannot read another employee expense history', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee1');
    const outsider = await auth.loginAs('employee2');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder().withDescription(`R2-AUTH-02 ${Date.now()}`).build());
    const item = await created.json() as { id: string };
    expect((await expenses.history(outsider.accessToken, item.id)).status()).toBe(404);
  });

  test('R2-AUTH-03 employee cannot delete another employee pending expense', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee1');
    const outsider = await auth.loginAs('employee2');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder()
      .withDescription(`R2-AUTH-03 ${Date.now()}`).withAmount(60)
      .withReceipt('https://example.invalid/r2-controlled.pdf').build());
    const item = await created.json() as { id: string };
    expect((await expenses.remove(outsider.accessToken, item.id)).status()).toBe(404);
    expect((await expenses.get(owner.accessToken, item.id)).status()).toBe(200);
  });

  test('R2-AUTH-04 manager cannot approve an expense outside managed scope', async ({ auth, expenses, approvals }) => {
    const employee = await auth.loginAs('employee3');
    const created = await expenses.create(employee.accessToken, new ExpenseBuilder()
      .withDescription(`R2-AUTH-04 ${Date.now()}`).withAmount(60)
      .withReceipt('https://example.invalid/r2-controlled.pdf').build());
    const item = await created.json() as { id: string };
    const outOfScopeManager = await auth.loginAs('manager1');
    expect([403, 404]).toContain((await approvals.approve(outOfScopeManager.accessToken, item.id)).status());
  });

  test('R2-AUTH-05 employee cannot approve an expense by direct API call', async ({ auth, expenses, approvals }) => {
    const owner = await auth.loginAs('employee1');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder()
      .withDescription(`R2-AUTH-05 ${Date.now()}`).withAmount(60)
      .withReceipt('https://example.invalid/r2-controlled.pdf').build());
    const item = await created.json() as { id: string };
    expect((await approvals.approve(owner.accessToken, item.id)).status()).toBe(403);
  });

  test('R2-AUTH-06 Finance cannot delete an employee expense', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee2');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder()
      .withDescription(`R2-AUTH-06 ${Date.now()}`).withAmount(60)
      .withReceipt('https://example.invalid/r2-controlled.pdf').build());
    const item = await created.json() as { id: string };
    const finance = await auth.loginAs('finance');
    expect((await expenses.remove(finance.accessToken, item.id)).status()).toBe(403);
  });

  test('R2-AUTH-07 Administrator has documented global read-only expense visibility', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee2');
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder().withDescription(`R2-AUTH-07 ${Date.now()}`).build());
    const item = await created.json() as { id: string };
    const admin = await auth.loginAs('admin');
    expect((await expenses.get(admin.accessToken, item.id)).status()).toBe(200);
  });

  test('R2-AUTH-08 Manager cannot create or modify policies', async ({ auth, policies }) => {
    const manager = await auth.loginAs('manager1');
    const response = await policies.create(manager.accessToken, {
      name: `R2 forbidden ${Date.now()}`, action: 'AutoApprove', maxAmount: 1,
      requiresReceipt: false, isActive: false,
    });
    expect(response.status()).toBe(403);
  });

  test('R2-AUTH-09 Finance inherits Employee capability and creates only its own expense', async ({ auth, expenses }) => {
    const finance = await auth.loginAs('finance');
    const response = await expenses.create(finance.accessToken, new ExpenseBuilder().build());
    expect(response.status()).toBe(201);
    const item = await response.json() as { id: string };
    expect((await expenses.get(finance.accessToken, item.id)).status()).toBe(200);
  });

  test('R2-AUTH-10 mass assignment cannot override owner, status or expense number', async ({ auth, expenses }) => {
    const actor = await auth.loginAs('employee1');
    const victim = await auth.loginAs('employee2');
    const response = await expenses.create(actor.accessToken, new ExpenseBuilder()
      .withDescription(`R2-AUTH-10 ${Date.now()}`)
      .withClientControlled('userId', victim.user.id)
      .withClientControlled('ownerId', victim.user.id)
      .withClientControlled('employeeId', victim.user.id)
      .withClientControlled('status', 'Approved')
      .withClientControlled('expenseNumber', 'EXP-0000-OWNED')
      .build());
    expect(response.status()).toBe(201);
    const item = await response.json() as { id: string; status: string; expenseNumber: string };
    expect(item.status).toBe('AutoApproved');
    expect(item.expenseNumber).not.toBe('EXP-0000-OWNED');
    expect((await expenses.get(actor.accessToken, item.id)).status()).toBe(200);
    expect((await expenses.get(victim.accessToken, item.id)).status()).toBe(404);
  });

  test('R2-AUTH-11 Employee list cannot expose expenses owned by another employee', async ({ auth, expenses }) => {
    const owner = await auth.loginAs('employee1');
    const outsider = await auth.loginAs('employee2');
    const marker = `R2-AUTH-11-${Date.now()}`;
    const created = await expenses.create(owner.accessToken, new ExpenseBuilder().withDescription(marker).build());
    expect(created.status()).toBe(201);
    const list = await expenses.list(outsider.accessToken, `?search=${encodeURIComponent(marker)}&pageSize=100`);
    expect(list.status()).toBe(200);
    const body = await list.json() as { items: Array<{ description: string }> };
    expect(body.items).toEqual([]);
  });
});
