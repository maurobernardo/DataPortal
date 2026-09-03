-- Alarga as colunas de texto curto da tabela `Report` (title, coverage, author, partners), que
-- estavam em VARCHAR(191) — o limite clássico do Prisma. Um título ou lista de parceiros mais
-- longa do que isso rebentava com "Data too long for column" e um erro 500 sem explicação nenhuma
-- ao criar/editar um relatório no admin. Corre em phpMyAdmin (aba "SQL"), uma vez.
--
-- 500 acompanha REPORT_TEXT_FIELD_MAX em lib/db.ts: se um destes números mudar, o outro tem de
-- mudar junto, senão a aplicação volta a aceitar texto que a base de dados recusa.

-- Sem "NOT NULL"/"NULL" explícito de propósito: MODIFY exige repetir a definição toda da coluna,
-- e adivinhar a obrigatoriedade actual arriscava impedir a alteração (ou pior, rejeitar linhas
-- existentes) se a suposição estivesse errada. A obrigatoriedade de title/coverage já é garantida
-- pela aplicação (validarCamposTextoReport em lib/db.ts); isto só alarga o tamanho.
ALTER TABLE Report MODIFY COLUMN title VARCHAR(500);
ALTER TABLE Report MODIFY COLUMN coverage VARCHAR(500);
ALTER TABLE Report MODIFY COLUMN author VARCHAR(500);
ALTER TABLE Report MODIFY COLUMN partners VARCHAR(500);
