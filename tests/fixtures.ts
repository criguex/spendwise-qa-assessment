import { test as base } from '@playwright/test';
import { ApprovalService } from '../src/api/approval-service.js';
import { AuthService } from '../src/api/auth-service.js';
import { ExpenseService } from '../src/api/expense-service.js';
import { HttpClient } from '../src/api/http-client.js';
import { PolicyService } from '../src/api/policy-service.js';

type Services = {
  http: HttpClient;
  auth: AuthService;
  expenses: ExpenseService;
  approvals: ApprovalService;
  policies: PolicyService;
};

export const test = base.extend<Services>({
  http: async ({}, use) => {
    const http = new HttpClient();
    await http.connect();
    await use(http);
    await http.dispose();
  },
  auth: async ({ http }, use) => use(new AuthService(http)),
  expenses: async ({ http }, use) => use(new ExpenseService(http)),
  approvals: async ({ http }, use) => use(new ApprovalService(http)),
  policies: async ({ http }, use) => use(new PolicyService(http)),
});

export { expect } from '@playwright/test';
