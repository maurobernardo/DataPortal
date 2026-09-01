-- Migração de produção — 2026-08-24
-- Só o que é NOVO desde a última migração (migracao-producao.sql, que já tinha: users.active,
-- AuditLog, Report.sector — esses NÃO estão repetidos aqui).
-- Corre isto no phpMyAdmin da base de dados de produção, uma vez, depois de publicar o novo código.
-- Todas as instruções ADD COLUMN/DROP INDEX/ADD INDEX usam IF NOT EXISTS / IF EXISTS, por isso
-- corre sem parar mesmo que parte já tenha sido criada antes (o phpMyAdmin aqui pára o resto do
-- script ao primeiro erro, por isso já não há nenhuma instrução que possa falhar por "já existe").

-- ============================================================================
-- 2FA, OAuth (Google/LinkedIn), troca de email com confirmação, pedido de eliminação de conta
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires DATETIME(3) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(191) NULL;
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS users_oauth_provider_id_key (oauth_provider, oauth_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(254) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email_expires DATETIME(3) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_category VARCHAR(30) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pedido_eliminacao_em DATETIME(3) NULL;

-- ============================================================================
-- Categorias: mesmo nome permitido em tipos diferentes (ex.: "Agricultura" geo + alfanumérico)
-- ============================================================================

ALTER TABLE Category DROP INDEX IF EXISTS Category_name_key;
ALTER TABLE Category ADD UNIQUE INDEX IF NOT EXISTS Category_name_datatype_key (name, dataType);

-- ============================================================================
-- Dataset: badge/miniatura de pré-visualização, certificação de proveniência, resumo por IA
-- ============================================================================

ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS previewAvailable TINYINT(1) NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS bboxMinX DOUBLE NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS bboxMinY DOUBLE NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS bboxMaxX DOUBLE NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS bboxMaxY DOUBLE NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS certificacao VARCHAR(30) NOT NULL DEFAULT 'nao_verificado';
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS resumoIA TEXT NULL;
ALTER TABLE Dataset ADD COLUMN IF NOT EXISTS resumoIAGeradoEm DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS DatasetVersao (
  id INT NOT NULL AUTO_INCREMENT,
  datasetId INT NOT NULL,
  dados JSON NOT NULL,
  editadoPor VARCHAR(254) NOT NULL,
  criadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX datasetversao_datasetid_idx (datasetId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS LixeiraDataset (
  id INT NOT NULL AUTO_INCREMENT,
  datasetId INT NOT NULL,
  dados JSON NOT NULL,
  eliminadoPor VARCHAR(254) NOT NULL,
  eliminadoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  restauradoEm DATETIME(3) NULL,
  PRIMARY KEY (id),
  INDEX lixeiradataset_datasetid_idx (datasetId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS DailyUsageStat (
  date DATE NOT NULL,
  views INT NOT NULL DEFAULT 0,
  downloads INT NOT NULL DEFAULT 0,
  viewsAlertedThreshold INT NOT NULL DEFAULT 0,
  downloadsAlertedThreshold INT NOT NULL DEFAULT 0,
  PRIMARY KEY (date)
);

CREATE TABLE IF NOT EXISTS DatasetFavorite (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  datasetId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY DatasetFavorite_user_dataset_key (userId, datasetId),
  INDEX DatasetFavorite_userId_idx (userId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE Statistic ADD COLUMN IF NOT EXISTS userId INT NULL;

-- ============================================================================
-- Pedidos e favoritos de outras entidades (dashboards, relatórios, mapas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ReportRequest (
  id INTEGER NOT NULL AUTO_INCREMENT,
  reportId INTEGER NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX ReportRequest_reportId_idx (reportId),
  INDEX ReportRequest_createdAt_idx (createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ReportRequest ADD COLUMN IF NOT EXISTS name VARCHAR(120) NULL;
ALTER TABLE ReportRequest ADD COLUMN IF NOT EXISTS email VARCHAR(254) NULL;
ALTER TABLE ReportRequest ADD COLUMN IF NOT EXISTS message TEXT NULL;

CREATE TABLE IF NOT EXISTS EntityFavorite (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  entityType VARCHAR(20) NOT NULL,
  entityId VARCHAR(64) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY EntityFavorite_user_entity_key (userId, entityType, entityId),
  INDEX EntityFavorite_userId_idx (userId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MapStat (
  id INT NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  type VARCHAR(20) NOT NULL,
  userId INT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX MapStat_slug_idx (slug),
  INDEX MapStat_slug_type_idx (slug, type)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MapRequest (
  id INT NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(120) NULL,
  email VARCHAR(254) NULL,
  message TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX MapRequest_slug_idx (slug)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS MapOverride (
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(255) NULL,
  subtitle VARCHAR(255) NULL,
  description TEXT NULL,
  coverage VARCHAR(255) NULL,
  category VARCHAR(120) NULL,
  badgesJson TEXT NULL,
  highlightsJson TEXT NULL,
  featured TINYINT(1) NULL,
  heroStatValue VARCHAR(40) NULL,
  heroStatLabel VARCHAR(80) NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (slug)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE ContactMessage ADD COLUMN IF NOT EXISTS purpose VARCHAR(60) NULL;

ALTER TABLE AlphanumericDashboard ADD COLUMN IF NOT EXISTS previewImagePath TEXT NULL;
ALTER TABLE AlphanumericDashboard ADD COLUMN IF NOT EXISTS category VARCHAR(191) NULL;
ALTER TABLE AlphanumericDashboard ADD COLUMN IF NOT EXISTS views INT NOT NULL DEFAULT 0;
ALTER TABLE AlphanumericDashboard ADD COLUMN IF NOT EXISTS lastDataUpdate DATE NULL;

-- ============================================================================
-- AI Insights: cartões guardados, registo de utilização, alertas de reanálise
-- ============================================================================

CREATE TABLE IF NOT EXISTS AIInsightTile (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(191) NOT NULL,
  question TEXT NOT NULL,
  datasetIds TEXT NOT NULL,
  resultJson LONGTEXT NOT NULL,
  shareToken VARCHAR(64) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY AIInsightTile_shareToken_key (shareToken),
  INDEX AIInsightTile_userId_idx (userId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS AIInsightQuery (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  question TEXT NOT NULL,
  datasetIds TEXT NOT NULL,
  confidence VARCHAR(20) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX AIInsightQuery_userId_idx (userId),
  INDEX AIInsightQuery_createdAt_idx (createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS DatasetUpdateSubscription (
  id INT NOT NULL AUTO_INCREMENT,
  userId INT NOT NULL,
  datasetId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY DatasetUpdateSubscription_user_dataset_key (userId, datasetId),
  INDEX DatasetUpdateSubscription_datasetId_idx (datasetId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE analises ADD COLUMN IF NOT EXISTS confianca_detalhe LONGTEXT NULL;

CREATE TABLE IF NOT EXISTS rotulos_aprendidos (
  chave VARCHAR(191) NOT NULL,
  tipo ENUM('coluna', 'valor') NOT NULL DEFAULT 'coluna',
  rotulo VARCHAR(191) NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (chave, tipo)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE rotulos_aprendidos MODIFY COLUMN tipo ENUM('coluna', 'valor') NOT NULL DEFAULT 'coluna';

CREATE TABLE IF NOT EXISTS dataset_perfis (
  dataset_id INT NOT NULL,
  dataset_actualizado_em VARCHAR(40) NOT NULL,
  perfil LONGTEXT NOT NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (dataset_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analise_falhas (
  id INT NOT NULL AUTO_INCREMENT,
  analise_id VARCHAR(40) NOT NULL,
  etapa VARCHAR(40) NULL,
  tipo_erro VARCHAR(80) NULL,
  mensagem TEXT NULL,
  tentativa INT NOT NULL DEFAULT 1,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX analise_falhas_analise_idx (analise_id),
  INDEX analise_falhas_criado_idx (criado_em)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- Sugestões de Datasets (admin) — classificação de perguntas, estado, tipos por categoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS perguntas_classificadas (
  pergunta_hash VARCHAR(64) NOT NULL PRIMARY KEY,
  pergunta TEXT NOT NULL,
  tema VARCHAR(100) NOT NULL,
  dataset_ja_existe TINYINT(1) NOT NULL DEFAULT 0,
  entidade_nao_reconhecida VARCHAR(191) NULL,
  resumo_curto VARCHAR(255) NOT NULL,
  pergunta_criado_em DATETIME(3) NULL,
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE perguntas_classificadas ADD COLUMN IF NOT EXISTS pergunta_criado_em DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS sugestoes_datasets_estado (
  tema VARCHAR(100) NOT NULL PRIMARY KEY,
  estado VARCHAR(20) NOT NULL DEFAULT 'nova',
  titulo_proposto VARCHAR(191) NULL,
  marcado_por VARCHAR(191) NULL,
  marcado_em DATETIME(3) NULL,
  nivel_geografico_sugerido VARCHAR(100) NULL,
  resumo_externo TEXT NULL,
  fontes_externas JSON NULL,
  enriquecido_em DATETIME(3) NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS nivel_geografico_sugerido VARCHAR(100) NULL;
ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS resumo_externo TEXT NULL;
ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS fontes_externas JSON NULL;
ALTER TABLE sugestoes_datasets_estado ADD COLUMN IF NOT EXISTS enriquecido_em DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS sugestoes_tipos_categoria (
  categoriaId INT NOT NULL PRIMARY KEY,
  categoriaNome VARCHAR(191) NOT NULL,
  totalDatasets INT NOT NULL,
  tiposSugeridos JSON NOT NULL,
  geradoEm DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- Exportação agendada de relatórios por email (semanal/mensal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS relatorios_agendados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  frequencia ENUM('semanal','mensal') NOT NULL,
  diaSemana TINYINT NULL,
  diaMes TINYINT NULL,
  destinatarios TEXT NOT NULL,
  filtroCategoria VARCHAR(120) NULL,
  filtroFormato VARCHAR(40) NULL,
  filtroFonte VARCHAR(120) NULL,
  activo TINYINT NOT NULL DEFAULT 1,
  criadoPor VARCHAR(190) NOT NULL,
  criadoEm DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimoEnvioEm DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- Origem geográfica dos acessos (IP → país/região/cidade; o IP em si nunca é guardado)
-- ============================================================================

CREATE TABLE IF NOT EXISTS AcessoOrigem (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo_evento   ENUM('vista_dataset','download','vista_mapa','pedido_mapa','pedido_relatorio',
                     'analise_ia','contacto') NOT NULL,
  referencia_id VARCHAR(80) NULL,
  pais          VARCHAR(2) NULL,
  regiao        VARCHAR(120) NULL,
  cidade        VARCHAR(120) NULL,
  utilizador_id INT NULL,
  criado_em     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_origem_tipo (tipo_evento, criado_em),
  INDEX idx_origem_pais (pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
