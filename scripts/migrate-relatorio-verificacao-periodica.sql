-- Reverificação periódica de relatórios já publicados (ver lib/relatorios/verificacao-periodica.ts).
-- Cria-se sozinha na primeira verificação manual em PainelVerificacao.tsx (migração preguiçosa) —
-- este script é só para quem prefere correr a migração manualmente no phpMyAdmin.

CREATE TABLE IF NOT EXISTS relatorio_verificacao_ref (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS relatorio_verificacao_estado (
  report_id INT PRIMARY KEY,
  total_afirmacoes INT NOT NULL,
  total_confirma INT NOT NULL,
  total_diverge INT NOT NULL,
  total_nao_comparavel INT NOT NULL,
  estado VARCHAR(12) NOT NULL,
  verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
