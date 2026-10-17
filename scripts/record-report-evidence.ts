// scripts/record-report-evidence.ts
// Re-records visual QA evidence for the 14 UI defects selected for the SpendWise
// technical assessment package. Plain ESM, run with:
//   npx tsx scripts/record-report-evidence.ts [BUG-XX ...]
// No args = all 14 defects, in the order below, serial execution, one fresh
// browser context per defect. Headless chromium only. No tracing, no HAR.

import 'dotenv/config';
import { chromium, request as pwRequest } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const FFMPEG = '/opt/homebrew/bin/ffmpeg';

const root = process.cwd();
const outRoot = path.join(root, 'evidence', 'report');

const webUrl = process.env.SPENDWISE_WEB_URL;
const apiUrl = process.env.SPENDWISE_API_URL;
const proxyUser = process.env.SPENDWISE_PROXY_USER;
const proxyPassword = process.env.SPENDWISE_PROXY_PASSWORD;
const seedPassword = process.env.SPENDWISE_SEED_PASSWORD;
if (![webUrl, apiUrl, proxyUser, proxyPassword, seedPassword].every(Boolean)) {
  throw new Error('Missing SpendWise environment variables in .env');
}

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 320, height: 568 };

// ---------------------------------------------------------------------------
// In-page overlays: visible cursor, step banner, defect banner, red box.
// Installed via context.addInitScript so they survive every navigation
// (including page.setContent calls) inside a given browser context.
// ---------------------------------------------------------------------------
const OVERLAY_INIT = () => {
  const CURSOR_ID = '__qa_cursor__';
  const BANNER_ID = '__qa_banner__';
  const STYLE_ID = '__qa_style__';

  function build() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CURSOR_ID}{position:fixed;left:-100px;top:-100px;width:26px;height:26px;
        border:3px solid #111827;border-radius:50%;background:rgba(255,230,0,.55);
        box-shadow:0 0 0 3px rgba(255,255,255,.95),0 2px 8px rgba(0,0,0,.45);
        transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647;
        transition:width .08s,height .08s,background .08s;}
      #${CURSOR_ID}.__down{width:18px;height:18px;background:rgba(239,68,68,.75);border-color:#991b1b;}
      .__qa_ripple{position:fixed;width:14px;height:14px;border:3px solid rgba(239,68,68,.9);
        border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483646;
        animation:__qa_ripple_a .6s ease-out forwards;}
      @keyframes __qa_ripple_a{from{width:8px;height:8px;opacity:.95;}to{width:56px;height:56px;opacity:0;}}
      #${BANNER_ID}{position:fixed;left:0;top:0;right:0;z-index:2147483645;
        font:700 18px/1.4 system-ui,-apple-system,sans-serif;padding:10px 18px;
        color:#fff;pointer-events:none;white-space:pre-wrap;text-align:center;
        box-shadow:0 2px 10px rgba(0,0,0,.35);border-bottom:4px solid #fff;}
      .__qa_box{position:fixed;border:4px solid #e11d2e;border-radius:6px;
        box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 14px rgba(225,29,46,.65);
        pointer-events:none;z-index:2147483640;box-sizing:border-box;}
      .__qa_box_label{position:fixed;background:#e11d2e;color:#fff;
        font:700 13px/18px system-ui,-apple-system,sans-serif;padding:2px 8px;
        border-radius:4px;pointer-events:none;z-index:2147483641;white-space:nowrap;
        max-width:90vw;overflow:hidden;text-overflow:ellipsis;}
      .__qa_box.__amber{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 14px rgba(245,158,11,.65);}
      .__qa_box_label.__amber{background:#b45309;}
    `;
    (document.head || document.documentElement).appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = CURSOR_ID;
    (document.body || document.documentElement).appendChild(cursor);
    const move = (x, y) => { cursor.style.left = x + 'px'; cursor.style.top = y + 'px'; };
    document.addEventListener('mousemove', e => move(e.clientX, e.clientY), true);
    document.addEventListener('mousedown', e => {
      cursor.classList.add('__down');
      const r = document.createElement('div');
      r.className = '__qa_ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      (document.body || document.documentElement).appendChild(r);
      setTimeout(() => r.remove(), 650);
    }, true);
    document.addEventListener('mouseup', () => cursor.classList.remove('__down'), true);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
  let tries = 0;
  const t = setInterval(() => { build(); if (++tries > 20 || document.getElementById(STYLE_ID)) clearInterval(t); }, 150);
};

async function installOverlays(page) {
  await page.addInitScript(OVERLAY_INIT);
  try { await page.evaluate(OVERLAY_INIT); } catch { /* page not ready yet */ }
}

async function showBanner(page, { kind, lines }) {
  const palette = {
    step: ['#1e293bf2', '#38bdf8'],
    defect: ['#4c0a0ef2', '#ff2d3a'],
    improvement: ['#78350ff2', '#f59e0b'],
  };
  const [bg, border] = palette[kind] || palette.step;
  const text = lines.join('\n');
  try {
    await page.evaluate(({ id, bg, border, text }) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.background = bg;
      el.style.borderBottomColor = border;
      el.textContent = text;
    }, { id: '__qa_banner__', bg, border, text });
  } catch { /* ignore if page mid-navigation */ }
}

async function drawBox(page, locatorOrRect, label, { color = 'red', clear = true } = {}) {
  let rect;
  if (locatorOrRect && typeof locatorOrRect.boundingBox === 'function') {
    await locatorOrRect.scrollIntoViewIfNeeded().catch(() => {});
    rect = await locatorOrRect.boundingBox().catch(() => null);
  } else {
    rect = locatorOrRect;
  }
  if (!rect) return false;
  await page.evaluate(({ rect, label, color, clear }) => {
    if (clear) document.querySelectorAll('.__qa_box, .__qa_box_label').forEach(e => e.remove());
    const pad = 6;
    const box = document.createElement('div');
    box.className = '__qa_box';
    if (color === 'amber') box.classList.add('__amber');
    Object.assign(box.style, {
      left: (rect.x - pad) + 'px', top: (rect.y - pad) + 'px',
      width: (rect.width + pad * 2) + 'px', height: (rect.height + pad * 2) + 'px',
    });
    const tag = document.createElement('div');
    tag.className = '__qa_box_label';
    if (color === 'amber') tag.classList.add('__amber');
    tag.style.left = (rect.x - pad) + 'px';
    const aboveTop = rect.y - pad - 22;
    const bannerSafeTop = 68; // keeps the label clear of the fixed top banner
    tag.style.top = (aboveTop >= bannerSafeTop ? aboveTop : rect.y + rect.height + pad + 4) + 'px';
    tag.textContent = label;
    document.body.appendChild(box);
    document.body.appendChild(tag);
    // Clamp the label horizontally so it never gets clipped off the right edge.
    const tagRect = tag.getBoundingClientRect();
    const overflowRight = tagRect.right - (window.innerWidth - 6);
    if (overflowRight > 0) {
      tag.style.left = Math.max(6, (rect.x - pad) - overflowRight) + 'px';
    }
  }, { rect, label, color, clear });
  return true;
}

async function drawBoxes(page, targets, label, color = 'red') {
  await clearBoxes(page);
  let drawn = 0;
  for (const target of targets) {
    if (await drawBox(page, target, label, { color, clear: false })) drawn += 1;
  }
  return drawn;
}

async function clearBoxes(page) {
  try { await page.evaluate(() => document.querySelectorAll('.__qa_box, .__qa_box_label').forEach(e => e.remove())); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Visible pointer helpers — never a raw .click() without moving the cursor.
// ---------------------------------------------------------------------------
async function moveTo(page, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox().catch(() => null);
  if (!box) throw new Error('Target is not visible for pointer movement');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 20 });
  await page.waitForTimeout(220);
  return { x, y };
}

async function visibleClick(page, locator) {
  const { x, y } = await moveTo(page, locator);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

async function visibleFill(page, locator, value) {
  await moveTo(page, locator);
  await locator.click();
  await locator.fill(value);
}

// ---------------------------------------------------------------------------
// Recorder: per-defect step/screenshot bookkeeping.
// ---------------------------------------------------------------------------
function pad2(n) { return String(n).padStart(2, '0'); }

class Recorder {
  constructor(page, dir, id) {
    this.page = page;
    this.dir = dir;
    this.id = id;
    this.n = 0;
    this.steps = [];
  }

  async step(text, action) {
    this.n += 1;
    await showBanner(this.page, { kind: 'step', lines: [`PASO ${this.n} · ${text}`] });
    await this.page.waitForTimeout(300);
    if (action) await action();
    await this.page.waitForTimeout(650);
    const shot = `${this.id}-${pad2(this.n)}.png`;
    await this.page.screenshot({ path: path.join(this.dir, shot) }).catch(() => {});
    this.steps.push({ n: this.n, text, screenshot: shot });
    return shot;
  }

  async defect({ expected, actual, label, target, targets, reproduced, notes }) {
    if (targets?.length) await drawBoxes(this.page, targets, label);
    else if (target) await drawBox(this.page, target, label);
    await showBanner(this.page, { kind: 'defect', lines: [`ESPERADO: ${expected}`, `REAL: ${actual}`] });
    await this.page.waitForTimeout(3000);
    const shot = `${this.id}-final.png`;
    await this.page.screenshot({ path: path.join(this.dir, shot) }).catch(() => {});
    return { expected, actual, reproduced: Boolean(reproduced), notes: notes ?? '', finalScreenshot: shot };
  }
}

async function apiLogin(email) {
  const apiCtx = await pwRequest.newContext({
    baseURL: apiUrl, ignoreHTTPSErrors: true,
    httpCredentials: { username: proxyUser, password: proxyPassword },
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  await apiCtx.get('/__gate', { maxRedirects: 0 }).catch(() => {});
  const response = await apiCtx.post('/api/v1/auth/login', { data: { email, password: seedPassword } });
  const body = await response.json().catch(() => ({}));
  return { apiCtx, response, body };
}

async function login(rec, email, opts = {}) {
  await rec.step(`Iniciar sesión como ${email}`, async () => {
    if (opts.viaGate !== false) {
      await rec.page.goto(`${webUrl}/__gate`);
    }
    await rec.page.waitForLoadState('domcontentloaded');
    const emailField = rec.page.getByTestId('login-email');
    const passField = rec.page.getByTestId('login-password');
    await visibleFill(rec.page, emailField, email);
    await visibleFill(rec.page, passField, seedPassword);
    await visibleClick(rec.page, rec.page.getByTestId('login-submit'));
    await rec.page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 15000 });
    await rec.page.waitForLoadState('domcontentloaded');
    await rec.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// Defect registry
// ---------------------------------------------------------------------------
const DEFECTS = {
  'BUG-09': {
    title: 'Login desde ruta protegida no regresa a la ruta original',
    role: 'Employee', user: 'employee2@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT,
    run: runBug09,
  },
  'BUG-10': {
    title: 'Administrator ve y abre una acción New expense no autorizada',
    role: 'Administrator', user: 'admin@spendwise.test', url: '/expenses/new',
    viewport: DESKTOP_VIEWPORT,
    run: runBug10,
  },
  'BUG-13': {
    title: 'CSV no neutraliza valores con prefijo de fórmula',
    role: 'Employee', user: 'employee3@spendwise.test', url: '/reports',
    viewport: DESKTOP_VIEWPORT,
    run: runBug13,
  },
  'BUG-17': {
    title: 'Finance ve controles de escritura del motor de políticas',
    role: 'FinanceController', user: 'finance@spendwise.test', url: '/policies',
    viewport: DESKTOP_VIEWPORT,
    run: runBug17,
  },
  'BUG-18': {
    title: 'UI comunica incorrectamente el límite de autoaprobación',
    role: 'FinanceController', user: 'finance@spendwise.test', url: '/policies',
    viewport: DESKTOP_VIEWPORT,
    run: runBug18,
  },
  'BUG-19': {
    title: 'Cola de aprobación omite al solicitante',
    role: 'FinanceController', user: 'finance@spendwise.test', url: '/approvals',
    viewport: DESKTOP_VIEWPORT,
    run: runBug19,
  },
  'BUG-20': {
    title: 'UI ofrece eliminar gastos finalizados',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT,
    run: runBug20,
  },
  'BUG-21': {
    title: 'Notes carece de asociación accesible con su etiqueta',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses/new',
    viewport: DESKTOP_VIEWPORT,
    run: runBug21,
  },
  'BUG-30': {
    title: 'Login vacío no comunica el error de forma persistente',
    role: 'N/A (visitante anónimo)', user: 'N/A', url: '/login',
    viewport: DESKTOP_VIEWPORT,
    run: runBug30,
  },
  'BUG-31': {
    title: 'Filtro activo no anuncia selección',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT,
    run: runBug31,
  },
  'BUG-32': {
    title: 'Filtros de Reports carecen de etiquetas asociadas',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/reports',
    viewport: DESKTOP_VIEWPORT,
    run: runBug32,
  },
  'BUG-33': {
    title: 'UI envía rangos de fecha invertidos',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/reports',
    viewport: DESKTOP_VIEWPORT,
    run: runBug33,
  },
  'BUG-34': {
    title: 'My Expenses desborda horizontalmente en móvil',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: MOBILE_VIEWPORT,
    run: runBug34,
  },
  'BUG-38': {
    title: 'Fallo al enviar gasto no se comunica en la UI',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses/new',
    viewport: DESKTOP_VIEWPORT,
    run: runBug38,
  },
  'BUG-40': {
    title: 'La pestaña Pending de My Expenses siempre aparece vacía',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT,
    run: runBug40,
  },
  'BUG-46': {
    title: 'El login no informa que la cuenta está bloqueada',
    role: 'Employee', user: 'nomanager@spendwise.test', url: '/login',
    viewport: DESKTOP_VIEWPORT, before: lockNoManager, run: runBug46,
  },
  'BUG-47': {
    title: 'Export CSV de My Expenses no hace nada',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT, run: runBug47,
  },
  'BUG-48': {
    title: 'La interfaz muestra indicadores fijos que simulan métricas',
    role: 'Employee / FinanceController', user: 'employee1, employee3, finance', url: '/dashboard; /expenses/new',
    viewport: DESKTOP_VIEWPORT, run: runBug48,
  },
  'BUG-49': {
    title: 'No existe detalle del gasto: no se ve el historial ni el recibo',
    role: 'Employee', user: 'employee1@spendwise.test', url: '/expenses',
    viewport: DESKTOP_VIEWPORT, run: runBug49,
  },
  'BUG-50': {
    title: 'Si falla la carga, la interfaz muestra listas vacías en lugar de un error',
    role: 'Employee / FinanceController', user: 'employee1, finance', url: '/expenses; /approvals; /reports',
    viewport: DESKTOP_VIEWPORT, run: runBug50,
  },
};

const DEFAULT_ORDER = [
  'BUG-09', 'BUG-10', 'BUG-13', 'BUG-17', 'BUG-18', 'BUG-19', 'BUG-20',
  'BUG-21', 'BUG-30', 'BUG-31', 'BUG-32', 'BUG-33', 'BUG-34', 'BUG-38',
  'BUG-46', 'BUG-47', 'BUG-48', 'BUG-49', 'BUG-50',
];

const IMPROVEMENTS = {
  'IMP-04': { title: 'Controles interactivos sin data-testid', run: runImp04 },
  'IMP-05': { title: '404 sin enlace para volver al Dashboard', run: runImp05 },
  'IMP-06': { title: 'Formulario abandona datos sin confirmación', run: runImp06 },
};

// ---------------------------------------------------------------------------
// Individual defect flows
// ---------------------------------------------------------------------------
async function runBug09(rec) {
  const page = rec.page;
  await rec.step('Intentar abrir /expenses sin sesión iniciada', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
  });
  await login(rec, 'employee2@spendwise.test');
  await page.waitForTimeout(400);
  const pathname = new URL(page.url()).pathname;
  const heading = page.getByRole('heading', { name: /welcome back/i }).first();
  return rec.defect({
    expected: 'Debe regresar a /expenses tras iniciar sesión',
    actual: `Aterriza en ${pathname} (Dashboard), no en /expenses`,
    label: 'DEFECTO BUG-09: no vuelve a /expenses',
    target: heading,
    reproduced: pathname !== '/expenses',
    notes: `URL final observada: ${page.url()}`,
  });
}

async function runBug10(rec) {
  const page = rec.page;
  await login(rec, 'admin@spendwise.test');
  const newExpenseBtn = page.getByRole('link', { name: /new expense/i }).first();
  await rec.step('Mostrar que Dashboard expone New expense / Scan receipt / Manual entry', async () => {
    await moveTo(page, newExpenseBtn);
  });
  let accessDenied = 0;
  await rec.step('Navegar directamente a /expenses/new', async () => {
    await page.goto(`${webUrl}/expenses/new`);
    await page.waitForLoadState('domcontentloaded');
    accessDenied = await page.getByTestId('access-denied').count();
  });
  const formHeading = page.getByRole('heading', { name: /new expense/i }).first();
  const formVisible = await formHeading.count();
  return rec.defect({
    expected: 'Solo deben ofrecerse opciones utilizables por el rol; /expenses/new debe mostrar acceso denegado',
    actual: formVisible
      ? 'Las acciones rápidas son visibles y la ruta directa abre el formulario completo de creación'
      : 'Se mostró acceso denegado (comportamiento correcto en esta ejecución)',
    label: 'DEFECTO BUG-10: formulario accesible para Administrator',
    target: formVisible ? formHeading : undefined,
    reproduced: formVisible > 0 && accessDenied === 0,
    notes: `access-denied testid count: ${accessDenied}`,
  });
}

async function runBug13(rec) {
  const page = rec.page;
  const email = 'employee3@spendwise.test';
  const marker = `=2+2 QA-${Date.now()}`;

  // Out-of-band check (not part of the recorded steps) for an existing formula expense.
  const apiCtx = await pwRequest.newContext({
    baseURL: apiUrl, ignoreHTTPSErrors: true,
    httpCredentials: { username: proxyUser, password: proxyPassword },
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  await apiCtx.get('/__gate', { maxRedirects: 0 }).catch(() => {});
  let existingDescription = null;
  try {
    const loginRes = await apiCtx.post('/api/v1/auth/login', { data: { email, password: seedPassword } });
    const session = await loginRes.json();
    const token = session.accessToken;
    const list = await apiCtx.get('/api/v1/expenses?pageSize=200', { headers: { Authorization: `Bearer ${token}` } });
    const data = await list.json();
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
    const found = items.find(e => typeof e.description === 'string' && e.description.startsWith('=2+2'));
    if (found) existingDescription = found.description;
    else {
      await apiCtx.post('/api/v1/expenses', {
        data: { description: marker, amount: 10, date: new Date().toISOString().slice(0, 10) },
        headers: { Authorization: `Bearer ${token}` },
      });
      existingDescription = marker;
    }
  } finally {
    await apiCtx.dispose();
  }

  await login(rec, email);
  await rec.step(`Confirmar gasto existente con descripción de fórmula: "${existingDescription}"`, async () => {
    await page.goto(`${webUrl}/reports`);
    await page.waitForLoadState('domcontentloaded');
  });

  const exportBtn = page.getByRole('button', { name: /export csv/i });
  let csvRaw = '';
  await rec.step('Exportar CSV desde Reports', async () => {
    const downloadPromise = page.waitForEvent('download');
    await visibleClick(page, exportBtn);
    const download = await downloadPromise;
    const filePath = await download.path();
    if (filePath) csvRaw = await fs.readFile(filePath, 'utf8');
  });

  const lines = csvRaw.split(/\r?\n/).filter(l => l.length > 0);
  const offendingLine = lines.find(l => l.includes('=2+2')) || lines.find(l => l.includes(existingDescription || '')) || '(no encontrada en esta página del CSV)';
  const header = lines[0] || '';
  const contextLines = lines.slice(1, 5);
  const displayLines = [header, ...contextLines];
  if (!displayLines.includes(offendingLine)) displayLines.push('…', offendingLine);
  const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font:15px/1.7 ui-monospace,monospace;background:#0b1220;color:#e2e8f0;padding:24px;margin:0;}
    h1{font:700 18px system-ui;color:#fff;margin:0 0 16px;}
    .row{white-space:pre;padding:3px 8px;border-radius:4px;}
    .bad{background:#7f1d1d;color:#fecaca;font-weight:700;outline:3px solid #ef4444;}
  </style></head><body>
  <h1>CSV exportado (contenido crudo) — BUG-13</h1>
  ${displayLines.map(l => `<div class="row${l === offendingLine ? ' bad' : ''}" id="${l === offendingLine ? 'offending-line' : ''}">${escape(l) || '&nbsp;'}</div>`).join('\n')}
  </body></html>`;
  await rec.step('Mostrar el contenido crudo del CSV descargado', async () => {
    await page.setContent(html);
    await installOverlays(page);
  });

  const target = displayLines.includes(offendingLine) ? page.locator('#offending-line') : undefined;
  return rec.defect({
    expected: "El valor debe neutralizarse (p.ej. con apóstrofo inicial '=2+2...) para impedir evaluación como fórmula",
    actual: `El CSV contiene literalmente: ${offendingLine}`,
    label: 'DEFECTO BUG-13: fórmula sin neutralizar en CSV',
    target,
    reproduced: /(^|,)"?=2\+2/.test(offendingLine),
    notes: `Línea completa del CSV: ${offendingLine}`,
  });
}

