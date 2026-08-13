# Plano de correcção do motor de análise

Estado em 2026-08-07, antes de qualquer implementação desta ronda. Mapeia as 13 etapas da
secção 12 do documento de correcção ao código actual (`lib/analysis/*`). Para cada etapa: o que
já existe, o que se adapta, o que é novo, estimativa de esforço, e riscos.

## Resumo executivo

O diagnóstico do documento está certo na direcção, mas parte de uma premissa desactualizada: que
o motor envia "linhas de dados" ao modelo e não tem qualquer noção de geografia derivada. Não é
bem assim.

**Já existe, a funcionar:**
- Amostra mínima no prompt (3 linhas × 10 colunas por dataset, não a tabela inteira).
- Ligação geográfica com 4 estratégias: pcode, nome exacto, nome difuso (Jaro-Winkler ≥0.92), e
  junção espacial ponto-em-polígono por coordenadas (admin2/admin3), com herança para admin1 por
  truncagem hierárquica do pcode.
- Uma única fonte de verdade por análise (`ctx.series`/`ctx.calcs`, persistidos em
  `analises.resultados`) — mapa, gráficos e narrativa já leem do mesmo objecto, nenhum componente
  faz fetch próprio.
- Normalizações derivadas (per_capita, por_1000, densidade_km2) já existem para passos
  geográficos.

**Não existe, e é a causa real das duas falhas:**
- **Falha A (lentidão)**: 4 chamadas ao Claude sequenciais e bloqueantes (Compreensão →
  Planeamento → Suficiência → Narrativa), nenhum paralelismo, nenhum cache semântico, nenhuma
  agregação pré-computada — tudo calculado a pedido, a cada pergunta.
- **Falha B (parcial)**: a ligação geográfica e a agregação por unidade já funcionam, mas o passo
  que liga "resultado agregado" a "facto citável na narrativa" tinha um buraco concreto (corrigido
  nesta sessão para o caso `resumo_estatistico` + `nivel_geo`). Não há cubo pré-computado, nem
  achados pré-calculados, nem resolução determinística de entidades — cada pergunta refaz tudo do
  zero, incluindo o que uma pergunta anterior já tinha calculado.

A arquitectura proposta (cubo pré-computado, geo-spine materializado, chamada única) é a correcção
certa a prazo. A ordem de implementação abaixo prioriza o que dá mais retorno por esforço: a
paralelização e o cache resolvem a maior parte da Falha A sem esperar pelo cubo completo; a
resolução determinística de entidades resolve grande parte da Falha B sem esperar pela ingestão
geo-spine completa.

---

## Etapa 1 — `geo_unidades` + fronteiras + população + dicionário de variantes

**Existe:** tabela `geo_unidades` (migração `scripts/migrate-analysis-engine.ts`) com
`nivel/codigo/codigo_pai/nome/nome_alt/area_km2/populacao/geometria/centroide`, já carregada com
COD-AB (admin1/2/3) e população 2017 via `scripts/carregar-geo-unidades.ts` e
`scripts/carregar-populacao.ts`. `nome_alt` e normalização de nomes existem em
`lib/analysis/dados.ts` (`normalizar()`), mas o dicionário de variantes é o normalizador genérico
(minúsculas, sem acentos), não uma lista curada por unidade como o documento pede.

**Falta:** coluna `nome_norm` materializada (hoje normaliza-se em runtime a cada pedido — barato,
mas repetido), `regiao` (Norte/Centro/Sul), `pop_0_17`, `pop_urbana`, dicionário de variantes
explícito por unidade (prefixos "Distrito de", "Cidade de", etc. — hoje só cobertos
parcialmente pela normalização genérica).

**Esforço:** pequeno (meio dia) — é sobretudo ALTER TABLE + um script de preenchimento de
`regiao` (mapeamento fixo de 11 valores) + revisão do dicionário de variantes contra os datasets
reais que já falharam correspondência (`ctx.avisos` já regista os `nao_correspondidos` de cada
análise — é a lista certa para começar).

