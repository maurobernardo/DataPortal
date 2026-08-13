/**
 * Migração do motor de análise (Parte 2.2 da especificação).
 *
 * Duas decisões que divergem do spec, por razões concretas:
 *
 * 1. O spec propõe uma tabela `datasets` nova. O portal já tem `Dataset` com 40 datasets reais
 *    em produção e todo o código a apontar para lá. Criar uma segunda tabela de registo
 *    duplicaria a fonte da verdade, por isso as tabelas novas referenciam `Dataset(id)`.
 *
 * 2. O spec assume MySQL 8 (`GEOMETRY NOT NULL SRID 4326`). A instalação local é MariaDB 10.4,
 *    que não suporta o atributo SRID ao nível da coluna. A migração detecta o motor e emite a
 *    sintaxe correspondente; em ambos os casos as coordenadas são EPSG:4326 por convenção,
 *    garantida na ingestão (reprojecção obrigatória) e não pela base de dados.
 */
import { db } from '../lib/db'

async function isMariaDB(): Promise<boolean> {
  const [rows] = (await db.execute('SELECT VERSION() AS v')) as [{ v: string }[], unknown]
  return /mariadb/i.test(rows[0]?.v || '')
}

async function exec(label: string, sql: string) {
  try {
    await db.execute(sql)
    console.log(`  ok   ${label}`)
  } catch (error: any) {
    if (/already exists|Duplicate key name|Duplicate column/i.test(error?.message || '')) {
      console.log(`  skip ${label} (já existe)`)
      return
    }
    console.error(`  FALHA ${label}: ${error?.message}`)
    throw error
  }
}

