import { expect, test } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';

async function pendingExpense(auth: any, expenses: any, role: 'employee1' | 'employee2' = 'employee1') {
  const employee = await auth.loginAs(role);
  const response = await expenses.create(
    employee.accessToken,
    new ExpenseBuilder().withDescription(`R2 pending ${Date.now()}-${crypto.randomUUID().slice(0, 6)}`).withAmount(125).build(),
  );
  expect(response.status(), await response.text()).toBe(201);
  const expense = await response.json();
  expect(expense.status).toBe('PendingApproval');
  return { employee, expense };
}

test.describe('Round 2 adversarial workflow mutations', () => {
  test('R2-FLOW-01 repeated approval cannot decide a final expense twice', async ({ auth, expenses, approvals }) => {
    const { expense } = await pendingExpense(auth, expenses);
    const manager = await auth.loginAs('manager1');
    expect((await approvals.approve(manager.accessToken, expense.id)).status()).toBe(200);
    const detailBefore = await (await expenses.get(manager.accessToken, expense.id)).json();
    const historyBefore = await (await expenses.history(manager.accessToken, expense.id)).json();
    const repeated = await approvals.approve(manager.accessToken, expense.id);
    expect(repeated.status()).toBeGreaterThanOrEqual(400);
    expect(repeated.status()).toBeLessThan(500);
    const detailAfter = await (await expenses.get(manager.accessToken, expense.id)).json();
    const historyAfter = await (await expenses.history(manager.accessToken, expense.id)).json();
    expect(detailAfter.status).toBe(detailBefore.status);
    expect(historyAfter).toHaveLength(historyBefore.length);
  });

  test('R2-FLOW-02 rejected expense cannot later be approved', async ({ auth, expenses, approvals }) => {
    const { expense } = await pendingExpense(auth, expenses);
    const manager = await auth.loginAs('manager1');
    expect((await approvals.reject(manager.accessToken, expense.id, 'R2 controlled rejection')).status()).toBe(200);
    const detailBefore = await (await expenses.get(manager.accessToken, expense.id)).json();
    const historyBefore = await (await expenses.history(manager.accessToken, expense.id)).json();
    const approveFinal = await approvals.approve(manager.accessToken, expense.id);
    expect(approveFinal.status()).toBeGreaterThanOrEqual(400);
    expect(approveFinal.status()).toBeLessThan(500);
    const detailAfter = await (await expenses.get(manager.accessToken, expense.id)).json();
    const historyAfter = await (await expenses.history(manager.accessToken, expense.id)).json();
    expect(detailAfter.status).toBe(detailBefore.status);
    expect(historyAfter).toHaveLength(historyBefore.length);
  });

  test('R2-FLOW-03 employee cannot self-approve own pending expense', async ({ auth, expenses, approvals }) => {
    const { employee, expense } = await pendingExpense(auth, expenses, 'employee2');
    const response = await approvals.approve(employee.accessToken, expense.id);
    expect(response.status()).toBe(403);
    const detail = await expenses.get(employee.accessToken, expense.id);
    expect((await detail.json()).status).toBe('PendingApproval');
  });

  test('R2-FLOW-04 client cannot overwrite owner, status or expense number', async ({ auth, expenses }) => {
    const employee = await auth.loginAs('employee2');
    const payload = new ExpenseBuilder().withAmount(10).build();
    payload.ownerId = crypto.randomUUID();
    payload.userId = crypto.randomUUID();
    payload.status = 'Approved';
    payload.expenseNumber = 'EXP-ROOT-0001';
    const response = await expenses.create(employee.accessToken, payload);
    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    expect(body.status).toBe('AutoApproved');
    expect(body.expenseNumber).not.toBe('EXP-ROOT-0001');
    expect(body.ownerId ?? body.userId).not.toBe(payload.ownerId);
  });

  for (const [id, body] of [
    ['R2-FLOW-05', null],
    ['R2-FLOW-06', []],
    ['R2-FLOW-07', 'not-an-object'],
  ] as const) {
    test(`${id} unexpected JSON shape is a client error, never 5xx`, async ({ auth, http }) => {
      const employee = await auth.loginAs('employee1');
      const response = await http.post('/api/v1/expenses', body, employee.accessToken);
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  }

  test('R2-FLOW-08 wrong method cannot mutate approval state', async ({ auth, expenses, http }) => {
    const { expense } = await pendingExpense(auth, expenses);
    const manager = await auth.loginAs('manager1');
    const detailBefore = await (await expenses.get(manager.accessToken, expense.id)).json();
    const historyBefore = await (await expenses.history(manager.accessToken, expense.id)).json();
    const response = await http.post(`/api/v1/approvals/${expense.id}/approve`, {}, manager.accessToken);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const detailAfterResponse = await expenses.get(manager.accessToken, expense.id);
    expect(detailAfterResponse.status()).toBe(200);
    const detailAfter = await detailAfterResponse.json();
    const historyAfter = await (await expenses.history(manager.accessToken, expense.id)).json();
    expect(detailAfter.status).toBe(detailBefore.status);
    expect(historyAfter).toHaveLength(historyBefore.length);
  });

  test('R2-FLOW-09 malformed and encoded route identifiers do not produce 5xx', async ({ auth, http }) => {
    const manager = await auth.loginAs('manager1');
    for (const id of ['null', 'undefined', '%2e%2e', '%00']) {
      const response = await http.put(`/api/v1/approvals/${id}/approve`, {}, manager.accessToken);
      expect(response.status(), `route id=${id}`).toBeGreaterThanOrEqual(400);
      expect(response.status(), `route id=${id}`).toBeLessThan(500);
    }
  });

  test('R2-FLOW-10 API logout follows documented stateless-token behavior', async ({ auth, http }) => {
    const employee = await auth.loginAs('employee1');
    expect((await auth.logout(employee.accessToken)).status()).toBe(204);
    const direct = await http.get('/api/v1/expenses?page=1&pageSize=1', employee.accessToken);
    // Annex G states the server does not retain sessions; the web client removes its cookie.
    expect(direct.status()).toBe(200);
  });
});
