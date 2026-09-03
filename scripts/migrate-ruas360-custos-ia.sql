-- Migração para o deploy de 2026-09: Ruas 360°, preferência de notificações e auditoria de
-- custos de IA. Corre em phpMyAdmin (aba "SQL" da base de dados de produção).
--
-- Não é obrigatório correr isto à mão: a aplicação já tenta criar estas colunas/tabela sozinha na
-- primeira vez que precisa delas (ver lib/db.ts, lib/analysis/persistencia.ts e
-- lib/relatorios/persistencia.ts). Mas isso só funciona se o utilizador da base de dados usado
-- pela aplicação tiver privilégio ALTER/CREATE — em muitas contas de hosting partilhado (cPanel)
-- não tem, e a app fica silenciosamente sem estas colunas para sempre em vez de dar um erro óbvio.
-- Correr este script à mão evita esse cenário.
--
-- Seguro de correr mais do que uma vez: os `ADD COLUMN` dão erro "Duplicate column name" se a
-- coluna já existir (ignore esse erro específico e continue para a instrução seguinte, é o mesmo
-- comportamento que a app já tem embutido); o `CREATE TABLE IF NOT EXISTS` nunca dá erro.

-- 1) Preferência de notificações por email (popup no primeiro login + opção no Perfil).
-- NULL = ainda não respondeu (é o que faz o popup aparecer); 0/1 depois de responder.
ALTER TABLE users ADD COLUMN receber_notificacoes TINYINT(1) NULL DEFAULT NULL;

-- 2) Tokens brutos por análise de dados, ao lado do custo_usd já existente (painel /admin/custos-ia).
ALTER TABLE analises ADD COLUMN tokens_entrada INT NULL;
ALTER TABLE analises ADD COLUMN tokens_saida INT NULL;

-- 3) Log de cada chamada de IA sobre um relatório (resumo, pergunta, tradução), com custo e tokens.
CREATE TABLE IF NOT EXISTS relatorio_uso_ia (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