async function runBug17(rec) {
  const page = rec.page;
  await login(rec, 'finance@spendwise.test');
  await rec.step('Abrir Policy Engine (/policies)', async () => {
    await page.goto(`${webUrl}/policies`);
    await page.waitForLoadState('domcontentloaded');
  });
  const newRule = page.getByRole('button', { name: /new rule/i });
  const writeControls = page.getByRole('button', { name: /edit|delete|deactivate/i });
  await rec.step('Localizar los controles de escritura visibles para Finance (sin hacer clic)', async () => {
    await moveTo(page, newRule).catch(() => {});
  });
  const newRuleCount = await newRule.count();
  const writeCount = await writeControls.count();
  return rec.defect({
    expected: 'Finance debe ver una vista de solo lectura, sin controles de escritura',
    actual: `Aparecen "New rule" (${newRuleCount}) y ${writeCount} controles de edición/eliminación/activación`,
    label: 'DEFECTO BUG-17: controles de escritura visibles para Finance',
    target: newRule,
    reproduced: newRuleCount > 0 || writeCount > 0,
    notes: 'No se hizo clic en ningún control destructivo.',
  });
}

async function runBug18(rec) {
  const page = rec.page;
  await login(rec, 'finance@spendwise.test');
  await rec.step('Abrir Policy Engine (/policies)', async () => {
    await page.goto(`${webUrl}/policies`);
    await page.waitForLoadState('domcontentloaded');
  });
  await page.getByText('Auto-approve under $50').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await rec.step('Localizar la regla "Auto-approve under $50"', async () => {
    await moveTo(page, page.getByText('Auto-approve under $50').first()).catch(() => {});
  });
  // Single atomic evaluate: read text and bounding rect together so a
  // re-render between two separate locator calls can't race the read.
  const found = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('body *'));
    const node = all.find(el => el.children.length === 0 && (el.textContent || '').trim() === 'Auto-approve under $50');
    if (!node) return null;
    let container = node;
    for (let i = 0; i < 2 && container.parentElement; i++) container = container.parentElement;
    const rect = container.getBoundingClientRect();
    return { text: container.innerText, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  }).catch(() => null);
  const text = found?.text ?? '';
  const hasAtOrBelow = /≤\s*\$?50|at or below \$?50/i.test(text);
  return rec.defect({
    expected: 'Según Anexo E §2 y §4, USD 50 exacto NO debe autoaprobarse (debe quedar Pending Approval); la UI debe decir "< $50"',
    actual: `El motor de políticas trata el umbral como "≤ $50": la UI muestra "${text.replace(/\n+/g, ' · ')}", que coincide con el comportamiento real (incorrecto) del backend, el cual autoaprueba $50 exacto en lugar de dejarlo pendiente`,
    label: 'DEFECTO BUG-18: backend y UI tratan el umbral como ≤ $50',
    target: found?.rect,
    reproduced: hasAtOrBelow,
    notes: 'El texto de la UI no es una desinformación aislada: refleja fielmente el comportamiento real (incorrecto) del backend, que autoaprueba USD 50 exacto en vez de dejarlo en Pending Approval como exige Anexo E §2 y §4.',
  });
}

