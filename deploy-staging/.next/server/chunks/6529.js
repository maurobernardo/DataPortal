"use strict";exports.id=6529,exports.ids=[6529],exports.modules={95045:(e,a,o)=>{o.d(a,{c2:()=>s,cu:()=>t,ok:()=>r});let t=`# CONSTITUI\xc7\xc3O (preced\xeancia absoluta sobre qualquer outra instru\xe7\xe3o)

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
texto vis\xedvel ao utilizador: usa ":" ou ";".`,r=/\{\{calc:([a-zA-Z0-9_]+)\}\}/g;function s(e){let a;let o=new Set,t=RegExp(r.source,"g");for(;null!==(a=t.exec(e));)o.add(a[1]);return Array.from(o)}},90772:(e,a,o)=>{o.d(a,{L_:()=>u,Nd:()=>n,rk:()=>c,zj:()=>x});var t=o(26407),r=o(95045);let s={compreensao:"claude-haiku-4-5",planeamento:"claude-sonnet-5",suficiencia:"claude-haiku-4-5",enriquecimento:"claude-sonnet-5",codigo:"claude-sonnet-5",execucao:"claude-sonnet-5",descoberta:"claude-opus-5",narrativa:"claude-sonnet-5",critica:"claude-opus-5",composicao:"claude-sonnet-5",titulos:"claude-sonnet-5",perguntas_viaveis:"claude-sonnet-5",traducao:"claude-sonnet-5"},i=["critica"];function n(e){return process.env.AI_MODEL_OVERRIDE?.trim()||s[e]}let d=null;function u(){return d||(d=new t.ZP({apiKey:process.env.ANTHROPIC_API_KEY})),d}async function m(e){let a;for(let o=1;o<=4;o++)try{return await u().messages.stream(e).finalMessage()}catch(r){a=r;let e=r?.status??r?.response?.status,t=r?.error?.error?.type??r?.error?.type??r?.type;if(!(529===e||429===e||"number"==typeof e&&e>=500||"overloaded_error"===t||"rate_limit_error"===t||"api_error"===t||"invalid_request_error"===t)||4===o)break;await new Promise(e=>setTimeout(e,1e3*2**(o-1)))}throw Error("N\xe3o foi poss\xedvel completar o pedido ao modelo de IA depois de v\xe1rias tentativas. Tente novamente.",{cause:a})}async function c(e){let a;let o=Date.now(),t=e.modeloOverride||n(e.estagio),s=[{type:"text",text:r.cu,cache_control:{type:"ephemeral"}}];e.contextoEstavel&&s.push({type:"text",text:e.contextoEstavel,cache_control:{type:"ephemeral"}}),s.push({type:"text",text:e.sistema,cache_control:{type:"ephemeral"}});let d=i.includes(e.estagio),u=e.maxTokens??(d?24e3:8e3),c={model:t,max_tokens:u,system:s,messages:[{role:"user",content:e.utilizador}],output_config:{format:{type:"json_schema",schema:e.schema}}};d&&(c.thinking={type:"adaptive"});let l=await m(c);if("refusal"===l.stop_reason)throw Error(`Est\xe1gio ${e.estagio}: pedido recusado pelo modelo`);let x=l.content.filter(e=>"text"===e.type).map(e=>e.text).join("");try{a=JSON.parse(x)}catch{let a=l.stop_reason;if("max_tokens"===a)throw Error(`Est\xe1gio ${e.estagio}: resposta truncada no limite de ${u} tokens. Aumentar maxTokens ou reduzir o \xe2mbito do pedido.`);throw Error(`Est\xe1gio ${e.estagio}: resposta n\xe3o \xe9 JSON v\xe1lido (stop_reason=${a}, ${x.length} caracteres). In\xedcio: ${x.slice(0,200)}`)}let p=Date.now()-o;return console.log(`[analise:tempo] estagio=${e.estagio} modelo=${t} pensamento=${d} duracao_ms=${p} tokens_entrada=${l.usage?.input_tokens??0} tokens_saida=${l.usage?.output_tokens??0} tokens_cache_lido=${l.usage?.cache_read_input_tokens??0} tokens_cache_escrito=${l.usage?.cache_creation_input_tokens??0}`),{dados:a,tokens_entrada:l.usage?.input_tokens??0,tokens_saida:l.usage?.output_tokens??0,duracao_ms:p}}let l={"claude-opus-5":{entrada:5,saida:25},"claude-sonnet-5":{entrada:3,saida:15},"claude-haiku-4-5":{entrada:1,saida:5}};function x(e,a,o){let t=l[e]||l["claude-sonnet-5"];return a/1e6*t.entrada+o/1e6*t.saida}},90455:(e,a,o)=>{o.d(a,{Ld:()=>d.Ld,Oe:()=>m,RA:()=>c,T6:()=>g,X9:()=>d.X9,Zh:()=>v,c_:()=>u,fM:()=>p,ge:()=>l,sV:()=>d.sV,st:()=>d.st,ts:()=>x,uy:()=>d.uy,xV:()=>f});var t=o(42023),r=o.n(t),s=o(84770),i=o.n(s),n=o(71615),d=o(70446);async function u(e){return r().hash(e,10)}async function m(e,a){return r().compare(e,a)}function c(){return i().randomBytes(32).toString("hex")}function l(){return i().randomInt(1e5,1e6).toString()}async function x(){let e=await (0,n.cookies)(),a=e.get(d.sV)?.value;return a?(0,d.g$)(a):null}async function p(){let e=await f();if(!e||"admin"!==e.role)return null;let{findUserById:a}=await o.e(9548).then(o.bind(o,39548)),t=await a(e.id);return t?.totp_enabled?{userId:e.id,email:e.email,role:"admin"}:null}async function g(){let e=await f();return e&&"admin"===e.role?{userId:e.id,email:e.email,role:"admin"}:null}async function f(){let e=await x();if(!e)return null;let{findUserById:a}=await o.e(9548).then(o.bind(o,39548)),t=await a(e.userId);if(!t||0===t.active||!1===t.active)return null;let r=(0,d.VA)(t.role),s=t.receber_notificacoes;return{id:t.id,email:t.email,name:t.name,role:r,emailVerified:!!t.emailVerified,receberNotificacoes:null==s?null:!!s}}function v(e,a){if(e?.trim()){let a=e.trim().split(/\s+/).filter(Boolean);return a.length>=2?`${a[0][0]}${a[a.length-1][0]}`.toUpperCase():a[0].slice(0,2).toUpperCase()}return(a?.[0]||"U").toUpperCase()}},57435:(e,a,o)=>{function t(e,a,o){let t=JSON.stringify({level:e,event:a,time:new Date().toISOString(),...function(e){if(!e)return;let a={};for(let[o,t]of Object.entries(e))a[o]=t instanceof Error?{name:t.name,message:t.message,stack:t.stack}:t;return a}(o)});"error"===e?console.error(t):"warn"===e?console.warn(t):console.log(t)}o.d(a,{k:()=>r});let r={debug:(e,a)=>t("debug",e,a),info:(e,a)=>t("info",e,a),warn:(e,a)=>t("warn",e,a),error:(e,a)=>t("error",e,a)}},23273:(e,a,o)=>{o.d(a,{ap:()=>x,Rz:()=>p,vE:()=>g});var t=o(20629),r=o(55315),s=o(39548);async function i(e){let a=(await o.e(5262).then(o.t.bind(o,5262,23))).default,t=[],r=0;return await a(e,{pagerender:async e=>{r+=1;let a=await e.getTextContent({normalizeWhitespace:!0}),o="",s=null;for(let e of a.items){let a=e.transform?.[5];null!==s&&a!==s&&(o+="\n"),o+=e.str,s=a}return t.push({pagina:r,texto:o.trim()}),o}}),{paginas:t,totalPaginas:t.length,digitalizado:0===t.length||t.filter(e=>e.texto.trim().length>=40).length/t.length<.3}}var n=o(20348);let d={type:"object",properties:{o_que_e:{type:"object",properties:{assunto:{type:"string"},geografia:{type:"string"},periodo:{type:"string"},metodologia:{type:"string"}},required:["assunto","geografia","periodo","metodologia"],additionalProperties:!1},resumo_curto:{type:"string"},resumo_medio:{type:"string"},achados:{type:"array",items:{type:"object",properties:{texto:{type:"string"},pagina:{type:"integer"},ano:{type:["integer","null"]}},required:["texto","pagina","ano"],additionalProperties:!1}},recomendacoes:{type:"array",items:{type:"object",properties:{texto:{type:"string"},responsavel:{type:["string","null"]},prazo:{type:["string","null"]},pagina:{type:"integer"}},required:["texto","responsavel","prazo","pagina"],additionalProperties:!1}},o_que_nao_diz:{type:"array",items:{type:"string"}},fontes:{type:"array",items:{type:"object",properties:{instituicao:{type:"string"},documento:{type:["string","null"]},ano:{type:["integer","null"]}},required:["instituicao","documento","ano"],additionalProperties:!1}},resultado:{type:"object",properties:{tipo:{type:"string",enum:["obtido","esperado","nao_aplicavel"]},texto:{type:["string","null"]},pagina:{type:["integer","null"]}},required:["tipo","texto","pagina"],additionalProperties:!1},afirmacoes_numericas:{type:"array",items:{type:"object",properties:{texto:{type:"string"},tema:{type:"string"},geografia:{type:"string"},periodo_inicio:{type:["integer","null"]},periodo_fim:{type:["integer","null"]},valor:{type:"number"},unidade:{type:"string"},pagina:{type:"integer"},tipo:{type:"string",enum:["nivel","variacao"]}},required:["texto","tema","geografia","periodo_inicio","periodo_fim","valor","unidade","pagina","tipo"],additionalProperties:!1}},glossario:{type:"array",items:{type:"object",properties:{termo:{type:"string"},definicao:{type:"string"},pagina:{type:"integer"}},required:["termo","definicao","pagina"],additionalProperties:!1}},credibilidade:{type:"object",properties:{tipo_dado:{anyOf:[{type:"string",enum:["primario","secundario","misto"]},{type:"null"}]},tamanho_amostra:{type:["string","null"]},observacoes:{type:["string","null"]}},required:["tipo_dado","tamanho_amostra","observacoes"],additionalProperties:!1}},required:["o_que_e","resumo_curto","resumo_medio","achados","recomendacoes","o_que_nao_diz","fontes","resultado","afirmacoes_numericas","glossario","credibilidade"],additionalProperties:!1},u=`L\xea o relat\xf3rio completo (dado abaixo, marcado por p\xe1gina, [PAGINA N]) e produz um digesto
estruturado em portugu\xeas de Mo\xe7ambique.

- "resumo_curto": duas a tr\xeas frases. Algu\xe9m tem de decidir, em trinta segundos, se este relat\xf3rio
  lhe interessa.
- "resumo_medio": um a dois par\xe1grafos, cobrindo assunto, achados principais e recomenda\xe7\xf5es
  principais. Algu\xe9m tem de ficar equipado para uma conversa em tr\xeas minutos.
- "achados": os factos MAIS IMPORTANTES que o relat\xf3rio estabelece, cada um com a p\xe1gina exacta.
  No m\xe1ximo 12: um relat\xf3rio longo tem dezenas de factos poss\xedveis, e o valor deste campo est\xe1 em
  escolher os que importam, n\xe3o em listar tudo o que o documento diz. Preenche "ano" s\xf3 quando o
  achado est\xe1 claramente associado a um ano espec\xedfico no documento (ex.: "em 2019, a taxa...");
  usa null quando o achado \xe9 atemporal ou o documento n\xe3o data esse facto em particular. A maioria
  dos achados vai ficar com "ano": null, e est\xe1 certo ficar assim.
- "recomendacoes": as recomenda\xe7\xf5es MAIS IMPORTANTES, no m\xe1ximo 10. Preenche "responsavel" e
  "prazo" s\xf3 quando o documento os nomeia explicitamente; caso contr\xe1rio usa null, nunca inventes
  um respons\xe1vel ou um prazo plaus\xedvel.
- "o_que_nao_diz": geografias, per\xedodos, perguntas ou grupos que o relat\xf3rio N\xc3O cobre e que um
  leitor podia razoavelmente esperar que cobrisse. No m\xe1ximo 6. Nunca uma frase gen\xe9rica.
- "fontes": institui\xe7\xf5es e documentos citados como fonte de dados ou de outras conclus\xf5es. No
  m\xe1ximo 10.
- "resultado": s\xf3 quando o relat\xf3rio tem um enquadramento de desfecho. Usa "obtido" quando o
  relat\xf3rio descreve um resultado J\xc1 alcan\xe7ado (uma avalia\xe7\xe3o de impacto, um piloto conclu\xeddo, um
  antes/depois com dados) e escreve esse resultado em "texto", com a p\xe1gina em "pagina". Usa
  "esperado" quando o relat\xf3rio \xe9 um plano, uma proposta ou um estudo de base que ainda n\xe3o tem
  resultado, mas diz o que se espera alcan\xe7ar; escreve isso em "texto". Usa "nao_aplicavel" para um
  relat\xf3rio puramente descritivo (um censo, um levantamento sem interven\xe7\xe3o associada) sem nenhum
  enquadramento de resultado, e nesse caso "texto" e "pagina" ficam null. Nunca inventes um
  resultado que o documento n\xe3o descreve.
- "afirmacoes_numericas": at\xe9 15 das afirma\xe7\xf5es num\xe9ricas MAIS VERIFIC\xc1VEIS (associadas a uma
  geografia clara, mesmo que seja "Mo\xe7ambique" no total nacional, e a um per\xedodo quando o
  documento o permitir). N\xe3o \xe9 uma lista exaustiva de todos os n\xfameros do documento: escolhe as
  que mais interessa confirmar contra outra fonte. Usa "tipo": "nivel" para um valor num momento,
  "variacao" para uma diferen\xe7a entre dois momentos (nesse caso "periodo_inicio" e "periodo_fim"
  s\xe3o os dois anos, e "valor" \xe9 a varia\xe7\xe3o, na unidade que o relat\xf3rio usa: "%", "pp" ou uma
  unidade absoluta). Quando o relat\xf3rio n\xe3o data a afirma\xe7\xe3o, usa null nos dois per\xedodos. A
  "unidade" \xe9 sempre a que o documento usa, tal como est\xe1 escrita. IMPORTANTE: quando o relat\xf3rio
  mostrar a MESMA vari\xe1vel em v\xe1rios anos (uma s\xe9rie, ex.: rendimento do milho em 2002, 2010 e
  2020), regista um "nivel" separado para CADA ano dessa s\xe9rie, com "tema", "geografia" e
  "unidade" id\xeanticos entre eles: \xe9 isso que permite depois desenhar um gr\xe1fico da evolu\xe7\xe3o. N\xe3o
  reduzas uma s\xe9rie a um \xfanico ponto s\xf3 para caber mais vari\xe1veis diferentes na lista; uma
  vari\xe1vel com evolu\xe7\xe3o ao longo do tempo vale mais do que v\xe1rias vari\xe1veis de um s\xf3 ponto cada.
- "glossario": at\xe9 10 siglas ou termos t\xe9cnicos que o relat\xf3rio usa sem os voltar a explicar (ex.:
  "BANP", "CCP", nomes de metodologias). Para cada um, a defini\xe7\xe3o TAL COMO o documento a d\xe1 (ou,
  se o documento s\xf3 a der uma vez por extenso antes de abreviar, essa forma por extenso) e a p\xe1gina
  onde aparece pela primeira vez. Um relat\xf3rio sem siglas nem jarg\xe3o devolve uma lista vazia; n\xe3o
  inventes entradas \xf3bvias s\xf3 para preencher.
- "credibilidade": "tipo_dado" \xe9 "primario" quando o relat\xf3rio recolheu os seus pr\xf3prios dados
  (inqu\xe9rito, entrevista, medi\xe7\xe3o em campo), "secundario" quando usa dados j\xe1 publicados por outra
  fonte, "misto" quando combina os dois, e null quando o documento n\xe3o deixa claro. "tamanho_amostra"
  \xe9 o n\xfamero ou descri\xe7\xe3o da amostra TAL COMO o documento a d\xe1 (ex.: "1 204 agregados familiares"),
  null se n\xe3o for mencionado. "observacoes" \xe9 uma frase curta sobre limita\xe7\xf5es metodol\xf3gicas que o
  PR\xd3PRIO documento reconhece (n\xe3o a tua opini\xe3o sobre a qualidade do estudo), null se n\xe3o houver
  nenhuma. Nunca inventes um tamanho de amostra ou uma limita\xe7\xe3o que o documento n\xe3o menciona.

Estes limites existem para a resposta caber num \xfanico pedido: um relat\xf3rio de 40 p\xe1ginas tem
mat\xe9ria para muito mais do que isto, e a tarefa \xe9 escolher o que mais importa, n\xe3o esgotar o
documento.`;async function m(e){let{texto:a,truncado:o}=function(e){let a="",o=!1;for(let t of e){let e=`

[PAGINA ${t.pagina}]
${t.texto}`;if(a.length+e.length>9e5){o=!0;break}a+=e}return{texto:a,truncado:o}}(e),t=await (0,n.m5)({estagio:"digesto",utilizador:`${u}

---
${a}`,schema:d,maxTokens:32e3}),r=t.dados;return o&&(r.o_que_nao_diz=[...r.o_que_nao_diz,`O documento \xe9 demasiado longo e foi lido apenas at\xe9 um ponto: partes finais podem estar por reflectir neste digesto.`]),{digesto:r,truncado:o,custoUsd:(0,n.zj)((0,n.th)("digesto"),t.tokens_entrada,t.tokens_saida),modelo:(0,n.th)("digesto"),tokensEntrada:t.tokens_entrada,tokensSaida:t.tokens_saida}}var c=o(20982),l=o(57435);class x extends Error{}async function p(e,a=null){let o=await (0,s.JG)(e);if(!o)throw new x("Relat\xf3rio n\xe3o encontrado");let n=String(o.filePath||"").trim();if(!n)throw new x("Este relat\xf3rio ainda n\xe3o tem ficheiro carregado");if(!n.toLowerCase().endsWith(".pdf"))throw new x("S\xf3 ficheiros PDF podem ser processados");try{let o=n.replace(/^\/+/,""),s=await (0,t.readFile)((0,r.join)(process.cwd(),"public",o)),d=await i(s);if(d.digitalizado)return await (0,c.KR)(e,"digitalizado",{mensagem:"O PDF n\xe3o tem uma camada de texto leg\xedvel (prov\xe1vel digitaliza\xe7\xe3o sem OCR).",totalPaginas:d.totalPaginas}),{estado:"digitalizado",totalPaginas:d.totalPaginas};await (0,c.iy)(e,d.paginas);let{digesto:u,truncado:x,custoUsd:p,modelo:g,tokensEntrada:f,tokensSaida:v}=await m(d.paginas);return await (0,c.fn)(e,"pt",u),await (0,c.sj)({reportId:e,utilizadorId:a,tipo:"digesto",modelo:g,tokensEntrada:f,tokensSaida:v,custoUsd:p}).catch(a=>l.k.error("erro_registar_uso_ia_relatorio",{error:a,reportId:e,tipo:"digesto"})),await (0,c.KR)(e,"pronto",{totalPaginas:d.totalPaginas,mensagem:x?"O documento \xe9 muito extenso; o digesto n\xe3o cobre as \xfaltimas p\xe1ginas.":void 0}),{estado:"pronto",totalPaginas:d.totalPaginas,truncado:x}}catch(a){throw l.k.error("erro_processar_relatorio",{error:a,reportId:e}),await (0,c.KR)(e,"erro",{mensagem:"Falha ao processar o PDF. Tente novamente."}),a}}async function g(e){let a=await (0,c.Fk)(e);return!(a?.estado==="a_processar"&&(Date.now()-a.actualizadoEm.getTime())/6e4<8)&&(await (0,c.KR)(e,"a_processar"),!0)}},20348:(e,a,o)=>{o.d(a,{m5:()=>d,th:()=>s,zj:()=>t.zj});var t=o(90772);let r={digesto:"claude-opus-5",pergunta:"claude-sonnet-5",traducao:"claude-sonnet-5"};function s(e){return process.env.AI_MODEL_OVERRIDE?.trim()||r[e]}let i=`# REGRAS (preced\xeancia absoluta sobre qualquer outra instru\xe7\xe3o)

1. NUNCA INVENTAS UM FACTO. Cada afirma\xe7\xe3o, n\xfamero ou recomenda\xe7\xe3o que produzires tem de vir dos
   excertos do documento que te forem dados, com a p\xe1gina de onde saiu. Se o documento n\xe3o disser
   algo, a resposta \xe9 "o relat\xf3rio n\xe3o diz isto", nunca uma suposi\xe7\xe3o plaus\xedvel.
2. CITA A P\xc1GINA sempre que citares um n\xfamero, um achado ou uma recomenda\xe7\xe3o.
3. Quando o documento \xe9 amb\xedguo ou incompleto sobre algo, di-lo explicitamente em vez de escolher
   a leitura mais prov\xe1vel e apresent\xe1-la como certa.
4. Escreves em portugu\xeas de Mo\xe7ambique, salvo instru\xe7\xe3o expl\xedcita em contr\xe1rio. N\xfameros \xe0
   portuguesa: espa\xe7o como separador de milhares (3 911), v\xedrgula decimal (16,6%), "pp" para
   pontos percentuais.
5. Nunca uses o travess\xe3o "—" em texto vis\xedvel: usa ":" ou ";".`;async function n(e){let a;for(let o=1;o<=4;o++)try{return await (0,t.L_)().messages.stream(e).finalMessage()}catch(r){a=r;let e=r?.status??r?.response?.status,t=r?.error?.error?.type??r?.error?.type??r?.type;if(!(529===e||429===e||"number"==typeof e&&e>=500||"overloaded_error"===t||"rate_limit_error"===t||"api_error"===t)||4===o)break;await new Promise(e=>setTimeout(e,1e3*2**(o-1)))}throw Error("N\xe3o foi poss\xedvel completar o pedido ao modelo de IA depois de v\xe1rias tentativas.",{cause:a})}async function d(e){let a;let o=Date.now(),t=s(e.estagio),r=await n({model:t,max_tokens:e.maxTokens??8e3,system:[{type:"text",text:i,cache_control:{type:"ephemeral"}}],messages:[{role:"user",content:e.utilizador}],output_config:{format:{type:"json_schema",schema:e.schema}}});if("refusal"===r.stop_reason)throw Error(`Est\xe1gio ${e.estagio}: pedido recusado pelo modelo`);let d=r.content.filter(e=>"text"===e.type).map(e=>e.text).join("");try{a=JSON.parse(d)}catch{let a=r.stop_reason;if("max_tokens"===a)throw Error(`Est\xe1gio ${e.estagio}: resposta truncada no limite de ${e.maxTokens} tokens.`);throw Error(`Est\xe1gio ${e.estagio}: resposta n\xe3o \xe9 JSON v\xe1lido (stop_reason=${a}).`)}return{dados:a,tokens_entrada:r.usage?.input_tokens??0,tokens_saida:r.usage?.output_tokens??0,duracao_ms:Date.now()-o}}},70446:(e,a,o)=>{o.d(a,{Ld:()=>l,VA:()=>d,X9:()=>x,g$:()=>m,sV:()=>i,st:()=>c,uy:()=>u});var t=o(41482),r=o.n(t),s=o(57435);let i="session",n=process.env.JWT_SECRET||"";function d(e){return"admin"===String(e??"").trim().toLowerCase()?"admin":"user"}function u(e){if(!n)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir uma sess\xe3o em seguran\xe7a.");return r().sign(e,n,{expiresIn:"7d"})}function m(e){if(!n)return null;try{let a=r().verify(e,n);return{userId:a.userId,email:a.email,role:d(a.role)}}catch{return null}}function c(e){if(!n)throw Error("JWT_SECRET n\xe3o configurado: n\xe3o \xe9 poss\xedvel emitir um token de 2FA em seguran\xe7a.");return r().sign({userId:e,purpose:"totp-pending"},n,{expiresIn:"5m"})}function l(e){if(!n)return null;try{let a=r().verify(e,n);if("totp-pending"!==a.purpose||"number"!=typeof a.userId)return null;return{userId:a.userId}}catch{return null}}function x(){return{httpOnly:!0,secure:!0,sameSite:"lax",maxAge:604800,path:"/"}}n||s.k.error("sessao.jwt_secret_em_falta",{aviso:'JWT_SECRET n\xe3o est\xe1 definido e NODE_ENV n\xe3o \xe9 "development": sess\xf5es n\xe3o podem ser emitidas nem validadas at\xe9 a vari\xe1vel de ambiente ser configurada.'})}};