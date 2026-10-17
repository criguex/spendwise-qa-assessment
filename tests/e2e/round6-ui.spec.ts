import { mkdir, readFile } from 'node:fs/promises';
import { expect, Page, TestInfo } from '@playwright/test';
import { test } from '../fixtures.js';
import { environment, TestRole } from '../../src/config/environment.js';
import { ExpenseBuilder } from '../../src/data/expense-builder.js';
import { LoginPage } from '../../src/pages/login.page.js';

type Expense = {
  id: string; expenseNumber: string; description: string; amount: number; date: string;
  status: string; receiptUrl: string | null;
};

const evidenceDir = 'evidence/round6/ui';
const expectedById: Record<string, string> = {
  'R6-UI-01': 'todas las metricas del Dashboard derivan de los gastos reales del alcance y periodo',
  'R6-UI-02': 'todas las metricas de Reports coinciden con su respuesta API y excluyen rechazados',
  'R6-UI-03': 'las metricas no son constantes entre usuarios con poblaciones distintas',
  'R6-UI-04': 'el mes actual excluye gastos futuros y rechazados',
  'R6-UI-05': 'el CSV conserva una fila y el mismo numero de columnas con coma, comillas y salto de linea',
  'R6-UI-06': 'Export CSV de My Expenses descarga un archivo CSV no vacio',
  'R6-UI-07': 'My Expenses explica el error 500 y no presenta un estado vacio',
  'R6-UI-08': 'Approvals explica el error 500 y no presenta una cola vacia',
  'R6-UI-09': 'Reports explica el error 500 y no presenta un reporte vacio',
  'R6-UI-10': 'Dashboard explica el error 500 y no presenta metricas vacias',
  'R6-UI-11': 'todos los botones de icono de Approvals tienen nombre accesible',
  'R6-UI-12': 'todos los botones de icono de Policy Engine tienen nombre accesible',
  'R6-UI-13': 'el toggle de password y las acciones de filas tienen nombre accesible',
  'R6-UI-14': 'login y menu exponen los data-testid, identidad, ambos roles y Sign out',
  'R6-UI-15': 'la sesion reside en una cookie httpOnly que document.cookie no puede leer',
  'R6-UI-16': 'employee ve access-denied al abrir Approvals y Policy Engine',
  'R6-UI-17': 'login comunica el estado en curso y las credenciales invalidas',
  'R6-UI-18': 'al perder la cookie de sesion aparece login-session-expired',
  'R6-UI-19': 'Policy Engine muestra maxAmount 0 como limite cero, no como sin limite',
  'R6-UI-20': 'el detalle muestra el historial y Ver recibo apunta al recibo del gasto',
};

function idOf(info: TestInfo): string {
  return info.title.match(/R6-UI-\d+/)?.[0] ?? 'R6-UI-UNKNOWN';
}

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const id = idOf(info);
  const real = (info.error?.message ?? `estado ${info.status}`)
    .replace(/\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g, '')
    .replace(/\s+/g, ' ').slice(0, 420);
  try {
    await mkdir(evidenceDir, { recursive: true });
    await page.evaluate(({ expected, realText }) => {
      document.querySelector('[data-r6-evidence-banner]')?.remove();
      const banner = document.createElement('div');
      banner.dataset.r6EvidenceBanner = 'true';
      banner.textContent = `ESPERADO: ${expected} / REAL: ${realText}`;
      Object.assign(banner.style, {
        position: 'fixed', inset: '0 0 auto 0', zIndex: '2147483647', background: '#b91c1c',
        color: 'white', padding: '16px 20px', font: '700 16px/1.4 sans-serif', whiteSpace: 'pre-wrap',
        boxShadow: '0 3px 10px rgba(0,0,0,.45)',
      });
      document.documentElement.appendChild(banner);
    }, { expected: expectedById[id] ?? 'cumplimiento de la regla', realText: real });
    await page.screenshot({ path: `${evidenceDir}/${id}.png`, fullPage: true });
  } catch { /* Evidence must never replace the original product assertion. */ }
});

async function signIn(page: Page, role: TestRole): Promise<void> {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(environment.email(role), environment.seedPassword());
  await expect(page.getByTestId('user-menu')).toBeVisible();
}

