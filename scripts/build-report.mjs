import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { defects, discarded, conformingControls, severityCriteria, priorityCriteria, modules, improvements, observations } from './report/defects.mjs';
import { ruleText } from './report/rules.mjs';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const evidence = path.join(root, 'evidence', 'report');
const cache = path.join(os.tmpdir(), 'spendwise-report-cache');
fs.mkdirSync(cache, { recursive: true });

const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const inline = v => esc(v).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const cot = iso => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const readJson = file => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
const slug = id => id.toLowerCase();

function cached(src, suffix, convert) {
  const stat = fs.statSync(src);
  const key = crypto.createHash('sha1').update(`${src}:${stat.size}:${stat.mtimeMs}:${suffix}`).digest('hex').slice(0, 16);
  const out = path.join(cache, `${key}${suffix}`);
  if (!fs.existsSync(out)) convert(out);
  return out;
}
const jpeg = (src, width, quality) => cached(src, `-${width}-${quality}.jpg`, out =>
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), '-Z', String(width), src, '--out', out], { stdio: 'ignore' }));
const webVideo = src => cached(src, '-web.mp4', out =>
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-vf', "scale='min(960,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '31', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]));
const poster = src => cached(src, '-poster.jpg', out =>
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '1.5', '-i', src, '-frames:v', '1', '-vf', "scale='min(960,iw)':-2", '-q:v', '6', out]));
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;

function testInventory() {
  const out = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=list'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const total = out.match(/Total: (\d+) tests? in (\d+) files?/);
  const byProject = {};
  for (const m of out.matchAll(/^\s+\[(\w+)\] ›/gm)) byProject[m[1]] = (byProject[m[1]] ?? 0) + 1;
  return { tests: Number(total?.[1] ?? 0), files: Number(total?.[2] ?? 0), byProject };
}

function loadEvidence(id) {
  const api = readJson(path.join(evidence, 'api', `${id}.json`));
  const dir = path.join(evidence, id);
  const ui = readJson(path.join(dir, `${id}.json`));
  let media = null;
  if (ui) {
    const video = path.join(dir, `${id}.mp4`);
    const final = path.join(dir, `${id}-final.png`);
    const steps = (ui.steps ?? []).filter(s => s.screenshot && fs.existsSync(path.join(dir, path.basename(s.screenshot))));
    media = {
      video: fs.existsSync(video) ? video : null,
      final: fs.existsSync(final) ? final : null,
      steps: steps.map(s => ({ n: s.n, text: s.text, file: path.join(dir, path.basename(s.screenshot)) })),
    };
  }
  return { api, ui, media };
}

const prettyValue = value => {
  const walk = v => {
    if (typeof v === 'string' && v.length > 70) return /^(.)\1+$/.test(v) ? `${v.slice(0, 6)}… (${v.length} caracteres)` : `${v.slice(0, 64)}…`;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  if (value === null || value === undefined || value === '') return '';
  const text = JSON.stringify(walk(value), null, 2);
  return text.length > 1400 ? `${text.slice(0, 1400)}\n…` : text;
};

const statusClass = code => (code >= 500 ? 'bad' : code >= 400 ? 'warn' : 'ok');

function curlFor(ex) {
  const p = ex.path.replace(/\/policies\/[0-9a-f-]{36}/i, '/policies/$POLICY_ID').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '$EXPENSE_ID');
  const head = `curl -sk -b jar.txt -u "$GATE_USER:$GATE_PASS" -X ${ex.method} "$API${p}" -H "Authorization: Bearer $TOKEN"`;
  if (ex.path.includes('/receipts/extract')) return `printf 'MZ executable payload' > disguised.pdf\n${head} \\\n  -F "file=@disguised.pdf;type=application/pdf"`;
  if (ex.requestBody === null || ex.requestBody === undefined) return head;
  const long = Object.values(ex.requestBody).some(v => typeof v === 'string' && v.length > 70 && /^(.)\1+$/.test(v));
  if (!long) return `${head} \\\n  -H "Content-Type: application/json" -d '${JSON.stringify(ex.requestBody)}'`;
  const json = JSON.stringify(ex.requestBody).replace(/"((.)\2{70,})"/g, (_, s, c) => `"$(printf '${c}%.0s' $(seq 1 ${s.length}))"`);
  return `${head} \\\n  -H "Content-Type: application/json" --data @- <<JSON\n${json}\nJSON`;
}

function httpSection(api) {
  const key = api.exchanges.filter(e => !e.setup);
  const setup = api.exchanges.filter(e => e.setup);
  const row = e => `<tr><td>${e.note ? `<b>${esc(e.note)}</b><br>` : ''}<code>${esc(e.method)} ${esc(e.path)}</code>${e.role ? `<div class="mut">Rol: ${esc(e.role)}</div>` : ''}${e.requestBody !== null ? `<pre>${esc(prettyValue(e.requestBody))}</pre>` : ''}</td><td class="st ${statusClass(e.status)}">${e.status}</td><td><pre>${esc(prettyValue(e.responseBody)) || '<span class="mut">(sin cuerpo)</span>'}</pre></td></tr>`;
  const table = rows => `<div class="tw"><table class="http"><thead><tr><th>Petición</th><th>Estado</th><th>Respuesta (recortada)</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div>`;
  const analysis = api.analysis ? `<div class="tw"><table class="kv">${Object.entries(api.analysis).map(([k, v]) => `<tr><td>${esc(k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase())}</td><td><code>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</code></td></tr>`).join('')}</table></div>` : '';
  const curls = key.filter(e => e.method !== 'GET' || e.path.includes('?') || key.length === 1).map(curlFor);
  const card = path.join(evidence, 'api', `${api.id}.png`);
  const shot = fs.existsSync(card) ? `<figure class="card-shot"><img loading="lazy" src="${dataUri(jpeg(card, 1236, 70), 'image/jpeg')}" alt="Evidencia HTTP ${esc(api.id)}"><figcaption><b>Captura de la evidencia HTTP</b> · petición y respuesta reales, saneadas</figcaption></figure>` : '';
  return `<h3>Evidencia HTTP <span class="mut">· ${esc(cot(api.capturedAt))} (hora Colombia)</span></h3>${shot}<details><summary>Peticiones y respuestas en texto</summary>${table(key)}</details>${analysis}
  ${setup.length ? `<details><summary>Preparación: ${setup.length} petición${setup.length > 1 ? 'es' : ''} (inicio de sesión y datos)</summary>${table(setup)}</details>` : ''}
  ${curls.length ? `<details><summary>Reproducir con cURL</summary><pre class="code">${esc(curls.join('\n\n'))}</pre><p class="mut">Requiere el bloque de preparación de la sección <a href="#anexo-curl">Reproducción por cURL</a>. $EXPENSE_ID es un gasto creado para el caso.</p></details>` : ''}`;
}

