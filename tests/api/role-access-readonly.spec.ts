import { expect, test } from '../fixtures.js';
import { TestRole } from '../../src/config/environment.js';

const permissionMatrix: Array<{
  account: TestRole;
  expenses: number;
  dashboard: number;
  reports: number;
  policies: number;
  approvals: number;
  categories: number;
}> = [
  { account: 'employee1', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 403, categories: 200 },
  { account: 'employee2', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 403, categories: 200 },
  { account: 'employee3', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 403, categories: 200 },
  { account: 'nomanager', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 403, categories: 200 },
  { account: 'manager1', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 200, categories: 200 },
  { account: 'manager2', expenses: 200, dashboard: 200, reports: 200, policies: 403, approvals: 200, categories: 200 },
  { account: 'finance', expenses: 200, dashboard: 200, reports: 200, policies: 200, approvals: 200, categories: 200 },
  { account: 'admin', expenses: 200, dashboard: 200, reports: 200, policies: 200, approvals: 403, categories: 200 },
];

test('RBAC-RO-01 role read access matches the documented resource matrix', async ({ auth, expenses, analytics, policies, approvals, http }) => {
  const observed: Array<Record<string, number | string>> = [];

  for (const expected of permissionMatrix) {
    const session = await auth.loginAs(expected.account);
    const statuses = {
      expenses: (await expenses.list(session.accessToken)).status(),
      dashboard: (await analytics.dashboard(session.accessToken)).status(),
      reports: (await analytics.reports(session.accessToken)).status(),
      policies: (await policies.list(session.accessToken)).status(),
      approvals: (await approvals.pending(session.accessToken)).status(),
      categories: (await http.get('/api/v1/categories', session.accessToken)).status(),
    };

    observed.push({ account: expected.account, ...statuses });
    expect(statuses, `read permissions for ${expected.account}`).toEqual({
      expenses: expected.expenses,
      dashboard: expected.dashboard,
      reports: expected.reports,
      policies: expected.policies,
      approvals: expected.approvals,
      categories: expected.categories,
    });
  }

  // Keep emitted evidence limited to test-account aliases and HTTP status codes.
  console.log(`[ACCESS_MATRIX_SANITIZED] ${JSON.stringify(observed)}`);
});
