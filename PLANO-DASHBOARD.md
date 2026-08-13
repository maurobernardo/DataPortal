# Plano: dashboards mais ricos (geoespacial + alfanumérico)

Âmbito desta ronda: só dashboards de um único dataset (ou vários do mesmo tipo). Análise cruzada
entre datasets fica para depois, como já combinado.

## Geoespacial

### Bug concreto encontrado: só um mapa aparece, nunca os dois

Em [components/analise/DashboardApresentacao.tsx:366](components/analise/DashboardApresentacao.tsx#L366):

```
{series.length > 0 && camadasBrutas.length === 0 && (
  <AnaliseSerieGeografica ... />
)}
```

Isto é exactamente o problema que descreveste: quando o dataset tem geometria própria
(`camadasBrutas`, ex.: pontos das escolas), o coroplético derivado da pergunta
(`AnaliseSerieGeografica`, ex.: "escolas por província") **nunca aparece** — só o mapa de
pontos brutos, que é visualmente parecido entre perguntas diferentes sobre o mesmo dataset (o que
confirmaste que não é problema).

**Correcção**: mostrar sempre os dois, lado a lado ou empilhados:
1. **Mapa 1 — dataset**: a geometria bruta (`AnaliseMapaPontos`), como já está — mesmo mapa entre
   perguntas diferentes sobre o mesmo dataset, confirmado que está bem assim.
2. **Mapa 2 — resposta à pergunta**: o coroplético derivado (`AnaliseSerieGeografica`), que muda
   consoante a pergunta feita (é o que já constrói `ctx.series` em `executor.ts`, dinâmico por
   construção — só estava a ser escondido pela condição acima).

Mudança de código: remover `&& camadasBrutas.length === 0` da condição, ajustar o layout do grid
principal (hoje é `xl:col-span-7` para o painel do mapa; com dois mapas, considerar duas colunas
menores lado a lado em ecrãs largos, empilhadas em ecrãs estreitos).

### Mais informação por baixo dos dois mapas

- **Legenda/estatística do coroplético já existe** (`AnaliseSerieGeografica` tem painel de área
  seleccionada) — só precisa de ficar visível com o mapa 2 sempre presente.
- **Tabela dos valores por unidade** (província/distrito): hoje só existe visualmente no mapa;
  falta uma tabela ordenável ao lado (nome, valor, % do total) — dá para quem quer o número exacto
  sem ter de passar o rato por cima de cada unidade do mapa.
- **Insights automáticos do mapa** (`GeoInsightsCard`, já existe no componente de detalhe do
  dataset via `computeGeoInsights` em `app/api/datasets/[id]/preview/route.ts`) — não está a ser
  usado no dashboard de análise; vale a pena reaproveitar aqui (extensão, área total, densidade
  média) como um cartão de contexto junto ao mapa 1.

## Alfanumérico

Hoje o dashboard alfanumérico depende inteiramente de quantos `ctx.graficos` o plano gerou — sem
geografia para desenhar um mapa, a única coisa visualmente rica é essa faixa de gráficos, e vimos
hoje que ela pode ficar vazia (0 gráficos nalgumas análises reais testadas). O que falta,
tipicamente, num dashboard de análise de dados tabulares que não pode faltar:

1. **Tabela de dados exploratória sempre visível** (já existe — `TabelaExploratoria` — confirmar
   que aparece sempre para datasets alfanuméricos, não só quando há espaço sobrando).
2. **Distribuição de cada coluna numérica relevante**: histograma ou resumo (min/mediana/max) por
   coluna, não só a métrica que a pergunta pediu directamente — dá contexto ao número principal.
3. **Cartão de qualidade dos dados**: completude por coluna, valores em falta, distintos — já
   existe como cálculo (`perfil_coluna`) mas normalmente fica escondido dentro do texto; merece
   um cartão visual próprio (barra de completude por coluna), sempre presente.
4. **Comparação com período anterior ou média**, quando aplicável — já é regra do Planeamento
   (regra 5), mas vale confirmar que está sempre a aparecer como cartão, não só texto.
5. **Perguntas sugeridas** — já existe (`getSuggestedQuestions`), mantém-se.

## Design (ambos)

- Cabeçalho já está bom (verde, pergunta em destaque, KPIs em flex-wrap) — manter.
- Cards com fundo branco + borda subtil já é o padrão do resto do site — manter consistência, não
  introduzir um novo estilo só para o dashboard de análise.
- Faixa de KPIs: já corrigido nesta sessão (flex-wrap em vez de grid, sem células fantasma).
- Secções que hoje têm pouco conteúdo (`o_que_mostram`, `porque`) já foram alargadas nesta sessão
  no prompt da narrativa — o texto deve crescer organicamente à medida que o motor souber calcular
  mais coisas (ver PLANO-INTELIGENCIA.md), não por padding artificial no prompt.

## Ordem sugerida

1. Corrigir o gate `camadasBrutas.length === 0` (bug concreto, rápido, alto impacto visual).
2. Adicionar tabela de valores por unidade ao lado do mapa 2.
3. Reaproveitar `GeoInsightsCard`/`computeGeoInsights` no dashboard de análise.
4. Cartão de qualidade de dados para alfanumérico (completude por coluna).
5. Confirmar que a tabela exploratória e as secções de texto aparecem sempre, não condicionalmente
   a haver "espaço".

Quando isto estiver pronto e testado, avançamos para análise cruzada de dois datasets.
