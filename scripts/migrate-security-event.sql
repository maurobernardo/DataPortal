-- Sinal de intrusão/WAF-lite: cada bloqueio de rate limit num ponto sensível (login, 2FA,
-- recuperação de senha) fica registado aqui, para alertar os admins por email quando o mesmo
-- alvo é bloqueado repetidamente (ver lib/security-events.ts). Cria-se sozinha na primeira
-- chamada (migração preguiçosa) — este script é só para quem prefere correr manualmente.

CREATE TABLE IF NOT EXISTS SecurityEvent (
  id INT NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(60) NOT NULL,
  identificador VARCHAR(254) NOT NULL,
  ip VARCHAR(64) NULL,
  detalhe TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX securityevent_tipo_identificador_idx (tipo, identificador, createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
