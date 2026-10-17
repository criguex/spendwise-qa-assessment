import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import { defects } from './report/defects.mjs';

const [input, output = path.join(import.meta.dirname, '..', 'evidence', 'report', 'full-run.json')] = process.argv.slice(2);
if (!input) throw new Error('Uso: node scripts/summarize-run.mjs <playwright-json> [salida]');

const secrets = [process.env.SPENDWISE_PROXY_PASSWORD, process.env.SPENDWISE_SEED_PASSWORD].filter(Boolean);
const redact = text => {
  let out = String(text ?? '');
  for (const s of secrets) out = out.split(s).join('[REDACTED]');
  return out.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '<TOKEN>').replace(/\u001b\[[0-9;]*m/g, '');
};

const consolidated = { 'VAL-09': 'BUG-04', 'MUT-EXPQ-01': 'BUG-04', 'MUT-EXPQ-02': 'BUG-04', 'MUT-EXPQ-03': 'BUG-04', 'MUT-REP-03': 'BUG-16' };
const owner = new Map(Object.entries(consolidated));
for (const d of defects) for (const t of d.tests) if (/^[A-Z0-9]+(-[A-Z0-9]+)+[a-z]?$/.test(t)) owner.set(t, d.id);

const report = JSON.parse(fs.readFileSync(input, 'utf8'));
const tests = [];
const walk = (suite, file) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const result = t.results?.at(-1) ?? {};
      const id = spec.title.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)+[a-z]?)\b/)?.[1] ?? null;
      const status = result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed';
      const error = status === 'failed' ? redact((result.error?.message ?? '').split('\n').filter(Boolean).slice(0, 3).join(' · ')).slice(0, 220) : null;
      tests.push({ project: t.projectName, file: spec.file ?? file, title: spec.title, id, status, defect: status === 'failed' ? owner.get(id) ?? null : null, durationMs: result.duration ?? 0, error });
    }
  }
  for (const child of suite.suites ?? []) walk(child, suite.file ?? file);
};
for (const suite of report.suites ?? []) walk(suite, suite.file);

const failed = tests.filter(t => t.status === 'failed');
const summary = {
  startedAt: report.stats?.startTime, durationMs: Math.round(report.stats?.duration ?? 0),
  total: tests.length, passed: tests.filter(t => t.status === 'passed').length, failed: failed.length,
  skipped: tests.filter(t => t.status === 'skipped').length,
  failedByDefect: Object.fromEntries([...new Set(failed.map(t => t.defect).filter(Boolean))].sort().map(d => [d, failed.filter(t => t.defect === d).map(t => t.id ?? t.title)])),
  unmapped: failed.filter(t => !t.defect).map(t => ({ id: t.id, title: t.title, file: t.file, error: t.error })),
  tests,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(summary, null, 2));
console.log(`${summary.total} pruebas · ${summary.passed} pasan · ${summary.failed} fallan · ${summary.skipped} omitidas · sin defecto asociado: ${summary.unmapped.length}`);
for (const u of summary.unmapped) console.log(`  SIN DEFECTO ${u.id ?? ''} ${u.title} → ${u.error}`);
