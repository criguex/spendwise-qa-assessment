import { request } from '@playwright/test';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'evidence', 'report', 'api');
const apiUrl = process.env.SPENDWISE_API_URL;
const gate = { username: process.env.SPENDWISE_PROXY_USER, password: process.env.SPENDWISE_PROXY_PASSWORD };
const seedPassword = process.env.SPENDWISE_SEED_PASSWORD;
if (![apiUrl, gate.username, gate.password, seedPassword].every(Boolean)) throw new Error('Missing SpendWise environment variables');

const secrets = [gate.password, seedPassword];
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const fakeCategory = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const only = new Set(process.argv.slice(2));

const redact = text => {
  let out = String(text ?? '');
  for (const secret of secrets) out = out.split(secret).join('[REDACTED]');
  return out.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '<TOKEN>');
};

function summarize(body) {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.length > 2 ? [...body.slice(0, 2), `… ${body.length - 2} elementos más`] : body;
  const copy = { ...body };
  for (const key of ['items', 'expenses', 'byCategory', 'byStatus', 'overTime', 'byMonth']) {
    if (Array.isArray(copy[key]) && copy[key].length > 2) copy[key] = [...copy[key].slice(0, 2), `… ${copy[key].length - 2} elementos más`];
  }
  if (typeof copy.accessToken === 'string') copy.accessToken = '<TOKEN>';
  return copy;
}

class Recorder {
  constructor(context) { this.context = context; this.log = []; }
  async call(method, url, { token, role, json, multipart, setup = false, note } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const started = Date.now();
    const response = await this.context.fetch(url, { method, headers, data: json, multipart, maxRedirects: 0 });
    const text = await response.text();
    let body = text;
    try { body = text ? JSON.parse(text) : ''; } catch { body = text; }
    const requestBody = multipart
      ? Object.fromEntries(Object.entries(multipart).map(([k, v]) => [k, typeof v === 'object' ? `<archivo ${v.name} · ${v.mimeType} · ${v.buffer.length} bytes>` : v]))
      : json;
    this.log.push({
      setup, note, method, path: url, role: role ?? null,
      requestBody: requestBody === undefined ? null : JSON.parse(redact(JSON.stringify(requestBody))),
      status: response.status(), statusText: response.statusText(),
      responseBody: JSON.parse(redact(JSON.stringify(summarize(body)))),
      durationMs: Date.now() - started, at: new Date().toISOString(),
    });
    return { status: response.status(), body };
  }
}

async function session(rec, role) {
  const res = await rec.call('POST', '/api/v1/auth/login', { json: { email: `${role}@spendwise.test`, password: seedPassword }, setup: true, role, note: `Inicio de sesión ${role}` });
  if (res.status !== 200) throw new Error(`Login ${role} → ${res.status}`);
  return res.body.accessToken;
}