async function openAndWait(page: Page, path: string, apiPath: string) {
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes(apiPath) && r.request().method() === 'GET'),
    page.goto(path),
  ]);
  return response;
}

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
}).format(value);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSV termino dentro de un campo entre comillas');
  if (field !== '' || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

async function assertIconButtonsNamed(page: Page, requireOne = true): Promise<void> {
  const icons = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasNotText: /\S/ });
  const count = await icons.count();
  if (requireOne) expect(count, 'La pantalla debe presentar al menos una accion de icono aplicable').toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await expect(icons.nth(i)).toHaveAccessibleName(/\S/);
}

test('R6-UI-01 RN-62 Dashboard: metricas reales para employee, manager y finance', async ({ page, auth, analytics }) => {
  const signatures = new Set<string>();
  const resolutionValues = new Set<string>();
  for (const role of ['employee1', 'manager1', 'finance'] as const) {
    const session = await auth.loginAs(role);
    const [summaryResponse, reportResponse] = await Promise.all([
      analytics.dashboard(session.accessToken), analytics.reports(session.accessToken),
    ]);
    expect(summaryResponse.status()).toBe(200);
    expect(reportResponse.status()).toBe(200);
    const summary = await summaryResponse.json();
    const report = await reportResponse.json() as { expenses: Expense[] };
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const period = report.expenses.filter(e => e.date.startsWith(month) && e.date <= today);
    const spendable = period.filter(e => e.status !== 'Rejected');
    const auto = period.filter(e => e.status === 'AutoApproved').length;
    const expectedSpend = spendable.reduce((sum, e) => sum + e.amount, 0);
    const expectedPending = report.expenses.filter(e => e.status === 'PendingApproval').length;
    const expectedRate = period.length ? Math.round(auto / period.length * 100) : 0;
    expect.soft(summary.spendThisMonth, `${role}: spendThisMonth`).toBeCloseTo(expectedSpend, 2);
    expect.soft(summary.pendingCount, `${role}: pendingCount`).toBe(expectedPending);
    expect.soft(summary.autoApprovedCount, `${role}: autoApprovedCount`).toBe(auto);
    expect.soft(summary.autoApprovedTotal, `${role}: denominador de auto-aprobacion`).toBe(period.length);

    await signIn(page, role);
    const response = await openAndWait(page, '/dashboard', '/api/v1/dashboard/summary');
    expect(response.status()).toBe(200);
    const main = page.locator('main');
    const ui = await main.innerText();
    expect.soft(ui, `${role}: UI spend`).toContain(money(expectedSpend));
    expect.soft(ui, `${role}: UI pending`).toMatch(new RegExp(`\\b${expectedPending}\\b`));
    expect.soft(ui, `${role}: UI auto aprobados`).toContain(`${auto} / ${period.length}`);
    expect.soft(ui, `${role}: UI tasa`).toContain(`${expectedRate}% rate this month`);
    const resolution = ui.match(/Avg\. resolution:\s*([\d.]+)\s*days/i)?.[1];
    expect.soft(resolution, `${role}: debe mostrarse la metrica de resolucion`).toBeDefined();
    if (resolution) resolutionValues.add(resolution);
    expect.soft(Object.keys(summary), `${role}: Avg. resolution debe tener fuente en dashboard/summary`)
      .toEqual(expect.arrayContaining([expect.stringMatching(/resolution|average.*(?:time|days)/i)]));
    const trendTotal = summary.spendTrend.reduce((sum: number, point: { amount: number }) => sum + point.amount, 0);
    expect.soft(ui, `${role}: UI tendencia`).toContain(money(trendTotal));
    signatures.add([summary.spendThisMonth, summary.pendingCount, auto, period.length, expectedRate].join('|'));
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  }
  expect(signatures.size, 'Las metricas no deben ser un bloque fijo comun a los tres alcances').toBe(3);
  expect(resolutionValues.size, 'Avg. resolution no debe ser la misma constante para tres poblaciones distintas').toBeGreaterThan(1);
});

test('R6-UI-02 RN-62 Reports: totales, cantidad, promedio y categorias derivan de gastos', async ({ page, auth, analytics }) => {
  const session = await auth.loginAs('finance');
  const api = await analytics.reports(session.accessToken);
  expect(api.status()).toBe(200);
  const report = await api.json();
  const included = (report.expenses as Expense[]).filter(e => e.status !== 'Rejected');
  const total = included.reduce((sum, e) => sum + e.amount, 0);
  const average = included.length ? total / included.length : 0;
  expect.soft(report.totalAmount).toBeCloseTo(total, 2);
  expect.soft(report.totalCount).toBe(included.length);
  expect.soft(report.averageAmount).toBeCloseTo(average, 2);
  expect.soft(report.byCategory.reduce((sum: number, r: { total: number }) => sum + r.total, 0)).toBeCloseTo(total, 2);

  await signIn(page, 'finance');
  const response = await openAndWait(page, '/reports', '/api/v1/reports');
  expect(response.status()).toBe(200);
  const uiReport = await response.json();
  const main = page.locator('main');
  await expect(main).toContainText(money(uiReport.totalAmount));
  await expect(main).toContainText(new RegExp(`\\b${uiReport.totalCount}\\b`));
  await expect(main).toContainText(money(uiReport.averageAmount));
  for (const category of uiReport.byCategory) {
    await expect(main).toContainText(category.categoryName);
  }
});

