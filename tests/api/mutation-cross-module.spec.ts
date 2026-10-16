import { environment } from '../../src/config/environment.js';
import { expectedStatus } from '../../src/data/api-mutants.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { expect, test } from '../fixtures.js';

const assertKilled = async (id: string, response: { status(): number; text(): Promise<string> }) => {
  const body = await response.text();
  expect(response.status(), `${id} survived with ${response.status()}: ${body}`).toBe(expectedStatus(id));
  expect(response.status(), `${id} caused an internal server error: ${body}`).toBeLessThan(500);
};

test.describe('Cross-module black-box API mutation', () => {
  for (const scenario of [
    { id: 'MUT-AUTH-01', body: { password: 'irrelevant' } },
    { id: 'MUT-AUTH-02', body: { email: environment.email('employee1') } },
    { id: 'MUT-AUTH-03', body: { email: [environment.email('employee1')], password: 'irrelevant' } },
  ]) {
    test(`${scenario.id} rejects a structurally mutated login`, async ({ http }) => {
      await assertKilled(scenario.id, await http.post('/api/v1/auth/login', scenario.body));
    });
  }

  test('MUT-AUTH-04 does not normalize a credential identifier silently', async ({ http }) => {
    await assertKilled('MUT-AUTH-04', await http.post('/api/v1/auth/login', {
      email: ` ${environment.email('employee1')} `,
      password: environment.seedPassword(),
    }));
  });

  for (const scenario of [
    { id: 'MUT-EXPQ-01', query: '?page=0' },
    { id: 'MUT-EXPQ-02', query: '?page=-1' },
    { id: 'MUT-EXPQ-03', query: '?page=NaN' },
    { id: 'MUT-EXPQ-04', query: '?pageSize=0' },
    { id: 'MUT-EXPQ-05', query: '?pageSize=101' },
    { id: 'MUT-EXPQ-06', query: '?status=Deleted' },
    { id: 'MUT-EXPQ-07', query: '?categoryId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { id: 'MUT-EXPQ-08', query: '?search=%00%0A%0D' },
  ]) {
    test(`${scenario.id} rejects one invalid expense query mutation`, async ({ auth, expenses }) => {
      const finance = await auth.loginAs('finance');
      await assertKilled(scenario.id, await expenses.list(finance.accessToken, scenario.query));
    });
  }

  test('MUT-APR-01 rejects malformed approval identifiers at the boundary', async ({ auth, http }) => {
    const manager = await auth.loginAs('manager1');
    await assertKilled('MUT-APR-01', await http.put('/api/v1/approvals/not-a-uuid/approve', undefined, manager.accessToken));
  });

  for (const scenario of [
    { id: 'MUT-POL-01', role: 'finance' as const },
    { id: 'MUT-POL-02', role: 'employee1' as const },
  ]) {
    test(`${scenario.id} enforces policy write authorization`, async ({ auth, policies }) => {
      const actor = await auth.loginAs(scenario.role);
      await assertKilled(scenario.id, await policies.create(actor.accessToken, {
        name: `${scenario.id} ${Date.now()}`, action: 'AutoApprove', maxAmount: 1,
        requiresReceipt: false, isActive: false,
      }));
    });
  }

  for (const scenario of [
    { id: 'MUT-POL-03', mutation: { action: 'AutoApprove', requiresReceipt: 'false', isActive: false } },
    { id: 'MUT-POL-04', mutation: { requiresReceipt: false, isActive: false } },
  ]) {
    test(`${scenario.id} rejects one policy contract mutation`, async ({ auth, policies }) => {
      const admin = await auth.loginAs('admin');
      const response = await policies.create(admin.accessToken, {
        name: `${scenario.id} ${Date.now()}`, maxAmount: 1, ...scenario.mutation,
      });
      const copy = await response.body();
      let createdId: string | undefined;
      if (response.status() === 201) {
        try { createdId = JSON.parse(copy.toString()).id; } catch { /* assertion keeps evidence */ }
      }
      try {
        await assertKilled(scenario.id, {
          status: () => response.status(),
          text: async () => copy.toString(),
        });
      } finally {
        if (createdId) await policies.remove(admin.accessToken, createdId);
      }
    });
  }

  for (const scenario of [
    { id: 'MUT-REP-01', query: '?dateFrom=2026-10-31&dateTo=2026-10-01' },
    { id: 'MUT-REP-02', query: '?categoryId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { id: 'MUT-REP-03', query: '?status=Deleted' },
  ]) {
    test(`${scenario.id} rejects one invalid reporting filter`, async ({ auth, analytics }) => {
      const finance = await auth.loginAs('finance');
      await assertKilled(scenario.id, await analytics.reports(finance.accessToken, scenario.query));
    });
  }

  for (const scenario of [
    { id: 'MUT-REC-01', file: { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) } },
    { id: 'MUT-REC-02', file: { name: 'disguised.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ executable payload') } },
  ]) {
    test(`${scenario.id} validates receipt content rather than metadata only`, async ({ auth, receipts }) => {
      const employee = await auth.loginAs('employee2');
      await assertKilled(scenario.id, await receipts.extract(employee.accessToken, scenario.file));
    });
  }

  for (const scenario of [
    { id: 'MUT-APR-02', reason: undefined },
    { id: 'MUT-APR-03', reason: '   ' },
  ]) {
    test(`${scenario.id} validates rejection reason before changing state`, async ({ auth, expenses, http }) => {
      const employee = await auth.loginAs('employee3');
      const created = await expenses.create(employee.accessToken, new ExpenseBuilder()
        .withDescription(`${scenario.id} controlled pending expense ${Date.now()}`)
        .withAmount(60)
        .withReceipt('https://example.invalid/controlled-receipt.pdf')
        .build());
      expect(created.status(), await created.text()).toBe(201);
      const expense = await created.json() as { id: string };
      const manager = await auth.loginAs('manager2');
      const payload = scenario.reason === undefined ? {} : { reason: scenario.reason };
      await assertKilled(scenario.id, await http.put(`/api/v1/approvals/${expense.id}/reject`, payload, manager.accessToken));
    });
  }
});
