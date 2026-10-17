import { expect, test } from '../fixtures.js';
import type { Page } from '@playwright/test';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { environment } from '../../src/config/environment.js';
import { LoginPage } from '../../src/pages/login.page.js';

test.use({ video: 'on', screenshot: 'on' });

async function showCursor(page: Page) {
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.id = 'evidence-cursor';
    dot.style.cssText = 'position:fixed;width:24px;height:24px;border:4px solid red;border-radius:50%;background:#fde04799;z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%)';
    document.body.append(dot);
    addEventListener('pointermove', e => { dot.style.left = `${e.clientX}px`; dot.style.top = `${e.clientY}px`; });
  }));
}

async function evidencePanel(page: Page, title: string, actual: string) {
  await page.evaluate(({ title, actual }: { title: string; actual: string }) => {
    const panel = document.createElement('section');
    panel.style.cssText = 'position:fixed;left:260px;top:90px;width:760px;padding:28px;background:white;border:5px solid #dc2626;border-radius:16px;z-index:999999;box-shadow:0 20px 60px #0005;font:20px system-ui;color:#111827';
    panel.innerHTML = `<h1 style="font-size:28px;color:#b91c1c">${title}</h1><p><b>Regla:</b> un gasto final no puede volver a decidirse.</p><p><b>Esperado:</b> HTTP 4xx y estado sin cambios.</p><p><b>Actual:</b> ${actual}</p>`;
    document.body.append(panel);
  }, { title, actual });
  await page.mouse.move(640, 290);
  await page.waitForTimeout(1200);
}

async function loginManager(page: Page) {
  await showCursor(page);
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email('manager1'), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

test('R2-FLOW-01-EVIDENCE repeated approval is rejected', async ({ page, auth, expenses, approvals }, testInfo) => {
  const employee = await auth.loginAs('employee1');
  const created = await (await expenses.create(employee.accessToken, new ExpenseBuilder().withAmount(125).build())).json();
  const manager = await auth.loginAs('manager1');
  await approvals.approve(manager.accessToken, created.id);
  const detailBefore = await (await expenses.get(manager.accessToken, created.id)).json();
  const historyBefore = await (await expenses.history(manager.accessToken, created.id)).json();
  const second = await approvals.approve(manager.accessToken, created.id);
  const detailAfter = await (await expenses.get(manager.accessToken, created.id)).json();
  const historyAfter = await (await expenses.history(manager.accessToken, created.id)).json();
  await loginManager(page);
  await page.goto('/approvals');
  await evidencePanel(page, 'R2-FLOW-01 · Aprobación repetida aceptada', `segunda aprobación respondió HTTP ${second.status()}.`);
  await page.screenshot({ path: testInfo.outputPath('R2-FLOW-01.png'), fullPage: true });
  expect(second.status()).toBeGreaterThanOrEqual(400);
  expect(second.status()).toBeLessThan(500);
  expect(detailAfter.status).toBe(detailBefore.status);
  expect(historyAfter).toHaveLength(historyBefore.length);
});

test('R2-FLOW-02-EVIDENCE rejected expense cannot become approved', async ({ page, auth, expenses, approvals }, testInfo) => {
  const employee = await auth.loginAs('employee1');
  const created = await (await expenses.create(employee.accessToken, new ExpenseBuilder().withAmount(125).build())).json();
  const manager = await auth.loginAs('manager1');
  await approvals.reject(manager.accessToken, created.id, 'R2 evidence rejection');
  const detailBefore = await (await expenses.get(manager.accessToken, created.id)).json();
  const historyBefore = await (await expenses.history(manager.accessToken, created.id)).json();
  const approve = await approvals.approve(manager.accessToken, created.id);
  const detailAfter = await (await expenses.get(manager.accessToken, created.id)).json();
  const historyAfter = await (await expenses.history(manager.accessToken, created.id)).json();
  await loginManager(page);
  await page.goto('/approvals');
  await evidencePanel(page, 'R2-FLOW-02 · Rechazado vuelve a Approved', `aprobación posterior respondió HTTP ${approve.status()}.`);
  await page.screenshot({ path: testInfo.outputPath('R2-FLOW-02.png'), fullPage: true });
  expect(approve.status()).toBeGreaterThanOrEqual(400);
  expect(approve.status()).toBeLessThan(500);
  expect(detailAfter.status).toBe(detailBefore.status);
  expect(historyAfter).toHaveLength(historyBefore.length);
});