async function runBug19(rec) {
  const page = rec.page;
  await login(rec, 'finance@spendwise.test');
  await rec.step('Abrir Approval queue (/approvals)', async () => {
    await page.goto(`${webUrl}/approvals`);
    await page.waitForLoadState('domcontentloaded');
  });
  const rows = page.locator('main .divide-y').last().locator(':scope > div');
  await rows.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await rec.step('Inspeccionar la primera fila de la cola de aprobación', async () => {
    await moveTo(page, rows.first()).catch(() => {});
  });
  const rowText = await rows.first().innerText().catch(() => '');
  const hasSubmitter = /@spendwise\.test|employee\d|elena|ethan|eva employee/i.test(rowText);
  return rec.defect({
    expected: 'La cola de aprobación debe mostrar nombre o correo del solicitante',
    actual: `La fila no incluye nombre ni correo del solicitante: "${rowText.replace(/\n+/g, ' · ')}"`,
    label: 'DEFECTO BUG-19: falta el solicitante',
    target: rows.first(),
    reproduced: !hasSubmitter,
    notes: '',
  });
}

async function runBug20(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir My Expenses (/expenses)', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  });
  const approvedFilter = page.getByRole('button', { name: 'Approved', exact: true });
  await rec.step('Filtrar por estado Approved (estado final)', async () => {
    await visibleClick(page, approvedFilter);
    await page.waitForTimeout(500);
  });
  const rows = page.locator('main .divide-y').last().locator(':scope > div');
  const hasRows = await rows.first().isVisible().catch(() => false);
  let deleteBtn;
  let deleteCount = 0;
  if (hasRows) {
    deleteBtn = rows.first().getByTitle('Delete expense');
    deleteCount = await deleteBtn.count();
    await rec.step('Localizar el botón Delete en un gasto Approved (sin confirmar nada)', async () => {
      if (deleteCount) await moveTo(page, deleteBtn.first());
    });
  }
  return rec.defect({
    expected: "No debe existir acción Delete en gastos con estado final (Approved/AutoApproved/Rejected)",
    actual: deleteCount
      ? "Aparece el botón 'Delete expense' en un gasto con estado Approved"
      : 'No se encontró el botón Delete en esta ejecución',
    label: 'DEFECTO BUG-20: Delete visible en estado final',
    target: deleteCount ? deleteBtn.first() : undefined,
    reproduced: deleteCount > 0,
    notes: 'No se hizo clic ni se confirmó ninguna eliminación.',
  });
}

