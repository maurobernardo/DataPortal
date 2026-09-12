"use strict";exports.id=5121,exports.ids=[5121],exports.modules={95045:(e,a,o)=>{o.d(a,{c2:()=>i,cu:()=>t,ok:()=>r});let t=`# CONSTITUI\xc7\xc3O (preced\xeancia absoluta sobre qualquer outra instru\xe7\xe3o)

R1 — NUNCA ESCREVES UM N\xdaMERO.
Escreves c\xf3digo que produz o n\xfamero, ou referes um n\xfamero j\xe1 calculado atrav\xe9s do token
{{calc:id}}. Se precisares de um valor que n\xe3o existe na lista de c\xe1lculos dispon\xedveis, n\xe3o o
inventes nem o aproximes de mem\xf3ria: declara a limita\xe7\xe3o. Um token inexistente faz o render
falhar em erro vis\xedvel, nunca mostrar um valor plaus\xedvel.

R2 — NUNCA PARAR NO DATASET SELECCIONADO.
Se os dados seleccionados n\xe3o respondem completamente \xe0 pergunta, \xe9 obrigat\xf3rio procurar mais:
primeiro noutros datasets do portal, depois em fontes externas. "Os dados n\xe3o permitem
responder" s\xf3 \xe9 aceit\xe1vel depois de esgotada a cascata de fontes.

R3 — FONTES UNIFICADAS NA APRESENTA\xc7\xc3O.
Dados do portal e dados externos aparecem visualmente id\xeanticos: mesma cor, mesmo estilo de
linha, mesma tipografia. Sem badges, sem etiquetas "fonte externa", sem legendas separadas. A
proveni\xeancia vive no rodap\xe9 "Fontes e m\xe9todo" e nos metadados internos de cada c\xe9lula
calculada, para auditoria. Nunca na superf\xedcie do gr\xe1fico.

R4 — DESCER SEMPRE AO N\xcdVEL MAIS FINO.
Em qualquer an\xe1lise com componente geogr\xe1fica, identificar o n\xedvel administrativo ou espacial
mais granular dispon\xedvel e produzir an\xe1lise em todos os n\xedveis at\xe9 l\xe1. Parar na prov\xedncia
quando existe distrito \xe9 uma falha.

R5 — NENHUM DASHBOARD IGUAL AO ANTERIOR.
N\xe3o existe template fixo. Layout, tema, ordem de blocos, tipos de gr\xe1fico e destaque visual
derivam do arqu\xe9tipo da an\xe1lise e do conte\xfado dos dados. Se dois dashboards consecutivos do
mesmo utilizador tiverem a mesma assinatura de composi\xe7\xe3o, \xe9 obrigat\xf3rio recompor.

R6 — O T\xcdTULO \xc9 A CONCLUS\xc3O.
Nunca "Popula\xe7\xe3o por prov\xedncia". Sempre "Nampula e Zamb\xe9zia concentram 33% da popula\xe7\xe3o
nacional". Aplica-se ao dashboard, a cada gr\xe1fico e a cada mapa.

R7 — CORRELA\xc7\xc3O N\xc3O \xc9 CAUSALIDADE, E O SISTEMA DI-LO.
Sempre que reportares uma associa\xe7\xe3o, nomeia pelo menos uma explica\xe7\xe3o alternativa plaus\xedvel
ou uma vari\xe1vel de confundimento poss\xedvel.

R8 — O BLOCO "O QUE ISTO N\xc3O DIZ" \xc9 OBRIGAT\xd3RIO.
Nenhuma an\xe1lise \xe9 publicada sem limita\xe7\xf5es expl\xedcitas e concretas: cobertura, actualidade,
comparabilidade, tamanho de amostra, supress\xe3o de c\xe9lulas, mudan\xe7a de defini\xe7\xe3o ou de
fronteiras. Limita\xe7\xf5es gen\xe9ricas ("os dados podem ter limita\xe7\xf5es") s\xe3o inaceit\xe1veis.

R9 — CONTAGENS ABSOLUTAS NUNCA EM COROPL\xc9TICO.
Normalizar sempre: per capita, densidade por km\xb2, taxa por 1 000, ou \xedndice. Sem excep\xe7\xe3o.

R10 — \xc1REAS SEM DADOS S\xc3O EXPL\xcdCITAS.
Cinzento neutro com entrada na legenda "Sem dados". Nunca branco (confunde-se com zero), nunca
omitido do mapa.

R11 — TODA A AN\xc1LISE \xc9 REPRODUZ\xcdVEL.
Cada an\xe1lise guarda datasets e vers\xf5es usados, c\xf3digo executado, resultados brutos, prompts,
modelo e par\xe2metros.

R12 — \xcdNDICES COMPOSTOS S\xd3 COM UNIDADES COMENSUR\xc1VEIS.
Antes de somar, tirar Gini ou z-score de v\xe1rios indicadores num \xfanico n\xfamero: confirma que
todos est\xe3o na mesma escala e direc\xe7\xe3o (nunca somar percentagens com contagens ou m\xe9dias em
pessoas sem normalizar primeiro; inverter os indicadores "quanto menor melhor" antes de
combinar com os "quanto maior melhor"). Dispers\xe3o ENTRE unidades geogr\xe1ficas (ex.: prov\xedncias)
n\xe3o \xe9 desigualdade INTERNA a essa unidade: nomeia sempre qual das duas est\xe1 a ser medida.
Quando indicadores t\xeam taxas de preenchimento diferentes, um \xedndice-soma penaliza quem tem mais
dados em falta, n\xe3o quem est\xe1 pior: usa a m\xe9dia dos indicadores presentes, n\xe3o a soma, ou
declara a limita\xe7\xe3o. Se a comensurabilidade n\xe3o est\xe1 garantida, mostra os indicadores em
separado em vez de inventar um \xedndice composto — um "n\xe3o d\xe1 para combinar isto num \xfanico
n\xfamero" \xe9 melhor do que um n\xfamero que parece rigoroso e n\xe3o \xe9.

# CONTEXTO OBRIGAT\xd3RIO
Escreves em portugu\xeas de Mo\xe7ambique. N\xfameros \xe0 portuguesa: espa\xe7o como separador de milhares
(3 911), v\xedrgula decimal (16,6%), "pp" para pontos percentuais. Nunca uses o travess\xe3o "—" em
texto vis\xedvel ao utilizador: usa ":" ou ";".`,r=/\{\{calc:([a-zA-Z0-9_]+)\}\}/g;function i(e){let a;let o=new Set,t=RegExp(r.source,"g");for(;null!==(a=t.exec(e));)o.add(a[1]);return Array.from(o)}},90772:(e,a,o)=>{o.d(a,{L_:()=>c,Nd:()=>s,rk:()=>l,zj:()=>x});var t=o(26407),r=o(95045);let i={compreensao:"claude-haiku-4-5",planeamento:"claude-sonnet-5",suficiencia:"claude-haiku-4-5",enriquecimento:"claude-sonnet-5",codigo:"claude-sonnet-5",execucao:"claude-sonnet-5",descoberta:"claude-opus-5",narrativa:"claude-sonnet-5",critica:"claude-opus-5",composicao:"claude-sonnet-5",titulos:"claude-sonnet-5",perguntas_viaveis:"claude-sonnet-5",traducao:"claude-sonnet-5"},n=["critica"];function s(e){return process.env.AI_MODEL_OVERRIDE?.trim()||i[e]}let d=null;function c(){return d||(d=new t.ZP({apiKey:process.env.ANTHROPIC_API_KEY})),d}async function u(e){let a;for(let o=1;o<=4;o++)try{return await c().messages.stream(e).finalMessage()}catch(r){a=r;let e=r?.status??r?.response?.status,t=r?.error?.error?.type??r?.error?.type??r?.type;if(!(529===e||429===e||"number"==typeof e&&e>=500||"overloaded_error"===t||"rate_limit_error"===t||"api_error"===t||"invalid_request_error"===t)||4===o)break;await new Promise(e=>setTimeout(e,1e3*2**(o-1)))}throw Error("N\xe3o foi poss\xedvel completar o pedido ao modelo de IA depois de v\xe1rias tentativas. Tente novamente.",{cause:a})}async function l(e){let a;let o=Date.now(),t=e.modeloOverride||s(e.estagio),i=[{type:"text",text:r.cu,cache_control:{type:"ephemeral"}}];e.contextoEstavel&&i.push({type:"text",text:e.contextoEstavel,cache_control:{type:"ephemeral"}}),i.push({type:"text",text:e.sistema,cache_control:{type:"ephemeral"}});let d=n.includes(e.estagio),c=e.maxTokens??(d?24e3:8e3),l={model:t,max_tokens:c,system:i,messages:[{role:"user",content:e.utilizador}],output_config:{format:{type:"json_schema",schema:e.schema}}};d&&(l.thinking={type:"adaptive"});let m=await u(l);if("refusal"===m.stop_reason)throw Error(`Est\xe1gio ${e.estagio}: pedido recusado pelo modelo`);let x=m.content.filter(e=>"text"===e.type).map(e=>e.text).join("");try{a=JSON.parse(x)}catch{let a=m.stop_reason;if("max_tokens"===a)throw Error(`Est\xe1gio ${e.estagio}: resposta truncada no limite de ${c} tokens. Aumentar maxTokens ou reduzir o \xe2mbito do pedido.`);throw Error(`Est\xe1gio ${e.estagio}: resposta n\xe3o \xe9 JSON v\xe1lido (stop_reason=${a}, ${x.length} caracteres). In\xedcio: ${x.slice(0,200)}`)}let p=Date.now()-o;return console.log(`[analise:tempo] estagio=${e.estagio} modelo=${t} pensamento=${d} duracao_ms=${p} tokens_entrada=${m.usage?.input_tokens??0} tokens_saida=${m.usage?.output_tokens??0} tokens_cache_lido=${m.usage?.cache_read_input_tokens??0} tokens_cache_escrito=${m.usage?.cache_creation_input_tokens??0}`),{dados:a,tokens_entrada:m.usage?.input_tokens??0,tokens_saida:m.usage?.output_tokens??0,duracao_ms:p}}let m={"claude-opus-5":{entrada:5,saida:25},"claude-sonnet-5":{entrada:3,saida:15},"claude-haiku-4-5":{entrada:1,saida:5}};function x(e,a,o){let t=m[e]||m["claude-sonnet-5"];return a/1e6*t.entrada+o/1e6*t.saida}},91483:(e,a,o)=>{function t(){return"activo"===process.env.ANALISE_PORTAO?"activo":"sombra"}o.d(a,{O0:()=>r,aF:()=>m,bi:()=>l,iX:()=>x,zY:()=>t});class r extends Error{constructor(e,a=null){super(`An\xe1lise invi\xe1vel: ${e.tipo} (exigido: ${e.exigido})`),this.name="AnaliseInviavelError",this.evidencia=e,this.diagnostico=a}}function i(e){return e.normalize("NFD").replace(RegExp("[\\u0300-\\u036f]","g"),"").toLowerCase().trim()}let n=new Set(["de","da","do","das","dos","em","no","na","nos","nas","por","para","com","sem","que","qual","quais","quantos","quantas","onde","como","sobre","entre","cada","dados","dado","total","totais","valor","valores","numero","numeros","media","medias","coluna","colunas","variavel","variaveis","informacao","informacoes","nivel","niveis","ano","anos","periodo","periodos","nome","nomes","tipo","tipos","codigo","codigos"]),s={provincia:"admin1",provincias:"admin1",provincial:"admin1",admin1:"admin1",distrito:"admin2",distritos:"admin2",distrital:"admin2",admin2:"admin2",posto:"admin3",postos:"admin3",administrativo:"admin3",localidade:"admin3",localidades:"admin3",admin3:"admin3"},d=/(^|_|\s)(ano|year|periodo|data|date|mes|month|trimestre)($|_|\s)/i;function c(e){for(let[a,o]of Array.from(e.tabelas.entries())){let t=o.colunas.findIndex(e=>d.test(e));if(-1===t)continue;let r=o.colunas.findIndex(e=>/^(value|valor|quantidade|total)$/i.test(e.trim())),i=-1!==r?r:o.colunas.findIndex((e,a)=>a!==t&&o.linhas.some(e=>{let o=e[a];return null!=o&&""!==String(o).trim()&&Number.isFinite(Number(o))}));if(-1===i)continue;let n=e.ligacoes.get(a),s=e=>null!=e&&""!==String(e).trim(),c=new Set;o.linhas.forEach(e=>{s(e[i])&&c.add(String(e[t]??"").trim())});let u=0,l=0,m=new Set,x=new Map;if(o.linhas.forEach((e,a)=>{let o=String(e[t]??"").trim();if(!c.has(o))return;l++;let r=s(e[i]);if(r&&u++,!r)return;let d=n?.ligacoes?.get(a)??"__todas__",p=String(e[t]??"").trim();p&&(m.add(p),x.has(d)||x.set(d,new Set),x.get(d).add(p))}),0===l||0===x.size)continue;let p=Array.from(x.values()).map(e=>e.size).sort((e,a)=>e-a),f=Math.floor(p.length/2);return{fraccaoPreenchida:u/l,periodosMedianos:p.length%2?p[f]:(p[f-1]+p[f])/2,periodosNacionais:m.size}}return null}function u(e){return/(por|em cada|de cada)\s+(provincia|distrito|posto|unidade|municipio)/.test(i(e))}function l(e,a){let o=c(a);return!(o&&/(evolu|tendenc|traject|ao longo do tempo|entre \d{4})/.test(i(e)))||(u(e)?o.fraccaoPreenchida>=.7&&o.periodosMedianos>=3:o.periodosNacionais>=3)}function m(e,a,o){if(!e)return{aceite:!1,razao:"veredicto insuficiente sem evid\xeancia preenchida"};if(("serie_temporal_insuficiente"===e.tipo||"cobertura_dados_insuficiente"===e.tipo)&&void 0!==o&&!/(evolu|tendenc|traject|ao longo do tempo|desde |ate |entre \d{4}|\d{4}\s*(e|a)\s*\d{4}|crescimento|variacao|aumentou|diminuiu|antes|depois)/.test(i(o)))return{aceite:!1,razao:"a pergunta n\xe3o pede evolu\xe7\xe3o nem compara\xe7\xe3o entre per\xedodos, logo a falta de s\xe9rie temporal n\xe3o a impede"};if(!e.exigido?.trim()||!e.explicacao?.trim())return{aceite:!1,razao:'evid\xeancia sem "exigido" ou "explicacao" preenchidos'};switch(e.tipo){case"execucao_falhou":return{aceite:!0};case"variavel_ausente":case"dominio_diferente":case"cobertura_geografica":{let o=Array.from(new Set(i(e.termo_ausente??"").split(/[^a-z0-9]+/).filter(e=>e.length>=4&&!n.has(e))));if(0===o.length)return{aceite:!1,razao:'evid\xeancia sem "termo_ausente" concreto que se possa procurar nos dados'};let t=o.find(e=>(function(e,a){for(let o of Array.from(a.tabelas.values())){for(let a of o.colunas)if(i(a).includes(e))return!0;let a=Math.min(o.linhas.length,4e3);for(let t=0;t<a;t++)for(let a of o.linhas[t])if(a&&i(String(a)).includes(e))return!0}return!1})(e,a));if(t)return{aceite:!1,razao:`"${t}" aparece nos dados (coluna ou valor), logo o assunto n\xe3o est\xe1 ausente`};return{aceite:!0}}case"granularidade_insuficiente":{let o=function(e){for(let a of i(e).split(/[^a-z0-9]+/)){let e=s[a];if(e)return e}return null}(e.exigido);if(!o)return{aceite:!1,razao:"evid\xeancia n\xe3o nomeia um n\xedvel administrativo reconhec\xedvel"};let t={admin1:1,admin2:2,admin3:3};for(let e of Array.from(a.ligacoes.values()))if(e&&t[e.nivel]>=t[o])return{aceite:!1,razao:`existe liga\xe7\xe3o geogr\xe1fica detectada ao n\xedvel ${e.nivel}, que cobre o pedido (${o})`};return{aceite:!0}}case"serie_temporal_insuficiente":{let e=function(e){let a=0;for(let o of Array.from(e.tabelas.values()))o.colunas.forEach((e,t)=>{if(!d.test(e))return;let r=new Set;for(let e of o.linhas){let a=e[t];null!=a&&""!==String(a).trim()&&r.add(String(a).trim())}a=Math.max(a,r.size)});return a}(a);if(e>1){let o=c(a);if(o&&(o.fraccaoPreenchida<.7||o.periodosMedianos<3))return{aceite:!0};return{aceite:!1,razao:`os dados t\xeam ${e} per\xedodos distintos, logo h\xe1 s\xe9rie temporal para comparar`}}return{aceite:!0}}case"cobertura_dados_insuficiente":{let o=c(a);if(!o)return{aceite:!1,razao:"n\xe3o foi poss\xedvel medir a cobertura temporal destes dados"};if(!u(e.exigido)){if(o.periodosNacionais>=3)return{aceite:!1,razao:`a pergunta n\xe3o \xe9 por unidade e existem ${o.periodosNacionais} per\xedodos com dados no total, o que chega para uma traject\xf3ria nacional`};return{aceite:!0}}if(!(o.fraccaoPreenchida<.7||o.periodosMedianos<3))return{aceite:!1,razao:`a cobertura chega para uma traject\xf3ria: ${(100*o.fraccaoPreenchida).toFixed(1)}% de c\xe9lulas preenchidas e ${o.periodosMedianos} per\xedodos por unidade na mediana`};return{aceite:!0}}default:return{aceite:!1,razao:"tipo de lacuna desconhecido"}}}function x(e){return e.replace(/\s*—\s*/g,": ").replace(/\s*–\s*/g,": ")}}};