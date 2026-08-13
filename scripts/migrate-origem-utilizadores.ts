/**
 * Migração da tabela de origem geográfica dos acessos (PLANO-ORIGEM-UTILIZADORES.md).
 */
import { db } from '../lib/db'

async function main() {
  console.log('Origem geográfica dos utilizadores')
  try {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS AcessoOrigem (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
    console.log('  ok   AcessoOrigem')
  } catch (error: any) {
    if (/already exists/i.test(error?.message || '')) {
      console.log('  skip AcessoOrigem (já existe)')
    } else {
      throw error
    }
  }
  console.log('Migração concluída.')
}

main()
  .then(() => db.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