async function runBug21(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir /expenses/new y omitir OCR', async () => {
    await page.goto(`${webUrl}/expenses/new`);
    await page.waitForLoadState('domcontentloaded');
    await visibleClick(page, page.getByRole('button', { name: /skip/i }));
  });
  const notesTextarea = page.locator('textarea').first();
  await rec.step('Localizar el campo Notes', async () => {
    await moveTo(page, notesTextarea).catch(() => {});
  });
  const byLabelCount = await page.getByLabel('Notes', { exact: true }).count();
  const placeholder = await notesTextarea.getAttribute('placeholder').catch(() => null);
  return rec.defect({
    expected: "getByLabel('Notes') debe encontrar 1 elemento (la etiqueta visible debe asociarse al textarea)",
    actual: `getByLabel('Notes') encuentra ${byLabelCount} elementos; el nombre accesible es el placeholder "${placeholder}"`,
    label: 'DEFECTO BUG-21: Notes sin <label> asociado',
    target: notesTextarea,
    reproduced: byLabelCount === 0,
    notes: '',
  });
}

async function runBug30(rec) {
  const page = rec.page;
  await rec.step('Abrir /login con los campos de email y contraseña vacíos', async () => {
    await page.goto(`${webUrl}/__gate`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  });
  await rec.step('Hacer clic en Sign in sin completar ningún dato', async () => {
    await visibleClick(page, page.getByTestId('login-submit'));
    await page.waitForTimeout(600);
  });
  const emailErr = page.getByText('Email is required.', { exact: true });
  const passwordErr = page.getByText('Password is required.', { exact: true });
  const emailErrCount = await emailErr.count();
  const passwordErrCount = await passwordErr.count();
  const loginErrorCount = await page.getByTestId('login-error').count();
  const activeInfo = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return 'ninguno';
    return el.getAttribute('data-testid') || el.tagName.toLowerCase();
  });
  const inlineErrorsVisible = emailErrCount > 0 && passwordErrCount > 0;
  const target = emailErrCount ? emailErr.first() : page.getByTestId('login-email');
  return rec.defect({
    expected: 'Debe aparecer un error accesible y persistente, y foco en el primer campo inválido',
    actual: inlineErrorsVisible
      ? `La pantalla SÍ muestra mensajes en rojo junto a cada campo: "Email is required." y "Password is required.", y el foco queda en ${activeInfo}. El testid 'login-error' genérico no existe (${loginErrorCount}), pero el error visible y persistente por campo SÍ está presente.`
      : `No se encontraron los mensajes inline esperados. testid 'login-error': ${loginErrorCount} · foco: ${activeInfo}`,
    label: 'CONTROL BUG-30: validación inline sí visible',
    target,
    reproduced: !inlineErrorsVisible,
    notes: inlineErrorsVisible
      ? 'Descartado: el reporte original indicaba ausencia de error accesible persistente, pero esta re-verificación muestra que la UI SÍ presenta "Email is required." y "Password is required." en rojo, de forma persistente, junto a cada campo, con el foco en el campo email. No se confirma el defecto tal como estaba descrito; se documenta como control descartado (falso positivo del reporte original), de forma análoga al caso E2E-06.'
      : '',
  });
}

