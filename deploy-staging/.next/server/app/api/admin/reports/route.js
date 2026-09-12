"use strict";(()=>{var e={};e.id=4529,e.ids=[4529],e.modules={62418:e=>{e.exports=require("mysql2/promise")},72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},27790:e=>{e.exports=require("assert")},78893:e=>{e.exports=require("buffer")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},74026:e=>{e.exports=require("string_decoder")},82452:e=>{e.exports=require("tls")},74175:e=>{e.exports=require("tty")},21764:e=>{e.exports=require("util")},92110:e=>{e.exports=require("node:diagnostics_channel")},87561:e=>{e.exports=require("node:fs")},49411:e=>{e.exports=require("node:path")},87739:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>E,patchFetch:()=>f,requestAsyncStorage:()=>w,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>g});var r={};a.r(r),a.d(r,{GET:()=>p,dynamic:()=>u});var s=a(49303),o=a(88716),n=a(60670),i=a(39548),d=a(90455),c=a(55441),l=a(57435);let u="force-dynamic";async function p(e){try{let t=await (0,d.fM)();if(!t)return new Response(JSON.stringify({error:"Acesso reservado a administradores"}),{status:403,headers:{"Content-Type":"application/json"}});if(!await (0,i.GY)(t.email))return new Response(JSON.stringify({error:"Acesso n\xe3o autorizado"}),{status:401,headers:{"Content-Type":"application/json"}});let{searchParams:a}=new URL(e.url),r=a.get("type")||"dashboard",s=a.get("format")||"json",o=a.get("startDate"),n=a.get("endDate"),l=a.get("category"),u=a.get("datasetFormat"),p=a.get("source"),m={};if("dashboard"===r){let e=(0,c.s)({categoryName:l,datasetFormat:u,source:p}),t=(0,c.o)({startDate:o,endDate:n}),[a,r,d,w,g,y,E,f]=await Promise.all([(async()=>{let[t]=await i.db.execute(`SELECT COUNT(*) as total
             FROM Dataset d
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE 1=1 ${e.whereSql}`,e.values);return t[0]?.total??0})(),(async()=>{let[a]=await i.db.execute(`SELECT COUNT(*) as total
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'view'
             ${t.whereSql}
             ${e.whereSql}`,[...t.values,...e.values]);return a[0]?.total??0})(),(async()=>{let[a]=await i.db.execute(`SELECT COUNT(*) as total
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'download'
             ${t.whereSql}
             ${e.whereSql}`,[...t.values,...e.values]);return a[0]?.total??0})(),(async()=>{let[a]=await i.db.execute(`SELECT s.datasetId, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'view'
             ${t.whereSql}
             ${e.whereSql}
             GROUP BY s.datasetId
             ORDER BY cnt DESC
             LIMIT 10`,[...t.values,...e.values]);return a})(),(async()=>{let[a]=await i.db.execute(`SELECT s.datasetId, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE s.type = 'download'
             ${t.whereSql}
             ${e.whereSql}
             GROUP BY s.datasetId
             ORDER BY cnt DESC
             LIMIT 10`,[...t.values,...e.values]);return a})(),(async()=>{let[a]=await i.db.execute(`SELECT s.datasetId, s.type, COUNT(*) as cnt
             FROM Statistic s
             JOIN Dataset d ON s.datasetId = d.id
             LEFT JOIN Category c ON d.categoryId = c.id
             WHERE 1=1
             ${t.whereSql}
             ${e.whereSql}
             GROUP BY s.datasetId, s.type`,[...t.values,...e.values]);return a})(),(async()=>{let[e]=await i.db.execute(`SELECT
               c.name as categoryName,
               COALESCE(SUM(d.views), 0) as totalViews,
               COALESCE(SUM(d.downloads), 0) as totalDownloads,
               CASE
                 WHEN COALESCE(SUM(d.views), 0) > 0
                   THEN (COALESCE(SUM(d.downloads), 0) / COALESCE(SUM(d.views), 0)) * 100
                 ELSE 0
               END as averageConversionRate
             FROM Category c
             LEFT JOIN Dataset d
               ON d.categoryId = c.id
               ${u?"AND d.format = ?":""}
               ${p?"AND d.source = ?":""}
             ${l?"WHERE c.name = ?":""}
             GROUP BY c.id
             ORDER BY averageConversionRate DESC`,[...u?[u]:[],...p?[p]:[],...l?[l]:[]]);return e})(),(async()=>{let[e]=await i.db.execute(`SELECT c.name as categoryName, COUNT(d.id) as count
             FROM Category c
             LEFT JOIN Dataset d
               ON d.categoryId = c.id
               ${u?"AND d.format = ?":""}
               ${p?"AND d.source = ?":""}
             ${l?"WHERE c.name = ?":""}
             GROUP BY c.id`,[...u?[u]:[],...p?[p]:[],...l?[l]:[]]);return e})()]),O=w.map(e=>e.datasetId),v=new Map(w.map(e=>[e.datasetId,e.cnt])),D=O.length?await (async()=>{let t=O.map(()=>"?").join(","),[a]=await i.db.execute(`SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${t}) ${e.whereSql}`,[...O,...e.values]);return a.map(e=>({...e,category:{id:e.cat_id,name:e.cat_name,description:e.cat_desc,dataType:e.cat_dataType},periodViews:v.get(e.id)||0})).sort((e,t)=>(t.periodViews||0)-(e.periodViews||0))})():[],S=g.map(e=>e.datasetId),T=new Map(g.map(e=>[e.datasetId,e.cnt])),h=S.length?await (async()=>{let t=S.map(()=>"?").join(","),[a]=await i.db.execute(`SELECT d.*, c.id as cat_id, c.name as cat_name, c.description as cat_desc, c.dataType as cat_dataType
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${t}) ${e.whereSql}`,[...S,...e.values]);return a.map(e=>({...e,category:{id:e.cat_id,name:e.cat_name,description:e.cat_desc,dataType:e.cat_dataType},periodDownloads:T.get(e.id)||0})).sort((e,t)=>(t.periodDownloads||0)-(e.periodDownloads||0))})():[],C={};for(let e of y){let t=String(e.datasetId);C[t]||(C[t]={views:0,downloads:0}),"view"===e.type&&(C[t].views=e.cnt),"download"===e.type&&(C[t].downloads=e.cnt)}let x=D.map(e=>({...e,periodDownloads:C[String(e.id)]?.downloads??0})),N=h.map(e=>({...e,periodViews:C[String(e.id)]?.views??0})),I=Object.keys(C).map(e=>parseInt(e)),R=I.length?await (async()=>{let t=I.map(()=>"?").join(","),[a]=await i.db.execute(`SELECT d.id, d.title
               FROM Dataset d
               LEFT JOIN Category c ON d.categoryId = c.id
               WHERE d.id IN (${t}) ${e.whereSql}`,[...I,...e.values]);return a.map(e=>{let t=C[String(e.id)]||{views:0,downloads:0},a=t.views,r=t.downloads;return{datasetId:e.id,datasetTitle:e.title,views:a,downloads:r,conversionRate:a>0?r/a*100:0}}).filter(e=>e.views>0).sort((e,t)=>t.conversionRate-e.conversionRate)})():[];m={metadata:{generatedAt:new Date().toISOString(),reportType:"dashboard-summary",format:s,period:{start:o||new Date(Date.now()-2592e6).toISOString(),end:n||new Date().toISOString()},filters:{category:l||"",source:p||"",datasetFormat:u||"",startDate:o||"",endDate:n||""}},summary:{totalDatasets:a,totalViews:r,totalDownloads:d,avgConversionRate:r>0?d/r*100:0},topViewed:x,topDownloaded:N,conversionRates:R,categoryPerformance:E,categoryStats:f}}if("csv"===s){let e=function(e){let t=!!(e.metadata?.filters?.startDate||e.metadata?.filters?.endDate),a=t?"Visualiza\xe7\xf5es (per\xedodo)":"Visualiza\xe7\xf5es",r=t?"Downloads (per\xedodo)":"Downloads",s=e=>t?e.periodViews??0:e.periodViews??e.views??0,o=e=>t?e.periodDownloads??0:e.periodDownloads??e.downloads??0,n="";return n+=`Relat\xf3rio de Dashboard
Gerado em: ${e.metadata.generatedAt}
`,t&&(n+=`Per\xedodo: ${e.metadata.filters.startDate||"N/D"} a ${e.metadata.filters.endDate||"N/D"}
`),n+=`
Sum\xe1rio:
Total de Datasets,${e.summary.totalDatasets}
Total de Visualiza\xe7\xf5es,${e.summary.totalViews}
Total de Downloads,${e.summary.totalDownloads}
Taxa de Convers\xe3o M\xe9dia,${e.summary.avgConversionRate}%

Top Datasets Visualizados:
T\xedtulo,Categoria,${a},${r}
`,e.topViewed.forEach(e=>{n+=`"${e.title}","${e.category.name}",${s(e)},${o(e)}
`}),n+=`
Top Datasets Baixados:
T\xedtulo,Categoria,${r},${a}
`,e.topDownloaded.forEach(e=>{n+=`"${e.title}","${e.category.name}",${o(e)},${s(e)}
`}),n+="\nTaxas de Convers\xe3o:\nDataset,Visualiza\xe7\xf5es,Downloads,Taxa de Convers\xe3o (%)\n",e.conversionRates.forEach(e=>{n+=`"${e.datasetTitle}",${e.views},${e.downloads},${e.conversionRate.toFixed(2)}%
`}),n+="\nPerformance por Categoria:\nCategoria,Total Visualiza\xe7\xf5es,Total Downloads,Taxa de Convers\xe3o M\xe9dia (%)\n",e.categoryPerformance.forEach(e=>{n+=`"${e.categoryName}",${e.totalViews},${e.totalDownloads},${e.averageConversionRate.toFixed(2)}%
`}),n}(m);return new Response(e,{status:200,headers:{"Content-Type":"text/csv","Content-Disposition":'attachment; filename="dashboard-report.csv"'}})}return new Response(JSON.stringify(m,null,2),{status:200,headers:{"Content-Type":"application/json"}})}catch(e){return l.k.error("erro_ao_gerar_relat_rio",{error:e}),new Response(JSON.stringify({error:"Erro ao gerar relat\xf3rio"}),{status:500,headers:{"Content-Type":"application/json"}})}}let m=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/admin/reports/route",pathname:"/api/admin/reports",filename:"route",bundlePath:"app/api/admin/reports/route"},resolvedPagePath:"D:\\VersaoProData\\DataPortal\\DataPortal\\app\\api\\admin\\reports\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:w,staticGenerationAsyncStorage:g,serverHooks:y}=m,E="/api/admin/reports/route";function f(){return(0,n.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:g})}},90455:(e,t,a)=>{a.d(t,{Ld:()=>d.Ld,Oe:()=>l,RA:()=>u,T6:()=>g,X9:()=>d.X9,Zh:()=>E,c_:()=>c,fM:()=>w,ge:()=>p,sV:()=>d.sV,st:()=>d.st,ts:()=>m,uy:()=>d.uy,xV:()=>y});var r=a(42023),s=a.n(r),o=a(84770),n=a.n(o),i=a(71615),d=a(70446);async function c(e){return s().hash(e,10)}async function l(e,t){return s().compare(e,t)}function u(){return n().randomBytes(32).toString("hex")}function p(){return n().randomInt(1e5,1e6).toString()}async function m(){let e=await (0,i.cookies)(),t=e.get(d.sV)?.value;return t?(0,d.g$)(t):null}async function w(){let e=await y();if(!e||"admin"!==e.role)return null;let{findUserById:t}=await a.e(9548).then(a.bind(a,39548)),r=await t(e.id);return r?.totp_enabled?{userId:e.id,email:e.email,role:"admin"}:null}async function g(){let e=await y();return e&&"admin"===e.role?{userId:e.id,email:e.email,role:"admin"}:null}async function y(){let e=await m();if(!e)return null;let{findUserById:t}=await a.e(9548).then(a.bind(a,39548)),r=await t(e.userId);if(!r||0===r.active||!1===r.active)return null;let s=(0,d.VA)(r.role),o=r.receber_notificacoes;return{id:r.id,email:r.email,name:r.name,role:s,emailVerified:!!r.emailVerified,receberNotificacoes:null==o?null:!!o}}function E(e,t){if(e?.trim()){let t=e.trim().split(/\s+/).filter(Boolean);return t.length>=2?`${t[0][0]}${t[t.length-1][0]}`.toUpperCase():t[0].slice(0,2).toUpperCase()}return(t?.[0]||"U").toUpperCase()}},57435:(e,t,a)=>{function r(e,t,a){let r=JSON.stringify({level:e,event:t,time:new Date().toISOString(),...function(e){if(!e)return;let t={};for(let[a,r]of Object.entries(e))t[a]=r instanceof Error?{name:r.name,message:r.message,stack:r.stack}:r;return t}(a)});"error"===e?console.error(r):"warn"===e?console.warn(r):console.log(r)}a.d(t,{k:()=>s});let s={debug:(e,t)=>r("debug",e,t),info:(e,t)=>r("info",e,t),warn:(e,t)=>r("warn",e,t),error:(e,t)=>r("error",e,t)}},55441:(e,t,a)=>{function r(e){let t=[],a=[];return e.datasetFormat&&(t.push("d.format = ?"),a.push(e.datasetFormat)),e.source&&(t.push("d.source = ?"),a.push(e.source)),e.categoryName&&(t.push("c.name = ?"),a.push(e.categoryName)),{whereSql:t.length?`AND ${t.join(" AND ")}`:"",values:a}}function s(e){let t=[],a=[];return e.startDate&&(t.push("s.createdAt >= ?"),a.push(new Date(`${e.startDate}T00:00:00.000`))),e.endDate&&(t.push("s.createdAt <= ?"),a.push(new Date(`${e.endDate}T23:59:59.999`))),{whereSql:t.length?`AND ${t.join(" AND ")}`:"",values:a}}a.d(t,{o:()=>s,s:()=>r})},70446:(e,t,a)=>{a.d(t,{Ld:()=>p,VA:()=>d,X9:()=>m,g$:()=>l,sV:()=>n,st:()=>u,uy:()=>c});var r=a(41482),s=a.n(r),o=a(57435);let n="session",i=process.env.JWT_SECRET||"";function d(e){return"admin"===String(e??"").trim().toLowerCase()?"admin":"user"}function c(e){if(!i)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir uma sess\xe3o em seguran\xe7a.");return s().sign(e,i,{expiresIn:"7d"})}function l(e){if(!i)return null;try{let t=s().verify(e,i);return{userId:t.userId,email:t.email,role:d(t.role)}}catch{return null}}function u(e){if(!i)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir um token de 2FA em seguran\xe7a.");return s().sign({userId:e,purpose:"totp-pending"},i,{expiresIn:"5m"})}function p(e){if(!i)return null;try{let t=s().verify(e,i);if("totp-pending"!==t.purpose||"number"!=typeof t.userId)return null;return{userId:t.userId}}catch{return null}}function m(){return{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"}}i||o.k.error("sessao.jwt_secret_em_falta",{aviso:'JWT_SECRET n\xe3o est\xe1 definido e NODE_ENV n\xe3o \xe9 "development": sess\xf5es n\xe3o podem ser emitidas nem validadas at\xe9 a vari\xe1vel de ambiente ser configurada.'})},49303:(e,t,a)=>{e.exports=a(30517)}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[8948,8992,4028,9548],()=>a(87739));module.exports=r})();