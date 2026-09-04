-- Detecção de anomalias dentro de cada dataset alfanumérico (ver lib/qualidade/detectar-anomalias.ts).
-- Cria-se sozinha na primeira chamada ao cron (migração preguiçosa) — este script é só para quem
-- prefere correr a migração manualmente no phpMyAdmin.

CREATE TABLE IF NOT EXISTS dataset_anomalia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset_id INT NOT NULL,
  coluna VARCHAR(190) NOT NULL,
  geografia VARCHAR(190) NOT NULL,
  periodo INT NULL,
  valor DOUBLE NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  detalhe VARCHAR(300) NOT NULL,
  detectado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dataset (dataset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS dataset_anomalia_verificado (
  dataset_id INT PRIMARY KEY,
  verificado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