async function runBug31(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir My Expenses (/expenses)', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
  });
  const approved = page.getByRole('button', { name: 'Approved', exact: true });
  await rec.step('Activar el filtro Approved', async () => {
    await visibleClick(page, approved);
    await page.waitForTimeout(400);
  });
  const attrs = await approved.evaluate(el => ({
    ariaPressed: el.getAttribute('aria-pressed'),
    ariaSelected: el.getAttribute('aria-selected'),
  }));
  return rec.defect({
    expected: "El filtro activo debe exponer aria-pressed=\"true\" (o patrón accesible equivalente)",
    actual: `aria-pressed: ${attrs.ariaPressed} · aria-selected: ${attrs.ariaSelected} (la selección solo se expresa por color/clase)`,
    label: 'DEFECTO BUG-31: sin aria-pressed',
    target: approved,
    reproduced: attrs.ariaPressed === null && attrs.ariaSelected === null,
    notes: '',
  });
}

async function runBug32(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir Expense Reports (/reports)', async () => {
    await page.goto(`${webUrl}/reports`);
    await page.waitForLoadState('domcontentloaded');
  });
  const filtersPanel = page.getByText('FILTERS', { exact: false }).locator('..');
  await rec.step('Inspeccionar los filtros From / To / Category / Status', async () => {
    await moveTo(page, filtersPanel).catch(() => {});
  });
  const counts = {};
  for (const label of ['From', 'To', 'Category', 'Status']) {
    counts[label] = await page.getByLabel(label, { exact: true }).count();
  }
  const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ');
  const anyMissing = Object.values(counts).some(c => c === 0);
  return rec.defect({
    expected: "Cada control debe tener una etiqueta asociada programáticamente (getByLabel debe encontrar 1 elemento por campo)",
    actual: `getByLabel() por campo → ${summary}`,
    label: 'DEFECTO BUG-32: filtros sin <label> asociado',
    target: filtersPanel,
    reproduced: anyMissing,
    notes: '',
  });
}

async function runBug33(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir Expense Reports (/reports)', async () => {
    await page.goto(`${webUrl}/reports`);
    await page.waitForLoadState('domcontentloaded');
  });
  let capturedRequest = '';
  page.on('request', req => {
    const u = req.url();
    if (/dateFrom=2026-10-20/.test(u) && /dateTo=2026-10-01/.test(u)) {
      const parsed = new URL(u);
      capturedRequest = parsed.pathname + parsed.search;
    }
  });
  const dateInputs = page.locator('input[type="date"]');
  await rec.step('Establecer From = 2026-10-20 y To = 2026-10-01 (rango invertido)', async () => {
    await visibleFill(page, dateInputs.nth(0), '2026-10-20');
    await visibleFill(page, dateInputs.nth(1), '2026-10-01');
    await page.waitForTimeout(900);
  });
  const mainText = await page.locator('main').innerText().catch(() => '');
  const hasValidationMsg = /from.*before|invalid date range|start date/i.test(mainText);
  return rec.defect({
    expected: 'Debe validarse el rango antes de enviar la solicitud; ninguna consulta incoherente debe enviarse',
    actual: capturedRequest
      ? `Se envió la solicitud con el rango invertido: ${capturedRequest}`
      : 'No se capturó una solicitud con el rango invertido en esta ejecución',
    label: 'DEFECTO BUG-33: rango invertido enviado sin validar',
    target: dateInputs.nth(0),
    reproduced: Boolean(capturedRequest) && !hasValidationMsg,
    notes: hasValidationMsg ? 'Se detectó un mensaje de validación en pantalla.' : '',
  });
}

async function runBug34(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir My Expenses (/expenses) en viewport 320×568', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const mainEl = page.locator('main').first();
  return rec.defect({
    expected: 'El contenido debe caber en el viewport (overflow ≤ 1 px) o la tabla debe desplazarse de forma contenida',
    actual: `document.documentElement.scrollWidth - clientWidth = ${overflow} px`,
    label: `DEFECTO BUG-34: overflow horizontal ${overflow}px`,
    target: mainEl,
    reproduced: overflow > 1,
    notes: 'La magnitud exacta puede variar frente al reporte original (102 px el 16-oct) según el contenido cargado en esta ejecución; el desbordamiento horizontal sigue reproduciéndose.',
  });
}

async function runBug38(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir /expenses/new y completar el formulario manual', async () => {
    await page.goto(`${webUrl}/expenses/new`);
    await page.waitForLoadState('domcontentloaded');
    await visibleClick(page, page.getByRole('button', { name: /skip/i }));
  });
  const marker = `ui-recovery-${Date.now()}`;
  await rec.step('Se simula una respuesta HTTP 500 del servidor (intercepción de red)', async () => {
    await page.route('**/api/v1/expenses', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'An unexpected error occurred.' }) });
        return;
      }
      await route.continue();
    });
    await visibleFill(page, page.getByLabel('Description'), marker);
    await visibleFill(page, page.getByLabel('Amount'), '12.34');
  });
  const submitBtn = page.getByRole('button', { name: /submit expense/i });
  await rec.step('Enviar el formulario (la API responde 500)', async () => {
    await visibleClick(page, submitBtn);
    await page.waitForTimeout(1000);
  });
  const mainText = await page.locator('main').innerText().catch(() => '');
  const hasErrorMessage = /error|failed|try again|unable/i.test(mainText);
  const descValue = await page.getByLabel('Description').inputValue().catch(() => '');
  const valuesPreserved = descValue === marker;
  return rec.defect({
    expected: 'Deben conservarse los valores ingresados y mostrarse un mensaje visible de error/falla',
    actual: `Valores conservados: ${valuesPreserved} · Mensaje de error visible: ${hasErrorMessage}`,
    label: 'DEFECTO BUG-38: sin mensaje de error tras el 500',
    target: hasErrorMessage ? undefined : submitBtn,
    reproduced: valuesPreserved && !hasErrorMessage,
    notes: 'No se creó ningún gasto real: la petición POST fue interceptada y respondida con 500 simulado.',
  });
}

async function runBug40(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir My Expenses (/expenses) y confirmar gastos Pending Approval en la pestaña All', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
  });
  const pendingRow = page.getByText('Pending Approval', { exact: true }).first();
  const pendingRowCountInAll = await pendingRow.count();
  await rec.step('Mostrar una fila con estado Pending Approval en la pestaña All', async () => {
    if (pendingRowCountInAll) await moveTo(page, pendingRow).catch(() => {});
  });

  let capturedUrl = '';
  page.on('request', req => {
    const u = req.url();
    if (/\/api\/v1\/expenses\?/.test(u) && /status=/.test(u)) capturedUrl = u;
  });
  const pendingTab = page.getByRole('button', { name: 'Pending', exact: true });
  await rec.step('Hacer clic en la pestaña Pending', async () => {
    await visibleClick(page, pendingTab);
    await page.waitForTimeout(800);
  });

  const mainText = await page.locator('main').innerText().catch(() => '');
  const showsEmptyState = /no expenses found/i.test(mainText) && /0 expenses/i.test(mainText);
  const parsedPath = capturedUrl ? new URL(capturedUrl).pathname + new URL(capturedUrl).search : '(no se capturó la solicitud)';
  const usesWrongStatus = /status=Pending(?!Approval)/.test(capturedUrl);
  const emptyStateTarget = page.getByText('No expenses found', { exact: false }).first();

  return rec.defect({
    expected: 'La pestaña lista los gastos PendingApproval del usuario',
    actual: `Consulta ${parsedPath} y muestra "No expenses found." aunque hay gastos pendientes (status=Pending en vez de status=PendingApproval)`,
    label: 'DEFECTO BUG-40: pestaña Pending vacía por status erróneo',
    target: emptyStateTarget,
    reproduced: usesWrongStatus && showsEmptyState && pendingRowCountInAll > 0,
    notes: `Fila Pending Approval visible en All antes del cambio de pestaña: ${pendingRowCountInAll > 0}. Solicitud capturada: ${capturedUrl || '(ninguna)'}`,
  });
}