async function main() {
  const maria = await isMariaDB()
  console.log(`Motor: ${maria ? 'MariaDB' : 'MySQL'}\n`)

  // Em MariaDB o atributo SRID de coluna não existe; em MySQL 8 é aceite e desejável.
  const geomCol = maria ? 'GEOMETRY NOT NULL' : 'GEOMETRY NOT NULL SRID 4326'
  const pointCol = maria ? 'POINT NOT NULL' : 'POINT NOT NULL SRID 4326'

  console.log('Unidades administrativas de referência (COD-AB)')
  await exec(
    'geo_unidades',
    `CREATE TABLE IF NOT EXISTS geo_unidades (
      id            BIGINT PRIMARY KEY AUTO_INCREMENT,
      nivel         ENUM('admin0','admin1','admin2','admin3','admin4') NOT NULL,
      codigo        VARCHAR(40) NOT NULL,
      codigo_pai    VARCHAR(40) NULL,
      nome          VARCHAR(200) NOT NULL,
      nome_alt      JSON NULL,
      regiao        ENUM('Norte','Centro','Sul') NULL,
      area_km2      DOUBLE NULL,
      populacao     BIGINT NULL,
      ano_populacao SMALLINT NULL,
      geometria     ${geomCol},
      centroide     ${pointCol},
      bbox          JSON NULL,
      criado_em     DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_geo_unidade (nivel, codigo),
      KEY idx_geo_pai (codigo_pai),
      KEY idx_geo_nome (nome),
      SPATIAL INDEX spx_geo_unidades (geometria)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )
  await exec('geo_unidades.regiao', `ALTER TABLE geo_unidades ADD COLUMN regiao ENUM('Norte','Centro','Sul') NULL`)

  console.log('\nRegião (Norte/Centro/Sul) por província')
  const REGIAO_POR_PROVINCIA: Record<string, string> = {
    Niassa: 'Norte',
    'Cabo Delgado': 'Norte',
    Nampula: 'Norte',
    Zambézia: 'Centro',
    Zambezia: 'Centro',
    Tete: 'Centro',
    Manica: 'Centro',
    Sofala: 'Centro',
    Inhambane: 'Sul',
    Gaza: 'Sul',
    'Maputo Província': 'Sul',
    'Maputo Provincia': 'Sul',
    'Maputo Cidade': 'Sul',
    'Cidade de Maputo': 'Sul',
  }
  for (const [nome, regiao] of Object.entries(REGIAO_POR_PROVINCIA)) {
    await db.execute(
      `UPDATE geo_unidades SET regiao = ? WHERE nivel = 'admin1' AND nome = ? AND regiao IS NULL`,
      [regiao, nome]
    )
  }
  // Distritos e postos herdam a região da província-mãe (codigo_pai é o pcode de 2 dígitos).
  await db.execute(
    `UPDATE geo_unidades filho
     JOIN geo_unidades prov ON prov.nivel = 'admin1' AND prov.codigo = LEFT(filho.codigo, 2)
     SET filho.regiao = prov.regiao
     WHERE filho.nivel IN ('admin2','admin3') AND filho.regiao IS NULL AND prov.regiao IS NOT NULL`
  )
  console.log('  ok   regiao preenchida (província + herança para distrito/posto)')

  console.log('\nCamada semântica')
  await exec(
    'manifestos_semanticos',
    `CREATE TABLE IF NOT EXISTS manifestos_semanticos (
      id           BIGINT PRIMARY KEY AUTO_INCREMENT,
      dataset_id   INT NOT NULL,
      versao       INT NOT NULL DEFAULT 1,
      manifesto    JSON NOT NULL,
      gerado_por   ENUM('ia','humano','ia_revisto_humano') DEFAULT 'ia',
      aprovado     TINYINT(1) DEFAULT 0,
      aprovado_por BIGINT NULL,
      aprovado_em  DATETIME NULL,
      criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_manifesto (dataset_id, versao),
      CONSTRAINT fk_manifesto_dataset FOREIGN KEY (dataset_id) REFERENCES Dataset(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  // Artefactos derivados por versão de dataset (Parquet/GeoParquet/PMTiles da Parte 2.1).
  await exec(
    'dataset_versoes',
    `CREATE TABLE IF NOT EXISTS dataset_versoes (
      id              BIGINT PRIMARY KEY AUTO_INCREMENT,
      dataset_id      INT NOT NULL,
      versao          INT NOT NULL,
      ficheiro_origem VARCHAR(600) NULL,
      parquet_path    VARCHAR(600) NULL,
      geoparquet_path VARCHAR(600) NULL,
      pmtiles_path    VARCHAR(600) NULL,
      n_linhas        BIGINT NULL,
      hash_conteudo   CHAR(64) NULL,
      criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dataset_versao (dataset_id, versao),
      CONSTRAINT fk_versao_dataset FOREIGN KEY (dataset_id) REFERENCES Dataset(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  console.log('\nAnálises')
  await exec(
    'analises',
    `CREATE TABLE IF NOT EXISTS analises (
      id             CHAR(12) PRIMARY KEY,
      utilizador_id  BIGINT NULL,
      pergunta       TEXT NOT NULL,
      datasets_ids   JSON NOT NULL,
      arquetipo      VARCHAR(60) NULL,
      estado         ENUM('planeando','executando','compondo','pronto','erro') DEFAULT 'planeando',
      plano          JSON NULL,
      resultados     JSON NULL,
      achados        JSON NULL,
      narrativa      JSON NULL,
      dashboard_spec JSON NULL,
      fontes         JSON NULL,
      confianca      DECIMAL(3,2) NULL,
      custo_usd      DECIMAL(10,4) NULL,
      duracao_ms     INT NULL,
      publico        TINYINT(1) DEFAULT 0,
      guardado       TINYINT(1) DEFAULT 0,
      criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_analise_utilizador (utilizador_id),
      KEY idx_analise_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )
  await exec('analises.guardado', `ALTER TABLE analises ADD COLUMN guardado TINYINT(1) DEFAULT 0`)

  await exec(
    'analise_execucoes',
    `CREATE TABLE IF NOT EXISTS analise_execucoes (
      id         BIGINT PRIMARY KEY AUTO_INCREMENT,
      analise_id CHAR(12) NOT NULL,
      passo      VARCHAR(80) NULL,
      codigo     MEDIUMTEXT NULL,
      stdout     MEDIUMTEXT NULL,
      resultado  JSON NULL,
      erro       TEXT NULL,
      duracao_ms INT NULL,
      criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_execucao_analise (analise_id),
      CONSTRAINT fk_execucao_analise FOREIGN KEY (analise_id) REFERENCES analises(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  await exec(
    'analise_feedback',
    `CREATE TABLE IF NOT EXISTS analise_feedback (
      id         BIGINT PRIMARY KEY AUTO_INCREMENT,
      analise_id CHAR(12) NOT NULL,
      bloco_id   VARCHAR(60) NULL,
      voto       TINYINT NULL,
      comentario TEXT NULL,
      criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_feedback_analise (analise_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  console.log('\nMemória entre análises (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 4)')
  await exec(
    'analise_planos_cache',
    `CREATE TABLE IF NOT EXISTS analise_planos_cache (
      id             BIGINT PRIMARY KEY AUTO_INCREMENT,
      pergunta       VARCHAR(500) NOT NULL,
      palavras_chave JSON NOT NULL,
      datasets_ids   JSON NOT NULL,
      arquetipo      VARCHAR(60) NULL,
      plano          JSON NOT NULL,
      usos           INT DEFAULT 0,
      criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_plano_cache_criado (criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  console.log('\nCache de fontes externas')
  await exec(
    'fontes_externas_cache',
    `CREATE TABLE IF NOT EXISTS fontes_externas_cache (
      chave     VARCHAR(255) PRIMARY KEY,
      fonte     VARCHAR(80) NULL,
      payload   JSON NOT NULL,
      obtido_em DATETIME NOT NULL,
      expira_em DATETIME NOT NULL,
      KEY idx_cache_expira (expira_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  )

  console.log('\nMigração concluída.')
}

main()
  .then(() => db.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