function uiSection(ui, media, id, actual) {
  const steps = media.steps.map(s => {
    const src = dataUri(jpeg(s.file, 720, 62), 'image/jpeg');
    return `<figure><img loading="lazy" src="${src}" alt="${esc(`${id} paso ${s.n}`)}"><figcaption><b>Paso ${esc(s.n)}</b> · ${esc(s.text)}</figcaption></figure>`;
  }).join('');
  const final = media.final ? `<figure class="wide"><img loading="lazy" src="${dataUri(jpeg(media.final, 1280, 72), 'image/jpeg')}" alt="${esc(`${id} resultado`)}"><figcaption><b>Resultado</b> · ${esc(actual)}</figcaption></figure>` : '';
  const video = media.video ? `<figure class="wide"><video controls preload="none" playsinline poster="${dataUri(poster(media.video), 'image/jpeg')}" src="${dataUri(webVideo(media.video), 'video/mp4')}"></video><figcaption><b>Video del paso a paso</b> · puntero visible, pasos numerados y resultado esperado frente al real</figcaption></figure>` : '';
  return `<h3>Evidencia visual <span class="mut">· ${esc(cot(ui.recordedAt))} (hora Colombia)</span></h3><div class="media">${video}${final}</div>${steps ? `<div class="grid">${steps}</div>` : ''}`;
}

function improvementSection(i) {
  const dir = path.join(evidence, 'improvements');
  const shots = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith(i.id) && /\.png$/.test(f)).sort() : [];
  const figs = shots.map(f => `<figure class="card-shot"><img loading="lazy" src="${dataUri(jpeg(path.join(dir, f), 1236, 70), 'image/jpeg')}" alt="${esc(f)}"><figcaption>${esc(f.replace('.png', ''))}</figcaption></figure>`).join('');
  return `<section class="defect" id="${i.id}"><h3>${i.id} — ${esc(i.title)} <span class="mut">· ${esc(i.area)}</span></h3>
  <div class="card imp"><table class="kv"><tr><td>Observado</td><td>${esc(i.observed)}</td></tr><tr><td>Por qué es mejora y no defecto</td><td>${esc(i.whyNotDefect)}</td></tr><tr><td>Beneficio</td><td>${esc(i.benefit)}</td></tr><tr><td>Criterio de aceptación</td><td>${esc(i.acceptance)}</td></tr>${i.tests.length ? `<tr><td>Pruebas</td><td>${i.tests.map(t => `<code>${esc(t)}</code>`).join(' ')}</td></tr>` : ''}</table></div>
  ${figs ? `<div class="evid">${figs}</div>` : '<p class="mut">Sin captura.</p>'}</section>`;
}

const sevPill = s => `<span class="pill sev-${slug(s)}">${esc(s)}</span>`;
const priPill = s => `<span class="pill pri">Prioridad ${esc(s)}</span>`;

function reverification(ev) {
  const r = [ev.api?.reproduced, ev.ui?.reproduced].filter(v => v !== undefined && v !== null);
  if (!r.length) return { ok: null, text: 'Sin re-verificación' };
  const ok = r.every(Boolean);
  const when = ev.api?.capturedAt ?? ev.ui?.recordedAt;
  return { ok, text: `${ok ? 'Reproduce' : 'No reproduce'} · ${cot(when)}` };
}

function defectSection(d, ev) {
  const rv = reverification(ev);
  return `<section class="defect" id="${d.id}">
  <h2>${d.id} — ${esc(d.title)}</h2>
  <div class="card meta">
    <div>${sevPill(d.severity)} ${priPill(d.priority)} <span class="pill ${rv.ok ? 'bad' : 'neutral'}">${esc(rv.text)}</span></div>
    <table class="kv">
      <tr><td>Módulo</td><td>${esc(d.module)} · ${esc(d.layer)}</td></tr>
      <tr><td>Regla</td><td>${d.rules.map(esc).join(' · ')}</td></tr>
      <tr><td>Rol y usuario</td><td>${esc(d.role)} · <code>${esc(d.user)}</code></td></tr>
      <tr><td>Dónde</td><td><code>${esc(d.where)}</code></td></tr>
      <tr><td>Precondiciones</td><td>${esc(d.pre)}</td></tr>
      <tr><td>Reproducibilidad</td><td>${esc(d.original)}; ${ev.api || ev.ui ? `re-verificado ${esc(cot(ev.api?.capturedAt ?? ev.ui?.recordedAt))}` : 'sin re-verificación'}</td></tr>
      <tr><td>Pruebas automatizadas</td><td>${d.tests.map(t => `<code>${esc(t)}</code>`).join(' ')}</td></tr>
      ${d.related ? `<tr><td>Relacionado</td><td><a href="#${d.related}">${d.related}</a></td></tr>` : ''}
    </table>
  </div>
  <div class="ev2"><div class="exp"><b>Esperado</b><p>${inline(d.expected)}</p></div><div class="act"><b>Real</b><p>${inline(d.actual)}</p>${ev.api?.observed ? `<p class="mut">Última ejecución: ${esc(ev.api.observed)}</p>` : ''}</div></div>
  <h3>Por qué es un defecto</h3><div class="card why"><ul>${d.rules.map(r => `<li><b>${esc(r)}</b>${ruleText[r] ? `: «${esc(ruleText[r])}»` : ''}</li>`).join('')}</ul><p>El sistema hace otra cosa: ${inline(d.actual)} Por eso no cumple ${d.rules.length > 1 ? 'estas reglas' : 'la regla'}.</p></div>
  <h3>Pasos para reproducir</h3><div class="card"><ol>${d.steps.map(s => `<li>${inline(s)}</li>`).join('')}</ol></div>
  <h3>Severidad y prioridad</h3><div class="card"><p>${sevPill(d.severity)} ${esc(d.severityWhy)}</p><p>${priPill(d.priority)} ${esc(d.priorityWhy)}</p>${d.note ? `<p class="mut">${esc(d.note)}</p>` : ''}</div>
  ${ev.api ? httpSection(ev.api) : ''}
  ${ev.ui && ev.media ? uiSection(ev.ui, ev.media, d.id, d.actual) : ''}
  <h3>Sugerencia de corrección</h3><div class="card"><p>${esc(d.fix)}</p></div>
  <p class="top"><a href="#registro">↑ Volver al registro</a></p>
</section>`;
}