**Risco:** baixo. É aditivo, não quebra nada existente.

---

## Etapa 2 — Geo-spine na ingestão (7 estratégias)

**Existe:** E1 (coordenadas → ponto-em-polígono, admin2/admin3 com herança), E3 (pcode), E4 (nome
exacto), E5 (nome difuso ≥0.92) — em `lib/analysis/dados.ts` (`ligarPorCoordenadas`,
`detectarColunaGeografica`, `ligarValoresAUnidades`). E7 (não resolvido → fica em avisos, nunca
descartado em silêncio) também já existe.

**Falta:** E2 (sobreposição de polígonos >50% de área — hoje só ponto-em-polígono, um dataset de
polígonos sem pcode/nome não liga), E6 (topónimo dentro de texto livre). Mais importante: isto
corre **a cada pedido de análise** (`criarContexto`), não uma vez na ingestão — cada pergunta
repete a mesma junção espacial para o mesmo dataset. Não há relatório de resolução para o
administrador nem métrica "≥95% das linhas com adm1_cod".

**Esforço:** médio (2-3 dias) — mover a ligação geográfica de "calculada por pedido" para
"calculada e guardada na ingestão/actualização do dataset" é a mudança estrutural real aqui; as
estratégias de correspondência em si já existem e reaproveitam-se quase sem alteração.

**Risco:** médio. Datasets já publicados precisam de reprocessamento (etapa 13); um bug na
migração pode silenciosamente piorar a taxa de correspondência de datasets que hoje funcionam.

---

## Etapa 3 — Dimensões e métricas derivadas + sinónimos

**Existe:** normalizações `densidade_km2`, `per_capita`, `por_1000` (não `por_100000`), contagem
implícita ("quantas escolas" já funciona sem coluna de contagem, ver `serieDe` em
`executor.ts`). Dimensões temporais: nenhuma derivação automática de ano/trimestre/estação a partir
de uma coluna de data — cada dataset precisa de já ter essas colunas.

**Falta:** tudo o resto — região/tipo_área/capital_provincial/distância à capital, dimensões
temporais derivadas, `_pct_do_total`, `_rank_nacional`, `_vs_media_nacional`, dicionário de
sinónimos como ficheiro consultável na resolução de entidades (hoje os sinónimos, quando existem,
estão implícitos no prompt de Planeamento, não numa estrutura determinística).

**Esforço:** médio (2-3 dias), maioritariamente funções puras sobre o resultado de
`agregarPorUnidade` — não precisa de mudar a ingestão, pode calcular-se a pedido inicialmente e só
mover para o cubo (etapa 4) depois de estabilizado.

**Risco:** baixo-médio. Mais superfície de código, mas isolado (funções novas, não alterações a
caminhos existentes).

---

## Etapa 4 — Cubo pré-computado (DuckDB)

**Não existe.** É a mudança de maior impacto na Falha A e a mais grande do plano: hoje cada
pergunta corre `agregarPorUnidade` (agregação em JS sobre a tabela carregada em memória) do zero.
Não há DuckDB no projecto (`package.json` não tem a dependência), nem Parquet particionado, nem
job assíncrono de recálculo.

**Falta:** tudo — escolher DuckDB (Node) vs. continuar em JS/MySQL com tabelas de agregados
materializadas (alternativa mais barata de introduzir dado o resto da stack já ser MySQL); definir
`(nível × dimensão × período)` plausíveis por dataset sem explodir combinatoriamente (o documento
pede "todas as agregações plausíveis" — precisa de um limite prático, ex.: só as dimensões que a
Compreensão/Planeamento já pediram nalguma análise anterior, crescendo por uso real em vez de
pré-computar tudo às cegas).

**Esforço:** grande (1-2 semanas). É a etapa com mais decisões de arquitectura em aberto — vale a
pena decidir DuckDB vs. MySQL materializado ANTES de estimar com mais precisão.

