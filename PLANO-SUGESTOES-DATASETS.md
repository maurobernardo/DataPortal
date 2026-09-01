# Plano: sugestões de datasets a partir do que as pessoas perguntam

## O problema real

A página "Utilização de IA" já mostra as perguntas recentes feitas ao AI Insights (`analises.pergunta`),
mas ninguém olha para isso de forma agregada. Há sinal real ali dentro: perguntas repetidas sobre o
mesmo tema (hotéis, portagens, estradas), perguntas que falharam por falta de dados, e perguntas
sobre unidades/temas que o portal simplesmente não cobre. Isso é o pedido dos próprios utilizadores
sobre o que o portal devia ter — só que ninguém está a lê-lo dessa forma.

## Ideia central

Uma página nova ("Sugestões de datasets"), dentro do admin, que:
1. Lê as perguntas reais feitas (não inventa nada — R1 aplica-se aqui também: toda sugestão tem de
   apontar para perguntas reais que a motivam, nunca "achamos que seria bom ter X" sem prova).
2. Agrupa por tema (agricultura, turismo, transportes, saúde, etc.) usando um misto de: (a) palavras-
   chave determinísticas (já existe `palavrasChave()` em `lib/analysis/memoria.ts`, reaproveitável),
   e (b) uma classificação por modelo, uma vez por lote de perguntas novas, cacheada.
3. Cruza cada tema com o catálogo de datasets já existente (`dataset` + `category`), para separar
   "tema já coberto" (a pergunta falhou por outra razão: nome mal escrito, nível geográfico errado,
   etc.) de "tema genuinamente sem dataset nenhum".
4. Para os temas sem cobertura, sugere um dataset concreto: título, tipo (geoespacial/alfanumérico),
   nível geográfico razoável, e as perguntas reais que o motivam — nunca uma fonte "confirmada"
   sem verificação (skill `fontes`): a instituição provável (INE, MISAU, ANE, DINAGECA, Biofund...)
   entra como sugestão a validar por uma pessoa, rotulada claramente como tal, nunca como facto.

## Sinal a extrair de cada pergunta (o que já temos vs. o que falta)

Já disponível sem trabalho novo:
- `analises.pergunta`, `datasets_ids`, `estado`, `criado_em` — tudo já gravado.
- `analise_falhas` (mencionada em `lib/analysis/falhas.ts`) — se já regista o motivo estruturado de
  cada falha, é uma fonte directa de "isto não pôde ser respondido" sem ter de adivinhar a partir do
  texto da narrativa.
- `avisos` dentro de `resultados` — já tem frases como "não corresponde a nenhuma unidade
  administrativa", "sem dataset que cubra este tema", que são sinal quase pronto a usar.

A extrair de novo (Fase 2 abaixo):
- Tema/domínio de cada pergunta (agricultura, saúde, turismo, transportes, energia, educação...).
- Se a pergunta foi satisfeita bem, satisfeita parcialmente, ou não pôde ser respondida por falta
  de dado (distinto de "falhou por bug" — uma falha técnica não é sinal de gap de dataset).
- Entidades nomeadas na pergunta que não bateram certo com nada (nomes de lugar, tipos de
  instalação) — o próprio caso "Vilankulos"663 desta sessão é um exemplo perfeito: nem sempre é
  falta de dataset, às vezes é falta de correspondência de nome (já corrigido); a extracção tem de
  distinguir os dois casos, senão sugere datasets que já existem.

## Fases

### Fase 1 — vista bruta, sem modelo nenhum (rápida, valor imediato)
Uma tabela/lista na página de admin agrupando perguntas por PALAVRAS-CHAVE mais frequentes
(reaproveitando `palavrasChave()`), contando quantas vezes cada palavra-chave aparece e quantas
dessas análises falharam ou tiveram avisos de "sem dados". Sem inteligência nenhuma para além de
contagem — já revela padrões óbvios (ex.: "hoteis"/"turismo" aparece N vezes, nenhum dataset de
turismo existe) sem gastar nada em modelo.

### Fase 2 — classificação por modelo, cacheada (a parte "inteligente")
Um job (não por pedido de página — teria de correr sob pedido explícito do admin, ou agendado, nunca
a cada carregamento) que:
1. Pega nas perguntas ainda não classificadas desde a última corrida.
2. Chama Haiku, em lote, para classificar cada uma: `{tema, dataset_ja_existe: bool, entidade_nao_reconhecida: string|null, resumo_curto}`.
3. Persiste isto numa tabela nova (`perguntas_classificadas`), para nunca reclassificar a mesma
   pergunta duas vezes — o mesmo padrão de cache já usado em `dataset_perfis` e
   `rotulos_aprendidos` nesta sessão.
4. Agrega por tema: contagem, % de falhas, datasets do portal já relacionados (por categoria), e as
   3-5 perguntas mais representativas desse tema como prova.

### Fase 3 — cruzamento com o catálogo e geração da sugestão final
Para cada tema com contagem significativa (ex.: ≥3 perguntas) E sem dataset relacionado no
catálogo:
1. Gera uma sugestão estruturada: título proposto, tipo (geo/alfa), nível geográfico sugerido
   (a partir do nível mais fino pedido nas perguntas desse tema), instituição(ões) moçambicana(s)
   provável(eis) como fonte (claramente rotulado "sugestão, a confirmar" — nunca apresentado como
   já verificado, isto seria uma citação de fonte inventada, o que a skill `fontes` proíbe).
2. Ordena por procura real (contagem de perguntas), não por nenhuma outra heurística.
3. Mostra sempre as perguntas reais por baixo de cada sugestão — a prova nunca fica escondida.

### Fase 4 — acção (opcional, mais tarde)
Um botão "Marcar como em avaliação" / "Pedir a um utilizador que submeta este dataset" que liga
à funcionalidade já existente de pedidos de dados (Serviços → pedidos de dados personalizados,
mencionada nas curiosidades desta sessão) — fecha o ciclo entre "as pessoas pedem X" e "alguém
publica X", sem inventar um fluxo novo onde já existe um a reaproveitar.

## Onde fica na navegação
Dentro do admin, ao lado de "Utilização de IA" (mesma secção, faz sentido estarem próximas) — uma
nova entrada "Sugestões de Datasets" na `AdminSidebar`.

## Risco e como mitigar
- **Custo do modelo**: classificar cada pergunta uma vez, cacheado para sempre — mesmo padrão já
  usado nesta sessão (perfil de dataset, rótulos aprendidos), nunca corre por pedido de página.
- **Inventar fontes**: nunca apresentar uma instituição como "a fonte" sem confirmação humana —
  fica sempre como sugestão a validar (skill `fontes`).
- **Confundir "falta de dataset" com "bug do motor"**: distinguir explicitamente os dois na
  classificação (Fase 2) — um caso como "Vilankulos" (falha de correspondência de nome, já
  corrigida) não é prova de que falta um dataset de turismo; só entidades genuinamente sem
  cobertura nenhuma no catálogo é que contam.

## O que precisamos de decidir antes de implementar
1. Confirmar que existe (ou criar) uma forma de correr a classificação por lote sem ser "a cada
   pedido de página" — cron simples, ou botão manual "Actualizar sugestões" no admin (mais simples
   de implementar primeiro, sem precisar de infraestrutura de agendamento nova).
2. Confirmar o limiar de "contagem significativa" para gerar uma sugestão (proposta: ≥3 perguntas
   sobre o mesmo tema, ajustável depois de ver dados reais).
3. Confirmar se a Fase 4 (ligação a pedidos de dados) interessa já, ou fica para depois de validar
   as Fases 1-3.