function registerTable(list, evs) {
  const rows = list.map(d => {
    const ev = evs.get(d.id);
    const rv = reverification(ev);
    const kinds = [ev.api ? 'HTTP' : null, ev.media?.video ? 'Video' : null, ev.media?.steps?.length || ev.media?.final || (ev.api && fs.existsSync(path.join(evidence, 'api', `${d.id}.png`))) ? 'Capturas' : null].filter(Boolean);
    return `<tr data-sev="${slug(d.severity)}" data-mod="${esc(d.module)}"><td><a href="#${d.id}"><b>${d.id}</b></a></td><td>${esc(d.module)}</td><td>${esc(d.title)}</td><td>${esc(d.severityWhy)}</td><td>${esc(d.priority)}</td><td><span class="st ${rv.ok ? 'bad' : 'neutral'}">${rv.ok ? 'Reproduce' : esc(rv.text)}</span></td><td>${kinds.map(k => `<span class="tag">${k}</span>`).join(' ')}</td></tr>`;
  }).join('');
  return `<div class="tw"><table class="register"><thead><tr><th>ID</th><th>Módulo</th><th>Defecto</th><th>Por qué esta severidad</th><th>Prioridad</th><th>17-oct</th><th>Evidencia</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function moduleMatrix() {
  const sev = ['Alta', 'Media', 'Baja'];
  const rows = modules.map(m => {
    const items = defects.filter(d => d.module === m);
    return `<tr><td>${esc(m)}</td>${sev.map(s => { const n = items.filter(d => d.severity === s).length; return `<td class="num ${n ? `h-${slug(s)}` : ''}">${n || '·'}</td>`; }).join('')}<td class="num"><b>${items.length}</b></td><td>${items.map(d => `<a href="#${d.id}">${d.id.replace('BUG-', '')}</a>`).join(' ')}</td></tr>`;
  }).join('');
  const totals = sev.map(s => `<td class="num"><b>${defects.filter(d => d.severity === s).length}</b></td>`).join('');
  return `<div class="tw"><table class="matrix"><thead><tr><th>Módulo</th><th>Alta</th><th>Media</th><th>Baja</th><th>Total</th><th>Defectos</th></tr></thead><tbody>${rows}<tr class="tot"><td>Total</td>${totals}<td class="num"><b>${defects.length}</b></td><td></td></tr></tbody></table></div>`;
}

const css = `:root{--bg:#f4f6f8;--card:#fff;--ink:#16202b;--mut:#5c6874;--line:#dbe2e8;--soft:#eef2f5;--red:#b42318;--redbg:#fde9e7;--amber:#b54708;--amberbg:#fff1df;--green:#087443;--greenbg:#e7f6ee;--blue:#155eef;--bluebg:#e8f0ff;--head:#16202b}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--card:#161b22;--ink:#e6edf3;--mut:#9aa4af;--line:#30363d;--soft:#1f262e;--redbg:#3a1714;--amberbg:#3a2a12;--greenbg:#11301f;--bluebg:#13233a;--red:#ff8a80;--amber:#f5b942;--green:#5ee69a;--blue:#7aa7ff;--head:#0a0f14}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:1180px;margin:0 auto;padding:26px 16px 80px}
header.hero{background:var(--head);color:#fff;padding:26px 28px;border-radius:12px;margin-bottom:18px}
header.hero h1{margin:0 0 6px;font-size:25px;line-height:1.25}header.hero code{background:#ffffff26;color:#fff}header.hero p{margin:3px 0;color:#cfd8e0}
.envbox{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.env{border-radius:8px;padding:12px 14px;font-size:13.5px;color:#e6edf3}.env.a{background:#13233a;border:1px solid #4b83e0}.env.b{background:#3a1d15;border:1px solid #e85d04}.env b{color:#fff}
h2{margin:38px 0 10px;font-size:21px;border-bottom:2px solid var(--line);padding-bottom:6px;scroll-margin-top:12px}h3{margin:18px 0 8px;font-size:15.5px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:10px 0}.card p{margin:6px 0}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--mut)}.kpi b{display:block;font-size:27px;line-height:1.15;color:var(--ink)}.kpi.r b{color:var(--red)}.kpi.a b{color:var(--amber)}.kpi.g b{color:var(--green)}
.decision{border-left:6px solid var(--red);background:var(--redbg)}.decision h3{margin-top:0;color:var(--red)}
.toc{columns:3;font-size:14px;margin:0;padding-left:18px}.toc li{margin:3px 0;break-inside:avoid}
a{color:var(--blue)}.mut{color:var(--mut);font-size:13px}code{background:var(--soft);padding:1px 5px;border-radius:4px;font:12.5px ui-monospace,Menlo,monospace;overflow-wrap:anywhere}
pre{margin:6px 0 0;font:11.5px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word}pre.code{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px}
.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);font-size:13.5px;margin:6px 0}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--soft);font-size:12px;text-transform:uppercase;letter-spacing:.02em}
table.kv td:first-child{color:var(--mut);width:200px;white-space:nowrap}table.http td:nth-child(1){width:38%}table.http td:nth-child(2){width:70px;text-align:center}
td.num{text-align:center;width:70px}table.register td:first-child,table:not(.http):not(.kv) td:first-child{white-space:nowrap}.h-alta{background:var(--redbg);color:var(--red);font-weight:700}.h-media{background:var(--amberbg);color:var(--amber);font-weight:700}.h-baja{background:var(--bluebg);color:var(--blue);font-weight:700}tr.tot td{background:var(--soft)}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;margin:0 4px 4px 0}.sev-alta{background:var(--redbg);color:var(--red)}.sev-media{background:var(--amberbg);color:var(--amber)}.sev-baja{background:var(--bluebg);color:var(--blue)}.pri{background:var(--soft);color:var(--ink)}.pill.bad{background:var(--redbg);color:var(--red)}.pill.neutral{background:var(--soft);color:var(--mut)}
.st{font-weight:700}.st.ok{color:var(--green)}.st.warn{color:var(--amber)}.st.bad{color:var(--red)}.st.neutral{color:var(--mut)}
.tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px;background:var(--soft);color:var(--mut);margin:1px}
.ev2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.ev2>div{border-radius:10px;padding:12px 14px;border:1px solid var(--line)}.ev2 p{margin:4px 0}.exp{background:var(--greenbg)}.exp b{color:var(--green)}.act{background:var(--redbg)}.act b{color:var(--red)}
details{background:var(--card);border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:0 12px}details summary{cursor:pointer;padding:9px 0;font-weight:600}details[open]{padding-bottom:10px}
.media{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-top:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}figure img{width:100%;display:block;cursor:zoom-in;background:#fff}figure video{width:100%;display:block;background:#000}figcaption{padding:7px 10px;color:var(--mut);font-size:12.5px}
.why{border-left:5px solid var(--red)}.why ul{margin-left:16px}figure.card-shot{max-width:900px;margin:6px 0 8px}.imp{border-left:5px solid var(--amber)}.defect{scroll-margin-top:10px}.defect h2{border-color:var(--line)}.top{text-align:right;font-size:13px;margin:8px 0 0}
.filters{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.filters button{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}.filters button.on{border-color:var(--blue);color:var(--blue);font-weight:700}
ul,ol{margin:6px 0 6px 20px;padding:0}li{margin:4px 0}
#lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:20;align-items:center;justify-content:center;cursor:zoom-out}#lb img{max-width:96vw;max-height:94vh}
footer{margin-top:40px;color:var(--mut);font-size:12.5px;text-align:center}
@media(max-width:820px){.envbox,.ev2,.media{grid-template-columns:1fr}.toc{columns:1}table.kv td:first-child{width:auto;white-space:normal}}
@media print{body{background:#fff}main{max-width:none}video,.filters,details summary~*{display:none}details{border:0}.defect{break-before:page}figure{break-inside:avoid}header.hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

const script = `const lb=document.getElementById('lb'),li=lb.querySelector('img');document.querySelectorAll('figure img').forEach(i=>i.addEventListener('click',()=>{li.src=i.src;lb.style.display='flex'}));lb.addEventListener('click',()=>{lb.style.display='none';li.removeAttribute('src')});
const rows=[...document.querySelectorAll('table.register tbody tr')];document.querySelectorAll('.filters button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('on',x===b));const f=b.dataset.f;rows.forEach(r=>{r.hidden=!(f==='all'||r.dataset.sev===f)})}));`;

function shell(title, body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${css}</style></head><body><div id="lb"><img alt=""></div><main>${body}</main><script>${script}</script></body></html>`;
}

function buildReport(inv, evs) {
  const count = s => defects.filter(d => d.severity === s).length;
  const reverified = defects.filter(d => reverification(evs.get(d.id)).ok).length;
  const lastRun = [...evs.values()].flatMap(e => [e.api?.capturedAt, e.ui?.recordedAt]).filter(Boolean).sort().at(-1);
  const highs = defects.filter(d => d.severity === 'Alta');
  const ref = ids => ids.map(id => `<a href="#${id}">${id}</a>`).join(', ');
  const toc = [['resumen', '1. Resumen ejecutivo'], ['lectura', '2. Cómo leer este informe'], ['modulos', '3. Defectos por módulo'], ['registro', '4. Registro de defectos'], ['fichas', '5. Fichas de defecto'], ['mejoras', '6. Oportunidades de mejora'], ['descartados', '7. Descartados, observaciones y controles conformes'], ['cobertura', '8. Cobertura y ejecución'], ['salida', '9. Recomendación y criterios de salida'], ['anexos', '10. Anexos']];
  const body = `
<header class="hero"><h1>SpendWise · Informe de QA de la versión candidata</h1>
<p>Prueba de aceptación de caja negra sobre la aplicación web y la API · Cristian Guerra, QA Analyst</p>
<p>Ejecución del 16-oct-2026 · verificación final ${esc(cot(lastRun))} (hora Colombia)</p>
<div class="envbox"><div class="env a"><b>Ambiente</b> — entorno exclusivo asignado: web <code>:4406</code>, API <code>:4506</code>, Swagger en <code>/swagger</code>. Cuentas del Anexo G (employee1-3, manager1, finance, admin). Referencia: Anexos A a H del enunciado.</div>
<div class="env b"><b>Resultado</b> — <b>${defects.length} defectos</b> confirmados: ${count('Alta')} de severidad alta, ${count('Media')} media y ${count('Baja')} baja. ${reverified} de ${defects.length} se re-ejecutaron el 17-oct y siguen ocurriendo. Recomendación: <b>no liberar</b> esta versión.</div></div></header>

<div class="card"><b>Contenido</b><ol class="toc">${toc.map(([id, t]) => `<li><a href="#${id}">${t.replace(/^\d+\. /, '')}</a></li>`).join('')}</ol></div>

<h2 id="resumen">1. Resumen ejecutivo</h2>
<div class="kpis"><div class="kpi r"><b>${defects.length}</b>defectos confirmados</div><div class="kpi r"><b>${count('Alta')}</b>severidad alta</div><div class="kpi a"><b>${count('Media')}</b>severidad media</div><div class="kpi"><b>${count('Baja')}</b>severidad baja</div><div class="kpi g"><b>${reverified}/${defects.length}</b>re-verificados el 17-oct</div><div class="kpi"><b>${inv.tests}</b>pruebas automatizadas en ${inv.files} archivos</div></div>
<div class="card decision"><h3>Recomendación: no liberar esta versión</h3>
<p>SpendWise funciona en lo básico: se inicia sesión, se registran gastos, se aprueban y se consultan reportes, y el control de acceso por rol de la API resiste los intentos de saltarlo. El problema está en las reglas que protegen el dinero: hoy el sistema aprueba solo gastos que deberían revisarse, acepta gastos sin comprobante, permite revertir o tomar decisiones sin justificación y muestra totales inflados. Con esos riesgos abiertos, una salida a producción expondría a la empresa a gastos aprobados sin control y a reportes financieros que no se pueden creer.</p>
<p>La versión se puede reconsiderar cuando se corrijan y re-verifiquen los ${count('Alta')} defectos de severidad alta y pase la regresión automatizada. Los ${count('Media') + count('Baja')} defectos medios y bajos pueden corregirse después si negocio acepta el riesgo por escrito.</p></div>
<div class="card"><b>Principales riesgos</b><ul>
<li><b>Gastos aprobados o rechazados por las razones equivocadas.</b> Un gasto de exactamente USD 50 se aprueba solo, los gastos de USD 25 o más se aceptan sin recibo, cualquier texto vale como "recibo" y la acción Block está invertida: rechaza los montos pequeños y deja pasar los que superan el límite (${ref(['BUG-18', 'BUG-39', 'BUG-15', 'BUG-41'])}).</li>
<li><b>Decisiones que no son definitivas ni justificadas.</b> Un gasto Approved, Rejected o AutoApproved puede cambiar de decisión o borrarse, se puede rechazar sin motivo, una segunda aprobación ensucia la auditoría y las decisiones automáticas no dicen qué regla las tomó (${ref(['BUG-36', 'BUG-08', 'BUG-29', 'BUG-35', 'BUG-42'])}).</li>
<li><b>Cifras que no son confiables.</b> Reportes y tablero suman gastos rechazados y fechas futuras, algunos indicadores son textos fijos y, si una carga falla, las pantallas muestran listas vacías en lugar de un error (${ref(['BUG-12', 'BUG-44', 'BUG-48', 'BUG-50', 'BUG-40'])}).</li>
<li><b>Datos inválidos y errores internos.</b> Se guardan montos en cero, negativos o con tres decimales y gastos sin datos obligatorios; varios datos mal escritos producen errores del servidor en lugar de un mensaje claro (${ref(['BUG-01', 'BUG-02', 'BUG-14', 'BUG-03', 'BUG-11', 'BUG-28'])}).</li>
<li><b>Seguridad y trazabilidad.</b> El CSV exportado permite inyectar fórmulas y el aprobador no ve quién envió el gasto (${ref(['BUG-13', 'BUG-19'])}).</li></ul></div>

<h2 id="lectura">2. Cómo leer este informe</h2>
<div class="card"><ul>
${severityCriteria.map(([s, t]) => `<li>${sevPill(s)} ${esc(t)}</li>`).join('')}
${priorityCriteria.map(([s, t]) => `<li>${priPill(s)} ${esc(t)}</li>`).join('')}
<li><b>Reproducibilidad.</b> Cada defecto se reprodujo al menos dos veces el 16-oct y se volvió a ejecutar el 17-oct; la columna "17-oct" indica el resultado de esa última ejecución.</li>
<li><b>Evidencia.</b> <span class="tag">HTTP</span> petición y respuesta reales, saneadas (sin contraseñas ni tokens). <span class="tag">Video</span> paso a paso con puntero visible y el resultado esperado frente al real. <span class="tag">Capturas</span> una por paso; haga clic para ampliarlas.</li>
<li>Las reglas citadas (RN-xx, Anexos) son las del enunciado. Cuando el anexo no define algo, se indica "criterio profesional" y se justifica.</li></ul></div>

<h2 id="modulos">3. Defectos por módulo</h2>
${moduleMatrix()}

<h2 id="registro">4. Registro de defectos</h2>
<div class="filters"><button class="on" data-f="all">Todos (${defects.length})</button><button data-f="alta">Alta (${count('Alta')})</button><button data-f="media">Media (${count('Media')})</button><button data-f="baja">Baja (${count('Baja')})</button></div>
${registerTable([...highs, ...defects.filter(d => d.severity === 'Media'), ...defects.filter(d => d.severity === 'Baja')], evs)}

<h2 id="fichas">5. Fichas de defecto</h2>
<p class="mut">Cada ficha incluye regla, rol y usuario, pasos, esperado frente a real, severidad y prioridad justificadas, evidencia y una sugerencia de corrección.</p>
${defects.map(d => defectSection(d, evs.get(d.id))).join('\n')}

<h2 id="mejoras">6. Oportunidades de mejora</h2>
<p>No se cuentan como defectos ni cambian la recomendación: el anexo no define un resultado obligatorio para ellas, pero endurecen el producto, el contrato o la suite.</p>
${improvements.map(i => improvementSection(i)).join('\n')}
<h2 id="descartados">7. Hallazgos descartados, observaciones y controles conformes</h2>
<p>Un fallo automatizado no se convierte en defecto sin revisar el requisito, la sincronización y los datos. Estos candidatos se descartaron:</p>
<div class="tw"><table><thead><tr><th>ID</th><th>Candidato</th><th>Por qué se descartó</th><th>Prueba</th></tr></thead><tbody>${discarded.map(x => `<tr><td><b>${esc(x.id)}</b></td><td>${esc(x.title)}</td><td>${esc(x.reason)}</td><td><code>${esc(x.test)}</code></td></tr>`).join('')}</tbody></table></div>
${(() => { const figs = discarded.filter(x => x.image && fs.existsSync(path.join(root, x.image))).map(x => `<figure><img loading="lazy" src="${dataUri(jpeg(path.join(root, x.image), 900, 65), 'image/jpeg')}" alt="${esc(x.id)}"><figcaption><b>${esc(x.id)}</b> · ${esc(x.title)}: evidencia de por qué se descartó</figcaption></figure>`).join(''); return figs ? `<div class="grid">${figs}</div>` : ''; })()}
<h3>Observaciones que no se reportan como defecto</h3><div class="tw"><table><thead><tr><th>ID</th><th>Observación</th><th>Detalle y decisión</th></tr></thead><tbody>${observations.map(o => `<tr><td><b>${esc(o.id)}</b></td><td>${esc(o.title)}</td><td>${esc(o.detail)}</td></tr>`).join('')}</tbody></table></div>
<h3>Controles que funcionan como se espera</h3><div class="card"><ul>${conformingControls.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>

<h2 id="cobertura">8. Cobertura y ejecución</h2>
<div class="tw"><table><thead><tr><th>Nivel</th><th>Pruebas</th><th>Qué cubre</th></tr></thead><tbody>
<tr><td>Componentes</td><td class="num">${inv.byProject.component ?? 0}</td><td>Builders de datos, esquemas de consumidor y catálogo de mutantes, sin red.</td></tr>
<tr><td>Contrato</td><td class="num">${inv.byProject.contract ?? 0}</td><td>OpenAPI publicado frente al runtime: operaciones, respuestas, seguridad, esquemas.</td></tr>
<tr><td>API</td><td class="num">${inv.byProject.api ?? 0}</td><td>Autenticación, validación y límites, filtros, recibos, motor de políticas, aprobaciones, reportes, permisos por rol, mutación de peticiones y rondas adversariales.</td></tr>
<tr><td>Integración</td><td class="num">${inv.byProject.integration ?? 0}</td><td>Ciclo de vida del gasto, políticas con limpieza y consistencia de reportes.</td></tr>
<tr><td>E2E (navegador)</td><td class="num">${inv.byProject.e2e ?? 0}</td><td>Login y retorno a la ruta, navegación por rol, módulos, CSV, accesibilidad, estado y recuperación ante errores.</td></tr>
<tr><td>Postman / Newman</td><td class="num">15</td><td>15 peticiones y 25 aserciones de estructura, datos y comportamiento.</td></tr></tbody></table></div>
${(() => {
  const run = readJson(path.join(evidence, 'full-run.json'));
  if (!run) return '';
  const mins = (run.durationMs / 60000).toFixed(1).replace('.', ',');
  const rows = Object.entries(run.failedByDefect).map(([d, ids]) => `<tr><td><a href="#${d}">${d}</a></td><td>${ids.map(i => `<code>${esc(i)}</code>`).join(' ')}</td></tr>`).join('');
  const open = run.unmapped.filter(u => u.rerun !== 'passed');
  const fixed = run.unmapped.filter(u => u.rerun === 'passed');
  const mapped = run.failed - run.unmapped.length;
  const orphan = `<p>${mapped === run.failed ? `Los ${run.failed} fallos corresponden` : `${mapped} de los ${run.failed} fallos corresponden`} a defectos reportados; cada uno de los ${defects.length} defectos tiene al menos una prueba que falla.${(run.notes ?? []).map(n => ` ${esc(n)}`).join('')}${fixed.map(u => ` <b>${esc(u.id)}</b> falló por la prueba y no por el producto: ${esc(u.cause)}`).join('')}${open.length ? ` <span class="st bad">Sin explicar: ${open.map(u => esc(u.id ?? u.title)).join(', ')}</span>` : ''}</p>`;
  return `<h3>Corrida completa · ${esc(cot(run.startedAt))}</h3><div class="kpis"><div class="kpi"><b>${run.total}</b>pruebas ejecutadas</div><div class="kpi g"><b>${run.passed}</b>pasan</div><div class="kpi r"><b>${run.failed}</b>fallan</div><div class="kpi"><b>${mins} min</b>duración</div></div>${orphan}<details><summary>Pruebas que fallan, agrupadas por defecto</summary><div class="tw"><table><thead><tr><th>Defecto</th><th>Pruebas</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
})()}
<h3>Ejecuciones registradas</h3>
<div class="tw"><table><thead><tr><th>Campaña</th><th>Resultado</th><th>Registro</th></tr></thead><tbody>
<tr><td>Regresión integral (119 pruebas, 4,1 min)</td><td>86 pasan · 33 fallan por defectos</td><td><code>evidence/final-execution-summary-2026-10-16.txt</code></td></tr>
<tr><td>Regresión ampliada (103 pruebas, 2,8 min)</td><td>81 pasan · 22 fallan por defectos</td><td><code>evidence/test-run-expanded-2026-10-16.txt</code></td></tr>
<tr><td>Mutación de peticiones (16 mutantes)</td><td>6 rechazados · 10 sobreviven · puntaje 37,5 %</td><td><code>docs/07-pruebas-mutantes.md</code></td></tr>
<tr><td>Rondas adversariales 1 y 2 (23 escenarios)</td><td>19 pasan · 4 fallan (BUG-35, BUG-36)</td><td><code>evidence/test-run-adversarial-rounds-2026-10-16.txt</code></td></tr>
<tr><td>Ronda 4 de contrato y datos (22 casos)</td><td>21 pasan · 1 falla (BUG-37)</td><td><code>evidence/contract-data-r4-2026-10-16.txt</code></td></tr>
<tr><td>Postman / Newman (25 aserciones), re-ejecutado el 17-oct</td><td>20 pasan · 5 fallan por BUG-01, 02, 03, 04 y 07</td><td><code>evidence/test-run-newman-2026-10-17.txt</code></td></tr>
<tr><td>Auditoría de oráculos (17-oct)</td><td>Revisión de las 36 especificaciones en busca de pruebas que pudieran pasar con el producto defectuoso: EXPA-06/07 aceptaban el comportamiento de BUG-26/27 y se corrigieron; 11 oráculos más se endurecieron (estado e historial tras decisiones, datos propios en lugar de datos semilla, esperas por respuesta en lugar de tiempos fijos, CSV analizado por celdas)</td><td><code>tests/</code></td></tr>
<tr><td>Ronda 6: reglas del anexo sin cobertura (17-oct)</td><td>36 escenarios nuevos de API (14), integración (2) e interfaz (20). Los que fallan corresponden a 8 defectos nuevos (BUG-41 a BUG-45, BUG-47, BUG-48 y BUG-50) y a variantes nuevas de BUG-03, 08, 12 y 36. Cuatro sospechas de la ronda (R6-UI-15, R6-UI-18, BUG-46 y BUG-49) se descartaron como falsos positivos tras verificarlas</td><td><code>tests/api/round6-api.spec.ts</code>, <code>tests/integration/policy-engine-block.spec.ts</code>, <code>tests/e2e/round6-ui.spec.ts</code></td></tr>
<tr><td>Verificación final (17-oct)</td><td>${reverified}/${defects.length} defectos se reproducen con evidencia nueva (HTTP o video)</td><td><code>evidence/report/</code></td></tr></tbody></table></div>
<p class="mut">Rendimiento y carga están fuera del alcance del enunciado; solo se registró una observación serial de tiempos (docs/06). Las pruebas que crean datos usan descripciones únicas y las reglas de prueba se crean inactivas y se eliminan al terminar.</p>

<h2 id="salida">9. Recomendación y criterios de salida</h2>
<div class="card"><ol>
<li>Corregir los ${count('Alta')} defectos de severidad alta: ${highs.map(d => `<a href="#${d.id}">${d.id.replace('BUG-', '')}</a>`).join(', ')}.</li>
<li>Re-verificar cada uno con su prueba automatizada (columna "Pruebas automatizadas" de cada ficha) y ejecutar la regresión completa con <code>npm test</code> y <code>npm run test:postman</code>.</li>
<li>Documentar en el OpenAPI los códigos reales y las respuestas de error para que el contrato se pueda validar en CI.</li>
<li>Para los defectos medios y bajos que no se corrijan antes de la salida, registrar la aceptación del riesgo por parte de negocio.</li></ol></div>

<h2 id="anexos">10. Anexos</h2>
<h3 id="anexo-curl">Reproducción por cURL</h3>
<pre class="code">export API="https://&lt;host asignado&gt;:4506"
export GATE_USER="&lt;usuario de la puerta del entorno&gt;" GATE_PASS="&lt;contraseña de la puerta&gt;" SEED_PASS="&lt;contraseña de las cuentas&gt;"
curl -sk -c jar.txt -u "$GATE_USER:$GATE_PASS" "$API/__gate" -o /dev/null
TOKEN=$(curl -sk -b jar.txt -u "$GATE_USER:$GATE_PASS" -H "Content-Type: application/json" \\
  -d '{"email":"employee3@spendwise.test","password":"'"$SEED_PASS"'"}' "$API/api/v1/auth/login" | jq -r .accessToken)</pre>
<p class="mut">Cambie el correo por el rol que indica cada ficha. Las credenciales se entregan por canal aparte y no forman parte de este informe.</p>
<h3>Trazabilidad defecto ↔ regla ↔ prueba</h3>
<div class="tw"><table><thead><tr><th>Defecto</th><th>Regla</th><th>Rol</th><th>Pruebas automatizadas</th></tr></thead><tbody>${defects.map(d => `<tr><td><a href="#${d.id}">${d.id}</a></td><td>${d.rules.map(esc).join(' · ')}</td><td>${esc(d.role)}</td><td>${d.tests.map(t => `<code>${esc(t)}</code>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>
<h3>Documentos del paquete</h3>
<div class="card"><ul>
<li><a href="02-estrategia-plan.html">E2 · Estrategia y plan de pruebas</a></li>
<li><a href="03-casos-prueba.html">E3 · Casos de prueba y automatización</a></li>
<li><a href="04-resumen-ejecutivo.html">E4 · Resumen ejecutivo (una página)</a></li>
<li><a href="07-pruebas-mutantes.html">Pruebas de mutación de peticiones</a> · <a href="06-observacion-no-funcional.html">Observación no funcional</a> · <a href="09-oportunidades-mejora.html">Oportunidades de mejora</a></li>
<li><a href="01-reporte-defectos.md">E1 en Markdown</a> · <a href="../README.md">Instrucciones de ejecución</a></li></ul></div>
<footer>SpendWise · Informe de QA · Cristian Guerra · Evidencia saneada: sin contraseñas ni tokens</footer>`;
  return shell('SpendWise · Informe de QA', body);
}

function buildMarkdown(evs) {
  const lines = ['# E1 — Reporte de defectos', '', '> Generado desde `scripts/report/defects.mjs`. Versión visual con evidencia embebida: `docs/INFORME-QA-SpendWise.html`.', '', '| ID | Título | Módulo | Regla | Severidad | Prioridad | 17-oct |', '|---|---|---|---|---|---|---|'];
  for (const d of defects) lines.push(`| ${d.id} | ${d.title} | ${d.module} | ${d.rules.join(', ')} | ${d.severity} | ${d.priority} | ${reverification(evs.get(d.id)).text} |`);
  for (const d of defects) {
    const ev = evs.get(d.id);
    lines.push('', `## ${d.id} — ${d.title}`, '', `- Regla: ${d.rules.join(', ')}`, `- Rol y usuario: ${d.role}, \`${d.user}\``, `- Dónde: \`${d.where}\``, `- Precondiciones: ${d.pre}`, '- Pasos:', ...d.steps.map((s, i) => `  ${i + 1}. ${s}`), `- Resultado esperado: ${d.expected}`, `- Resultado obtenido: ${d.actual}`, `- Severidad: **${d.severity}**. ${d.severityWhy}`, `- Prioridad: **${d.priority}**. ${d.priorityWhy}`, `- Reproducibilidad: ${d.original}; ${reverification(ev).text}.`, `- Pruebas: ${d.tests.join(', ')}`, `- Evidencia: ${[ev.api ? `\`evidence/report/api/${d.id}.json\`` : null, ev.ui ? `\`evidence/report/${d.id}/\`` : null].filter(Boolean).join(' y ') || 'ver pruebas automatizadas'}`, `- Sugerencia: ${d.fix}`);
    if (d.note) lines.push(`- Nota: ${d.note}`);
  }
  lines.push('', '## Hallazgos descartados', '', ...discarded.map(x => `- **${x.id} — ${x.title}.** ${x.reason}`), '');
  return lines.join('\n');
}

const mdInline = v => esc(v).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
function markdownToHtml(md) {
  const lines = md.split('\n'); let out = '', list = '', code = false, buf = [];
  const close = () => { if (list) { out += `</${list}>`; list = ''; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('```')) { close(); if (code) { out += `<pre class="code">${esc(buf.join('\n'))}</pre>`; buf = []; } code = !code; continue; }
    if (code) { buf.push(l); continue; }
    if (/^\|/.test(l) && /^\|[-: |]+\|?$/.test(lines[i + 1] ?? '')) {
      close(); const split = x => x.trim().slice(1, -1).split('|').map(v => v.trim());
      const head = split(l); const rows = []; i += 2;
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(split(lines[i++]));
      i--; out += `<div class="tw"><table><thead><tr>${head.map(h => `<th>${mdInline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/); if (h) { close(); const n = Math.min(h[1].length + 1, 4); out += `<h${n}>${mdInline(h[2])}</h${n}>`; continue; }
    if (/^\s*[-*] /.test(l)) { if (list !== 'ul') { close(); list = 'ul'; out += '<ul>'; } out += `<li>${mdInline(l.replace(/^\s*[-*] /, ''))}</li>`; continue; }
    if (/^\s*\d+\. /.test(l)) { if (list !== 'ol') { close(); list = 'ol'; out += '<ol>'; } out += `<li>${mdInline(l.replace(/^\s*\d+\. /, ''))}</li>`; continue; }
    close();
    if (/^> /.test(l)) out += `<div class="card mut">${mdInline(l.slice(2))}</div>`;
    else if (l.trim()) out += `<p>${mdInline(l)}</p>`;
  }
  close(); return out;
}

const sections = [
  ['02-estrategia-plan', 'E2 · Estrategia y plan de pruebas'],
  ['03-casos-prueba', 'E3 · Casos de prueba y automatización'],
  ['04-resumen-ejecutivo', 'E4 · Resumen ejecutivo'],
  ['06-observacion-no-funcional', 'Observación no funcional'],
  ['07-pruebas-mutantes', 'Pruebas de mutación de peticiones'],
  ['09-oportunidades-mejora', 'Oportunidades de mejora'],
];
function buildSection(name, title) {
  const md = fs.readFileSync(path.join(docs, `${name}.md`), 'utf8').replace(/^# .*\n/, '');
  const nav = `<p class="mut"><a href="../00-INDICE.html">Índice</a> · <a href="INFORME-QA-SpendWise.html">Informe de QA</a> · ${sections.filter(([n]) => n !== name).map(([n, t]) => `<a href="${n}.html">${esc(t.replace(/^E\d · /, ''))}</a>`).join(' · ')}</p>`;
  return shell(`SpendWise · ${title}`, `<header class="hero"><h1>${esc(title)}</h1><p>SpendWise · Prueba técnica de QA · Cristian Guerra</p></header>${nav}<div class="card">${markdownToHtml(md)}</div>`);
}

function buildIndex(inv) {
  const count = s => defects.filter(d => d.severity === s).length;
  return shell('SpendWise · Entrega QA', `<header class="hero"><h1>SpendWise · Entrega de la prueba técnica de QA</h1><p>Cristian Guerra · QA Analyst · octubre de 2026</p></header>
<div class="kpis"><div class="kpi r"><b>${defects.length}</b>defectos confirmados</div><div class="kpi r"><b>${count('Alta')}</b>severidad alta</div><div class="kpi"><b>${inv.tests}</b>pruebas automatizadas</div><div class="kpi"><b>${inv.files}</b>archivos de prueba</div></div>
<div class="card decision"><h3>Recomendación: no liberar esta versión</h3><p>Hasta corregir y re-verificar los ${count('Alta')} defectos de severidad alta. Detalle en el informe.</p></div>
<div class="tw"><table><thead><tr><th>Entregable</th><th>Documento</th></tr></thead><tbody>
<tr><td><b>E1 · Reporte de defectos</b></td><td><a href="docs/INFORME-QA-SpendWise.html"><b>Informe de QA con evidencia embebida</b></a> (un solo archivo HTML) · <a href="docs/01-reporte-defectos.md">versión Markdown</a></td></tr>
<tr><td><b>E2 · Estrategia y plan</b></td><td><a href="docs/02-estrategia-plan.html">Estrategia y plan de pruebas</a></td></tr>
<tr><td><b>E3 · Casos y automatización</b></td><td><a href="docs/03-casos-prueba.html">Casos de prueba</a> · <a href="docs/07-pruebas-mutantes.html">Mutación de peticiones</a> · código en <code>tests/</code> y <code>postman/</code> · <a href="README.md">instrucciones de ejecución</a></td></tr>
<tr><td><b>E4 · Resumen ejecutivo</b></td><td><a href="docs/04-resumen-ejecutivo.html">Resumen ejecutivo (una página)</a></td></tr>
<tr><td>Complementos</td><td><a href="docs/09-oportunidades-mejora.html">Oportunidades de mejora</a> · <a href="docs/06-observacion-no-funcional.html">Observación no funcional</a></td></tr>
<tr><td>Evidencia</td><td><code>evidence/report/</code> (verificación final: HTTP, videos y capturas) · <code>evidence/selected/</code> (corridas del 16-oct con trazas saneadas) · <code>evidence/*.txt</code> (registros de ejecución)</td></tr></tbody></table></div>
<p class="mut">La evidencia no contiene contraseñas ni tokens. Las trazas de Playwright se sanearon y pueden abrirse en trace.playwright.dev.</p>`);
}

const inv = testInventory();
const evs = new Map(defects.map(d => [d.id, loadEvidence(d.id)]));
fs.writeFileSync(path.join(docs, 'INFORME-QA-SpendWise.html'), buildReport(inv, evs));
fs.writeFileSync(path.join(docs, '01-reporte-defectos.md'), buildMarkdown(evs));
for (const [name, title] of sections) fs.writeFileSync(path.join(docs, `${name}.html`), buildSection(name, title));
fs.writeFileSync(path.join(root, '00-INDICE.html'), buildIndex(inv));
const size = fs.statSync(path.join(docs, 'INFORME-QA-SpendWise.html')).size;
const missing = defects.filter(d => !fs.existsSync(path.join(evidence, 'api', `${d.id}.png`)) && !evs.get(d.id).media?.final).map(d => d.id);
const impMissing = improvements.filter(i => !fs.existsSync(path.join(evidence, 'improvements')) || !fs.readdirSync(path.join(evidence, 'improvements')).some(f => f.startsWith(i.id))).map(i => i.id);
console.log(`Informe: docs/INFORME-QA-SpendWise.html (${(size / 1048576).toFixed(1)} MB) · ${inv.tests} pruebas en ${inv.files} archivos · defectos sin captura: ${missing.join(', ') || 'ninguno'} · mejoras sin captura: ${impMissing.join(', ') || 'ninguna'}`);
