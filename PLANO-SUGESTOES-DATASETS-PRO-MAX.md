# Plano Pro Max: Sugestões de Datasets

A versão actual (Fases 1-4) só agrega e cruza dados internos. Falta: inteligência real (pesquisa
externa), evidência visual (KPIs, gráficos, tendência ao longo do tempo) e um caminho directo entre
"vimos o sinal" e "criámos o dataset".

## O que entra nesta versão

1. **Tendência ao longo do tempo**: guardar a data original de cada pergunta classificada (não só a
   data de classificação) para desenhar um mini-gráfico semanal por tema, mostrando se a procura por
   aquele tema está a crescer, estável ou a esmorecer. Sem isto, "12 perguntas sobre turismo" não diz
   se aconteceu em uma semana ou em seis meses.

2. **KPIs no topo da página**: total de perguntas classificadas, número de sugestões activas, e
   percentagem de temas já cobertos no catálogo. Dá contexto imediato sem ler tabela nenhuma.

3. **Enriquecimento por pesquisa externa (Sonnet + web search)**: por sugestão, sob pedido explícito
   do admin (nunca automático), pesquisa fontes reais na internet sobre o tema em Moçambique e devolve
   nível geográfico sugerido, um resumo curto e uma lista de fontes com título e URL reais (nunca
   inventadas: só o que a pesquisa devolveu). Continua rotulado "a confirmar" — pesquisa externa não é
   validação humana, só reduz o trabalho de quem vai validar.

4. **Atalho para criar o dataset**: botão "Criar dataset a partir desta sugestão" que abre
   Cadastrar Dados já com título, tipo (geo/alfa) e palavras-chave preenchidos.

5. **Limpeza de estilo**: sem travessões em texto visível; ícone de estrelas (Sparkles) substituído por
   ícones que já existem no resto do admin (Lightbulb, TrendingUp, Search).

## O que fica fora (por agora)

- Gráficos com biblioteca externa: usa-se SVG simples já usado no resto do admin, sem nova dependência.
- Pesquisa externa automática em lote: fica sempre por sugestão, sob pedido, para controlar custo.