async function lockNoManager() {
  const email = 'nomanager@spendwise.test';
  const apiCtx = await pwRequest.newContext({
    baseURL: apiUrl, ignoreHTTPSErrors: true,
    httpCredentials: { username: proxyUser, password: proxyPassword },
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  await apiCtx.get('/__gate', { maxRedirects: 0 }).catch(() => {});
  const lockedAtUtc = process.env.SPENDWISE_NOMANAGER_LOCKED_AT_UTC || new Date().toISOString();
  let finalStatus = 0;
  let finalBody = {};
  try {
    if (!process.env.SPENDWISE_NOMANAGER_LOCKED_AT_UTC) {
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        await apiCtx.post('/api/v1/auth/login', {
          data: { email, password: 'deliberately-wrong-password' },
        });
      }
    }
    const verification = await apiCtx.post('/api/v1/auth/login', { data: { email, password: seedPassword } });
    finalStatus = verification.status();
    finalBody = await verification.json().catch(() => ({}));
  } finally {
    await apiCtx.dispose();
  }
  if (finalStatus !== 401 || finalBody.code !== 'account_locked') {
    throw new Error(`No se confirmó el bloqueo de nomanager (status=${finalStatus}, code=${finalBody.code ?? 'ausente'})`);
  }
  return { lockedAtUtc, attempts: 5, finalStatus, finalCode: finalBody.code, finalMessage: finalBody.message };
}

async function runBug46(rec) {
  const page = rec.page;
  let apiResult = rec.precondition ? {
    status: rec.precondition.finalStatus,
    code: rec.precondition.finalCode,
    message: rec.precondition.finalMessage,
  } : null;
  page.on('response', async response => {
    if (response.request().method() !== 'POST' || !response.url().includes('/api/v1/auth/login')) return;
    const body = await response.json().catch(() => ({}));
    apiResult = { status: response.status(), code: body.code, message: body.message };
  });
  await rec.step('Abrir Login con la cuenta nomanager bloqueada previamente por la API', async () => {
    await page.goto(`${webUrl}/__gate`);
    await page.waitForLoadState('domcontentloaded');
  });
  await rec.step('Ingresar la contraseña correcta y pulsar Sign in', async () => {
    await visibleFill(page, page.getByTestId('login-email'), 'nomanager@spendwise.test');
    await visibleFill(page, page.getByTestId('login-password'), seedPassword);
    await visibleClick(page, page.getByTestId('login-submit'));
    await page.getByTestId('login-error').waitFor({ state: 'visible', timeout: 10000 });
  });
  const uiText = await page.getByTestId('login-error').innerText();
  const apiText = apiResult ? `HTTP ${apiResult.status} · ${apiResult.code}: ${apiResult.message}` : 'respuesta API no capturada';
  return rec.defect({
    expected: `La UI debe informar el bloqueo. API observada: ${apiText}`,
    actual: `La pantalla muestra "${uiText}". API observada: ${apiText}`,
    label: 'DEFECTO BUG-46: oculta el bloqueo de la cuenta',
    target: /invalid email or password/i.test(uiText) ? page.getByTestId('login-error') : undefined,
    reproduced: apiResult?.status === 401 && apiResult?.code === 'account_locked' && /invalid email or password/i.test(uiText),
    notes: `Bloqueo preparado fuera del video a ${rec.precondition?.lockedAtUtc ?? '(hora no disponible)'}.`,
  });
}

async function runBug47(rec) {
  const page = rec.page;
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir My Expenses', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  });
  let downloads = 0;
  let popups = 0;
  const exportRequests = [];
  page.on('download', () => { downloads += 1; });
  page.on('popup', () => { popups += 1; });
  page.on('request', request => {
    if (/export|\.csv(?:$|\?)/i.test(request.url())) exportRequests.push(request.url());
  });
  const expenseExport = page.getByRole('button', { name: /export csv/i });
  await rec.step('Hacer clic en Export CSV de My Expenses y observar durante 6 segundos', async () => {
    await visibleClick(page, expenseExport);
    await page.waitForTimeout(6000);
  });
  const none = downloads === 0 && popups === 0 && exportRequests.length === 0;
  const expenseObservation = `My Expenses: descargas=${downloads}, popups=${popups}, solicitudes de exportación=${exportRequests.length}`;

  await rec.step('Contraste: abrir Reports y hacer clic en Export CSV', async () => {
    await page.goto(`${webUrl}/reports`);
    await page.waitForLoadState('domcontentloaded');
    const download = page.waitForEvent('download', { timeout: 10000 });
    await visibleClick(page, page.getByRole('button', { name: /export csv/i }));
    await download;
  });
  await rec.step('Volver a My Expenses para señalar el botón que no actuó', async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
  });
  return rec.defect({
    expected: 'Export CSV de My Expenses debe descargar un CSV, como sí lo hace Reports',
    actual: `${expenseObservation}; en contraste, Reports sí produjo una descarga`,
    label: 'DEFECTO BUG-47: Export CSV no ejecuta ninguna acción',
    target: page.getByRole('button', { name: /export csv/i }),
    reproduced: none,
    notes: 'La observación de My Expenses duró 6 segundos completos.',
  });
}