**Risco:** alto. Nova dependência de runtime (DuckDB precisa de correr em Node no cPanel —
confirmar que o hosting actual suporta o binário nativo antes de comprometer esta escolha, dado
que já tivemos esta sessão inteira de fricção só para correr `next build`/`node` no cPanel).

---

## Etapa 5 — Achados pré-calculados

**Não existe** como pré-cálculo. `ctx.avisos` e a família Moran/LISA/Gi*/Geary já existem como
*métodos que a pergunta pode pedir* (catálogo em `lib/analysis/library/index.ts`), mas correm a
pedido, não offline. A "Descoberta" proactiva foi explicitamente removida nesta sessão anterior
(Opus + raciocínio prolongado, era a etapa mais lenta) — reintroduzi-la como pré-cálculo offline
(em vez de chamada LLM síncrona) é coerente com essa decisão anterior, não uma reversão dela.

**Esforço:** médio-grande (3-5 dias), depende da etapa 4 estar pronta (os achados leem do cubo).

**Risco:** médio.

---

## Etapa 6 — Resolução determinística de entidades (sem LLM)

**Parcialmente existe:** topónimos já resolvem sem LLM (`ligarValoresAUnidades`/`normalizar`).
Períodos ("desde o Idai") só são interpretados pelo Compreensão (LLM) — não há regex/dicionário
determinístico à parte. Métricas e "por província"→admin1 são decididas pelo Planeamento (LLM),
não por um dicionário prévio.

**Falta:** o essencial do documento — mover isto para ANTES da primeira chamada LLM, para reduzir
o que o modelo precisa de decidir. Alto retorno: é a etapa que mais reduz tokens de entrada e
elimina uma fatia real de erros de planeamento (ex.: o bug desta sessão só apareceu porque o
Planeamento tinha de "adivinhar" se havia geografia — com resolução determinística prévia, o plano
já chega com "isto é uma pergunta admin1, o dataset liga a admin3" resolvido, sem ambiguidade).

**Esforço:** médio (2-3 dias).

**Risco:** baixo.

---

## Etapa 7 — Chamada única de planeamento (Haiku, saída estruturada) + validação

**Existe parcialmente ao contrário:** há saída estruturada (JSON Schema) em todas as 4 chamadas
actuais, mas são 4 chamadas, não 1, e Planeamento usa Sonnet (mais lento/caro), não Haiku — foi
subido de Haiku para Sonnet nesta sessão anterior precisamente porque a qualidade do plano com
Haiku não chegava. Fundir Compreensão+Planeamento+Suficiência numa única chamada é possível mas
arriscado para a qualidade do plano; a via mais segura é reduzir de 4 para 2 chamadas primeiro
(fundir Compreensão dentro do Planeamento, já que Compreensão é pequena e rápida) e medir, antes
de arriscar 1 chamada só em Haiku.

**Esforço:** médio (2-3 dias) + tempo de validação de qualidade (comparar planos antes/depois em
perguntas reais, não só latência).

**Risco:** médio-alto para a qualidade das respostas, se se forçar Haiku cedo demais. Latência e
qualidade estão em tensão directa aqui — a etapa com mais probabilidade de precisar de mais do que
uma iteração.

---

## Etapa 8 — Execução paralela + streaming SSE

**Existe:** streaming SSE já funciona (`app/api/analise/route.ts`), com eventos
`estagio_inicio`/`plano_pronto`/`passo_fim`/`calc_pronto`/`concluido` — a estrutura de eventos do
documento já está, na prática, implementada. O que falta é paralelismo: hoje os passos do plano
correm em `for` sequencial (`pipeline.ts`, secção 5), e Narrativa espera todos os passos acabarem.

**Falta:** paralelizar passos independentes do plano (`Promise.all` em vez do `for` actual — a
maioria dos passos não depende uns dos outros, só a narrativa depende de todos), e paralelizar
Narrativa/DashboardSpec/achados como o documento propõe (composição do dashboard já existe como
etapa separada em `compositor.ts`, dá para paralelizar com a narrativa).

