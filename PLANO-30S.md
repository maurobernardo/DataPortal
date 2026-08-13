# Plano: análise a caber em 30-50s, sem perder qualidade

## Diagnóstico

O motor já foi desenhado para um orçamento de 30-60s por análise (ver `router.ts`, comentário
original da Parte 15: "Trocados para Sonnet, sem raciocínio prolongado, para caber num orçamento
de 30-60s por análise"). O que estourou esse orçamento na sessão anterior foi uma adição minha
de hoje, não uma lentidão pré-existente do motor: quando a Crítica encontrava uma objecção FATAL,
o pipeline passou a fazer uma segunda chamada a Narrativa (reescrever) seguida de uma SEGUNDA
chamada completa a Crítica (Opus + raciocínio prolongado) para verificar a correcção. Isso duplica
exactamente a etapa mais lenta do pipeline nas perguntas onde ela já era mais provável de correr
(comparativas/temporais — precisamente o tipo de pergunta testado).

## Decisão: remover o "loop de reparação", manter tudo o resto

A garantia que importa ("o utilizador tem sempre uma análise, nunca uma página de erro") não
depende de reescrever a narrativa — depende só de nunca bloquear a publicação e de qualquer
objecção sobrevivente virar aviso visível em "O que isto não diz". Os NÚMEROS já são sempre reais
(R1, garantido independentemente da Crítica). O que a reescrita automática acrescentava era só
"o texto fica mais bonito depois de corrigido" — não uma garantia de correcção, porque nada impede
a versão reescrita de ainda ter um problema (daí a segunda chamada a Crítica para verificar, que é
exactamente o que duplicava o tempo).

Por isso: volta-se a uma só chamada a Crítica (como estava antes de hoje), objecções FATAL e
MATERIAL entram directamente em "O que isto não diz" como aviso, sem tentativa de reescrita
automática. Isto:
- Elimina uma chamada a Narrativa (Sonnet) + uma segunda chamada a Crítica (Opus, a mais lenta)
  exactamente no caso que estava a exceder o orçamento.
- Não muda R1, R3, R8, R12 nem o resto da Constituição.
- Não muda o dashboard nem a composição visual — só a rapidez com que a análise fica pronta e o
  facto de o texto da narrativa já não ser reescrito automaticamente quando há uma objecção FATAL
  (fica a versão original, com o aviso anexado, tal como acontecia com as objecções MATERIAL).

## O que NÃO muda (para não perder qualidade)

- Crítica continua condicional (confiança baixa ou pergunta comparativa/temporal), continua em
  Opus + raciocínio prolongado quando corre — a profundidade da revisão não é reduzida.
- R1-R12 mantêm-se exactamente como estão.
- O dashboard, os componentes, a explicabilidade (Fase 6) e a memória (Fase 4) não mudam.

## Se ainda assim uma pergunta muito complexa ultrapassar 50s

Perguntas genuinamente grandes (vários anos, várias províncias, vários indicadores, com
enriquecimento externo) podem legitimamente precisar de mais do que 50s mesmo sem o loop de
reparação — Planeamento, Suficiência, Execução (com vários passos em paralelo) e Crítica somados
têm um mínimo físico. Não há como forçar um tecto rígido de 30-50s para qualquer pergunta sem
reduzir profundidade nalgum estágio (menos raciocínio na Crítica, catálogo mais pequeno no
Planeamento, etc.) — o que o utilizador pediu explicitamente para não fazer. Este plano corrige a
regressão introduzida hoje; não promete um tecto absoluto para qualquer pergunta possível.
