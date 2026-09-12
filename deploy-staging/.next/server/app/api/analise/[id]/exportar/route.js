"use strict";(()=>{var e={};e.id=3118,e.ids=[3118],e.modules={62418:e=>{e.exports=require("mysql2/promise")},72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},21764:e=>{e.exports=require("util")},92110:e=>{e.exports=require("node:diagnostics_channel")},87561:e=>{e.exports=require("node:fs")},49411:e=>{e.exports=require("node:path")},4593:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>b,patchFetch:()=>_,requestAsyncStorage:()=>x,routeModule:()=>h,serverHooks:()=>v,staticGenerationAsyncStorage:()=>E});var i={};t.r(i),t.d(i,{GET:()=>g,dynamic:()=>u});var o=t(49303),s=t(88716),r=t(60670),n=t(87070),l=t(90455),d=t(47128);let u="force-dynamic";function c(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let p={admin1:"Prov\xedncia",admin2:"Distrito",admin3:"Posto administrativo"};function m(e){let a=[...e.unidades].sort((e,a)=>a.valor-e.valor).slice(0,20),t=a[0]?.valor||1,i=a.map((e,a)=>`
        <div class="linha-barra">
          <span class="linha-rotulo">${a+1}. ${c(e.nome)}</span>
          <div class="linha-fundo"><div class="linha-preenchida" style="width:${Math.max(2,e.valor/t*100)}%"></div></div>
          <span class="linha-valor">${function(e){let a=Number.isInteger(e)?0:Math.abs(e)>=100?0:Math.abs(e)>=10?1:2;return e.toLocaleString("pt-PT",{minimumFractionDigits:a,maximumFractionDigits:a})}(e.valor)}</span>
        </div>`).join("");return`
    <section class="cartao">
      <h2>${p[e.nivel]||e.nivel}: ${c(e.metrica)}</h2>
      <p class="legenda">${e.unidades.length} unidades${a.length<e.unidades.length?` \xb7 mostrando as ${a.length} maiores`:""}</p>
      <div class="lista-barras">${i}</div>
    </section>`}function f(e){let a={esq:40,dir:10,cima:10,baixo:24},t=e.eixoX.length,i=e.series.flatMap(e=>e.valores).filter(e=>null!=e),o=Math.min(...i,0),s=Math.max(...i,0)-o||1,r=560-a.esq-a.dir,n=220-a.cima-a.baixo;function l(e){return a.cima+n-(e-o)/s*n}let d=["#064E2C","#0a6339","#3D8B5F","#7BB596","#B8DBC8","#CFE3D6"],u=["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948"],p="",m="";if("barra"===e.tipo){let i=r/t,o=.7*i/e.series.length;e.series.forEach((e,t)=>{e.valores.forEach((e,s)=>{if(null==e)return;let r=a.esq+s*i+.15*i+t*o,u=n-(l(e)-a.cima);p+=`<rect x="${r.toFixed(1)}" y="${l(e).toFixed(1)}" width="${o.toFixed(1)}" height="${u.toFixed(1)}" fill="${d[t%d.length]}" />`})}),m=e.series.map((e,a)=>`<span class="chave"><i style="background:${d[a%d.length]}"></i>${c(e.nome)}</span>`).join("")}else if("pizza"===e.tipo){let a=(e.series[0]?.valores||[]).map(e=>e??0),t=a.reduce((e,a)=>e+a,0)||1,i=-Math.PI/2;a.forEach((e,a)=>{let o=e/t*Math.PI*2,s=280+90*Math.cos(i),r=110+90*Math.sin(i),n=280+90*Math.cos(i+=o),l=110+90*Math.sin(i);p+=`<path d="M280,110 L${s.toFixed(1)},${r.toFixed(1)} A90,90 0 ${o>Math.PI?1:0} 1 ${n.toFixed(1)},${l.toFixed(1)} Z" fill="${u[a%u.length]}" stroke="#fff" stroke-width="1.5" />`}),m=e.eixoX.map((e,a)=>`<span class="chave"><i style="background:${u[a%u.length]}"></i>${c(e)}</span>`).join("")}else if("dispersao"===e.tipo){let t=e.series[0]?.valores||[],i=e.eixoX.map(e=>Number.parseFloat(e)),o=Math.min(...i),s=Math.max(...i)-o||1;i.forEach((e,i)=>{let n=t[i];if(null==n||!Number.isFinite(e))return;let u=a.esq+(e-o)/s*r;p+=`<circle cx="${u.toFixed(1)}" cy="${l(n).toFixed(1)}" r="3" fill="${d[0]}" fill-opacity="0.6" />`})}else e.series.forEach((e,i)=>{let o=e.valores.map((e,i)=>null==e?null:`${(a.esq+i/(t-1||1)*r).toFixed(1)},${l(e).toFixed(1)}`).filter(Boolean).join(" ");p+=`<polyline points="${o}" fill="none" stroke="${d[i%d.length]}" stroke-width="2" />`}),m=e.series.map((e,a)=>`<span class="chave"><i style="background:${d[a%d.length]}"></i>${c(e.nome)}</span>`).join("");return`
    <section class="cartao">
      <h2>${c(e.titulo)}</h2>
      <svg viewBox="0 0 560 220" class="grafico-svg" role="img" aria-label="${c(e.titulo)}">${p}</svg>
      <div class="legenda-grafico">${m}</div>
    </section>`}async function g(e,{params:a}){let t=await (0,l.ts)();if(!t)return n.NextResponse.json({erro:"N\xe3o autenticado"},{status:401});let i=await (0,d.cp)(a.id);if(!i)return n.NextResponse.json({erro:"An\xe1lise n\xe3o encontrada"},{status:404});if(!i.publico&&i.utilizador_id!==t.userId)return n.NextResponse.json({erro:"Sem acesso"},{status:403});if("erro"===i.estado||!i.narrativa?.resolvida)return n.NextResponse.json({erro:"An\xe1lise sem narrativa public\xe1vel"},{status:409});let o=i.narrativa.resolvida,s=(i.resultados?.series||[]).filter(e=>e.unidades?.length>0),r=i.resultados?.graficos||[],u=i.resultados?.destaques||[],p=i.achados||[],g=`<!doctype html>
<html lang="pt-MZ">
<head>
<meta charset="utf-8" />
<title>${c(o.titulo)} \xb7 Data Portal</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #FAFBFA; color: #1A2E22; }
  .pagina { max-width: 880px; margin: 0 auto; padding: 32px 20px 60px; }
  header.hero { background: linear-gradient(135deg, #064E2C, #0a6339); color: #fff; border-radius: 16px; padding: 40px 36px; margin-bottom: 28px; }
  header.hero p.eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 11px; font-weight: 700; color: #9FD4B4; margin: 0 0 14px; }
  header.hero h1 { font-size: 32px; line-height: 1.15; margin: 0 0 14px; font-weight: 800; }
  header.hero p.subtitulo { font-size: 16px; color: rgba(255,255,255,.85); line-height: 1.6; margin: 0; max-width: 640px; }
  header.hero .rodape { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.15); font-size: 12px; color: rgba(255,255,255,.6); }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .kpi { background: #fff; border: 1px solid #E2E8E5; border-radius: 14px; padding: 18px; text-align: center; }
  .kpi .valor { font-size: 30px; font-weight: 800; color: #064E2C; line-height: 1; margin-bottom: 6px; }
  .kpi .rotulo { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; }
  .cartao { background: #fff; border: 1px solid #E2E8E5; border-radius: 14px; padding: 22px 24px; margin-bottom: 18px; }
  .cartao h2 { font-size: 15px; font-weight: 700; margin: 0 0 6px; }
  .cartao .legenda { font-size: 12px; color: #6B7280; margin: 0 0 14px; }
  .cartao p.resposta { font-size: 16px; line-height: 1.65; margin: 0; }
  .linha-barra { display: grid; grid-template-columns: 160px 1fr 70px; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 12px; }
  .linha-rotulo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .linha-fundo { background: #F1F4F2; border-radius: 4px; height: 16px; overflow: hidden; }
  .linha-preenchida { background: #B8DBC8; height: 100%; }
  .linha-valor { font-weight: 700; color: #064E2C; text-align: right; font-variant-numeric: tabular-nums; }
  .grafico-svg { width: 100%; height: auto; }
  .legenda-grafico { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
  .chave { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #4B5563; }
  .chave i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .achados { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  .achado { border-left: 4px solid #064E2C; background: #fff; border: 1px solid #E2E8E5; border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 700; }
  .aviso { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 14px; padding: 20px 22px; margin-bottom: 18px; }
  .aviso h2 { color: #92400E; font-size: 15px; margin: 0 0 10px; }
  .aviso li { color: #92400E; font-size: 13px; line-height: 1.6; }
  footer { font-size: 12px; color: #6B7280; border-top: 1px solid #E2E8E5; padding-top: 16px; }
</style>
</head>
<body>
<div class="pagina">
  <header class="hero">
    <p class="eyebrow">Data Portal \xb7 dataportal.co.mz</p>
    <h1>${c(o.titulo)}</h1>
    <p class="subtitulo">${c(o.subtitulo)}</p>
    <div class="rodape">${c(i.pergunta)} \xb7 ${new Date(i.criado_em).toLocaleDateString("pt-PT",{day:"2-digit",month:"long",year:"numeric"})}</div>
  </header>

  ${o.numeros_chave?.length?`<div class="kpis">${o.numeros_chave.map(e=>`<div class="kpi"><div class="valor">${c(String(e.valor))}</div><div class="rotulo">${c(e.rotulo)}</div></div>`).join("")}</div>`:""}

  <div class="cartao"><p class="resposta">${c(o.resposta_directa)}</p></div>

  ${u.map(e=>`
    <section class="cartao">
      <h2>${c(e.titulo)}</h2>
      <p class="resposta" style="font-size:15px;color:#B91C1C;font-weight:700;margin:0">${c(e.nome)}</p>
      <p class="legenda" style="margin-top:6px">${c(String(e.valor))} ${c(e.metrica)} \xb7 mapa interactivo dispon\xedvel na vers\xe3o online</p>
    </section>`).join("")}

  ${s.map(m).join("")}
  ${r.map(f).join("")}

  ${p.length?`<section class="cartao"><h2>O que n\xe3o perguntou mas devia saber</h2><div class="achados">${p.slice(0,6).map(e=>`<div class="achado">${c(e.titulo)}</div>`).join("")}</div></section>`:""}

  <section class="aviso">
    <h2>O que isto n\xe3o diz</h2>
    <ul>${o.o_que_nao_diz.map(e=>`<li>${c(e)}</li>`).join("")}</ul>
  </section>

  <footer>
    <p><strong>Fontes:</strong> ${o.fontes.map(e=>`${c(e.instituicao)}${e.ano?` (${e.ano})`:""}`).join("; ")}</p>
    <p>Produzido por dataportal.co.mz, o portal de dados oficial de Mo\xe7ambique.</p>
  </footer>
</div>
</body>
</html>`;return new n.NextResponse(g,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`attachment; filename="analise-${a.id}.html"`}})}let h=new o.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/analise/[id]/exportar/route",pathname:"/api/analise/[id]/exportar",filename:"route",bundlePath:"app/api/analise/[id]/exportar/route"},resolvedPagePath:"D:\\VersaoProData\\DataPortal\\DataPortal\\app\\api\\analise\\[id]\\exportar\\route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:x,staticGenerationAsyncStorage:E,serverHooks:v}=h,b="/api/analise/[id]/exportar/route";function _(){return(0,r.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:E})}},47128:(e,a,t)=>{t.d(a,{lP:()=>u,xg:()=>y,cV:()=>N,LS:()=>c,WQ:()=>x,nL:()=>w,hy:()=>S,cp:()=>_,aZ:()=>O,RS:()=>E,NC:()=>p,p6:()=>v});var i=t(39548);let o=["resposta","mapa","graficos","o_que_mostram","porque"],s={geoespacial:["resposta","mapa","o_que_mostram","graficos","porque"],ranking:["resposta","mapa","graficos","o_que_mostram","porque"],comparativo:["resposta","graficos","mapa","o_que_mostram","porque"],temporal:["resposta","graficos","o_que_mostram","mapa","porque"],diagnostico:["resposta","o_que_mostram","porque","mapa","graficos"]},r=!1,n=!1;async function l(){if(!n){try{await i.db.execute("ALTER TABLE analises ADD COLUMN tokens_entrada INT NULL")}catch{}try{await i.db.execute("ALTER TABLE analises ADD COLUMN tokens_saida INT NULL")}catch{}n=!0}}async function d(){if(!r){try{await i.db.execute("ALTER TABLE analises ADD COLUMN confianca_detalhe LONGTEXT NULL")}catch{}r=!0}}async function u(e,a,t,o){await i.db.execute(`INSERT INTO analises (id, utilizador_id, pergunta, datasets_ids, estado)
     VALUES (?, ?, ?, ?, 'planeando')`,[e,o,a,JSON.stringify(t)])}async function c(e){await d(),await l();let{contexto:a}=e,t=function(e,a){let t=(s[e]||o).filter(e=>"mapa"===e?a.mapa:"graficos"!==e||a.graficos);return{arquetipo:e,ordem:t}}(e.compreensao.arquetipo_sugerido,{mapa:a.series.length>0||a.destaques.length>0||a.camadasBrutas.length>0,graficos:a.graficos.length>0});for(let o of(await i.db.execute(`UPDATE analises SET
       arquetipo = ?, estado = ?, plano = ?, resultados = ?, achados = ?,
       narrativa = ?, dashboard_spec = ?, fontes = ?, confianca = ?, custo_usd = ?, duracao_ms = ?,
       confianca_detalhe = ?, tokens_entrada = ?, tokens_saida = ?
     WHERE id = ?`,[e.compreensao.arquetipo_sugerido,e.critica.bloqueia_publicacao?"erro":"pronto",JSON.stringify(e.plano),JSON.stringify({calcs:a.calcs,series:a.series,graficos:a.graficos,destaques:a.destaques,camadasBrutas:a.camadasBrutas,listas:a.listas,multiplos:a.multiplos,avisos:a.avisos,qualidade:a.qualidade,codigoExecutado:a.codigoExecutado}),JSON.stringify(e.achados),JSON.stringify({bruta:e.narrativa,resolvida:e.narrativa_resolvida,critica:e.critica}),JSON.stringify(t),JSON.stringify(e.narrativa.fontes),e.suficiencia.confianca_sem_enriquecimento,e.custo_usd,e.duracao_ms,JSON.stringify(e.confianca),e.tokens_entrada,e.tokens_saida,e.analise_id]),e.plano.passos)){let t=Object.values(a.calcs).filter(e=>e.passo_id===o.id);await i.db.execute(`INSERT INTO analise_execucoes (analise_id, passo, codigo, resultado, erro)
       VALUES (?, ?, ?, ?, ?)`,[e.analise_id,o.id,`${o.metodo}(${JSON.stringify(o.coluna_metrica??null)})`,JSON.stringify(t),0===t.length?"Passo n\xe3o produziu c\xe1lculos":null])}}async function p(e,a,t){let o={titulo:"N\xe3o foi poss\xedvel concluir esta an\xe1lise",subtitulo:a,resposta_directa:t,numeros_chave:[],o_que_mostram:"Nenhum c\xe1lculo p\xf4de ser produzido a partir dos dados seleccionados.",porque:"Pode ser uma falha tempor\xe1ria de rede ou de processamento, ou os dados seleccionados n\xe3o terem informa\xe7\xe3o suficiente para responder a esta pergunta em concreto.",o_que_nao_diz:["Esta resposta n\xe3o cont\xe9m n\xfameros: nenhum c\xe1lculo foi validado.","Tente reformular a pergunta ou seleccionar outros datasets."],como_chegamos:"A an\xe1lise foi tentada, mas n\xe3o produziu resultados suficientes para publicar.",fontes:[]};await i.db.execute(`UPDATE analises SET
       estado = 'pronto', resultados = ?, achados = ?, narrativa = ?, dashboard_spec = ?
     WHERE id = ?`,[JSON.stringify({calcs:{},series:[],graficos:[],destaques:[],camadasBrutas:[],avisos:[],qualidade:[],codigoExecutado:[]}),JSON.stringify([]),JSON.stringify({bruta:o,resolvida:o,critica:null}),JSON.stringify(null),e])}let m=!1;async function f(){if(!m)try{let[e]=await i.db.execute("SHOW COLUMNS FROM analises LIKE 'estado'"),a=String(e[0]?.Type||"");a&&!a.includes("'inviavel'")&&await i.db.execute(`ALTER TABLE analises MODIFY COLUMN estado
         ENUM('planeando','executando','compondo','pronto','erro','inviavel')
         NOT NULL DEFAULT 'planeando'`),m=!0}catch{}}let g=!1;async function h(){if(!g)try{let[e]=await i.db.execute("SHOW COLUMNS FROM analises LIKE 'narrativa_en'");0===e.length&&await i.db.execute("ALTER TABLE analises ADD COLUMN narrativa_en LONGTEXT NULL"),g=!0}catch{}}async function x(e,a){await h(),await i.db.execute("UPDATE analises SET narrativa_en = ? WHERE id = ?",[JSON.stringify(a),e])}async function E(e){await h();try{let[a]=await i.db.execute("SELECT narrativa_en FROM analises WHERE id = ? LIMIT 1",[e]),t=a[0]?.narrativa_en;if(!t)return null;return"string"==typeof t?JSON.parse(t):t}catch{return null}}async function v(e,a,t,o){await f(),await i.db.execute("UPDATE analises SET estado = 'inviavel', narrativa = ?, plano = ?, resultados = ? WHERE id = ?",[JSON.stringify({inviavel:{evidencia:a,sugestoes:t}}),o?.plano?JSON.stringify(o.plano):null,o?JSON.stringify({portao:o.portao,avisos:o.avisos,passos_falhados:o.passos_falhados,calcs:o.calcs}):null,e])}function b(e,a){if(null==e)return a;if("string"==typeof e)try{return JSON.parse(e)}catch{return a}return e}async function _(e){await d();let[a]=await i.db.execute("SELECT * FROM analises WHERE id = ? LIMIT 1",[e]),t=a[0];return t?{id:t.id,pergunta:t.pergunta,datasets_ids:b(t.datasets_ids,[]),arquetipo:t.arquetipo,estado:t.estado,plano:b(t.plano,null),resultados:b(t.resultados,null),achados:b(t.achados,[]),narrativa:b(t.narrativa,null),dashboard_spec:b(t.dashboard_spec,null),confianca:null!=t.confianca?Number(t.confianca):null,confianca_detalhe:b(t.confianca_detalhe,null),custo_usd:null!=t.custo_usd?Number(t.custo_usd):null,duracao_ms:t.duracao_ms,publico:!!t.publico,guardado:!!t.guardado,criado_em:t.criado_em,utilizador_id:t.utilizador_id}:null}async function y(e,a,t){let[o]=await i.db.execute("UPDATE analises SET guardado = ? WHERE id = ? AND utilizador_id = ?",[t?1:0,e,a]);return o.affectedRows>0}async function N(e,a,t){let[o]=await i.db.execute("UPDATE analises SET publico = ? WHERE id = ? AND utilizador_id = ?",[t?1:0,e,a]);return o.affectedRows>0}async function S(e,a,t=4){if(0===e.length)return[];let[o]=await i.db.execute(`SELECT id, pergunta, datasets_ids, criado_em
     FROM analises
     WHERE publico = 1 AND estado = 'pronto' AND id != ?
     ORDER BY criado_em DESC
     LIMIT 200`,[a]);return o.filter(a=>("string"==typeof a.datasets_ids?JSON.parse(a.datasets_ids):a.datasets_ids).some(a=>e.includes(a))).slice(0,t).map(e=>({id:e.id,pergunta:e.pergunta,criado_em:e.criado_em}))}async function w(e,a=20){let[t]=await i.db.execute(`SELECT id, pergunta, estado, criado_em FROM analises
     WHERE utilizador_id = ? ORDER BY criado_em DESC LIMIT ?`,[e,a]);return t}async function O(e=null){let a=e?"AND criado_em >= ?":"",t=e?[e]:[],[o]=await i.db.execute(`SELECT
       COUNT(*) as nAnalises,
       COALESCE(SUM(custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(custo_usd), 0) as custoMedioUsd,
       COALESCE(SUM(tokens_entrada), 0) as tokensEntrada,
       COALESCE(SUM(tokens_saida), 0) as tokensSaida,
       COALESCE(AVG(duracao_ms), 0) as duracaoMediaMs
     FROM analises
     WHERE custo_usd IS NOT NULL ${a}`,t),[s]=await i.db.execute(`SELECT a.utilizador_id as utilizadorId, u.name as nome, u.email as email,
       COUNT(*) as nAnalises,
       COALESCE(SUM(a.custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(a.custo_usd), 0) as custoMedioUsd
     FROM analises a
     LEFT JOIN users u ON u.id = a.utilizador_id
     WHERE a.custo_usd IS NOT NULL ${a}
     GROUP BY a.utilizador_id, u.name, u.email
     ORDER BY custoTotalUsd DESC
     LIMIT 50`,t),[r]=await i.db.execute(`SELECT a.id, a.pergunta, u.name as nome, u.email as email,
       a.custo_usd as custoUsd, a.tokens_entrada as tokensEntrada, a.tokens_saida as tokensSaida,
       a.duracao_ms as duracaoMs, a.criado_em as criadoEm
     FROM analises a
     LEFT JOIN users u ON u.id = a.utilizador_id
     WHERE a.custo_usd IS NOT NULL ${a}
     ORDER BY a.criado_em DESC
     LIMIT 50`,t),n=o[0]||{};return{totais:{nAnalises:Number(n.nAnalises)||0,custoTotalUsd:Number(n.custoTotalUsd)||0,custoMedioUsd:Number(n.custoMedioUsd)||0,tokensEntrada:Number(n.tokensEntrada)||0,tokensSaida:Number(n.tokensSaida)||0,duracaoMediaMs:Number(n.duracaoMediaMs)||0},porUtilizador:s.map(e=>({utilizadorId:e.utilizadorId,nome:e.nome,email:e.email,nAnalises:Number(e.nAnalises)||0,custoTotalUsd:Number(e.custoTotalUsd)||0,custoMedioUsd:Number(e.custoMedioUsd)||0})),recentes:r.map(e=>({id:e.id,pergunta:e.pergunta,nome:e.nome,email:e.email,custoUsd:null!=e.custoUsd?Number(e.custoUsd):null,tokensEntrada:e.tokensEntrada,tokensSaida:e.tokensSaida,duracaoMs:e.duracaoMs,criadoEm:e.criadoEm}))}}},90455:(e,a,t)=>{t.d(a,{Ld:()=>l.Ld,Oe:()=>u,RA:()=>c,T6:()=>g,X9:()=>l.X9,Zh:()=>x,c_:()=>d,fM:()=>f,ge:()=>p,sV:()=>l.sV,st:()=>l.st,ts:()=>m,uy:()=>l.uy,xV:()=>h});var i=t(42023),o=t.n(i),s=t(84770),r=t.n(s),n=t(71615),l=t(70446);async function d(e){return o().hash(e,10)}async function u(e,a){return o().compare(e,a)}function c(){return r().randomBytes(32).toString("hex")}function p(){return r().randomInt(1e5,1e6).toString()}async function m(){let e=await (0,n.cookies)(),a=e.get(l.sV)?.value;return a?(0,l.g$)(a):null}async function f(){let e=await h();if(!e||"admin"!==e.role)return null;let{findUserById:a}=await t.e(9548).then(t.bind(t,39548)),i=await a(e.id);return i?.totp_enabled?{userId:e.id,email:e.email,role:"admin"}:null}async function g(){let e=await h();return e&&"admin"===e.role?{userId:e.id,email:e.email,role:"admin"}:null}async function h(){let e=await m();if(!e)return null;let{findUserById:a}=await t.e(9548).then(t.bind(t,39548)),i=await a(e.userId);if(!i||0===i.active||!1===i.active)return null;let o=(0,l.VA)(i.role),s=i.receber_notificacoes;return{id:i.id,email:i.email,name:i.name,role:o,emailVerified:!!i.emailVerified,receberNotificacoes:null==s?null:!!s}}function x(e,a){if(e?.trim()){let a=e.trim().split(/\s+/).filter(Boolean);return a.length>=2?`${a[0][0]}${a[a.length-1][0]}`.toUpperCase():a[0].slice(0,2).toUpperCase()}return(a?.[0]||"U").toUpperCase()}},57435:(e,a,t)=>{function i(e,a,t){let i=JSON.stringify({level:e,event:a,time:new Date().toISOString(),...function(e){if(!e)return;let a={};for(let[t,i]of Object.entries(e))a[t]=i instanceof Error?{name:i.name,message:i.message,stack:i.stack}:i;return a}(t)});"error"===e?console.error(i):"warn"===e?console.warn(i):console.log(i)}t.d(a,{k:()=>o});let o={debug:(e,a)=>i("debug",e,a),info:(e,a)=>i("info",e,a),warn:(e,a)=>i("warn",e,a),error:(e,a)=>i("error",e,a)}},70446:(e,a,t)=>{t.d(a,{Ld:()=>p,VA:()=>l,X9:()=>m,g$:()=>u,sV:()=>r,st:()=>c,uy:()=>d});var i=t(41482),o=t.n(i),s=t(57435);let r="session",n=process.env.JWT_SECRET||"";function l(e){return"admin"===String(e??"").trim().toLowerCase()?"admin":"user"}function d(e){if(!n)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir uma sess\xe3o em seguran\xe7a.");return o().sign(e,n,{expiresIn:"7d"})}function u(e){if(!n)return null;try{let a=o().verify(e,n);return{userId:a.userId,email:a.email,role:l(a.role)}}catch{return null}}function c(e){if(!n)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir um token de 2FA em seguran\xe7a.");return o().sign({userId:e,purpose:"totp-pending"},n,{expiresIn:"5m"})}function p(e){if(!n)return null;try{let a=o().verify(e,n);if("totp-pending"!==a.purpose||"number"!=typeof a.userId)return null;return{userId:a.userId}}catch{return null}}function m(){return{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"}}n||s.k.error("sessao.jwt_secret_em_falta",{aviso:'JWT_SECRET n\xe3o est\xe1 definido e NODE_ENV n\xe3o \xe9 "development": sess\xf5es n\xe3o podem ser emitidas nem validadas at\xe9 a vari\xe1vel de ambiente ser configurada.'})}};var a=require("../../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),i=a.X(0,[8948,8992,4028,5972,9548],()=>t(4593));module.exports=i})();