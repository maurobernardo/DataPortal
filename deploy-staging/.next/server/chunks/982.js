"use strict";exports.id=982,exports.ids=[982],exports.modules={20982:(a,t,o)=>{o.d(t,{Fk:()=>c,GP:()=>R,Hn:()=>I,II:()=>l,KR:()=>T,MM:()=>L,QF:()=>A,Qw:()=>m,Sf:()=>d,Xc:()=>N,bB:()=>S,cf:()=>u,fn:()=>_,gH:()=>p,gL:()=>U,iy:()=>s,ln:()=>O,nx:()=>E,sj:()=>n});var e=o(39548);let i=!1;async function r(){i||(await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_paginas (
      report_id INT NOT NULL,
      pagina INT NOT NULL,
      texto MEDIUMTEXT NOT NULL,
      PRIMARY KEY (report_id, pagina)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_digesto (
      report_id INT NOT NULL,
      idioma VARCHAR(2) NOT NULL DEFAULT 'pt',
      digesto LONGTEXT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, idioma)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_estado (
      report_id INT PRIMARY KEY,
      estado VARCHAR(16) NOT NULL DEFAULT 'pendente',
      mensagem VARCHAR(500) NULL,
      total_paginas INT NULL,
      actualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_acesso (
      report_id INT NOT NULL,
      utilizador_id BIGINT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, utilizador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_uso_ia (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL,
      utilizador_id BIGINT NULL,
      tipo VARCHAR(20) NOT NULL,
      modelo VARCHAR(40) NOT NULL,
      tokens_entrada INT NOT NULL DEFAULT 0,
      tokens_saida INT NOT NULL DEFAULT 0,
      custo_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_uso_ia_report (report_id),
      KEY idx_uso_ia_utilizador (utilizador_id),
      KEY idx_uso_ia_criado (criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_pedido (
      report_id INT NOT NULL,
      utilizador_id BIGINT NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (report_id, utilizador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_verificacao_ref (
      report_id INT PRIMARY KEY,
      dataset_id INT NOT NULL,
      nivel_geo VARCHAR(10) NOT NULL,
      coluna_metrica VARCHAR(190) NULL,
      coluna_indicador VARCHAR(190) NULL,
      valor_indicador VARCHAR(300) NULL,
      coluna_tempo VARCHAR(190) NULL,
      unidade_metrica VARCHAR(100) NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),await e.db.execute(`CREATE TABLE IF NOT EXISTS relatorio_verificacao_estado (
      report_id INT PRIMARY KEY,
      total_afirmacoes INT NOT NULL,
      total_confirma INT NOT NULL,
      total_diverge INT NOT NULL,
      total_nao_comparavel INT NOT NULL,
      estado VARCHAR(12) NOT NULL,
      verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`),i=!0)}async function d(a,t){await r(),await e.db.execute("INSERT IGNORE INTO relatorio_pedido (report_id, utilizador_id) VALUES (?, ?)",[a,t])}async function E(a,t){await r();let[o]=await e.db.execute("SELECT 1 FROM relatorio_pedido WHERE report_id = ? AND utilizador_id = ? LIMIT 1",[a,t]);return o.length>0}async function n(a){await r(),await e.db.execute(`INSERT INTO relatorio_uso_ia
       (report_id, utilizador_id, tipo, modelo, tokens_entrada, tokens_saida, custo_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,[a.reportId,a.utilizadorId,a.tipo,a.modelo,a.tokensEntrada,a.tokensSaida,a.custoUsd])}async function s(a,t){for(let o of(await r(),await e.db.execute("DELETE FROM relatorio_paginas WHERE report_id = ?",[a]),t))await e.db.execute("INSERT INTO relatorio_paginas (report_id, pagina, texto) VALUES (?, ?, ?)",[a,o.pagina,o.texto])}async function l(a){await r();let[t]=await e.db.execute("SELECT pagina, texto FROM relatorio_paginas WHERE report_id = ? ORDER BY pagina ASC",[a]);return t.map(a=>({pagina:Number(a.pagina),texto:String(a.texto||"")}))}async function _(a,t,o){await r(),await e.db.execute(`INSERT INTO relatorio_digesto (report_id, idioma, digesto) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE digesto = VALUES(digesto), criado_em = NOW()`,[a,t,JSON.stringify(o)])}async function u(a,t){await r();let[o]=await e.db.execute("SELECT digesto FROM relatorio_digesto WHERE report_id = ? AND idioma = ? LIMIT 1",[a,t]),i=o[0]?.digesto;if(!i)return null;try{return"string"==typeof i?JSON.parse(i):i}catch{return null}}async function T(a,t,o){await r(),await e.db.execute(`INSERT INTO relatorio_estado (report_id, estado, mensagem, total_paginas)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), mensagem = VALUES(mensagem),
       total_paginas = COALESCE(VALUES(total_paginas), total_paginas)`,[a,t,o?.mensagem??null,o?.totalPaginas??null])}async function c(a){await r();let[t]=await e.db.execute("SELECT estado, mensagem, total_paginas, actualizado_em FROM relatorio_estado WHERE report_id = ? LIMIT 1",[a]);return t[0]?{estado:t[0].estado,mensagem:t[0].mensagem?String(t[0].mensagem):null,totalPaginas:null!=t[0].total_paginas?Number(t[0].total_paginas):null,actualizadoEm:new Date(t[0].actualizado_em)}:null}async function N(){await r();let[a]=await e.db.execute("SELECT COUNT(*) AS n FROM relatorio_estado WHERE estado = 'pronto'");return Number(a[0]?.n??0)}async function L(a,t){await r(),await e.db.execute(`INSERT INTO relatorio_acesso (report_id, utilizador_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE report_id = report_id`,[a,t])}async function m(a,t){await r();let[o]=await e.db.execute("SELECT 1 FROM relatorio_acesso WHERE report_id = ? AND utilizador_id = ? LIMIT 1",[a,t]);return o.length>0}async function A(){await r();let[a]=await e.db.execute(`SELECT r.id AS reportId, r.title AS titulo,
            COUNT(ra.utilizador_id) AS nUtilizadores,
            MAX(ra.criado_em) AS ultimoAcesso
     FROM Report r
     LEFT JOIN relatorio_acesso ra ON ra.report_id = r.id
     GROUP BY r.id, r.title
     ORDER BY nUtilizadores DESC, r.title ASC`);return a.map(a=>({reportId:Number(a.reportId),titulo:String(a.titulo),nUtilizadores:Number(a.nUtilizadores),ultimoAcesso:a.ultimoAcesso?new Date(a.ultimoAcesso).toISOString():null}))}async function I(a){await r();let[t]=await e.db.execute(`SELECT u.name AS nome, u.email AS email, ra.criado_em AS criadoEm
     FROM relatorio_acesso ra
     INNER JOIN users u ON u.id = ra.utilizador_id
     WHERE ra.report_id = ?
     ORDER BY ra.criado_em DESC`,[a]);return t.map(a=>({nome:String(a.nome||a.email),email:String(a.email),criadoEm:new Date(a.criadoEm).toISOString()}))}async function R(a=null){await r();let t=a?"AND criado_em >= ?":"",o=a?[a]:[],[i]=await e.db.execute(`SELECT COUNT(*) as nChamadas, COALESCE(SUM(custo_usd), 0) as custoTotalUsd,
       COALESCE(AVG(custo_usd), 0) as custoMedioUsd,
       COALESCE(SUM(tokens_entrada), 0) as tokensEntrada, COALESCE(SUM(tokens_saida), 0) as tokensSaida
     FROM relatorio_uso_ia WHERE 1=1 ${t}`,o),[d]=await e.db.execute(`SELECT COUNT(*) as nRelatoriosDistintos, COALESCE(AVG(totalPorRelatorio), 0) as custoMedioPorRelatorioUsd
     FROM (
       SELECT report_id, SUM(custo_usd) as totalPorRelatorio
       FROM relatorio_uso_ia
       WHERE 1=1 ${t}
       GROUP BY report_id
     ) t`,o),[E]=await e.db.execute(`SELECT tipo, COUNT(*) as nChamadas, COALESCE(SUM(custo_usd), 0) as custoTotalUsd
     FROM relatorio_uso_ia WHERE 1=1 ${t} GROUP BY tipo ORDER BY custoTotalUsd DESC`,o),[n]=await e.db.execute(`SELECT ui.report_id as reportId, r.title as titulo,
       COUNT(*) as nChamadas, COALESCE(SUM(ui.custo_usd), 0) as custoTotalUsd
     FROM relatorio_uso_ia ui
     LEFT JOIN Report r ON r.id = ui.report_id
     WHERE 1=1 ${t}
     GROUP BY ui.report_id, r.title
     ORDER BY custoTotalUsd DESC
     LIMIT 50`,o),[s]=await e.db.execute(`SELECT ui.id, ui.report_id as reportId, r.title as titulo, ui.tipo, ui.modelo,
       u.name as nome, u.email as email,
       ui.custo_usd as custoUsd, ui.tokens_entrada as tokensEntrada, ui.tokens_saida as tokensSaida,
       ui.criado_em as criadoEm
     FROM relatorio_uso_ia ui
     LEFT JOIN Report r ON r.id = ui.report_id
     LEFT JOIN users u ON u.id = ui.utilizador_id
     WHERE 1=1 ${t}
     ORDER BY ui.criado_em DESC
     LIMIT 50`,o),l=i[0]||{},_=d[0]||{};return{totais:{nChamadas:Number(l.nChamadas)||0,custoTotalUsd:Number(l.custoTotalUsd)||0,custoMedioUsd:Number(l.custoMedioUsd)||0,custoMedioPorRelatorioUsd:Number(_.custoMedioPorRelatorioUsd)||0,nRelatoriosDistintos:Number(_.nRelatoriosDistintos)||0,tokensEntrada:Number(l.tokensEntrada)||0,tokensSaida:Number(l.tokensSaida)||0},porTipo:E.map(a=>({tipo:a.tipo,nChamadas:Number(a.nChamadas)||0,custoTotalUsd:Number(a.custoTotalUsd)||0})),porRelatorio:n.map(a=>({reportId:a.reportId,titulo:a.titulo||`Relat\xf3rio #${a.reportId}`,nChamadas:Number(a.nChamadas)||0,custoTotalUsd:Number(a.custoTotalUsd)||0})),recentes:s.map(a=>({id:a.id,reportId:a.reportId,titulo:a.titulo||`Relat\xf3rio #${a.reportId}`,tipo:a.tipo,modelo:a.modelo,nome:a.nome,email:a.email,custoUsd:Number(a.custoUsd)||0,tokensEntrada:a.tokensEntrada,tokensSaida:a.tokensSaida,criadoEm:a.criadoEm}))}}async function U(a){await r(),await e.db.execute(`INSERT INTO relatorio_verificacao_ref
       (report_id, dataset_id, nivel_geo, coluna_metrica, coluna_indicador, valor_indicador, coluna_tempo, unidade_metrica)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       dataset_id = VALUES(dataset_id), nivel_geo = VALUES(nivel_geo), coluna_metrica = VALUES(coluna_metrica),
       coluna_indicador = VALUES(coluna_indicador), valor_indicador = VALUES(valor_indicador),
       coluna_tempo = VALUES(coluna_tempo), unidade_metrica = VALUES(unidade_metrica), actualizado_em = NOW()`,[a.reportId,a.datasetId,a.nivelGeo,a.colunaMetrica||null,a.colunaIndicador||null,a.valorIndicador||null,a.colunaTempo||null,a.unidadeMetrica||null])}async function S(a){await r();let[t]=await e.db.execute(`SELECT r.report_id, r.dataset_id, r.nivel_geo, r.coluna_metrica, r.coluna_indicador, r.valor_indicador, r.coluna_tempo, r.unidade_metrica
     FROM relatorio_verificacao_ref r
     LEFT JOIN relatorio_verificacao_estado e ON e.report_id = r.report_id
     ORDER BY e.verificado_em IS NOT NULL, e.verificado_em ASC
     LIMIT ?`,[a]);return t.map(a=>({reportId:a.report_id,datasetId:a.dataset_id,nivelGeo:a.nivel_geo,colunaMetrica:a.coluna_metrica||void 0,colunaIndicador:a.coluna_indicador||void 0,valorIndicador:a.valor_indicador||void 0,colunaTempo:a.coluna_tempo||void 0,unidadeMetrica:a.unidade_metrica||void 0}))}async function p(a,t){await r(),await e.db.execute(`INSERT INTO relatorio_verificacao_estado
       (report_id, total_afirmacoes, total_confirma, total_diverge, total_nao_comparavel, estado)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       total_afirmacoes = VALUES(total_afirmacoes), total_confirma = VALUES(total_confirma),
       total_diverge = VALUES(total_diverge), total_nao_comparavel = VALUES(total_nao_comparavel),
       estado = VALUES(estado), verificado_em = NOW()`,[a,t.totalAfirmacoes,t.totalConfirma,t.totalDiverge,t.totalNaoComparavel,t.estado])}async function O(a){await r();let t=new Map;if(0===a.length)return t;let o=a.map(()=>"?").join(","),[i]=await e.db.execute(`SELECT report_id, total_afirmacoes, total_confirma, total_diverge, total_nao_comparavel, estado, verificado_em
     FROM relatorio_verificacao_estado WHERE report_id IN (${o})`,a);for(let a of i)t.set(a.report_id,{totalAfirmacoes:a.total_afirmacoes,totalConfirma:a.total_confirma,totalDiverge:a.total_diverge,totalNaoComparavel:a.total_nao_comparavel,estado:a.estado,verificadoEm:a.verificado_em});return t}}};