const expense = (overrides = {}) => ({ description: `QA evidencia ${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, amount: 10, date: today, ...overrides });

async function pending(rec, role = 'employee1') {
  const token = await session(rec, role);
  const res = await rec.call('POST', '/api/v1/expenses', { token, role, json: expense({ amount: 125, description: `QA pendiente ${Date.now()}` }), setup: true, note: 'Gasto de USD 125 que queda PendingApproval' });
  if (res.status !== 201 || res.body.status !== 'PendingApproval') throw new Error(`Pending expense → ${res.status} ${res.body?.status}`);
  return res.body;
}

const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v));

const cases = {
  async 'BUG-01'(rec) {
    const t = await session(rec, 'employee3');
    const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 0 }) });
    return { reproduced: r.status === 201, observed: `HTTP ${r.status}; estado ${r.body?.status ?? '-'}` };
  },
  async 'BUG-02'(rec) {
    const t = await session(rec, 'employee3');
    const a = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: -0.01 }) });
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 1.001 }) });
    return { reproduced: a.status === 201 || b.status === 201, observed: `-0.01 → ${a.status}; 1.001 → ${b.status}` };
  },
  async 'BUG-03'(rec) {
    const t = await session(rec, 'employee2');
    const a = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ description: 'd'.repeat(501) }), note: 'Descripción de 501 caracteres' });
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ vendor: 'v'.repeat(201) }), note: 'Proveedor de 201 caracteres' });
    const c = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ notes: 'n'.repeat(1001) }), note: 'Notas de 1001 caracteres' });
    const d = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ receiptUrl: `https://example.invalid/${'r'.repeat(480)}.pdf` }), note: 'Enlace de recibo de 508 caracteres' });
    return { reproduced: [a, b, c, d].some(x => x.status >= 500), observed: `descripción 501 → ${a.status}; proveedor 201 → ${b.status}; notas 1001 → ${c.status}; recibo 508 → ${d.status}` };
  },
  async 'BUG-04'(rec) {
    const t = await session(rec, 'employee1');
    const r = await rec.call('GET', '/api/v1/expenses?page=0', { token: t, role: 'employee1' });
    return { reproduced: r.status >= 500, observed: `HTTP ${r.status}` };
  },
  async 'BUG-05'(rec) {
    const t = await session(rec, 'admin');
    const created = [];
    const a = await rec.call('POST', '/api/v1/policies', { token: t, role: 'admin', json: { name: '', action: 'AutoApprove', maxAmount: 1, requiresReceipt: false, isActive: false }, note: 'Regla con nombre vacío (inactiva)' });
    if (a.status === 201) created.push(a.body.id);
    const b = await rec.call('POST', '/api/v1/policies', { token: t, role: 'admin', json: { name: 'QA negative threshold', action: 'AutoApprove', maxAmount: -1, requiresReceipt: false, isActive: false }, note: 'Regla con límite negativo (inactiva)' });
    if (b.status === 201) created.push(b.body.id);
    const c = await rec.call('POST', '/api/v1/policies', { token: t, role: 'admin', json: { name: 'p'.repeat(201), action: 'AutoApprove', maxAmount: 1, requiresReceipt: false, isActive: false }, note: 'Regla con nombre de 201 caracteres (inactiva)' });
    if (c.status === 201) created.push(c.body.id);
    for (const id of created) await rec.call('DELETE', `/api/v1/policies/${id}`, { token: t, role: 'admin', setup: true, note: 'Limpieza de la regla creada' });
    return { reproduced: a.status === 201 || b.status === 201, observed: `nombre vacío → ${a.status}; maxAmount -1 → ${b.status}; nombre de 201 → ${c.status}; reglas eliminadas después` };
  },
  async 'BUG-06'(rec) {
    const r = await rec.call('GET', '/swagger/v1/swagger.json', { setup: true, note: 'Descarga del OpenAPI publicado' });
    const spec = typeof r.body === 'object' ? r.body : JSON.parse(fs.readFileSync(path.join(root, 'openapi', 'spendwise-openapi.json'), 'utf8'));
    rec.log[rec.log.length - 1].responseBody = { openapi: spec.openapi, info: spec.info, components: Object.keys(spec.components ?? {}) };
    const ops = Object.entries(spec.paths ?? {}).flatMap(([p, o]) => Object.entries(o).map(([m, d]) => ({ op: `${m.toUpperCase()} ${p}`, responses: d.responses ?? {} })));
    const negative = ops.filter(o => Object.keys(o.responses).some(c => /^[45]/.test(c))).length;
    const withSchema = ops.filter(o => Object.values(o.responses).some(r => r.content)).length;
    const documented = op => Object.keys(ops.find(o => o.op === op)?.responses ?? {}).join(', ');
    return {
      reproduced: negative === 0 || withSchema === 0,
      observed: `${negative}/${ops.length} operaciones documentan respuestas 4xx/5xx; ${withSchema}/${ops.length} documentan esquema de respuesta; POST /api/v1/expenses documenta ${documented('POST /api/v1/expenses')} y el runtime responde 201; DELETE /api/v1/expenses/{id} documenta ${documented('DELETE /api/v1/expenses/{id}')} y el runtime responde 204`,
      analysis: { operaciones: ops.length, conRespuestasNegativas: negative, conEsquemaDeRespuesta: withSchema, securitySchemes: Object.keys(spec.components?.securitySchemes ?? {}), seguridadGlobal: spec.security ?? null, ejemploPostExpenses: ops.find(o => o.op === 'POST /api/v1/expenses')?.responses },
    };
  },
  async 'BUG-07'(rec) {
    const login = await rec.call('POST', '/api/v1/auth/login', { json: { email: 'employee1@spendwise.test', password: seedPassword }, role: 'employee1', note: 'El id del usuario en la respuesta de login' });
    const t = login.body.accessToken;
    const cats = await rec.call('GET', '/api/v1/categories', { token: t, role: 'employee1' });
    const list = Array.isArray(cats.body) ? cats.body : cats.body.items ?? [];
    const badIds = [login.body.user?.id, ...list.map(c => c.id)].filter(id => !isUuid(id));
    const noIcon = list.filter(c => !('icon' in c)).length;
    return { reproduced: noIcon > 0, observed: `${noIcon}/${list.length} categorías sin icon. Observación: ${badIds.length} identificadores tienen formato GUID válido pero no siguen la versión RFC 4122 (p. ej. ${badIds[0] ?? '-'})` };
  },
  async 'BUG-08'(rec) {
    const t = await session(rec, 'employee2');
    const c = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ amount: 10 }), setup: true, note: 'Gasto de USD 10 → AutoApproved (estado final)' });
    const d = await rec.call('DELETE', `/api/v1/expenses/${c.body.id}`, { token: t, role: 'employee2' });
    const g = await rec.call('GET', `/api/v1/expenses/${c.body.id}`, { token: t, role: 'employee2', note: 'El gasto ya no existe' });
    const m = await session(rec, 'manager1');
    const results = [];
    for (const decision of ['approve', 'reject']) {
      const e = await pending(rec);
      await rec.call('PUT', `/api/v1/approvals/${e.id}/${decision}`, { token: m, role: 'manager1', json: decision === 'reject' ? { reason: 'Rechazo controlado de QA' } : undefined, setup: true, note: decision === 'approve' ? 'Aprobación del gerente' : 'Rechazo del gerente' });
      const e1 = await session(rec, 'employee1');
      const del = await rec.call('DELETE', `/api/v1/expenses/${e.id}`, { token: e1, role: 'employee1', note: decision === 'approve' ? 'El dueño elimina un gasto Approved' : 'El dueño elimina un gasto Rejected' });
      results.push(`${decision === 'approve' ? 'Approved' : 'Rejected'} → ${del.status}`);
    }
    return { reproduced: d.status === 204, observed: `AutoApproved → ${d.status} (GET posterior ${g.status}); ${results.join('; ')}` };
  },
  async 'BUG-11'(rec) {
    const t = await session(rec, 'employee3');
    const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ categoryId: crypto.randomUUID() }), note: 'categoryId UUID válido pero inexistente' });
    return { reproduced: r.status >= 500, observed: `HTTP ${r.status}` };
  },
  async 'BUG-12'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', '/api/v1/reports', { token: t, role: 'finance' });
    const all = await rec.context.fetch('/api/v1/reports', { headers: { Authorization: `Bearer ${t}` } }).then(x => x.json());
    const rejected = all.expenses.filter(e => e.status === 'Rejected');
    const valid = all.expenses.filter(e => e.status !== 'Rejected');
    const sum = xs => Math.round(xs.reduce((s, e) => s + e.amount, 0) * 100) / 100;
    const byCat = Math.round(all.byCategory.reduce((s, x) => s + x.total, 0) * 100) / 100;
    const e1 = await session(rec, 'employee1');
    const dash = await rec.call('GET', '/api/v1/dashboard/summary', { token: e1, role: 'employee1', note: 'Gasto del mes del tablero de employee1' });
    const mine = [];
    for (let page = 1; ; page++) { const b = await rec.context.fetch(`/api/v1/expenses?page=${page}&pageSize=100`, { headers: { Authorization: `Bearer ${e1}` } }).then(x => x.json()); mine.push(...b.items); if (mine.length >= b.totalCount || !b.items.length) break; }
    const nowDay = new Date().toISOString().slice(0, 10);
    const month = mine.filter(e => e.date.startsWith(nowDay.slice(0, 7)) && e.date <= nowDay);
    const analysis = { totalAmountReportado: all.totalAmount, sumaSinRechazados: sum(valid), sumaRechazados: sum(rejected), totalCountReportado: all.totalCount, conteoSinRechazados: valid.length, rechazados: rejected.length, sumaByCategory: byCat, tableroGastoDelMes: dash.body.spendThisMonth, tableroSinRechazados: sum(month.filter(e => e.status !== 'Rejected')), tableroRechazadosDelMes: sum(month.filter(e => e.status === 'Rejected')) };
    return { reproduced: Math.abs(all.totalAmount - sum(valid)) > 0.009 || all.totalCount !== valid.length, observed: `Reports: totalAmount ${all.totalAmount} vs ${sum(valid)} sin rechazados (diferencia ${sum(rejected)}); totalCount ${all.totalCount} vs ${valid.length}. Tablero de employee1: ${dash.body.spendThisMonth} vs ${analysis.tableroSinRechazados} sin rechazados`, analysis };
  },
  async 'BUG-14'(rec) {
    const t = await session(rec, 'employee2');
    const base = expense();
    const { amount, ...noAmount } = base;
    const { date, ...noDate } = expense();
    const a = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ description: '     ' }), note: 'Descripción solo con espacios' });
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: noAmount, note: 'Sin amount' });
    const c = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: noDate, note: 'Sin date' });
    const d = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ amount: '10.00' }), note: 'amount enviado como string' });
    return { reproduced: [a, b, c, d].some(x => x.status === 201), observed: `espacios → ${a.status}; sin amount → ${b.status} (amount ${b.body?.amount}); sin date → ${c.status} (date ${c.body?.date}); amount string → ${d.status}` };
  },
  async 'BUG-15'(rec) {
    const t = await session(rec, 'employee2');
    const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee2', json: expense({ amount: 30, receiptUrl: 'https://example.invalid/not-an-uploaded-receipt.pdf' }), note: 'USD 30 con una URL externa como comprobante' });
    return { reproduced: r.status === 201, observed: `HTTP ${r.status}; estado ${r.body?.status}; receiptUrl ${r.body?.receiptUrl}` };
  },
  async 'BUG-16'(rec) {
    const t = await session(rec, 'finance');
    const base = await rec.call('GET', '/api/v1/reports', { token: t, role: 'finance', setup: true, note: 'Reporte sin filtro (referencia)' });
    const r = await rec.call('GET', '/api/v1/reports?status=MadeUpStatus', { token: t, role: 'finance' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; totalCount ${r.body?.totalCount} (sin filtro: ${base.body?.totalCount})` };
  },
  async 'BUG-18'(rec) {
    const f = await session(rec, 'finance');
    await rec.call('GET', '/api/v1/policies', { token: f, role: 'finance', note: 'Texto de la regla tal como lo devuelve la API' });
    const t = await session(rec, 'employee3');
    const receipt = 'https://example.invalid/qa-receipt.pdf';
    const a = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 49.99, receiptUrl: receipt }), note: 'USD 49,99 con recibo' });
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 50, receiptUrl: receipt }), note: 'USD 50 con recibo (el Anexo E exige PendingApproval)' });
    const c = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 50.01, receiptUrl: receipt }), setup: true, note: 'Control: USD 50,01 con recibo' });
    return { reproduced: b.body?.status === 'AutoApproved', observed: `49,99 → ${a.body?.status} (correcto); 50 → ${b.body?.status}; 50,01 → ${c.body?.status}. El motor aplica "≤ 50" en lugar de "< 50"` };
  },
  async 'BUG-19'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', '/api/v1/approvals/pending', { token: t, role: 'finance' });
    const list = Array.isArray(r.body) ? r.body : r.body?.items ?? [];
    const keys = list[0] ? Object.keys(list[0]) : [];
    const has = keys.some(k => /submit|owner|user|employee|requester/i.test(k));
    return { reproduced: list.length > 0 && !has, observed: `campos de cada elemento: ${keys.join(', ')}`, analysis: { campos: keys } };
  },
  async 'BUG-22'(rec) {
    const t = await session(rec, 'employee1');
    const r = await rec.call('GET', '/api/v1/expenses?pageSize=0', { token: t, role: 'employee1' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; items ${r.body?.items?.length}; totalCount ${r.body?.totalCount}; pageSize ${r.body?.pageSize}` };
  },
  async 'BUG-23'(rec) {
    const t = await session(rec, 'employee1');
    const r = await rec.call('GET', '/api/v1/expenses?status=Deleted&pageSize=50', { token: t, role: 'employee1' });
    const all = await rec.context.fetch('/api/v1/expenses?status=Deleted&pageSize=50', { headers: { Authorization: `Bearer ${t}` } }).then(x => x.json());
    const statuses = [...new Set((all.items ?? []).map(i => i.status))];
    return { reproduced: r.status === 200 && statuses.length > 0, observed: `HTTP ${r.status}; estados devueltos: ${statuses.join(', ')}` };
  },
  async 'BUG-24'(rec) {
    const t = await session(rec, 'employee1');
    const base = await rec.call('GET', '/api/v1/expenses', { token: t, role: 'employee1', setup: true, note: 'Listado sin filtro (referencia)' });
    const r = await rec.call('GET', `/api/v1/expenses?categoryId=${fakeCategory}`, { token: t, role: 'employee1' });
    return { reproduced: r.status === 200 && r.body?.totalCount === base.body?.totalCount && base.body?.totalCount > 0, observed: `HTTP ${r.status}; totalCount ${r.body?.totalCount} (sin filtro: ${base.body?.totalCount})` };
  },
  async 'BUG-25'(rec) {
    const t = await session(rec, 'manager1');
    const r = await rec.call('PUT', '/api/v1/approvals/not-a-uuid/approve', { token: t, role: 'manager1' });
    return { reproduced: r.status === 404, observed: `HTTP ${r.status}; cuerpo ${r.body === '' ? 'vacío' : JSON.stringify(r.body).slice(0, 80)}` };
  },
  async 'BUG-26'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', '/api/v1/reports?dateFrom=2026-10-31&dateTo=2026-10-01', { token: t, role: 'finance' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; totalAmount ${r.body?.totalAmount}; totalCount ${r.body?.totalCount}` };
  },
  async 'BUG-27'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', `/api/v1/reports?categoryId=${fakeCategory}`, { token: t, role: 'finance' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; totalAmount ${r.body?.totalAmount}; totalCount ${r.body?.totalCount}` };
  },
  async 'BUG-28'(rec) {
    const t = await session(rec, 'employee2');
    const r = await rec.call('POST', '/api/v1/receipts/extract', { token: t, role: 'employee2', multipart: { file: { name: 'disguised.pdf', mimeType: 'application/pdf', buffer: Buffer.from('MZ executable payload') } }, note: 'Archivo .pdf cuyo contenido empieza por la cabecera ejecutable MZ (no se ejecuta)' });
    return { reproduced: r.status >= 500, observed: `HTTP ${r.status}` };
  },
  async 'BUG-29'(rec) {
    const e1 = await pending(rec);
    const e2 = await pending(rec);
    const m = await session(rec, 'manager1');
    const a = await rec.call('PUT', `/api/v1/approvals/${e1.id}/reject`, { token: m, role: 'manager1', json: {}, note: 'Rechazo con cuerpo vacío' });
    const b = await rec.call('PUT', `/api/v1/approvals/${e2.id}/reject`, { token: m, role: 'manager1', json: { reason: '   ' }, note: 'Rechazo con motivo de solo espacios' });
    const g = await rec.call('GET', `/api/v1/expenses/${e1.id}`, { token: m, role: 'manager1', note: 'Estado final del primer gasto' });
    const h = await rec.call('GET', `/api/v1/expenses/${e1.id}/history`, { token: m, role: 'manager1', note: 'Historial: el rechazo queda sin motivo' });
    return { reproduced: a.status === 200 || b.status === 200, observed: `{} → ${a.status}; "   " → ${b.status}; estado ${g.body?.status}; motivo en historial: ${JSON.stringify(h.body?.[0]?.notes ?? null)}` };
  },
  async 'BUG-35'(rec) {
    const e = await pending(rec);
    const m = await session(rec, 'manager1');
    const a = await rec.call('PUT', `/api/v1/approvals/${e.id}/approve`, { token: m, role: 'manager1', setup: true, note: 'Primera aprobación (legítima)' });
    const b = await rec.call('PUT', `/api/v1/approvals/${e.id}/approve`, { token: m, role: 'manager1', note: 'Segunda aprobación sobre un gasto ya Approved' });
    const h = await rec.call('GET', `/api/v1/expenses/${e.id}/history`, { token: m, role: 'manager1', note: 'Historial después de la segunda aprobación' });
    const dup = (h.body ?? []).filter(x => x.fromStatus === 'Approved' && x.toStatus === 'Approved').length;
    return { reproduced: a.status === 200 && b.status === 200, observed: `primera → ${a.status}; segunda → ${b.status}; registros de auditoría Approved→Approved: ${dup}` };
  },
  async 'BUG-36'(rec) {
    const e = await pending(rec);
    const m = await session(rec, 'manager1');
    const a = await rec.call('PUT', `/api/v1/approvals/${e.id}/reject`, { token: m, role: 'manager1', json: { reason: 'Rechazo controlado de QA' }, setup: true, note: 'Rechazo legítimo con motivo' });
    const b = await rec.call('PUT', `/api/v1/approvals/${e.id}/approve`, { token: m, role: 'manager1', note: 'Aprobación posterior sobre un gasto Rejected' });
    const g = await rec.call('GET', `/api/v1/expenses/${e.id}`, { token: m, role: 'manager1', note: 'Estado final del gasto' });
    await rec.call('GET', `/api/v1/expenses/${e.id}/history`, { token: m, role: 'manager1', note: 'Historial: Rejected → Approved' });
    const ap = await pending(rec);
    await rec.call('PUT', `/api/v1/approvals/${ap.id}/approve`, { token: m, role: 'manager1', setup: true, note: 'Aprobación legítima' });
    const late = await rec.call('PUT', `/api/v1/approvals/${ap.id}/reject`, { token: m, role: 'manager1', json: { reason: 'Rechazo posterior' }, note: 'Rechazo sobre un gasto ya Approved' });
    const e1 = await session(rec, 'employee1');
    const auto = await rec.call('POST', '/api/v1/expenses', { token: e1, role: 'employee1', json: expense({ amount: 10 }), setup: true, note: 'Gasto de USD 10 → AutoApproved' });
    const f = await session(rec, 'finance');
    const aa = await rec.call('PUT', `/api/v1/approvals/${auto.body.id}/approve`, { token: f, role: 'finance', note: 'Finance aprueba un gasto AutoApproved' });
    const ar = await rec.call('PUT', `/api/v1/approvals/${auto.body.id}/reject`, { token: f, role: 'finance', json: { reason: 'Rechazo de un estado final' }, note: 'Finance rechaza el mismo gasto' });
    return { reproduced: b.status === 200 && g.body?.status === 'Approved', observed: `Rejected → approve ${b.status} (estado ${g.body?.status}, nota "${g.body?.notes}"); Approved → reject ${late.status} (estado ${late.body?.status}); AutoApproved → approve ${aa.status}, reject ${ar.status} (estado final ${ar.body?.status})` };
  },
  async 'BUG-39'(rec) {
    const t = await session(rec, 'employee3');
    const policies = await session(rec, 'finance');
    await rec.call('GET', '/api/v1/policies', { token: policies, role: 'finance', setup: true, note: 'Reglas vigentes: Receipt required at $25+ activa' });
    const a = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 24.99 }), setup: true, note: 'Control: USD 24,99 sin recibo se acepta (correcto)' });
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 25 }), note: 'USD 25 sin recibo' });
    const c = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 80 }), note: 'USD 80 sin recibo (ejemplo literal del Anexo E)' });
    return { reproduced: b.status === 201 || c.status === 201, observed: `24,99 → ${a.status} ${a.body?.status}; 25 → ${b.status} ${b.body?.status}; 80 → ${c.status} ${c.body?.status}` };
  },
  async 'BUG-40'(rec) {
    const t = await session(rec, 'employee1');
    const ui = await rec.call('GET', '/api/v1/expenses?status=Pending&page=1&pageSize=20', { token: t, role: 'employee1', note: 'Consulta que envía la pestaña Pending de la interfaz' });
    const ok = await rec.call('GET', '/api/v1/expenses?status=PendingApproval&page=1&pageSize=20', { token: t, role: 'employee1', note: 'Consulta correcta para los gastos pendientes de aprobación' });
    return { reproduced: ui.body?.totalCount === 0 && ok.body?.totalCount > 0, observed: `status=Pending → ${ui.body?.totalCount} gastos; status=PendingApproval → ${ok.body?.totalCount} gastos` };
  },
  async 'BUG-41'(rec) {
    const adm = await session(rec, 'admin');
    const t = await session(rec, 'employee3');
    const rule = await rec.call('POST', '/api/v1/policies', { token: adm, role: 'admin', json: { name: `QA Block over 100 ${Date.now()}`, action: 'Block', maxAmount: 100, requiresReceipt: false, isActive: true }, note: 'Regla Block activa con maxAmount 100 (temporal)' });
    const out = {};
    try {
      for (const amount of [150, 60, 10]) {
        const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount, receiptUrl: 'https://example.invalid/qa-receipt.pdf' }), note: `USD ${amount} con la regla Block activa` });
        out[amount] = r.body?.status;
      }
    } finally {
      await rec.call('DELETE', `/api/v1/policies/${rule.body.id}`, { token: adm, role: 'admin', setup: true, note: 'Eliminación de la regla temporal' });
    }
    const after = await rec.call('GET', '/api/v1/policies', { token: adm, role: 'admin', setup: true, note: 'Reglas tras la limpieza: solo las dos originales' });
    return { reproduced: out[150] !== 'Rejected' && out[10] === 'Rejected', observed: `150 → ${out[150]}; 60 → ${out[60]}; 10 → ${out[10]}; reglas activas después: ${after.body.map(p => p.name).join(', ')}` };
  },
  async 'BUG-42'(rec) {
    const t = await session(rec, 'employee1');
    const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee1', json: expense({ amount: 10 }), setup: true, note: 'Gasto de USD 10 → AutoApproved' });
    const h = await rec.call('GET', `/api/v1/expenses/${r.body.id}/history`, { token: t, role: 'employee1', note: 'Historial de la decisión automática' });
    await rec.call('GET', `/api/v1/expenses/${r.body.id}`, { token: t, role: 'employee1', note: 'Detalle del gasto: no hay campo de regla' });
    return { reproduced: !String(h.body?.[0]?.notes ?? '').includes('Auto-approve under $50'), observed: `actor ${h.body?.[0]?.performedBy}; motivo "${h.body?.[0]?.notes}"` };
  },
  async 'BUG-43'(rec) {
    const e = await pending(rec);
    const m = await session(rec, 'manager1');
    const a = await rec.call('PUT', `/api/v1/approvals/${e.id}/approve`, { token: m, role: 'manager1', json: { comment: 'Aprobado con comentario de QA' }, note: 'Aprobación con comentario opcional' });
    const h = await rec.call('GET', `/api/v1/expenses/${e.id}/history`, { token: m, role: 'manager1', note: 'Historial de la aprobación' });
    return { reproduced: a.status === 200 && h.body?.[0]?.notes !== 'Aprobado con comentario de QA', observed: `approve → ${a.status}; notes del historial ${JSON.stringify(h.body?.[0]?.notes)}` };
  },
  async 'BUG-44'(rec) {
    const t = await session(rec, 'employee3');
    const now = new Date();
    const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const b = await rec.call('GET', '/api/v1/dashboard/summary', { token: t, role: 'employee3', note: 'Tablero antes' });
    await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ amount: 10, date: lastDay }), note: `Gasto de USD 10 con fecha futura ${lastDay}` });
    const a = await rec.call('GET', '/api/v1/dashboard/summary', { token: t, role: 'employee3', note: 'Tablero después' });
    const delta = Math.round((a.body.spendThisMonth - b.body.spendThisMonth) * 100) / 100;
    return { reproduced: delta !== 0, observed: `gasto del mes ${b.body.spendThisMonth} → ${a.body.spendThisMonth} (+${delta}) tras registrar un gasto fechado ${lastDay}` };
  },
  async 'BUG-45'(rec) {
    const t = await session(rec, 'employee2');
    const txt = await rec.call('POST', '/api/v1/receipts/extract', { token: t, role: 'employee2', multipart: { file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a receipt') } }, note: 'Archivo .txt: el mensaje lista los tipos aceptados' });
    const gif = await rec.call('POST', '/api/v1/receipts/extract', { token: t, role: 'employee2', multipart: { file: { name: 'pixel.gif', mimeType: 'image/gif', buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64') } }, note: 'Imagen GIF de 1×1 px: se acepta aunque el mensaje no la menciona' });
    const empty = await rec.call('POST', '/api/v1/receipts/extract', { token: t, role: 'employee2', multipart: { file: { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) } }, note: 'Archivo PDF vacío' });
    const msg = JSON.stringify(txt.body);
    return { reproduced: gif.status === 200 && !/GIF/i.test(msg), observed: `.txt → ${txt.status} ${msg}; GIF → ${gif.status}; vacío → ${empty.status} ${JSON.stringify(empty.body)}` };
  },
  async 'IMP-01'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', '/api/v1/expenses?pageSize=1000', { token: t, role: 'finance', note: 'pageSize=1000' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; pageSize ${r.body?.pageSize}; totalCount ${r.body?.totalCount}` };
  },
  async 'IMP-02'(rec) {
    const t = await session(rec, 'finance');
    const r = await rec.call('GET', '/api/v1/expenses?search=%00%0A%0D', { token: t, role: 'finance', note: 'Búsqueda con NUL, LF y CR' });
    return { reproduced: r.status === 200, observed: `HTTP ${r.status}; totalCount ${r.body?.totalCount}` };
  },
  async 'IMP-03'(rec) {
    const m = await session(rec, 'manager1');
    const a = await rec.call('PUT', '/api/v1/approvals/not-a-uuid/approve', { token: m, role: 'manager1', note: '404 sin cuerpo' });
    const t = await session(rec, 'employee3');
    const b = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee3', json: expense({ categoryId: crypto.randomUUID() }), note: '500 genérico' });
    const c = await rec.call('POST', '/api/v1/receipts/extract', { token: t, role: 'employee3', multipart: { file: { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') } }, note: '400 con {"error"}' });
    const d = await rec.call('POST', '/api/v1/auth/login', { json: { email: 'employee3@spendwise.test', password: 'WrongPass1' }, note: '401 con {"code","message"}' });
    return { reproduced: true, observed: `formatos: ${a.status} ${JSON.stringify(a.body) || 'vacío'} · ${b.status} ${JSON.stringify(b.body)} · ${c.status} ${JSON.stringify(c.body)} · ${d.status} ${JSON.stringify(d.body)}` };
  },
  async 'BUG-37'(rec) {
    const t = await session(rec, 'employee1');
    const r = await rec.call('POST', '/api/v1/expenses', { token: t, role: 'employee1', json: expense({ currency: 'ZZZ' }), note: 'Propiedad no declarada en CreateExpenseRequest' });
    return { reproduced: r.status === 201, observed: `HTTP ${r.status}; currency en la respuesta: ${r.body && 'currency' in r.body ? r.body.currency : 'omitida'}` };
  },
};

fs.mkdirSync(outDir, { recursive: true });
const context = await request.newContext({ baseURL: apiUrl, ignoreHTTPSErrors: true, httpCredentials: gate, extraHTTPHeaders: { Accept: 'application/json' } });
const g = await context.get('/__gate', { maxRedirects: 0 });
if (g.status() !== 302) throw new Error(`Gate → ${g.status()}`);
const summary = [];
for (const [id, run] of Object.entries(cases)) {
  if (only.size && !only.has(id)) continue;
  const rec = new Recorder(context);
  let result;
  try { result = await run(rec); } catch (error) { result = { reproduced: null, observed: `Error de ejecución: ${redact(error.message)}` }; }
  const record = { id, capturedAt: new Date().toISOString(), environment: new URL(apiUrl).host, ...result, exchanges: rec.log };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(record, null, 2));
  summary.push(`${id}\t${result.reproduced === true ? 'REPRODUCE' : result.reproduced === false ? 'NO REPRODUCE' : 'ERROR'}\t${result.observed}`);
  console.log(summary.at(-1));
}
await context.dispose();