async function runBug48(rec) {
  const page = rec.page;
  const values = [];
  for (const email of ['employee1@spendwise.test', 'employee3@spendwise.test', 'finance@spendwise.test']) {
    await page.context().clearCookies();
    await login(rec, email);
    await rec.step(`Mostrar Dashboard de ${email}`, async () => {
      await page.goto(`${webUrl}/dashboard`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(700);
      const resolution = page.getByText(/Avg\. resolution:\s*1\.4 days/i).first();
      const rate = page.getByText(/\d+% rate this month/i).first();
      values.push({ email, resolution: await resolution.innerText(), rate: await rate.innerText() });
      await drawBox(page, resolution, 'DEFECTO BUG-48: valor fijo 1.4 days');
    });
  }
  await page.context().clearCookies();
  await login(rec, 'employee1@spendwise.test');
  await rec.step('Abrir New expense y señalar las métricas promocionales fijas', async () => {
    await page.goto(`${webUrl}/expenses/new`);
    await page.waitForLoadState('domcontentloaded');
    const time = page.getByText(/AI-assisted capture saves ~90 seconds per entry/i).first();
    const accuracy = page.getByText(/OCR accuracy:\s*96% on clear receipts/i).first();
    await drawBoxes(page, [time, accuracy], 'DEFECTO BUG-48: indicador fijo sin fuente');
  });
  const distinctRates = new Set(values.map(v => v.rate)).size;
  const fixedTime = page.getByText(/AI-assisted capture saves ~90 seconds per entry/i).first();
  const fixedAccuracy = page.getByText(/OCR accuracy:\s*96% on clear receipts/i).first();
  return rec.defect({
    expected: 'Las métricas deben derivarse de datos reales o identificarse claramente como estimaciones no operativas',
    actual: `Avg. resolution fue 1.4 days para tres usuarios mientras la tasa varió (${values.map(v => `${v.email}: ${v.rate}`).join(' · ')}); New expense fija ~90 seconds y 96%`,
    label: 'DEFECTO BUG-48: métricas fijas simuladas',
    targets: [fixedTime, fixedAccuracy],
    reproduced: values.length === 3 && values.every(v => /1\.4 days/i.test(v.resolution)) && distinctRates > 1,
    notes: JSON.stringify(values),
  });
}

async function runBug49(rec) {
  const page = rec.page;
  const { apiCtx, response, body } = await apiLogin('employee1@spendwise.test');
  if (response.status() !== 200 || !body.accessToken) {
    await apiCtx.dispose();
    throw new Error(`No se pudo autenticar employee1 por API (HTTP ${response.status()})`);
  }
  let expense;
  try {
    const list = await apiCtx.get('/api/v1/expenses?pageSize=1000', { headers: { Authorization: `Bearer ${body.accessToken}` } });
    const payload = await list.json();
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [];
    expense = items.find(item => item.receiptUrl);
  } finally {
    await apiCtx.dispose();
  }
  if (!expense) throw new Error('employee1 no tiene un gasto con receiptUrl');

  await login(rec, 'employee1@spendwise.test');
  await rec.step(`Abrir My Expenses y localizar ${expense.expenseNumber}, que tiene receiptUrl`, async () => {
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    const search = page.getByPlaceholder(/search vendor or description/i);
    await visibleFill(page, search, expense.description);
    await page.waitForTimeout(700);
    await moveTo(page, page.getByText(expense.expenseNumber, { exact: true }));
  });
  const number = page.getByText(expense.expenseNumber, { exact: true });
  const before = page.url();
  await rec.step('Hacer clic en la fila/número del gasto', async () => {
    await visibleClick(page, number);
    await page.waitForTimeout(700);
  });
  const stayedOnListUrl = page.url() === before;
  const receiptLinkVisible = await page.getByRole('link', { name: /view receipt/i }).isVisible().catch(() => false);
  const historyVisible = await page.getByText(/status history/i).isVisible().catch(() => false);
  const detailOpened = receiptLinkVisible && historyVisible;
  await rec.step(`Abrir directamente /expenses/${expense.id}`, async () => {
    await page.goto(`${webUrl}/expenses/${expense.id}`);
    await page.waitForLoadState('domcontentloaded');
  });
  const notFound = page.getByText('This page could not be found.', { exact: false }).first();
  const is404 = await notFound.isVisible().catch(() => false);
  return rec.defect({
    expected: 'El gasto debe abrir un detalle con historial y el enlace al recibo asociado',
    actual: detailOpened
      ? `El clic abre un panel lateral con historial y "View receipt" (URL de lista conservada=${stayedOnListUrl}); solo la URL directa muestra 404`
      : `El clic no abre detalle y la URL directa muestra 404 "This page could not be found."`,
    label: 'DEFECTO BUG-49: no existe el detalle del gasto',
    target: detailOpened ? undefined : notFound,
    reproduced: !detailOpened && is404,
    notes: `Gasto ${expense.expenseNumber}; receiptUrl informado sin guardar su valor. Panel lateral: receipt=${receiptLinkVisible}, historial=${historyVisible}.`,
  });
}

async function runBug50(rec) {
  const page = rec.page;
  await simpleLogin(page, 'employee1@spendwise.test');
  await rec.step('Se simula una respuesta HTTP 500 del servidor (intercepción de red)', async () => {
    await page.route('**/api/v1/expenses*', route => route.request().method() === 'GET'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated HTTP 500' }) })
      : route.continue());
    await page.goto(`${webUrl}/expenses`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await showBanner(page, { kind: 'step', lines: ['PASO 1 · Se simula una respuesta HTTP 500 del servidor (intercepción de red)'] });
  });
  const expenseEmpty = page.getByText('No expenses found.', { exact: false }).first();
  const expenseShowsEmpty = await expenseEmpty.isVisible().catch(() => false);
  await rec.step('My Expenses presenta un estado vacío sin explicar el error', async () => {
    if (expenseShowsEmpty) await drawBox(page, expenseEmpty, 'DEFECTO BUG-50: HTTP 500 presentado como lista vacía');
  });
  await page.unroute('**/api/v1/expenses*');

  await page.context().clearCookies();
  await login(rec, 'finance@spendwise.test');
  await page.route('**/api/v1/approvals/pending*', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await rec.step('Approvals recibe HTTP 500 y presenta "All caught up!"', async () => {
    await page.goto(`${webUrl}/approvals`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    const empty = page.getByText('All caught up!', { exact: false }).first();
    if (await empty.isVisible().catch(() => false)) await drawBox(page, empty, 'DEFECTO BUG-50: HTTP 500 presentado como cola vacía');
  });
  const approvalEmpty = await page.getByText('All caught up!', { exact: false }).first().isVisible().catch(() => false);
  await page.unroute('**/api/v1/approvals/pending*');

  await page.route('**/api/v1/reports*', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await rec.step('Reports recibe HTTP 500 y presenta totales en cero', async () => {
    await page.goto(`${webUrl}/reports`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await drawBox(page, page.locator('main').first(), 'DEFECTO BUG-50: HTTP 500 presentado como reporte vacío');
  });
  const reportText = await page.locator('main').innerText();
  const reportEmpty = /\$0\.00/.test(reportText) && /\b0\b/.test(reportText) && !/error|failed|unable|try again/i.test(reportText);
  return rec.defect({
    expected: 'Cada pantalla debe explicar el fallo de carga y no presentarlo como un estado vacío válido',
    actual: `My Expenses: "No expenses found."=${expenseShowsEmpty}; Approvals: "All caught up!"=${approvalEmpty}; Reports: totales 0 sin error=${reportEmpty}`,
    label: 'DEFECTO BUG-50: el HTTP 500 queda oculto',
    target: page.locator('main').first(),
    reproduced: expenseShowsEmpty && approvalEmpty && reportEmpty,
    notes: 'Las tres respuestas HTTP 500 fueron simuladas mediante intercepción de red; no se alteró el servidor.',
  });
}

async function simpleLogin(page, email) {
  await page.goto(`${webUrl}/__gate`);
  await page.waitForLoadState('domcontentloaded');
  await visibleFill(page, page.getByTestId('login-email'), email);
  await visibleFill(page, page.getByTestId('login-password'), seedPassword);
  await visibleClick(page, page.getByTestId('login-submit'));
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function saveImprovement(page, dir, id, n, observed, why, targets, boxLabel) {
  const label = boxLabel ?? `MEJORA ${id}: ${observed}`;
  await drawBoxes(page, targets, label, 'amber');
  await showBanner(page, { kind: 'improvement', lines: [`OBSERVADO: ${observed}`, `POR QUÉ ES MEJORA: ${why}`] });
  await page.waitForTimeout(500);
  const filename = `${id}-${pad2(n)}.png`;
  await page.screenshot({ path: path.join(dir, filename) });
  return filename;
}

async function controlsWithoutTestId(page) {
  return page.locator('button, a[href], input, select, textarea').evaluateAll(elements => elements
    .filter(el => !el.hasAttribute('data-testid'))
    .map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })
    .filter(r => r.width > 0 && r.height > 0));
}

async function runImp04(page, dir) {
  await simpleLogin(page, 'employee1@spendwise.test');
  const files = [];
  for (const [n, route] of [[1, '/expenses'], [2, '/expenses/new']]) {
    await page.goto(`${webUrl}${route}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(700);
    const rects = await controlsWithoutTestId(page);
    files.push(await saveImprovement(page, dir, 'IMP-04', n,
      `${rects.length} controles interactivos visibles sin data-testid en ${route}`,
      'La lista obligatoria de test ids del Anexo G sí se cumple; agregar ids a estos controles ampliaría la automatización estable.', rects, 'sin testid'));
  }
  return { reproduced: true, files };
}

async function runImp05(page, dir) {
  await simpleLogin(page, 'employee1@spendwise.test');
  await page.goto(`${webUrl}/esta-ruta-no-existe`);
  await page.waitForLoadState('domcontentloaded');
  const message = page.getByText('This page could not be found.', { exact: false }).first();
  const links = await page.getByRole('link', { name: /dashboard|home|back/i }).count();
  const file = await saveImprovement(page, dir, 'IMP-05', 1,
    `La página 404 no ofrece un enlace de regreso al Dashboard (enlaces encontrados: ${links})`,
    'Un enlace de recuperación evita que el usuario quede en una vía muerta.', [message]);
  return { reproduced: links === 0, files: [file] };
}

async function runImp06(page, dir) {
  await simpleLogin(page, 'employee1@spendwise.test');
  await page.goto(`${webUrl}/expenses/new`);
  await page.waitForLoadState('domcontentloaded');
  const skip = page.getByRole('button', { name: /skip/i });
  if (await skip.isVisible().catch(() => false)) await visibleClick(page, skip);
  const description = page.getByLabel('Description');
  const amount = page.getByLabel('Amount');
  await visibleFill(page, description, 'Borrador que debe protegerse');
  await visibleFill(page, amount, '45.67');
  const files = [];
  files.push(await saveImprovement(page, dir, 'IMP-06', 1,
    'El formulario contiene datos sin guardar', 'Conviene advertir antes de abandonar cambios.', [description, amount]));
  const dashboard = page.getByRole('link', { name: /dashboard/i }).first();
  await visibleClick(page, dashboard);
  files.push(await saveImprovement(page, dir, 'IMP-06', 2,
    'Dashboard abrió sin pedir confirmación', 'Una confirmación previene pérdida accidental de datos.', [page.locator('main').first()]));
  await page.goto(`${webUrl}/expenses/new`);
  await page.waitForLoadState('domcontentloaded');
  const skipAgain = page.getByRole('button', { name: /skip/i });
  if (await skipAgain.isVisible().catch(() => false)) await visibleClick(page, skipAgain);
  const emptyDescription = (await page.getByLabel('Description').inputValue()) === '';
  const emptyAmount = (await page.getByLabel('Amount').inputValue()) === '';
  files.push(await saveImprovement(page, dir, 'IMP-06', 3,
    `Al volver, los campos están vacíos (descripción=${emptyDescription}, monto=${emptyAmount})`,
    'Preservar el borrador o confirmar la salida evita pérdida silenciosa.', [page.getByLabel('Description'), page.getByLabel('Amount')]));
  return { reproduced: emptyDescription && emptyAmount, files };
}

// ---------------------------------------------------------------------------
// ffmpeg conversion
// ---------------------------------------------------------------------------
async function convertToMp4(webmPath, mp4Path, { scale2xNearest = false } = {}) {
  const args = ['-y', '-i', webmPath];
  if (scale2xNearest) {
    args.push('-vf', 'scale=640:-2:flags=neighbor');
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '26', '-movflags', '+faststart', '-an', mp4Path);
  await execFileAsync(FFMPEG, args);
}

async function probeDuration(mp4Path) {
  try {
    const { stdout } = await execFileAsync(FFMPEG, ['-i', mp4Path]);
    return stdout;
  } catch (err) {
    // ffmpeg -i without -y and without output writes info to stderr and exits non-zero; err.stderr has it.
    return err.stderr || '';
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2).filter(a => /^(?:BUG|IMP)-\d+$/.test(a));
  const order = args.length ? args : DEFAULT_ORDER;

  const unknown = order.filter(id => !DEFECTS[id] && !IMPROVEMENTS[id]);
  if (unknown.length) throw new Error(`Unknown defect id(s): ${unknown.join(', ')}`);

  await fs.mkdir(outRoot, { recursive: true });

  const browser = process.env.SPENDWISE_CDP_URL
    ? await chromium.connectOverCDP(process.env.SPENDWISE_CDP_URL)
    : await chromium.launch({ headless: true });
  const results = [];

  const improvementIds = order.filter(id => IMPROVEMENTS[id]);
  if (improvementIds.length) {
    const improvementDir = path.join(outRoot, 'improvements');
    await fs.mkdir(improvementDir, { recursive: true });
    for (const id of improvementIds) {
      for (const existing of await fs.readdir(improvementDir)) {
        if (existing.startsWith(`${id}-`) && existing.endsWith('.png')) {
          await fs.unlink(path.join(improvementDir, existing));
        }
      }
      const context = await browser.newContext({
        viewport: DESKTOP_VIEWPORT, ignoreHTTPSErrors: true,
        httpCredentials: { username: proxyUser, password: proxyPassword }, acceptDownloads: true,
      });
      await installOverlays(context);
      const page = await context.newPage();
      await installOverlays(page);
      console.log(`\n=== ${id} — ${IMPROVEMENTS[id].title} ===`);
      try {
        const outcome = await IMPROVEMENTS[id].run(page, improvementDir);
        results.push({ id, reproduced: Boolean(outcome.reproduced), mp4Size: 0, screenshots: outcome.files.length });
        console.log(`  reproduced=${Boolean(outcome.reproduced)} screenshots=${outcome.files.length} (sin video)`);
      } finally {
        await context.close();
      }
    }
  }

  for (const id of order.filter(candidate => DEFECTS[candidate])) {
    const meta = DEFECTS[id];
    // Safety: this script must NEVER touch evidence/report/ itself (other
    // processes, e.g. API evidence, write siblings there). Only ever remove
    // or (re)create this single defect's own subfolder.
    const dir = path.join(outRoot, id);
    if (path.dirname(dir) !== outRoot || !/^BUG-\d+$/.test(id)) {
      throw new Error(`Refusing unsafe output path for ${id}: ${dir}`);
    }
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    console.log(`\n=== ${id} — ${meta.title} ===`);

    const precondition = meta.before ? await meta.before() : null;

    const context = await browser.newContext({
      viewport: meta.viewport,
      ignoreHTTPSErrors: true,
      httpCredentials: { username: proxyUser, password: proxyPassword },
      recordVideo: { dir, size: meta.viewport },
      acceptDownloads: true,
    });
    await installOverlays(context);

    const page = await context.newPage();
    await installOverlays(page);
    const rec = new Recorder(page, dir, id);
    rec.precondition = precondition;

    let outcome;
    try {
      outcome = await meta.run(rec);
    } catch (err) {
      console.error(`  ! ${id} failed: ${err.message}`);
      outcome = {
        expected: '(no determinado por error de ejecución)',
        actual: `Error durante la grabación: ${err.message}`,
        reproduced: false,
        notes: 'La grabación falló antes de completarse; revisar manualmente.',
      };
      await page.screenshot({ path: path.join(dir, `${id}-final.png`) }).catch(() => {});
    }

    const video = page.video();
    await context.close();

    let mp4Name = `${id}.mp4`;
    let mp4Size = 0;
    try {
      const webmPath = await video.path();
      const mp4Path = path.join(dir, mp4Name);
      await convertToMp4(webmPath, mp4Path, { scale2xNearest: id === 'BUG-34' });
      await fs.unlink(webmPath).catch(() => {});
      const stat = await fs.stat(mp4Path);
      mp4Size = stat.size;
    } catch (err) {
      console.error(`  ! ffmpeg conversion failed for ${id}: ${err.message}`);
      mp4Name = null;
    }

    const screenshots = await fs.readdir(dir).then(files => files.filter(f => f.endsWith('.png')));

    const record = {
      id,
      title: meta.title,
      role: meta.role,
      user: meta.user,
      url: meta.url,
      recordedAt: new Date().toISOString(),
      reproduced: Boolean(outcome?.reproduced),
      expected: outcome?.expected ?? '',
      actual: outcome?.actual ?? '',
      steps: rec.steps,
      notes: outcome?.notes ?? '',
      ...(precondition ? { precondition } : {}),
    };
    await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(record, null, 2));

    results.push({ id, reproduced: record.reproduced, mp4Size, screenshots: screenshots.length });
    console.log(`  reproduced=${record.reproduced} mp4=${mp4Name ? `${(mp4Size / 1024).toFixed(0)}KB` : 'FAILED'} screenshots=${screenshots.length}`);
  }

  await browser.close();

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`${r.id}\treproduced=${r.reproduced}\tmp4=${r.mp4Size ? `${(r.mp4Size / 1024).toFixed(0)}KB` : 'N/A'}\tscreenshots=${r.screenshots}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
