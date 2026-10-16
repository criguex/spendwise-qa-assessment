import { chromium } from '@playwright/test';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'evidence', 'selected');
const webUrl = process.env.SPENDWISE_WEB_URL;
const proxyUser = process.env.SPENDWISE_PROXY_USER;
const proxyPassword = process.env.SPENDWISE_PROXY_PASSWORD;
const seedPassword = process.env.SPENDWISE_SEED_PASSWORD;
if (![webUrl, proxyUser, proxyPassword, seedPassword].every(Boolean)) throw new Error('Missing SpendWise environment variables');

const browser = await chromium.launch({ headless: true });

const cursorScript = () => {
  const install = () => {
    if (document.querySelector('#qa-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'qa-cursor';
    Object.assign(cursor.style, {
      position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
      background: '#ffe600', border: '3px solid #111827', zIndex: '2147483647',
      pointerEvents: 'none', transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 3px #fff'
    });
    const banner = document.createElement('div');
    banner.id = 'qa-step';
    Object.assign(banner.style, {
      position: 'fixed', left: '20px', bottom: '20px', maxWidth: '720px',
      padding: '10px 14px', background: '#102a43ee', color: '#fff', borderRadius: '8px',
      font: '700 16px system-ui', zIndex: '2147483646', pointerEvents: 'none'
    });
    banner.textContent = 'QA evidence';
    document.body.append(cursor, banner);
    document.addEventListener('mousemove', event => {
      cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`;
    }, true);
    document.addEventListener('mousedown', () => {
      cursor.animate([
        { boxShadow: '0 0 0 3px #fff,0 0 0 5px #ef4444' },
        { boxShadow: '0 0 0 3px #fff,0 0 0 24px #ef444400' }
      ], { duration: 650 });
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
};

async function step(page, text, wait = 700) {
  await page.evaluate(cursorScript);
  await page.waitForSelector('#qa-step');
  await page.evaluate(value => { const el = document.querySelector('#qa-step'); if (el) el.textContent = value; }, text);
  await page.waitForTimeout(wait);
}

async function visibleClick(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Target is not visible');
  const x = box.x + box.width / 2; const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 14 });
  await page.waitForTimeout(450);
  await page.mouse.click(x, y);
}

async function login(page, email) {
  await step(page, `PASO 1 · Iniciar sesión como ${email}`);
  const emailField = page.getByTestId('login-email');
  const passwordField = page.getByTestId('login-password');
  await visibleClick(page, emailField); await emailField.fill(email);
  await visibleClick(page, passwordField); await passwordField.fill(seedPassword);
  await step(page, 'CLIC · Sign in (contraseña enmascarada)', 500);
  await visibleClick(page, page.getByRole('button', { name: /sign in/i }));
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
}

async function record(id, run) {
  const dir = path.join(output, id);
  await fs.mkdir(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: true,
    httpCredentials: { username: proxyUser, password: proxyPassword },
    recordVideo: { dir, size: { width: 1280, height: 720 } }
  });
  await context.addInitScript(cursorScript);
  const page = await context.newPage();
  const video = page.video();
  await run(page);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(dir, `${id}-selected.png`), fullPage: false });
  await context.close();
  const raw = await video.path();
  await fs.rename(raw, path.join(dir, `${id}-pointer.webm`));
}

await record('BUG-09', async page => {
  await page.goto(`${webUrl}/expenses`);
  await step(page, 'PRECONDICIÓN · Deep link solicitado: /expenses');
  await login(page, 'employee2@spendwise.test');
  await step(page, `DEFECTO · Esperado /expenses · Obtenido ${new URL(page.url()).pathname}`, 2200);
});

await record('BUG-10', async page => {
  await page.goto(`${webUrl}/login`);
  await login(page, 'admin@spendwise.test');
  await step(page, 'DEFECTO · Administrator no debe ver New expense');
  const target = page.getByRole('link', { name: /new expense/i }).first();
  const box = await target.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  await step(page, 'OBTENIDO · New expense está visible para Administrator', 2200);
});

await record('E2E-06-ACCESS-DENIED-PASS', async page => {
  await page.goto(`${webUrl}/login`);
  await login(page, 'employee1@spendwise.test');
  await step(page, 'PASO 2 · Employee navega directamente a /policies', 900);
  await page.goto(`${webUrl}/policies`);
  await step(page, 'CONTROL QA · Access denied visible: comportamiento correcto', 2200);
});

await browser.close();