test('R6-UI-03 RN-62 receipt/OCR area does not present simulated metrics', async ({ page, auth, analytics, expenses }, testInfo) => {
  await signIn(page, 'employee1');
  await page.goto('/expenses/new');
  const ocrText = await page.locator('main').innerText();
  const displayed = ocrText.match(/(?:~?\d+(?:\.\d+)?\s*(?:seconds?|minutes?)|\d+(?:\.\d+)?%)/gi) ?? [];
  const employee = await auth.loginAs('employee1');
  const [dashboard, report, list] = await Promise.all([
    analytics.dashboard(employee.accessToken), analytics.reports(employee.accessToken), expenses.list(employee.accessToken),
  ]);
  const sources = [await dashboard.json(), await report.json(), await list.json()];
  const sourceKeys: string[] = [];
  const collectKeys = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) { sourceKeys.push(key); collectKeys(child); }
  };
  collectKeys(sources);
  testInfo.annotations.push({ type: 'observacion', description: displayed.length ? displayed.join(', ') : 'El area OCR visible no presenta metricas.' });
  if (displayed.some(metric => metric.includes('%'))) {
    expect(sourceKeys, 'La precision OCR visible debe tener un dato fuente identificable en las APIs autoritativas')
      .toEqual(expect.arrayContaining([expect.stringMatching(/ocr.*(?:accuracy|precision)|(?:accuracy|precision).*ocr/i)]));
  }
  if (displayed.some(metric => /seconds?|minutes?/i.test(metric))) {
    expect(sourceKeys, 'El tiempo medio OCR visible debe tener un dato fuente identificable en las APIs autoritativas')
      .toEqual(expect.arrayContaining([expect.stringMatching(/ocr.*(?:time|duration|seconds)|(?:time|duration|seconds).*ocr/i)]));
  }
});

test('R6-UI-04 RN-61 Dashboard no suma un gasto futuro del mes', async ({ page, auth, analytics, expenses }) => {
  const employee = await auth.loginAs('employee2');
  const before = await (await analytics.dashboard(employee.accessToken)).json();
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const futureDay = Math.max(now.getUTCDate() + 1, Math.min(30, lastDay));
  expect(futureDay, 'El entorno debe ejecutarse antes del ultimo dia para probar una fecha futura del mes').toBeLessThanOrEqual(lastDay);
  const futureDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(futureDay).padStart(2, '0')}`;
  expect(futureDate > now.toISOString().slice(0, 10)).toBeTruthy();
  const created = await expenses.create(employee.accessToken, new ExpenseBuilder()
    .withDescription(`R6-future-${Date.now()}`).withAmount(17.31).withDate(futureDate).build());
  expect(created.status()).toBe(201);
  const after = await (await analytics.dashboard(employee.accessToken)).json();
  expect(after.spendThisMonth).toBeCloseTo(before.spendThisMonth, 2);

  await signIn(page, 'employee2');
  const response = await openAndWait(page, '/dashboard', '/api/v1/dashboard/summary');
  expect(response.status()).toBe(200);
  await expect(page.locator('main')).toContainText(money(before.spendThisMonth));
});

test('R6-UI-05 RN-63 Reports exporta CSV RFC 4180 integro con texto complejo', async ({ page, auth, expenses }) => {
  const employee = await auth.loginAs('employee2');
  const description = `R6-comma, quote " and\nnewline-${Date.now()}`;
  const created = await expenses.create(employee.accessToken, new ExpenseBuilder().withDescription(description).withAmount(12.34).build());
  expect(created.status()).toBe(201);
  await signIn(page, 'employee2');
  await openAndWait(page, '/reports', '/api/v1/reports');
  const downloadPromise = page.waitForEvent('download', { timeout: 7_000 });
  await page.getByRole('button', { name: /export csv/i }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const rows = parseCsv(await readFile(path!, 'utf8'));
  expect(rows.length).toBeGreaterThan(1);
  const columnCount = rows[0]!.length;
  for (const row of rows) expect(row.length, `Fila CSV desigual: ${JSON.stringify(row)}`).toBe(columnCount);
  expect(rows.some(row => row.includes(description))).toBeTruthy();
});

