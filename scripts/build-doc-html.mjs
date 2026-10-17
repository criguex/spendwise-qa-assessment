import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),docs=path.join(root,'docs');
const pages=[
 ['02-estrategia-plan.md','02-estrategia-plan.html','Estrategia y plan de pruebas'],
 ['03-casos-prueba.md','03-casos-prueba.html','Casos de prueba y cobertura'],
 ['04-resumen-ejecutivo.md','04-resumen-ejecutivo.html','Resumen ejecutivo'],
 ['06-observacion-no-funcional.md','06-observacion-no-funcional.html','Observaciones no funcionales'],
 ['07-pruebas-mutantes.md','07-pruebas-mutantes.html','Pruebas mutantes'],
 ['09-oportunidades-mejora.md','09-oportunidades-mejora.html','Oportunidades de mejora']
];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const inline=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
function markdown(md){
 const lines=md.split('\n');let out='',list='',code=false,buf=[];
 const close=()=>{if(list){out+=`</${list}>`;list=''}};
 for(let i=0;i<lines.length;i++){
  const l=lines[i];
  if(l.startsWith('```')){close();if(code){out+=`<pre><code>${esc(buf.join('\n'))}</code></pre>`;buf=[]}code=!code;continue} if(code){buf.push(l);continue}
  if(/^\|/.test(l)&&i+1<lines.length&&/^\|[-: |]+\|?$/.test(lines[i+1])){close();const rows=[];const split=x=>x.slice(1,-1).split('|').map(v=>v.trim());const head=split(l);i+=2;while(i<lines.length&&/^\|/.test(lines[i])){rows.push(split(lines[i]));i++}i--;out+='<div class="table-wrap"><table><thead><tr>'+head.map(x=>`<th>${inline(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>`<td>${inline(x)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';continue}
  const h=l.match(/^(#{1,4})\s+(.*)$/);if(h){close();const n=h[1].length;out+=`<h${n}>${inline(h[2])}</h${n}>`;continue}
  if(/^[-*] /.test(l)){if(list!=='ul'){close();list='ul';out+='<ul>'}out+=`<li>${inline(l.slice(2))}</li>`;continue}
  if(/^\d+\. /.test(l)){if(list!=='ol'){close();list='ol';out+='<ol>'}out+=`<li>${inline(l.replace(/^\d+\. /,''))}</li>`;continue}
  close();if(/^> /.test(l))out+=`<blockquote>${inline(l.slice(2))}</blockquote>`;else if(l.trim())out+=`<p>${inline(l)}</p>`;
 } close();return out;
}
const nav=pages.map(([,html,title])=>`<a href="${html}">${title}</a>`).join('');
const css=`:root{--o:#ff6c0c;--c:#0dd3ad;--bg:#172532;--p:#213545;--line:#3b5264;--t:#f3f7f8;--m:#b8c5cc}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:15px/1.6 system-ui}header{padding:30px 5vw;background:linear-gradient(120deg,#172532,#294154);border-bottom:1px solid var(--line)}h1{margin:0;background:linear-gradient(90deg,var(--o),var(--c));background-clip:text;color:transparent}header p{color:var(--m)}nav{position:sticky;top:0;z-index:2;display:flex;gap:7px;overflow:auto;padding:10px 5vw;background:#172532ee;border-bottom:1px solid var(--line)}nav a{color:var(--m);text-decoration:none;white-space:nowrap;border:1px solid var(--line);border-radius:99px;padding:5px 9px}main{max-width:1200px;margin:auto;padding:30px 5vw 70px}h2{margin-top:32px;color:var(--c)}h3{color:#f5b942}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;background:var(--p);margin:14px 0}th,td{text-align:left;vertical-align:top;border:1px solid var(--line);padding:9px}th{color:var(--c)}code,pre{background:#101d27;border:1px solid var(--line);border-radius:5px}code{padding:1px 4px}pre{padding:14px;overflow:auto}blockquote{border-left:4px solid var(--o);background:var(--p);margin:15px 0;padding:12px 16px;color:var(--m)}a{color:var(--c)}.back{display:inline-block;margin-top:30px}@media print{body{background:white;color:#172532}nav{display:none}table,pre,blockquote{background:white}}`;
for(const [mdName,htmlName,title] of pages){const body=markdown(fs.readFileSync(path.join(docs,mdName),'utf8'));const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · SpendWise</title><style>${css}</style></head><body><header><h1>${title}</h1><p>SpendWise · Evaluación técnica QA · Cristian Guerra</p></header><nav><a href="11-informe-final-consolidado.html">Informe final</a>${nav}</nav><main>${body}<a class="back" href="../00-INDICE-EVIDENCIAS.html">← Volver al índice</a></main></body></html>`;fs.writeFileSync(path.join(docs,htmlName),html);console.log(`Generated docs/${htmlName}`)}
