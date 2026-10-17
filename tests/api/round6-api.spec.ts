import { test, expect } from '../fixtures.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import type { ApprovalService } from '../../src/api/approval-service.js';
import type { AuthService } from '../../src/api/auth-service.js';
import type { ExpenseService } from '../../src/api/expense-service.js';
import type { HttpClient } from '../../src/api/http-client.js';
import type { TestRole } from '../../src/config/environment.js';

const receipt = 'https://example.invalid/qa-receipt.pdf';
const marker = (label: string) => `R6 ${label} ${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

async function register(auth: AuthService, expenses: ExpenseService, role: TestRole, amount: number, label: string) {
  const session = await auth.loginAs(role);
  const response = await expenses.create(session.accessToken, new ExpenseBuilder().withDescription(marker(label)).withAmount(amount).withReceipt(receipt).build());
  expect(response.status(), await response.text()).toBe(201);
  return { token: session.accessToken, expense: await response.json() };
}

async function decided(auth: AuthService, expenses: ExpenseService, approvals: ApprovalService, decision: 'approve' | 'reject') {
  const created = await register(auth, expenses, 'employee1', 125, decision);
  const manager = await auth.loginAs('manager1');
  const response = decision === 'approve'
    ? await approvals.approve(manager.accessToken, created.expense.id)
    : await approvals.reject(manager.accessToken, created.expense.id, 'R6 rechazo controlado');
  expect(response.status()).toBe(200);
  return { ...created, managerToken: manager.accessToken };
}

async function queue(http: HttpClient, token: string): Promise<{ id: string; status: string }[]> {
  const body = await (await http.get('/api/v1/approvals/pending?pageSize=200', token)).json();
  return Array.isArray(body) ? body : body.items;
}

async function ownExpenses(expenses: ExpenseService, token: string) {
  const all: { amount: number; date: string; status: string }[] = [];
  for (let page = 1; ; page++) {
    const body = await (await expenses.list(token, `?page=${page}&pageSize=100`)).json();
    all.push(...body.items);
    if (all.length >= body.totalCount || body.items.length === 0) return all;
  }
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

test.describe('Round 6 · annex rules not covered before', () => {
  test('R6-API-01 expense number is not reused after deleting a pending expense (RN-07)', async ({ auth, expenses }) => {
    const first = await register(auth, expenses, 'employee2', 125, 'rn07-a');
    expect((await expenses.remove(first.token, first.expense.id)).status()).toBe(204);
    const second = await register(auth, expenses, 'employee2', 125, 'rn07-b');
    expect(second.expense.expenseNumber).not.toBe(first.expense.expenseNumber);
  });

  test('R6-API-02 automatic decision names the rule that produced it (RN-31)', async ({ auth, expenses }) => {
    const created = await register(auth, expenses, 'employee1', 10, 'rn31');
    expect(created.expense.status).toBe('AutoApproved');
    const history = await (await expenses.history(created.token, created.expense.id)).json();
    expect(history[0].performedBy).toBe('Policy Engine');
    expect(history[0].notes ?? '').toContain('Auto-approve under $50');
  });

  test('R6-API-03 an AutoApproved expense cannot be approved or rejected (Anexo F §3)', async ({ auth, expenses, approvals }) => {
    const created = await register(auth, expenses, 'employee1', 10, 'auto-final');
    const finance = await auth.loginAs('finance');
    for (const response of [await approvals.approve(finance.accessToken, created.expense.id), await approvals.reject(finance.accessToken, created.expense.id, 'R6 rechazo de estado final')]) {
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    }
    expect((await (await expenses.get(created.token, created.expense.id)).json()).status).toBe('AutoApproved');
  });

  test('R6-API-04 an Approved expense cannot be rejected afterwards (RN-40)', async ({ auth, expenses, approvals }) => {
    const approved = await decided(auth, expenses, approvals, 'approve');
    const response = await approvals.reject(approved.managerToken, approved.expense.id, 'R6 rechazo posterior');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    expect((await (await expenses.get(approved.token, approved.expense.id)).json()).status).toBe('Approved');
  });

  for (const decision of ['approve', 'reject'] as const) {
    test(`R6-API-05${decision === 'approve' ? 'a' : 'b'} an ${decision === 'approve' ? 'Approved' : 'Rejected'} expense cannot be deleted (RN-52)`, async ({ auth, expenses, approvals }) => {
      const final = await decided(auth, expenses, approvals, decision);
      const response = await expenses.remove(final.token, final.expense.id);
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
      expect((await expenses.get(final.token, final.expense.id)).status()).toBe(200);
    });
  }

  test('R6-API-06 Finance queue excludes its own pending expense and self-approval is forbidden (Anexo G §2.2)', async ({ auth, expenses, approvals, http }) => {
    const own = await register(auth, expenses, 'finance', 125, 'finance-own');
    expect(own.expense.status).toBe('PendingApproval');
    expect((await queue(http, own.token)).map(item => item.id)).not.toContain(own.expense.id);
    expect((await approvals.approve(own.token, own.expense.id)).status()).toBe(403);
  });

  test('R6-API-07 a manager own pending expense goes to Finance, not to the manager queue (Anexo G §2.2)', async ({ auth, expenses, http }) => {
    const own = await register(auth, expenses, 'manager1', 125, 'manager-own');
    const finance = await auth.loginAs('finance');
    expect((await queue(http, own.token)).map(item => item.id)).not.toContain(own.expense.id);
    expect((await queue(http, finance.accessToken)).map(item => item.id)).toContain(own.expense.id);
  });

  test('R6-API-08 default expense list is page 1 of 20 ordered by date descending (Anexo C §5)', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee1');
    const body = await (await expenses.list(session.accessToken)).json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    const dates = body.items.map((item: { date: string }) => item.date);
    expect(dates.length).toBeGreaterThan(0);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  test('R6-API-09 receipt link longer than 500 characters is rejected with 400 (RN-04, RN-06)', async ({ auth, expenses }) => {
    const session = await auth.loginAs('employee3');
    const url = `https://example.invalid/${'r'.repeat(480)}.pdf`;
    const response = await expenses.create(session.accessToken, new ExpenseBuilder().withDescription(marker('rn04-receipt')).withAmount(10).withReceipt(url).build());
    expect(url.length).toBeGreaterThan(500);
    expect(response.status(), await response.text()).toBe(400);
  });

  test('R6-API-10 approval keeps the optional comment in the audit history (RN-41, RN-50)', async ({ auth, expenses, http }) => {
    const created = await register(auth, expenses, 'employee1', 125, 'rn41');
    const manager = await auth.loginAs('manager1');
    const comment = 'R6 aprobado con comentario';
    const response = await http.put(`/api/v1/approvals/${created.expense.id}/approve`, { comment }, manager.accessToken);
    expect(response.status()).toBe(200);
    const history = await (await expenses.history(manager.accessToken, created.expense.id)).json();
    expect(history[0].toStatus).toBe('Approved');
    expect(history[0].notes).toBe(comment);
  });

  test('R6-API-11 dashboard month spend excludes rejected expenses (RN-61)', async ({ auth, expenses, analytics }) => {
    const session = await auth.loginAs('employee1');
    const dashboard = await (await analytics.dashboard(session.accessToken)).json();
    const today = new Date().toISOString().slice(0, 10);
    const month = (await ownExpenses(expenses, session.accessToken)).filter(e => e.date.startsWith(today.slice(0, 7)) && e.date <= today);
    expect(month.some(e => e.status === 'Rejected')).toBe(true);
    expect(dashboard.spendThisMonth).toBeCloseTo(roundMoney(month.filter(e => e.status !== 'Rejected').reduce((sum, e) => sum + e.amount, 0)), 2);
  });

  test('R6-API-12 dashboard month spend ignores future-dated expenses (RN-61)', async ({ auth, expenses, analytics }) => {
    const session = await auth.loginAs('employee3');
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    test.skip(lastDay <= now.toISOString().slice(0, 10), 'No future day left in the current month');
    const before = (await (await analytics.dashboard(session.accessToken)).json()).spendThisMonth;
    const response = await expenses.create(session.accessToken, new ExpenseBuilder().withDescription(marker('future')).withAmount(10).withDate(lastDay).build());
    expect(response.status(), await response.text()).toBe(201);
    const after = (await (await analytics.dashboard(session.accessToken)).json()).spendThisMonth;
    expect(roundMoney(after - before)).toBe(0);
  });

  test('R6-API-13 unsupported receipt type error lists every accepted type (RN-21, RN-22)', async ({ auth, receipts }) => {
    const session = await auth.loginAs('employee2');
    const response = await receipts.extract(session.accessToken, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a receipt') });
    expect(response.status()).toBe(400);
    const message = await response.text();
    for (const type of ['JPG', 'PNG', 'GIF', 'WEBP', 'PDF']) expect(message.toUpperCase(), type).toContain(type);
  });
});
