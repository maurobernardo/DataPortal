-- Nova tabela: "quem pediu a sua própria análise deste relatório". Corre em phpMyAdmin, uma vez.
--
-- O estado de processamento (relatorio_estado) é global, uma linha por relatório: correcto para
-- não repetir a mesma chamada cara à IA duas vezes sobre o mesmo PDF. Mas sozinho isso deixava uma
-- fuga: uma conta que nunca clicou em nada, ao abrir a página de um relatório enquanto outra conta
-- tinha uma análise em curso, via directamente "a processar" (ou o resumo, assim que terminasse) —
-- confirmado ao vivo em produção. Esta tabela é o "eu pedi isto" por conta: só quem tem uma linha
-- aqui é que pode ver o estado real; todas as outras contas continuam a ver sempre "pendente" (o
-- botão "Analisar"), mesmo com outra pessoa a processar o mesmo relatório nesse preciso momento.

CREATE TABLE IF NOT EXISTS relatorio_pedido (
  report_id INT NOT NULL,
  utilizador_id BIGINT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, utilizador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
