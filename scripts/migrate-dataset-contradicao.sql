-- Detecção de contradições entre datasets alfanuméricos do catálogo (ver
-- lib/qualidade/detectar-contradicoes.ts). Estas tabelas também se criam sozinhas na primeira
-- chamada ao cron (migração preguiçosa, o padrão já usado no resto do projecto) — este script é
-- só para quem prefere correr a migração manualmente no phpMyAdmin em vez de esperar pela primeira
-- corrida.

CREATE TABLE IF NOT EXISTS dataset_contradicao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_a_id INT NOT NULL,
  dataset_b_id INT NOT NULL,
  coluna_a VARCHAR(190) NOT NULL,
  coluna_b VARCHAR(190) NOT NULL,
  geografia VARCHAR(190) NOT NULL,
  periodo INT NULL,
  valor_a DOUBLE NOT NULL,
  valor_b DOUBLE NOT NULL,
  estado VARCHAR(12) NOT NULL,
  diferenca_relativa_pct DOUBLE NULL,
  detectado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dataset_a (dataset_a_id),
  INDEX idx_dataset_b (dataset_b_id),
  INDEX idx_par (dataset_a_id, dataset_b_id, coluna_a, coluna_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS dataset_par_verificado (
  dataset_a_id INT NOT NULL,
  dataset_b_id INT NOT NULL,
  coluna_a VARCHAR(190) NOT NULL,
  coluna_b VARCHAR(190) NOT NULL,
  verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (dataset_a_id, dataset_b_id, coluna_a, coluna_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
