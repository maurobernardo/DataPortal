"use strict";exports.id=4495,exports.ids=[4495],exports.modules={95045:(e,a,t)=>{t.d(a,{c2:()=>r,cu:()=>o,ok:()=>s});let o=`# CONSTITUI\xc7\xc3O (preced\xeancia absoluta sobre qualquer outra instru\xe7\xe3o)

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
texto vis\xedvel ao utilizador: usa ":" ou ";".`,s=/\{\{calc:([a-zA-Z0-9_]+)\}\}/g;function r(e){let a;let t=new Set,o=RegExp(s.source,"g");for(;null!==(a=o.exec(e));)t.add(a[1]);return Array.from(t)}},16024:(e,a,t)=>{t.d(a,{G5:()=>m,JO:()=>d,gp:()=>c,jM:()=>u,t3:()=>r});var o=t(39548);let s=new Set(["a","as","o","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas","por","para","com","sem","sobre","entre","e","ou","que","qual","quais","quantos","quantas","como","quando","onde","\xe9","foi","foram","ser","estar","tem","t\xeam","ha","h\xe1","se","ao","aos","\xe0","\xe0s","este","esta","esse","essa","isso","isto","seu","sua","seus","suas","mais","menos","muito","muita","todo","toda","todos","todas","me","lhe","nas","num","numa","pelo","pela","pelos","pelas"]);function r(e){return Array.from(new Set(e.toLowerCase().normalize("NFD").replace(RegExp("[\\u0300-\\u036f]","g"),"").split(/[^a-z0-9]+/).filter(e=>e.length>=3&&!s.has(e)))).sort()}function i(e,a){if(0===e.length||0===a.length)return 0;let t=new Set(e),o=new Set(a),s=0;t.forEach(e=>{o.has(e)&&s++});let r=t.size+o.size-s;return 0===r?0:s/r}function n(e,a){if(e.length!==a.length)return!1;let t=new Set(a);return e.every(e=>t.has(e))}async function d(e,a){let t=r(e);if(0===t.length)return null;let[s]=await o.db.execute(`SELECT pergunta, palavras_chave, datasets_ids, arquetipo, plano
     FROM analise_planos_cache
     ORDER BY criado_em DESC
     LIMIT 300`),d=null;for(let e of s){if(!n(a,"string"==typeof e.datasets_ids?JSON.parse(e.datasets_ids):e.datasets_ids))continue;let o=i(t,"string"==typeof e.palavras_chave?JSON.parse(e.palavras_chave):e.palavras_chave);o>=.35&&(!d||o>d.similaridade)&&(d={pergunta:e.pergunta,plano:"string"==typeof e.plano?JSON.parse(e.plano):e.plano,arquetipo:e.arquetipo,similaridade:o})}return d}function u(e){let a=e.plano.passos.map(e=>`  - ${e.id} (${e.metodo}): ${e.descricao_humana}`).join("\n");return`

---
Uma pergunta parecida j\xe1 foi respondida com sucesso sobre exactamente estes mesmos datasets (similaridade l\xe9xica ${(100*e.similaridade).toFixed(0)}%):
"${e.pergunta}"

Plano usado (arqu\xe9tipo: ${e.arquetipo??"desconhecido"}):
${a}

Usa isto como ponto de partida se a estrutura se aplicar \xe0 pergunta actual — adapta m\xe9tricas, filtros e n\xedvel geogr\xe1fico ao que foi realmente pedido agora. N\xe3o copies passos que n\xe3o fazem sentido para esta pergunta.`}async function c(e,a,t,s){let d=r(t);if(0===d.length)return null;let[u]=await o.db.execute(`SELECT id, pergunta, datasets_ids, narrativa, criado_em
     FROM analises
     WHERE utilizador_id = ? AND estado = 'pronto' AND id != ?
     ORDER BY criado_em DESC
     LIMIT 100`,[e,s]),c=null;for(let e of u){if(!n(a,"string"==typeof e.datasets_ids?JSON.parse(e.datasets_ids):e.datasets_ids))continue;let t=i(d,r(e.pergunta));if(t<.35||c&&t<=c.similaridade)continue;let o="string"==typeof e.narrativa?JSON.parse(e.narrativa):e.narrativa,s=o?.resolvida?.numeros_chave||[];0!==s.length&&(c={id:e.id,pergunta:e.pergunta,criadoEm:e.criado_em,numerosChave:s,similaridade:t})}return c}async function m(e,a,t,s){let i=r(e);0!==i.length&&await o.db.execute(`INSERT INTO analise_planos_cache (pergunta, palavras_chave, datasets_ids, arquetipo, plano)
     VALUES (?, ?, ?, ?, ?)`,[e.slice(0,500),JSON.stringify(i),JSON.stringify(a),t,JSON.stringify(s)])}},90772:(e,a,t)=>{t.d(a,{L_:()=>u,Nd:()=>n,rk:()=>m,zj:()=>p});var o=t(26407),s=t(95045);let r={compreensao:"claude-haiku-4-5",planeamento:"claude-sonnet-5",suficiencia:"claude-haiku-4-5",enriquecimento:"claude-sonnet-5",codigo:"claude-sonnet-5",execucao:"claude-sonnet-5",descoberta:"claude-opus-5",narrativa:"claude-sonnet-5",critica:"claude-opus-5",composicao:"claude-sonnet-5",titulos:"claude-sonnet-5",perguntas_viaveis:"claude-sonnet-5",traducao:"claude-sonnet-5"},i=["critica"];function n(e){return process.env.AI_MODEL_OVERRIDE?.trim()||r[e]}let d=null;function u(){return d||(d=new o.ZP({apiKey:process.env.ANTHROPIC_API_KEY})),d}async function c(e){let a;for(let t=1;t<=4;t++)try{return await u().messages.stream(e).finalMessage()}catch(s){a=s;let e=s?.status??s?.response?.status,o=s?.error?.error?.type??s?.error?.type??s?.type;if(!(529===e||429===e||"number"==typeof e&&e>=500||"overloaded_error"===o||"rate_limit_error"===o||"api_error"===o||"invalid_request_error"===o)||4===t)break;await new Promise(e=>setTimeout(e,1e3*2**(t-1)))}throw Error("N\xe3o foi poss\xedvel completar o pedido ao modelo de IA depois de v\xe1rias tentativas. Tente novamente.",{cause:a})}async function m(e){let a;let t=Date.now(),o=e.modeloOverride||n(e.estagio),r=[{type:"text",text:s.cu,cache_control:{type:"ephemeral"}}];e.contextoEstavel&&r.push({type:"text",text:e.contextoEstavel,cache_control:{type:"ephemeral"}}),r.push({type:"text",text:e.sistema,cache_control:{type:"ephemeral"}});let d=i.includes(e.estagio),u=e.maxTokens??(d?24e3:8e3),m={model:o,max_tokens:u,system:r,messages:[{role:"user",content:e.utilizador}],output_config:{format:{type:"json_schema",schema:e.schema}}};d&&(m.thinking={type:"adaptive"});let l=await c(m);if("refusal"===l.stop_reason)throw Error(`Est\xe1gio ${e.estagio}: pedido recusado pelo modelo`);let p=l.content.filter(e=>"text"===e.type).map(e=>e.text).join("");try{a=JSON.parse(p)}catch{let a=l.stop_reason;if("max_tokens"===a)throw Error(`Est\xe1gio ${e.estagio}: resposta truncada no limite de ${u} tokens. Aumentar maxTokens ou reduzir o \xe2mbito do pedido.`);throw Error(`Est\xe1gio ${e.estagio}: resposta n\xe3o \xe9 JSON v\xe1lido (stop_reason=${a}, ${p.length} caracteres). In\xedcio: ${p.slice(0,200)}`)}let x=Date.now()-t;return console.log(`[analise:tempo] estagio=${e.estagio} modelo=${o} pensamento=${d} duracao_ms=${x} tokens_entrada=${l.usage?.input_tokens??0} tokens_saida=${l.usage?.output_tokens??0} tokens_cache_lido=${l.usage?.cache_read_input_tokens??0} tokens_cache_escrito=${l.usage?.cache_creation_input_tokens??0}`),{dados:a,tokens_entrada:l.usage?.input_tokens??0,tokens_saida:l.usage?.output_tokens??0,duracao_ms:x}}let l={"claude-opus-5":{entrada:5,saida:25},"claude-sonnet-5":{entrada:3,saida:15},"claude-haiku-4-5":{entrada:1,saida:5}};function p(e,a,t){let o=l[e]||l["claude-sonnet-5"];return a/1e6*o.entrada+t/1e6*o.saida}},84495:(e,a,t)=>{t.d(a,{K4:()=>m,Vs:()=>f,YA:()=>x,YS:()=>N,_o:()=>E,nN:()=>p,xq:()=>_});var o=t(39548),s=t(57435),r=t(90772),i=t(16024);let n=!1;async function d(){n||(await o.db.execute(`CREATE TABLE IF NOT EXISTS perguntas_classificadas (
      pergunta_hash VARCHAR(64) NOT NULL PRIMARY KEY,
      pergunta TEXT NOT NULL,
      tema VARCHAR(100) NOT NULL,
      dataset_ja_existe TINYINT(1) NOT NULL DEFAULT 0,
      entidade_nao_reconhecida VARCHAR(191) NULL,
      resumo_curto VARCHAR(255) NOT NULL,
      pergunta_criado_em DATETIME(3) NULL,
      criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),await o.db.execute("ALTER TABLE perguntas_classificadas ADD COLUMN IF NOT EXISTS pergunta_criado_em DATETIME(3) NULL").catch(()=>{}),await o.db.execute(`CREATE TABLE IF NOT EXISTS sugestoes_datasets_estado (
      tema VARCHAR(100) NOT NULL PRIMARY KEY,
      estado VARCHAR(20) NOT NULL DEFAULT 'nova',
      titulo_proposto VARCHAR(191) NULL,
      marcado_por VARCHAR(191) NULL,
      marcado_em DATETIME(3) NULL,
      nivel_geografico_sugerido VARCHAR(100) NULL,
      resumo_externo TEXT NULL,
      fontes_externas JSON NULL,
      enriquecido_em DATETIME(3) NULL
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),await o.db.execute("ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS nivel_geografico_sugerido VARCHAR(100) NULL").catch(()=>{}),await o.db.execute("ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS resumo_externo TEXT NULL").catch(()=>{}),await o.db.execute("ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS fontes_externas JSON NULL").catch(()=>{}),await o.db.execute("ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS enriquecido_em DATETIME(3) NULL").catch(()=>{}),await o.db.execute(`CREATE TABLE IF NOT EXISTS sugestoes_tipos_categoria (
      categoriaId INT NOT NULL PRIMARY KEY,
      categoriaNome VARCHAR(191) NOT NULL,
      totalDatasets INT NOT NULL,
      tiposSugeridos JSON NOT NULL,
      geradoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`),n=!0)}async function u(e){return(await Promise.resolve().then(t.t.bind(t,84770,23))).createHash("sha256").update(e.trim().toLowerCase()).digest("hex")}async function c(){let[e]=await o.db.execute(`SELECT t.id, t.question as pergunta, t.createdAt as criadoEm FROM (
       SELECT CAST(id AS CHAR) as id, CONVERT(question USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, createdAt FROM AIInsightQuery
       UNION ALL
       SELECT CAST(id AS CHAR) as id, CONVERT(pergunta USING utf8mb4) COLLATE utf8mb4_unicode_ci as question, criado_em as createdAt FROM analises WHERE pergunta IS NOT NULL AND pergunta != ''
     ) t
     ORDER BY t.createdAt DESC
     LIMIT 2000`);return e.map(e=>({id:e.id,pergunta:e.pergunta,criadoEm:e.criadoEm}))}async function m(){let e=await c(),a=new Map;for(let t of e)for(let e of Array.from(new Set((0,i.t3)(t.pergunta)))){let o=a.get(e)||{total:0,exemplos:[]};o.total++,o.exemplos.length<3&&o.exemplos.push(t.pergunta),a.set(e,o)}return Array.from(a.entries()).map(([e,a])=>({palavra:e,total:a.total,exemplos:a.exemplos})).filter(e=>e.total>=2).sort((e,a)=>a.total-e.total).slice(0,60)}async function l(e){let a=(0,r.L_)(),t=await a.messages.create({model:(0,r.Nd)("suficiencia"),max_tokens:4096,system:[{type:"text",text:'Classificas perguntas feitas por utilizadores a um assistente de an\xe1lise de dados geoespaciais e estat\xedsticos de Mo\xe7ambique. Para cada pergunta, indica: "tema" (um dom\xednio curto em min\xfasculas, ex.: "turismo", "agricultura", "saude", "transportes", "educacao", "energia", "agua_saneamento", "comercio", "clima", "populacao", "seguranca", "ambiente", "outro"); "dataset_ja_existe" (true se a pergunta parece j\xe1 coberta por um dataset t\xedpico de um portal de dados abertos geral, false se parece pedir um tema de dados que normalmente n\xe3o estaria coberto); "entidade_nao_reconhecida" (nome de lugar/instala\xe7\xe3o citado que pode n\xe3o ter batido certo com nenhuma unidade administrativa ou dataset, ou null se n\xe3o h\xe1 nenhum caso desses \xf3bvio); "resumo_curto" (at\xe9 12 palavras, em portugu\xeas de Mo\xe7ambique, resumindo o que foi pedido). Nunca inventes cobertura de dataset que n\xe3o tens forma de confirmar: na d\xfavida, dataset_ja_existe = false. Nunca uses o travess\xe3o "—" em nenhum texto: usa ":" ou ";". Responde s\xf3 com um array JSON de objectos na mesma ordem das perguntas recebidas, um por pergunta, sem mais texto nenhum.',cache_control:{type:"ephemeral"}}],messages:[{role:"user",content:e.map((e,a)=>`${a+1}. ${e}`).join("\n")}]}),o=t.content?.filter(e=>"text"===e.type).map(e=>e.text).join("")||"[]",s=JSON.parse(o.match(/\[[\s\S]*\]/)?.[0]||"[]");return Array.isArray(s)?s:[]}async function p(){await d();let e=await c(),[a]=await o.db.execute("SELECT pergunta_hash FROM perguntas_classificadas"),t=new Set(a.map(e=>e.pergunta_hash)),r=[];for(let a of e){let e=a.pergunta?.trim();if(!e)continue;let o=await u(e);t.has(o)||r.push(a)}let i=0;for(let e=0;e<r.length;e+=25){let a=r.slice(e,e+25);try{let e=await l(a.map(e=>e.pergunta));for(let t=0;t<a.length;t++){let s=e[t];if(!s||!s.tema||!s.resumo_curto)continue;let r=await u(a[t].pergunta);await o.db.execute(`INSERT IGNORE INTO perguntas_classificadas
             (pergunta_hash, pergunta, tema, dataset_ja_existe, entidade_nao_reconhecida, resumo_curto, pergunta_criado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,[r,a[t].pergunta,String(s.tema).toLowerCase().trim().slice(0,100),s.dataset_ja_existe?1:0,s.entidade_nao_reconhecida?String(s.entidade_nao_reconhecida).slice(0,191):null,String(s.resumo_curto).slice(0,255),a[t].criadoEm]).catch(()=>{}),i++}}catch(e){s.k.error("erro_classificar_lote_sugestoes_datasets",{error:e,tamanhoLote:a.length})}}return{classificadasAgora:i,total:e.length}}async function x(){await d();let[e]=await o.db.execute(`SELECT tema, dataset_ja_existe, entidade_nao_reconhecida, resumo_curto, pergunta, pergunta_criado_em, criado_em
     FROM perguntas_classificadas ORDER BY criado_em DESC`),[a]=await o.db.execute("SELECT name FROM Category"),t=a.map(e=>(0,i.t3)(e.name)),[s]=await o.db.execute(`SELECT tema, estado, nivel_geografico_sugerido, resumo_externo, fontes_externas, enriquecido_em
     FROM sugestoes_datasets_estado`),r=new Map(s.map(e=>[e.tema,e])),n=new Map;for(let a of e){let e=n.get(a.tema)||{total:0,semCobertura:0,entidades:new Set,perguntas:[],datas:[]};e.total++,!a.dataset_ja_existe&&e.semCobertura++,a.entidade_nao_reconhecida&&e.entidades.add(a.entidade_nao_reconhecida),e.perguntas.length<5&&e.perguntas.push(a.pergunta),e.datas.push(a.pergunta_criado_em||a.criado_em),n.set(a.tema,e)}let u=[],c=[];for(let[e,a]of Array.from(n.entries())){let o=(0,i.t3)(e),s=t.some(e=>e.some(e=>o.some(a=>e.includes(a)||a.includes(e))));if(u.push({tema:e,total:a.total,jaCoberto:s}),a.semCobertura>=3&&!s){let t=r.get(e),o=[];if(t?.fontes_externas)try{o="string"==typeof t.fontes_externas?JSON.parse(t.fontes_externas):t.fontes_externas}catch{o=[]}c.push({tema:e,totalPerguntas:a.total,totalSemCobertura:a.semCobertura,entidadesNaoReconhecidas:Array.from(a.entidades),perguntasExemplo:a.perguntas,jaCobertoNoCatalogo:!1,emAvaliacao:t?.estado==="em_avaliacao",tendenciaSemanal:function(e){let a=Date.now(),t=Array(8).fill(0);for(let o of e){if(!o)continue;let e=new Date(o).getTime();if(Number.isNaN(e))continue;let s=7-Math.floor((a-e)/6048e5);s>=0&&s<8&&t[s]++}return t}(a.datas),nivelGeograficoSugerido:t?.nivel_geografico_sugerido||null,resumoExterno:t?.resumo_externo||null,fontesExternas:o,enriquecidoEm:t?.enriquecido_em?new Date(t.enriquecido_em).toISOString():null})}}return c.sort((e,a)=>a.totalSemCobertura-e.totalSemCobertura),u.sort((e,a)=>a.total-e.total),{sugestoes:c,temasCobertos:u,totalPerguntasClassificadas:e.length}}async function g(e,a,t){let o=(0,r.L_)(),i=[`Categoria: ${e}`,`Datasets j\xe1 existentes nesta categoria: ${a}`,t.length>0?`Perguntas reais de utilizadores relacionadas com este tema, ainda mal respondidas:
${t.map(e=>`- ${e}`).join("\n")}`:"Sem perguntas de utilizadores directamente relacionadas registadas at\xe9 agora."].join("\n\n"),n=await o.messages.create({model:(0,r.Nd)("suficiencia"),max_tokens:1024,system:[{type:"text",text:'Sugeres tipos concretos de dataset (geoespacial ou alfanum\xe9rico) que um portal de dados abertos de Mo\xe7ambique devia ter numa categoria tem\xe1tica, para refor\xe7ar uma cobertura ainda fraca. Recebes o nome da categoria, quantos datasets j\xe1 l\xe1 existem, e (quando houver) perguntas reais que utilizadores j\xe1 fizeram sobre este tema e que o portal n\xe3o conseguiu responder bem. Sugere de 3 a 5 tipos de dataset especificos e accion\xe1veis (ex.: n\xe3o "mais dados de sa\xfade", mas "localiza\xe7\xe3o e capacidade das unidades sanit\xe1rias por distrito" ou "cobertura de vacina\xe7\xe3o infantil por prov\xedncia"), priorizando os que respondem \xe0s perguntas reais fornecidas quando existirem. Nunca inventes que uma institui\xe7\xe3o j\xe1 publica isto — isso \xe9 sempre uma decis\xe3o humana posterior, n\xe3o tua. Nunca uses o travess\xe3o "—" em nenhum texto: usa ":" ou ";". Responde s\xf3 com um array JSON de strings, cada uma um tipo de dataset sugerido, sem mais texto nenhum.',cache_control:{type:"ephemeral"}}],messages:[{role:"user",content:i}]}),d=n.content?.filter(e=>"text"===e.type).map(e=>e.text).join("")||"[]",u=d.match(/\[[\s\S]*\]/)?.[0]||"[]";try{let e=JSON.parse(u);return Array.isArray(e)?e.filter(e=>"string"==typeof e).slice(0,5):[]}catch(a){return s.k.error("erro_parse_tipos_categoria",{error:a,categoria:e}),[]}}async function _(){await d();let[e]=await o.db.execute(`SELECT c.id, c.name, COUNT(d.id) as total
     FROM Category c LEFT JOIN Dataset d ON d.categoryId = c.id
     GROUP BY c.id, c.name`),[a]=await o.db.execute("SELECT tema, pergunta FROM perguntas_classificadas WHERE dataset_ja_existe = 0"),t=e.filter(e=>3>Number(e.total)),r=0;for(let e of t)try{let t=(0,i.t3)(e.name),s=a.filter(e=>(0,i.t3)(e.tema).some(e=>t.some(a=>a.includes(e)||e.includes(a)))).map(e=>e.pergunta).slice(0,6),n=await g(e.name,Number(e.total),s);if(0===n.length)continue;await o.db.execute(`INSERT INTO sugestoes_tipos_categoria (categoriaId, categoriaNome, totalDatasets, tiposSugeridos, geradoEm)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE categoriaNome = VALUES(categoriaNome), totalDatasets = VALUES(totalDatasets),
           tiposSugeridos = VALUES(tiposSugeridos), geradoEm = VALUES(geradoEm)`,[e.id,e.name,e.total,JSON.stringify(n)]),r++}catch(a){s.k.error("erro_gerar_tipos_categoria",{error:a,categoria:e.name})}return{categoriasAnalisadas:r}}async function f(){await d();let[e]=await o.db.execute("SELECT tema, COUNT(*) as total FROM perguntas_classificadas WHERE dataset_ja_existe = 0 GROUP BY tema"),[a]=await o.db.execute("SELECT categoriaId, categoriaNome, totalDatasets, tiposSugeridos, geradoEm FROM sugestoes_tipos_categoria");return a.map(a=>{let t=(0,i.t3)(a.categoriaNome),o=e.filter(e=>(0,i.t3)(e.tema).some(e=>t.some(a=>a.includes(e)||e.includes(a)))).reduce((e,a)=>e+Number(a.total),0),s=[];try{s="string"==typeof a.tiposSugeridos?JSON.parse(a.tiposSugeridos):a.tiposSugeridos}catch{s=[]}return{categoriaId:a.categoriaId,categoria:a.categoriaNome,totalDatasets:Number(a.totalDatasets),tiposSugeridos:s,perguntasRelacionadas:o,geradoEm:a.geradoEm?new Date(a.geradoEm).toISOString():null}}).sort((e,a)=>a.perguntasRelacionadas-e.perguntasRelacionadas||e.totalDatasets-a.totalDatasets)}async function E(e,a,t){await d();let s=`Sugest\xe3o de dataset: ${e.replace(/_/g," ")}`,r=[`Tema identificado a partir de ${a.totalPerguntas} pergunta(s) feita(s) ao AI Insights, ${a.totalSemCobertura} sem cobertura conhecida no cat\xe1logo actual.`,a.entidadesNaoReconhecidas.length>0?`Entidades citadas sem correspond\xeancia clara: ${a.entidadesNaoReconhecidas.join(", ")}.`:null,"Fonte institucional prov\xe1vel: a confirmar por uma pessoa antes de qualquer publica\xe7\xe3o.","","Perguntas reais que motivam esta sugest\xe3o:",...a.perguntasExemplo.map(e=>`- "${e}"`)].filter(Boolean).join("\n");await (0,o.bg)({name:t.name||t.email,email:t.email,subject:s,message:r,purpose:"sugestao_dataset"}),await o.db.execute(`INSERT INTO sugestoes_datasets_estado (tema, estado, titulo_proposto, marcado_por, marcado_em)
     VALUES (?, 'em_avaliacao', ?, ?, NOW())
     ON DUPLICATE KEY UPDATE estado = 'em_avaliacao', titulo_proposto = VALUES(titulo_proposto),
       marcado_por = VALUES(marcado_por), marcado_em = VALUES(marcado_em)`,[e,s,t.email])}async function N(e,a){await d();let t=(0,r.L_)(),i=await t.messages.create({model:"claude-sonnet-5",max_tokens:2048,system:[{type:"text",text:'Pesquisas na internet por fontes de dados reais sobre um tema em Mo\xe7ambique, para ajudar a decidir se vale a pena criar um dataset novo no portal. Depois de pesquisar, responde s\xf3 com um objecto JSON: {"nivel_geografico_sugerido": string (ex.: "distrito", "provincia", "posto administrativo"), "resumo_externo": string (at\xe9 40 palavras, portugu\xeas de Mo\xe7ambique, resumindo o que existe de facto sobre o tema e se parece haver institui\xe7\xe3o mo\xe7ambicana com dados sobre isto), "fontes": [{"titulo": string, "url": string}]}. Em "fontes", inclui s\xf3 resultados REAIS que a pesquisa devolveu, nunca inventes uma URL ou t\xedtulo. Se a pesquisa n\xe3o encontrar nada relevante, devolve "fontes": [] e diz isso mesmo no resumo, em vez de inventar. Nada disto \xe9 confirma\xe7\xe3o final, \xe9 s\xf3 um ponto de partida para uma pessoa validar depois. Nunca uses o travess\xe3o "—" no resumo: usa ":" ou ";".',cache_control:{type:"ephemeral"}}],tools:[{type:"web_search_20260209",name:"web_search",max_uses:4}],messages:[{role:"user",content:`Tema: ${e.replace(/_/g," ")}. Exemplos de perguntas reais feitas por utilizadores sobre este tema:
${a.perguntasExemplo.map(e=>`- ${e}`).join("\n")}`}]});if((i.content||[]).some(e=>"web_search_tool_result"===e.type&&e.content?.type==="web_search_tool_result_error"))throw Error("A pesquisa externa falhou do lado do fornecedor. Tente novamente dentro de instantes.");let n=i.content?.filter(e=>"text"===e.type).map(e=>e.text).join("")||"{}",u=n.match(/\{[\s\S]*\}/)?.[0]||"{}",c={};try{c=JSON.parse(u)}catch(a){s.k.error("erro_parse_enriquecimento_sugestao",{error:a,tema:e})}let m="string"==typeof c.nivel_geografico_sugerido?c.nivel_geografico_sugerido:null,l="string"==typeof c.resumo_externo?c.resumo_externo:"Sem resumo dispon\xedvel.",p=Array.isArray(c.fontes)?c.fontes.filter(e=>e&&"string"==typeof e.url&&"string"==typeof e.titulo).slice(0,6):[];if(/falha t[ée]cnica|n[ãa]o foi poss[ií]vel concluir a pesquisa/i.test(l)&&0===p.length)throw Error("A pesquisa externa n\xe3o conseguiu concluir desta vez. Tente novamente dentro de instantes.");return await o.db.execute(`INSERT INTO sugestoes_datasets_estado (tema, titulo_proposto, nivel_geografico_sugerido, resumo_externo, fontes_externas, enriquecido_em)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE nivel_geografico_sugerido = VALUES(nivel_geografico_sugerido),
       resumo_externo = VALUES(resumo_externo), fontes_externas = VALUES(fontes_externas), enriquecido_em = VALUES(enriquecido_em)`,[e,`Sugest\xe3o de dataset: ${e.replace(/_/g," ")}`,m,l,JSON.stringify(p)]),{nivelGeograficoSugerido:m,resumoExterno:l,fontesExternas:p}}}};