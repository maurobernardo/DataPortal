# Plano DataProPROMAX: motor de raciocínio sobre dados, não só de procura de colunas

Este plano responde à visão completa recebida do utilizador (granularidade geográfica
automática, derivação de indicadores implícitos, cruzamento robusto entre datasets, dashboard
adaptativo, sistema de confiança). Antes de propor trabalho novo, a análise abaixo verifica o que
já existe no código — parte significativa da visão já está construída, só não estava documentada
nem visível de fora. Propor reescrever isso seria desperdício; o plano foca-se no que falta de
verdade.

## Parte 1 — Análise: o que já existe vs. o que falta

### 5. Hierarquia geográfica automática — **já construído**

`lib/analysis/dados.ts:agregarPorUnidade()` já sobe a hierarquia (distrito → província → país)
truncando o pcode (2 dígitos = província, 4 = distrito, 6 = posto administrativo) — é
literalmente o diagrama da secção 5 do pedido, já em produção. A correcção feita nesta sessão
(prompt de planeamento) já cobre o caso descrito na secção 2 ("dataset por distrito, pergunta por
província" e o inverso): quando dois datasets têm granularidade nativa diferente, o plano usa o
nível mais grosso comum em vez de falhar. **Falta**: isto corre bem quando o nível pedido é mais
grosso do que os dados (agregar para cima); não desce (distrito a partir de província) porque essa
informação não existe nos dados — nenhum sistema consegue inventar isso, é um limite honesto, não
um bug.

### 6. Agregação inteligente (soma/média/máx/mín/contagem) — **já construído**

`agregarPorUnidade()` já implementa `'soma' | 'media' | 'contagem'`; máximo/mínimo já são
resolvidos pelo executor sobre o resultado agregado (R4 do catálogo). **Falta**: um modo de
"média ponderada" como opção de primeira classe. Hoje a correcção é uma REGRA DE PROMPT (já
existe em `prompts.ts`, regra 11: "a média das taxas de 10 províncias não é a taxa nacional,
agregar somas brutas antes de dividir") — funciona, mas depende do modelo lembrar-se de a aplicar
a cada plano. Vale a pena tornar isto um parâmetro determinístico do método em vez de uma
instrução textual (ver Fase 1 abaixo).

### 7. Derivação de indicadores implícitos (taxa, densidade, produtividade) — **parcialmente construído**

`normalizacao: 'densidade_km2' | 'per_capita' | 'por_1000' | 'percentagem_do_total'` já cobre os
três exemplos dados no pedido (densidade populacional, taxa de acesso, produtividade é uma razão
entre duas colunas quaisquer). Para razões entre duas colunas arbitrárias que não são
população/área, existe `execucao_codigo` — mas está descrito no catálogo como "último recurso,
deve ser raro", não como um módulo central. **Falta**: um método de catálogo dedicado
`razao_entre_colunas` (coluna_metrica ÷ coluna_metrica_2, com validação de unidades) para o caso
comum "taxa de X" / "produtividade de Y" não precisar de passar pelo caminho lento e caro de
`execucao_codigo`.

### 8, 11, 23. Cruzamento entre datasets, "cross-dataset reasoning" — **construído, com uma lacuna real**

`juntar_datasets` já existe, já identifica a chave geográfica comum, já normaliza nomes
(`resolverUnidadePorNome`), já produz um dataset sintético combinado para os passos seguintes
lerem — é exactamente o pipeline descrito na secção 8 e a política da secção 23 ("nunca analisar
separadamente quando a pergunta exige resposta conjunta"). **A lacuna real, confirmada por teste
nesta sessão**: quando a junção falha (granularidade incompatível, nomes sem correspondência
suficiente), o plano não tem sempre um gráfico de fallback garantido — já foi parcialmente
corrigido via prompt, mas não verificado em execução real ainda (ver Pendências).

### 9. Cruzamento geoespacial (point-in-polygon, overlay, intersecção) — **parcial, gap conhecido**

Point-in-polygon (E1) e ponto representativo para linhas/polígonos já existem
(`lib/analysis/geo-join.ts`). Polygon overlay e intersecção geométrica exacta **não existem** —
isto já estava identificado em `PLANO-INTELIGENCIA-PRO-MAX.md` (Pilar 2) antes deste pedido. É o
gap mais genuíno e mais caro de fechar de toda a lista: exige uma biblioteca de geometria
computacional (Turf.js é a candidata já registada nesse plano) e é trabalho novo a sério, não uma
correcção.

### 10. Normalização geográfica (acentos, maiúsculas, abreviações) — **já construído**

`dados.ts` já remove acentos, normaliza para minúsculas, e tem um caso especial para "Maputo
Cidade"/variantes. `ligarValoresAUnidades()` devolve `taxa_correspondencia` (% de nomes que
encontraram correspondência) — é literalmente a métrica de qualidade de join que a secção 13 pede.
**Falta**: reconhecimento de nomes históricos e erros de escrita mais distantes (distância de
Levenshtein) — hoje é normalização exacta após limpeza, não fuzzy matching tolerante a erros de
digitação.

### 12, 13. Validação antes da resposta + sistema de confiança — **existe, mas disperso**

A Suficiência (`PROMPT_SUFICIENCIA`) já valida cobertura por sub-pergunta e produz
`confianca_sem_enriquecimento`. `ligacao.taxa_correspondencia` já existe por dataset. **O que
falta é juntar isto num painel único**, como o exemplo da secção 13 mostra ("Confiança da
análise: 94%, Entidades correspondentes: 162/162...") — os números já são calculados em pontos
diferentes do pipeline, só nunca foram compostos num bloco visível ao utilizador. Este é um dos
itens de maior valor por menor esforço de todo o plano: não exige cálculo novo, exige composição
e exposição do que já existe.

### 22. Arquitectura (LLM só interpreta, operações determinísticas) — **já é assim**

Isto já é o desenho actual: `lib/analysis/library/*.ts` faz toda a estatística e geoestatística em
TypeScript puro, nunca no modelo. O LLM decide o quê (plano) e escreve a narrativa; nunca calcula
um número. Não há nada para migrar aqui — o pedido descreve a arquitectura que já existe.

### 15-21. Dashboard adaptativo, narrativa rica, sistema de confiança visível — **gap real de produto**

Aqui está o gap genuíno e de maior impacto visível. `compositor.ts` hoje só varia a ORDEM dos
blocos por arquétipo (5 blocos fixos: resposta, mapa, gráficos, o_que_mostram, porque) — não o
CONJUNTO de blocos, nem o tipo de gráfico dentro de cada categoria. O pedido descreve um dashboard
que muda de forma consoante o tipo de pergunta (ranking visual, comparação antes/depois, scatter
com outliers marcados), não só a ordem de secções fixas. Isto é trabalho de design + composição
novo, não uma correcção.

## Parte 2 — O plano de implementação

Ordem por valor/esforço, não pela ordem do pedido original — itens já cobertos pela análise acima
não reaparecem aqui.

### Fase 1 — Fechar as lacunas baratas (alto valor, baixo risco)

1. **Painel de confiança visível** (secção 13): compor num único bloco os números que já existem
   — `confianca_sem_enriquecimento`, `taxa_correspondencia` de cada ligação geográfica, %
   completude do perfil de dataset (já calculado em `lib/analysis/perfil.ts`, desta sessão),
   contagem de valores derivados. Sem cálculo novo, só composição e UI.
2. **`razao_entre_colunas` como método de catálogo** (secção 7): tira o caso comum "produtividade
   de X" / "taxa de Y" do caminho lento de `execucao_codigo`, com validação de unidades
   incompatíveis (ex.: dividir uma coluna em MZN por uma em hectares sem indicação — recusar com
   explicação, não inventar).
3. **Média ponderada como parâmetro determinístico**, não só regra de prompt: `agregarPorUnidade`
   ganha `'media_ponderada'` (soma do numerador ÷ soma do denominador declarado), tornando a regra
   11 do prompt uma garantia de código em vez de uma instrução que o modelo pode esquecer.
4. **Fallback de gráfico garantido quando a junção falha** (retomado do teste desta sessão):
   verificar em execução real se a instrução de prompt já resolve isto ou se precisa de reforço
   por código (um passo de gráfico independente por dataset, sempre presente, não condicional ao
   sucesso da junção).

### Fase 2 — Dashboard adaptativo a sério (secções 15-21)

1. `compositor.ts` deixa de escolher só ordem — passa a escolher também QUAIS blocos existem por
   arquétipo: ranking visual com barras para "ranking", scatter + linha de tendência para
   "correlação", timeline com marcos para "temporal", mapa duplo (dois datasets lado a lado) para
   "cross-dataset geoespacial".
2. Resumo executivo como bloco novo, sempre presente: conclusão principal + maior/menor valor +
   tendência, extraído da narrativa já gerada (sem nova chamada ao modelo — é reformatação do que
   `Narrativa` já produz).
3. KPIs: já existe `FaixaKPIs.tsx` para os números-chave da narrativa; ampliar para incluir
   automaticamente cobertura (% de unidades com dado) e dados ausentes, que já vêm de
   `qualidade`/`avisos` no contexto de execução — não são números novos, é mostrar mais do que já
   existe.

### Fase 3 — Geoestatística completa (secção 9)

Retomar directamente o Pilar 2 de `PLANO-INTELIGENCIA-PRO-MAX.md`: distância/proximidade, buffer +
junção, intersecção geométrica exacta via Turf.js. Este é o único item do pedido que exige uma
dependência nova e trabalho de geometria computacional a sério — isolar como fase própria, testável
sozinha, sem depender das fases anteriores.

### Fase 4 — Normalização geográfica tolerante a erros (secção 10)

Distância de Levenshtein (ou biblioteca equivalente) como segunda tentativa quando a
correspondência exacta falha, com o `taxa_correspondencia` a reflectir honestamente que foi uma
correspondência aproximada, não exacta — nunca esconder isso do utilizador.

### Fase 5 — Bateria de testes de regressão (secção 24)

Já desenhada em `scripts/testar-analise.ts` (desta sessão) como esqueleto; expandir com os casos
concretos pedidos: distrito→província, distrito→país, província+distrito cruzados, dois datasets
com nomes diferentes para a mesma entidade, valores ausentes, períodos diferentes. Corre antes de
qualquer deploy que toque em `lib/analysis/**`.

## O que este plano deliberadamente não promete

- **PostGIS**: avaliado nesta sessão (pergunta directa do utilizador) e descartado por agora — a
  escala de dados actual (datasets até ~162 distritos) não justifica a complexidade de infra
  adicional. Reavaliar só se a Fase 3 (geometria real) mostrar que Turf.js não chega.
- **Python**: mesma avaliação, mesma conclusão — a biblioteca estatística em TypeScript já é
  completa e correcta; não há ganho de trocar de linguagem à escala actual.
- **Reescrever a arquitectura do motor**: a separação "LLM decide, código calcula" (secção 22) já
  é o desenho actual, verificado nesta análise. Não há reescrita a fazer aqui, só extensão.

## Ordem recomendada

Fase 1 primeiro (dias, não semanas — é composição do que já existe). Fase 2 a seguir (o dashboard
adaptativo é o que mais muda a percepção de qualidade por parte de quem usa o portal). Fases 3 e 4
são investimento de infra mais lento, correm em paralelo uma à outra quando começarem. Fase 5
(testes) começa em paralelo com a Fase 1 e cresce com cada fase seguinte — não é um passo final,
é uma rede de segurança contínua.

Este plano não implementa nada por si só — é a base para decidir, item a item, o que avança a
seguir.