test('R6-UI-06 RN-63 Export CSV de My Expenses descarga archivo', async ({ page }) => {
  await signIn(page, 'employee1');
  await openAndWait(page, '/expenses', '/api/v1/expenses');
  const downloadPromise = page.waitForEvent('download', { timeout: 7_000 });
  await page.getByRole('button', { name: /export csv/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  const path = await download.path();
  expect(path).not.toBeNull();
  expect((await readFile(path!, 'utf8')).trim().length).toBeGreaterThan(0);
});

for (const scenario of [
  { id: 'R6-UI-07', role: 'employee1', path: '/expenses', api: '/api/v1/expenses', empty: /(?:0 expenses|no expenses)/i },
  { id: 'R6-UI-08', role: 'finance', path: '/approvals', api: '/api/v1/approvals/pending', empty: /(?:0 expenses|0\s+total in queue|no expenses)/i },
  { id: 'R6-UI-09', role: 'finance', path: '/reports', api: '/api/v1/reports', empty: /(?:0 expenses|no expenses)/i },
  { id: 'R6-UI-10', role: 'employee1', path: '/dashboard', api: '/api/v1/dashboard/summary', empty: /(?:no recent activity|\$0\.00\s+pending\s+0)/i },
] as const) {
  test(`${scenario.id} RN-70 ${scenario.path} diferencia error 500 de estado vacio`, async ({ page }) => {
    await signIn(page, scenario.role);
    await page.route(`**${scenario.api}*`, route => route.fulfill({
      status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'R6 simulated server failure' }),
    }));
    const response = await openAndWait(page, scenario.path, scenario.api);
    expect(response.status()).toBe(500);
    const main = page.locator('main');
    await expect(main).toContainText(/error|failed|unable|try again|could not/i);
    await expect(main).not.toContainText(scenario.empty);
  });
}

test('R6-UI-11 RN-72 botones de icono en Approvals tienen nombre', async ({ page }) => {
  await signIn(page, 'finance');
  await openAndWait(page, '/approvals', '/api/v1/approvals/pending');
  await assertIconButtonsNamed(page);
});

test('R6-UI-12 RN-72 botones de icono en Policy Engine tienen nombre', async ({ page }) => {
  await signIn(page, 'admin');
  await openAndWait(page, '/policies', '/api/v1/policies');
  await assertIconButtonsNamed(page);
});

test('R6-UI-13 RN-72 toggle de password y acciones de My Expenses tienen nombre', async ({ page }) => {
  await new LoginPage(page).goto();
  await expect(page.getByTestId('login-password-toggle')).toHaveAccessibleName(/show|hide|password/i);
  await signIn(page, 'employee1');
  await openAndWait(page, '/expenses', '/api/v1/expenses');
  await assertIconButtonsNamed(page);
});

test('R6-UI-14 Anexo G login testids y menu Finance completo', async ({ page }) => {
  await new LoginPage(page).goto();
  for (const id of ['login-email', 'login-password', 'login-password-toggle', 'login-submit']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.getByTestId('login-email').fill(environment.email('finance'));
  await page.getByTestId('login-password').fill(environment.seedPassword());
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('user-menu')).toBeVisible();
  await page.getByTestId('user-menu').click();
  await expect(page.getByTestId('user-menu-name')).toContainText(/Fiona Finance/i);
  await expect(page.locator('body')).toContainText(/Finance\s*Controller/);
  await expect(page.locator('body')).toContainText('Employee');
  await expect(page.getByTestId('user-menu-signout')).toBeVisible();

  await page.getByTestId('user-menu-signout').click();
  await page.getByTestId('login-email').fill(environment.email('employee1'));
  await page.getByTestId('login-password').fill('R6-invalid-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-error')).toBeVisible();
});

test('R6-UI-15 Anexo G sesion en cookie httpOnly e invisible a document.cookie', async ({ page, context }) => {
  await signIn(page, 'employee1');
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name === 'sw_session');
  expect(sessionCookie, 'Debe existir la cookie sw_session').toBeDefined();
  expect(sessionCookie!.httpOnly, 'sw_session debe ser httpOnly').toBeTruthy();
  const visible = await page.evaluate(() => document.cookie);
  expect(visible).not.toContain('sw_session=');
});