**Esforço:** pequeno-médio (2 dias) — a estrutura de eventos não muda, só a ordem de execução.

**Risco:** baixo-médio. Paralelizar passos que hoje assumem ordem implícita (ex.: um passo que lê
`ctx.enriquecimentoPopulacao` preenchido por um passo anterior) precisa de revisão caso a caso.

---

## Etapa 9 — R3: objecto único de resultados, remover fetch dos componentes

**Já está feito**, na prática — confirmado nesta inspecção. `ctx.calcs`/`ctx.series`/`ctx.graficos`
são a única fonte, persistidos uma vez, lidos pelo dashboard e pela narrativa sem fetch
independente por componente. Não identifiquei nenhum componente do dashboard a fazer fetch de
dados próprios (os fetches que existem em componentes client são de metadados de UI — preview de
catálogo, thumbnails — não de resultados de análise).

**Esforço:** nenhum, ou muito pequeno (auditoria de confirmação, não mudança de código).

**Risco:** nenhum.

---

## Etapa 10 — Testes de CI (calc_id e alucinação numérica)

**Existe parcialmente:** `resolverNarrativa`/`TokenPorResolverError` (`lib/analysis/render.ts`) já
valida em RUNTIME que todo `{{calc:id}}` citado existe, e força uma segunda chamada de correcção
se não existir — isto é o R1 a funcionar, mas como validação em produção, não como teste
automático no CI.

**Falta:** o teste de CI propriamente dito — correr um conjunto fixo de perguntas contra datasets
de teste e falhar o build se algum número aparecer fora de um `{{calc:}}` resolvido, ou se algum
`calc_id` do `DashboardSpec` não existir em `resultados`.

**Esforço:** pequeno-médio (1-2 dias) — a validação já existe, só falta empacotá-la como suite de
CI com casos fixos.

**Risco:** baixo.

---

## Etapa 11 — Via profunda em background

**Não existe.** A "Descoberta" (Opus + raciocínio prolongado) e a "Crítica adversarial" (Opus +
raciocínio prolongado) foram removidas do pipeline síncrono nesta sessão anterior por serem as
etapas mais lentas. Reintroduzi-las como enriquecimento assíncrono pós-resposta (que já é o padrão
usado para enriquecimento externo com `fontes_externas`) é directamente reaproveitável — o
mecanismo de "análise já publicada, blocos a chegar depois" ainda não existe (hoje é tudo ou nada,
uma análise só fica "pronta" quando o pipeline inteiro termina), mas o precedente de emitir eventos
incrementais via SSE já está estabelecido.

**Esforço:** grande (1 semana+) — depende de decidir como uma análise "já publicada" recebe
actualizações depois (nova coluna de estado, novo evento SSE tipo `aprofundado`, e o frontend
precisa de saber re-renderizar um dashboard já montado).

**Risco:** médio-alto. É a etapa que mais muda o modelo mental de "análise = operação síncrona que
acaba" para "análise = objecto que continua a mudar depois de publicado".

---

## Etapa 12 — Via agêntica com ferramentas

**Não existe.** Hoje o plano é fixo depois do Planeamento — não há loop de ferramentas nem
reformulação a meio da execução. O catálogo de métodos (`lib/analysis/library/index.ts`) já é,
essencialmente, o "catálogo de ferramentas" que um agente chamaria — a peça em falta é o loop em
si (Tool Runner da SDK da Anthropic, não escrito à mão).

**Esforço:** grande (1-2 semanas), só depois das etapas 4-6 estarem estáveis (um agente sobre um
cubo pré-computado é muito mais seguro do que um agente com `executar_sql`/`executar_python` livre
sobre dados brutos).

**Risco:** alto. Maior superfície de ataque (execução de SQL/Python gerado por LLM), maior
variância de custo/latência por análise.

---

## Etapa 13 — Reprocessar datasets existentes

**Depende inteiramente da etapa 2** (geo-spine na ingestão) estar implementada. Script único,
correr uma vez sobre os ~40 datasets do portal.

