import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defects, improvements } from './report/defects.ts';

const root = path.resolve(import.meta.dirname, '..');
const apiDir = path.join(root, 'evidence', 'report', 'api');
const impDir = path.join(root, 'evidence', 'report', 'improvements');
fs.mkdirSync(impDir, { recursive: true });
const only = new Set(process.argv.slice(2));

const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const cot = iso => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
const clip = (value, lines = 22) => {
  const walk = v => {
    if (typeof v === 'string' && v.length > 70) return /^(.)\1+$/.test(v) ? `${v.slice(0, 6)}… (${v.length} caracteres)` : `${v.slice(0, 64)}…`;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  if (value === null || value === undefined || value === '') return '(sin cuerpo)';
  const text = JSON.stringify(walk(value), null, 2).split('\n');
  return text.length > lines ? [...text.slice(0, lines), '  …'].join('\n') : text.join('\n');
};
const statusColor = code => (code >= 500 ? '#b42318' : code >= 400 ? '#b54708' : '#087443');

const css = `*{box-sizing:border-box}body{margin:0;background:#eef2f5;font:15px/1.45 -apple-system,"Segoe UI",Roboto,sans-serif;color:#16202b;padding:22px}
.card{background:#fff;border:1px solid #dbe2e8;border-radius:12px;overflow:hidden;width:1236px}
.head{background:#16202b;color:#fff;padding:16px 20px}.head h1{margin:0;font-size:21px}.head p{margin:4px 0 0;color:#cfd8e0;font-size:13px}
.banner{padding:12px 20px;font-weight:700;font-size:15px}.banner.bad{background:#7a1d16;color:#fff}.banner.imp{background:#7a4b06;color:#fff}.banner div+div{margin-top:4px}
.body{padding:14px 20px 18px}.ex{border:1px solid #dbe2e8;border-left:6px solid #d92d20;border-radius:8px;margin:10px 0;overflow:hidden}.ex.imp{border-left-color:#f79009}
.exh{display:flex;justify-content:space-between;align-items:center;background:#f6f8fa;padding:8px 12px;font-weight:700}.exh code{font:13px ui-monospace,Menlo,monospace;font-weight:600}
.st{color:#fff;border-radius:999px;padding:2px 10px;font:700 13px ui-monospace,Menlo,monospace}
.cols{display:grid;grid-template-columns:1fr 1fr}.cols>div{padding:8px 12px}.cols>div+div{border-left:1px solid #dbe2e8}.lbl{font-size:11px;text-transform:uppercase;color:#5c6874;font-weight:700;margin-bottom:4px}
pre{margin:0;font:12px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
.setup{color:#5c6874;font-size:12.5px;margin-top:10px}.setup li{margin:2px 0}.why{background:#fff8e6;border:1px solid #f5d38a;border-radius:8px;padding:10px 12px;margin-top:10px;font-size:14px}
.tag{display:inline-block;background:#d92d20;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:5px;margin-right:8px}.tag.imp{background:#f79009}`;

function exchangeHtml(e, kind) {
  return `<div class="ex ${kind}"><div class="exh"><span><span class="tag ${kind}">${kind === 'imp' ? 'OBSERVADO' : 'EVIDENCIA'}</span>${esc(e.note ?? '')}</span><span class="st" style="background:${statusColor(e.status)}">${e.status}</span></div>
  <div class="cols"><div><div class="lbl">Petición · ${esc(e.role ?? 'sin sesión')}</div><pre><b>${esc(e.method)} ${esc(e.path)}</b>\n${esc(e.requestBody === null ? '' : clip(e.requestBody, 12))}</pre></div><div><div class="lbl">Respuesta</div><pre>${esc(clip(e.responseBody))}</pre></div></div></div>`;
}

function cardHtml({ id, title, subtitle, bannerKind, top, bottom, record, kind, why }) {
  const key = record.exchanges.filter(e => !e.setup).slice(0, 5);
  const setup = record.exchanges.filter(e => e.setup);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="card">
  <div class="head"><h1>${esc(id)} — ${esc(title)}</h1><p>${esc(subtitle)} · ${esc(cot(record.capturedAt))} (hora Colombia) · API ${esc(record.environment)}</p></div>
  <div class="banner ${bannerKind}"><div>${top}</div><div>${bottom}</div></div>
  <div class="body">${key.map(e => exchangeHtml(e, kind)).join('')}
  ${why ? `<div class="why">${why}</div>` : ''}
  ${setup.length ? `<ul class="setup"><b>Preparación (${setup.length}):</b>${setup.map(e => `<li>${esc(e.method)} ${esc(e.path)} → ${e.status}${e.note ? ` · ${esc(e.note)}` : ''}</li>`).join('')}</ul>` : ''}
  </div></div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
let count = 0;
async function shoot(html, out) {
  await page.setContent(html);
  await page.locator('.card').screenshot({ path: out });
  count++;
}

for (const d of defects) {
  const file = path.join(apiDir, `${d.id}.json`);
  if (!fs.existsSync(file) || (only.size && !only.has(d.id))) continue;
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  await shoot(cardHtml({
    id: d.id, title: d.title, subtitle: `${d.role} · ${d.rules.join(' · ')}`, bannerKind: 'bad', kind: 'bad', record,
    top: `ESPERADO: ${esc(d.expected)}`, bottom: `REAL: ${esc(record.observed)}`,
  }), path.join(apiDir, `${d.id}.png`));
}

for (const imp of improvements) {
  const file = path.join(apiDir, `${imp.id}.json`);
  if (!fs.existsSync(file) || (only.size && !only.has(imp.id))) continue;
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  await shoot(cardHtml({
    id: imp.id, title: imp.title, subtitle: imp.area, bannerKind: 'imp', kind: 'imp', record,
    top: `OBSERVADO: ${esc(record.observed)}`, bottom: `POR QUÉ ES MEJORA Y NO DEFECTO: ${esc(imp.whyNotDefect)}`,
    why: `<b>Propuesta:</b> ${esc(imp.acceptance)}`,
  }), path.join(impDir, `${imp.id}.png`));
}

const docCard = (id, title, area, observed, why, blocks) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="card">
  <div class="head"><h1>${esc(id)} — ${esc(title)}</h1><p>${esc(area)} · evidencia del repositorio</p></div>
  <div class="banner imp"><div>OBSERVADO: ${esc(observed)}</div><div>POR QUÉ ES MEJORA Y NO DEFECTO: ${esc(why)}</div></div>
  <div class="body">${blocks.map(([label, text]) => `<div class="ex imp"><div class="exh"><span><span class="tag imp">OBSERVADO</span>${esc(label)}</span></div><div style="padding:8px 12px"><pre>${esc(text)}</pre></div></div>`).join('')}</div></div></body></html>`;

for (const imp of improvements.filter(i => ['IMP-07', 'IMP-08'].includes(i.id))) {
  if (only.size && !only.has(imp.id)) continue;
  const blocks = imp.id === 'IMP-07'
    ? [['.github/workflows/quality.yml (pasos que ejecuta CI)', fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8').split('\n').filter(l => /- run:|name:|on:|workflow_dispatch|push:/.test(l)).join('\n')],
       ['evidence/test-run-mutation-2026-10-16.txt', fs.readFileSync(path.join(root, 'evidence/test-run-mutation-2026-10-16.txt'), 'utf8').split('\n').filter(l => /Mutantes|Muertos|Sobrevivientes|score/i.test(l)).join('\n')]]
    : [['evidence/contract-data-r4-2026-10-16.txt', fs.readFileSync(path.join(root, 'evidence/contract-data-r4-2026-10-16.txt'), 'utf8').split('\n').filter(l => /Comando|colisión|output/i.test(l)).join('\n')]];
  await shoot(docCard(imp.id, imp.title, imp.area, imp.observed, imp.whyNotDefect, blocks), path.join(impDir, `${imp.id}.png`));
}

await browser.close();
console.log(`${count} tarjetas de evidencia generadas`);