test('R6-UI-16 Anexo G employee recibe access-denied en Approvals y Policies', async ({ page }) => {
  await signIn(page, 'employee1');
  for (const path of ['/approvals', '/policies']) {
    await page.goto(path);
    await expect(page.getByTestId('access-denied')).toBeVisible();
  }
});

test('R6-UI-17 Anexo G login muestra el estado en curso y el de credenciales inválidas', async ({ page }) => {
  await new LoginPage(page).goto();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/auth/login', async route => {
    await gate;
    await route.continue();
  });
  await page.getByTestId('login-email').fill(environment.email('employee1'));
  await page.getByTestId('login-password').fill('R6-invalid-password');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('login-submit')).toBeDisabled();
  release();
  await expect(page.getByTestId('login-error')).toContainText(/invalid email or password/i);
});

test('R6-UI-18 Anexo G perdida de cookie muestra sesion expirada', async ({ page, context }) => {
  await signIn(page, 'employee1');
  let cookies = await context.cookies();
  expect(cookies.some(c => c.name === 'sw_session'), 'La precondicion exige sw_session').toBeTruthy();
  expect(cookies.some(c => c.name === 'sw_session_hint'), 'La precondicion exige conservar sw_session_hint').toBeTruthy();
  await context.clearCookies({ name: 'sw_session' });
  await page.goto('/expenses');
  await expect(page.getByTestId('login-session-expired')).toBeVisible();

  await signIn(page, 'employee1');
  cookies = await context.cookies();
  const session = cookies.find(c => c.name === 'sw_session');
  expect(session, 'La variante alterada exige sw_session').toBeDefined();
  await context.addCookies([{ ...session!, value: 'tampered-session-value' }]);
  expect((await context.cookies()).some(c => c.name === 'sw_session_hint')).toBeTruthy();
  await page.goto('/expenses');
  await expect(page.getByTestId('login-session-expired')).toBeVisible();
});

test('R6-UI-19 RN-32 Policy Engine distingue limite 0 de sin limite', async ({ page, auth, policies }) => {
  const admin = await auth.loginAs('admin');
  const name = `R6-zero-limit-${Date.now()}`;
  let id: string | undefined;
  try {
    const created = await policies.create(admin.accessToken, {
      name, description: 'R6 inactive zero boundary', action: 'AutoApprove',
      maxAmount: 0, requiresReceipt: false, isActive: false,
    });
    expect(created.status()).toBe(201);
    id = (await created.json()).id;
    await signIn(page, 'admin');
    await openAndWait(page, '/policies', '/api/v1/policies');
    const row = page.getByText(name, { exact: true }).locator('xpath=ancestor::*[.//button[@title="Edit"]][1]');
    await expect(row).toBeVisible();
    await expect(row).toContainText(/(?:\$\s*0(?:\.00)?|≤\s*\$?0|0\s*(?:USD|dollars?))/i);
    await expect(row).not.toContainText(/no limit|unlimited|any amount/i);
  } finally {
    if (id) expect((await policies.remove(admin.accessToken, id)).status()).toBe(204);
  }
});

test('R6-UI-20 RN-23 el detalle del gasto muestra historial y Ver recibo apunta al recibo asociado', async ({ page, auth, expenses }) => {
  let owner: 'employee1' | 'employee2' | 'employee3' | undefined;
  let target: Expense | undefined;
  for (const role of ['employee1', 'employee2', 'employee3'] as const) {
    const session = await auth.loginAs(role);
    const response = await expenses.list(session.accessToken, '?pageSize=1000');
    expect(response.status()).toBe(200);
    target = ((await response.json()).items as Expense[]).find(e => e.receiptUrl);
    if (target) { owner = role; break; }
  }
  expect(target, 'No existe un gasto con receiptUrl; el chequeo no puede ejecutarse').toBeDefined();
  await signIn(page, owner!);
  await openAndWait(page, '/expenses', '/api/v1/expenses');
  const search = page.getByPlaceholder(/search vendor or description/i);
  const responsePromise = page.waitForResponse(r => r.url().includes('/api/v1/expenses') && r.request().method() === 'GET');
  await search.fill(target!.description);
  await responsePromise;
  await page.getByText(target!.expenseNumber, { exact: true }).click();
  await expect(page.getByText('Status history', { exact: false })).toBeVisible();
  const receipt = page.getByRole('link', { name: /view receipt/i });
  await expect(receipt).toBeVisible();
  const href = await receipt.getAttribute('href');
  expect(href).toBe(target!.receiptUrl);
});