**Esforço:** pequeno depois da etapa 2 estar pronta (meio dia + tempo de execução).

**Risco:** baixo, desde que corra em ambiente de teste primeiro e se compare a taxa de
correspondência antes/depois por dataset.

---

## Ordem de implementação recomendada (revista)

A ordem da secção 12 do documento original está correcta na intenção, mas as etapas 9 (já feita)
e partes da 1/2 (já existem) mudam o que dá mais retorno imediato. Proposta:

1. **Etapa 6** (resolução determinística) — maior redução de erro por esforço, não depende de mais nada.
2. **Etapa 8** (paralelização) — maior redução de latência por esforço, não depende de mais nada.
3. **Etapa 1** (completar `geo_unidades`: região, dicionário de variantes) — pequeno, desbloqueia a 2.
4. **Etapa 2** (mover geo-spine para a ingestão) — maior mudança estrutural da Falha B.
5. **Etapa 3** (dimensões/métricas derivadas) — pequeno-médio, sobre o resultado da 2.
6. **Etapa 7** (reduzir de 4 para 2 chamadas LLM; só depois avaliar 1) — com cautela de qualidade.
7. **Etapa 10** (testes de CI) — formalizar o que já existe em runtime.
8. **Etapa 4** (cubo) — a maior decisão de arquitectura; só depois de 1-7 estabilizarem e medirmos
   se a latência já está aceitável sem o cubo (pode ser que não seja necessário no curto prazo).
9. **Etapa 5** (achados pré-calculados) — depende de 4.
10. **Etapa 13** (reprocessar datasets) — depende de 2.
11. **Etapa 11** (via profunda em background) — depois do síncrono estar rápido e correcto.
12. **Etapa 12** (via agêntica) — última, maior risco.

Testes de fumo da secção 13 do documento: correr no fim das etapas 4 (resolução determinística +
paralelização), 6 (geo-spine na ingestão completo) e 9 (cubo), não 4/8/12 como no plano original —
os números da secção 12 mudaram de posição nesta revisão.

---

## Latência actual (linha de base)

Medida nesta sessão anterior, testes reais pagos contra o pipeline actual (sem as correcções desta
sessão de hoje, que ainda não mudam a latência — só a correcção do "nome_max" geográfico, que é
grátis em tempo):

| Cenário | Duração total |
|---|---|
| Antes de qualquer optimização (thinking prolongado, Opus em Planeamento/Narrativa/Descoberta/Crítica, `fontes_externas` implícito) | 751,9 s |
| Depois de: remover Descoberta/Crítica, desligar `fontes_externas` por omissão, trocar Opus→Sonnet/Haiku por etapa, remover raciocínio prolongado, apertar limites de verbosidade do prompt | 97,5 s |

Decomposição por etapa (medida via logging temporário nos testes anteriores, com
`fontes_externas` desligado):
- Compreensão: poucos segundos (Haiku, prompt pequeno).
- Suficiência: ~5,6 s (Haiku).
- **Planeamento: 57-75 s** (Sonnet, sem raciocínio prolongado, mas o maior consumidor de tempo).
- **Narrativa: ~41 s** (Sonnet).
- Execução dos passos: variável por plano, tipicamente alguns segundos no total (agregação em
  memória, sem chamadas de rede).

Meta do documento (P50 ≤ 15 s) está a **~6,5×** de distância do estado actual optimizado (97,5 s),
não a partir do pior caso (751,9 s). Planeamento e Narrativa, as duas chamadas Sonnet, são
responsáveis por ~95% da duração — é exactamente aí que a paralelização (etapa 8) e a redução de
chamadas (etapa 7) têm de incidir primeiro para haver alguma hipótese de aproximar a meta sem o
cubo pré-computado (etapa 4) estar pronto.

Não corri uma nova medição ao vivo para este documento (evitar gastar uma chamada paga só para
confirmar um número já medido há poucas horas, no mesmo código) — se quiseres um número fresco
antes de aprovar o plano, digo já como correr o teste.
