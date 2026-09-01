# Plano: eliminar palavras técnicas residuais + reduzir tempo de análise

Duas frentes independentes, cada uma com fases que não dependem da outra. Nenhuma fase muda a
arquitectura R1 (todo número vem de cálculo real) nem reduz o número de passos que uma pergunta
complexa precisa — só corta tempo morto e texto não traduzido.

## Frente A — palavras técnicas em legendas/mapas/gráficos

### Diagnóstico (o que já ficou resolvido nesta sessão vs. o que falta)
Já corrigido: OBJECTID/FID como métrica, "NaN" a poluir o perfil, "contagem" ambíguo, rótulos
duplicados entre séries. O que continua a aparecer cru:
1. **Nomes de coluna fora do dicionário de `rotularColuna`** — datasets têm nomes idiossincráticos
   (`Ligacao`, `Manut1996`, `ADM1_PT`, campos truncados a 10 caracteres de shapefile) que o
   dicionário fixo actual não cobre e nunca vai cobrir por completo (é uma lista fechada, cada
   dataset novo pode trazer um nome novo).
2. **Valores de categoria não traduzidos** — `traduzirValorCategoria` só tem um dicionário fechado
   para vocabulário OSM; qualquer dataset com códigos próprios (`"Other"`, siglas do IGN/DINAGECA,
   etc.) fica tal e qual.

### Fase 1 — determinístico, imediato (sem custo de modelo)
- Alargar os `sufixosTruncados`/`conhecidos` de `rotularColuna` com mais padrões genéricos de
  shapefile (`_yr`, `_cat`, `_cls`, `_st`, `_ha`, `_km`, `_no`) e o de `traduzirValorCategoria` com
  mais siglas comuns em datasets moçambicanos (INE, DINAGECA, MADER).
- Baixo risco, baixo esforço, mas tecto baixo: nunca vai cobrir 100% porque cada dataset pode ter
  vocabulário novo.

### Fase 2 — enriquecimento por modelo, cacheado por dataset (o que resolve de vez)
Ideia central: **traduzir uma vez por dataset, nunca por análise.** Já existe o mecanismo certo
para isto — `dataset_perfis` (cache por dataset, invalidado só quando o dataset muda).
- Ao calcular o perfil (`lib/analysis/perfil.ts`), para cada coluna cujo nome pareça técnico
  (heurística: maiúsculas+números, abreviatura sem vogais, ou já falha em todos os padrões de
  `rotularColuna`) e para os valores mais frequentes de colunas categóricas que pareçam código
  (siglas, "Other", tudo maiúsculas), faz-se **uma chamada Haiku barata, em lote, uma vez por
  dataset**: "traduz estes nomes de coluna/valores para um rótulo curto em português, sem inventar
  significado que não conste do nome" — e persiste-se o resultado no próprio `PerfilDataset`
  (novo campo `rotulos_traduzidos: Record<string,string>`).
- `rotularColuna`/`traduzirValorCategoria` passam a consultar primeiro este dicionário cacheado
  (se existir para aquele dataset) antes de caírem nos padrões fixos.
- Custo: uma chamada Haiku pequena, uma vez por dataset, nunca por análise — não mexe no tempo de
  nenhuma análise individual depois da primeira vez que esse dataset é usado.
- Falha graciosa: se a chamada falhar ou o dataset não tiver perfil ainda, cai-se nos padrões
  fixos da Fase 1 — nunca bloqueia nem atrasa uma análise à espera disto.

## Frente B — tempo de análise

### Já resolvido nesta sessão (não repetir)
`detectarColunaGeografica` tinha um bug O(n³) que podia nunca terminar em datasets largos (>370
colunas) — corrigido com um tecto de 8 colunas candidatas. Isto sozinho já elimina o pior caso
(minutos/horas → segundos) para qualquer dataset parecido.

### Fase 1 — medir antes de cortar
Sem números reais por estágio, qualquer corte é palpite. Adicionar (já existe `emitir` por
estágio, só falta persistir a duração):
- Guardar `duracao_ms` por estágio (compreensão/planeamento, suficiência, execução, narrativa,
  crítica) em `ctx`/`resultados`, não só o total.
- Depois de 10-20 análises reais, fica claro ONDE o tempo está a ir — sem isto as fases seguintes
  arriscam optimizar o que já é rápido e ignorar o que é lento de facto.

### Fase 2 — cortes de baixo risco (não tocam na qualidade da resposta)
- **Paralelizar o que já é independente**: confirmar que `passosNormais` (já correm em
  `Promise.all`) cobre a maioria dos casos reais; `passosJuncao` corre sequencial antes — se um
  plano tiver 2+ junções independentes entre si, paralelizar também.
- **Cache de perfil mais agressiva**: perfil já é por dataset; confirmar que TODOS os datasets de
  uma análise multi-dataset batem cache na segunda vez (não há razão para recalcular se nenhum
  dataset mudou).
- **Limitar `execucao_codigo` a paralelo quando há mais do que um no mesmo plano** (cada chamada
  sobe/apaga um ficheiro na Files API — se há 2 passos independentes deste tipo, correm em série
  hoje dentro do mesmo `Promise.all` de passosNormais só se já estiverem nesse grupo; confirmar).

### Fase 3 — cortes que trocam velocidade por menos garantia, só se a Fase 1 mostrar que valem a pena
- **Crítica condicional já existe** (só corre com confiança <0.6 ou arquétipo comparativo) — se os
  números da Fase 1 mostrarem que a Crítica (Opus + thinking) é a maior fatia em análises que a
  disparam, considerar um limiar mais alto (correr menos vezes) — mas isto reduz genuinamente a
  auditoria adversarial, por isso só депois de ver os números, não às cegas.
- **Suficiência (Haiku) em paralelo com o início da Execução** para os passos que não dependem do
  resultado da Suficiência — arriscado (Suficiência pode invalidar passos), avaliar caso a caso.

## Ordem recomendada
1. Frente A, Fase 1 (rápido, sem custo).
2. Frente B, Fase 1 (medir) — corre em paralelo com o resto, é só instrumentação.
3. Frente A, Fase 2 (a correcção definitiva das legendas).
4. Frente B, Fase 2 (cortes sem risco).
5. Frente B, Fase 3, só com números da Fase 1 na mão.
