# Plano: perfil de dataset em cache + planeamento informado + resultado ao vivo

Decorre da avaliação de arquitectura "Dataset → Data Processing Engine → Contexto Compacto →
Claude → Dashboard" (conversa desta sessão). Conclusão dessa avaliação: a separação
processamento/raciocínio já existe na prática (`lib/analysis/library/*.ts` já faz toda a
estatística e geoestatística em TypeScript, Claude nunca vê dados brutos); o que falta são três
peças concretas, sem reduzir profundidade nenhuma:

1. Perfil de dataset calculado uma vez e reaproveitado, em vez de recalculado a cada análise.
2. O Planeamento a ler esse perfil em vez de só 3 linhas de amostra.
3. A página de resultado a mostrar os cálculos em tempo real (o protocolo SSE já os emite via
   `calc_pronto` — só não chegavam a aparecer no ecrã), em vez de um spinner até ao fim.

## 1. Perfil de dataset (cache)

Novo módulo `lib/analysis/perfil.ts` + tabela `dataset_perfis` (idempotente, mesmo padrão de
`lib/audit.ts`). Para cada dataset, calculado uma vez e invalidado quando o dataset é actualizado:

- Colunas numéricas: min, máx, média, mediana, desvio-padrão, contagem de nulos, outliers (IQR).
- Colunas categóricas: top 5 valores + contagem, número de categorias distintas.
- Pares de colunas numéricas com correlação forte (|r| > 0.5), pré-calculada.
- Para geoespaciais: nível administrativo da ligação geográfica já detectada (reaproveita
  `ctx.ligacoes`, que já é calculado uma vez por análise — passa a ser calculado uma vez por
  dataset e cacheado).

Chave de cache: `dataset_id` + hash do `updatedAt` do dataset — muda automaticamente quando o
dataset é reprocessado, sem intervenção manual.

## 2. Planeamento informado pelo perfil

`contextoDatasets()` em `pipeline.ts` passa a incluir o resumo do perfil (não os dados brutos) em
vez de/além da amostra de 3 linhas. O Planeamento deixa de gastar tokens e tempo a "descobrir" a
forma dos dados a partir de uma amostra pequena — já sabe as colunas, os tipos, as correlações
fortes, os outliers. Efeito esperado: plano mais rápido e mais informado, sem mudar o que decide,
só o que já sabe de antemão.

## 3. Resultado ao vivo (a peça que ataca directamente "6 minutos de ecrã vazio")

O SSE já emite `calc_pronto` assim que cada valor é calculado — o browser simplesmente não fazia
nada com esse evento. Correcção: `NovaAnaliseClient.tsx` passa a capturar `calc_pronto` e mostrar
os valores a aparecer um a um no ecrã de espera, não só o checklist de passos que já existia. O
utilizador vê números reais a aparecer enquanto o resto do pipeline continua, em vez de olhar para
uma barra de progresso genérica.

## O que NÃO muda

- Nenhum cálculo passa a ser aproximado ou pré-computado de forma genérica sem relação com a
  pergunta — o perfil é só metadados/estatística descritiva para informar o Planeamento, os
  cálculos que respondem à pergunta continuam a ser decididos pelo plano e executados de propósito.
- Suficiência, Narrativa, Crítica: sem alterações.
- Node/TypeScript, sem introduzir Python nem PostGIS (avaliados e descartados por agora — ver a
  análise desta sessão: nenhum ganho real na escala de dados actual).

## Ordem de implementação

1. `lib/analysis/perfil.ts` + tabela `dataset_perfis`.
2. Ligar o perfil a `contextoDatasets()` em `pipeline.ts`.
3. Capturar e mostrar `calc_pronto` em `NovaAnaliseClient.tsx`.
