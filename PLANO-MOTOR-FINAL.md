# Plano final pré-lançamento: motor rápido, sem falhas, e que aprende sozinho

Este é o último plano antes do lançamento oficial do AI Insights. Junta três pedidos numa coisa só:
tempo mínimo possível, zero falhas, e um motor que melhora com o uso. Não substitui o
`PLANO-INTELIGENCIA-PRO-MAX.md` (esse continua válido para funcionalidades futuras); este plano é
sobre fechar o que falta para poder dizer "está pronto para o público".

## 0. O que já foi corrigido nesta sessão (ponto de partida, não repetir)

Antes de propor mais nada, o estado real depois dos testes de hoje:

- **Corrigido**: timeout de 5 minutos do Node (`server.js`) que cortava análises longas em produção
  sem nenhum erro visível.
- **Corrigido**: heartbeat SSE a cada 15s para o proxy do cPanel não cortar a ligação por
  inactividade.
- **Corrigido**: condição de corrida em que o browser navegava para `/analise/{id}` antes do
  resultado estar gravado na base de dados, mostrando "não foi publicada" numa análise que na
  verdade tinha corrido com sucesso.
- **Corrigido**: perguntas com vários critérios simultâneos esgotavam o tecto de tokens do
  planeamento (subiu de 12000 para 20000, mais uma instrução no prompt a limitar o plano a 5
  sub-perguntas e 12 passos).
- **Corrigido**: quando dois datasets seleccionados têm níveis geográficos nativos diferentes (ex.:
  um só tem dados por província, outro por distrito), o motor já não falha a pergunta inteira; passa
  a responder ao nível mais fino em comum, com o motivo explicado no título.
- **Ainda por confirmar**: o gráfico de comparação de garantia (instrução nova no prompt, ainda não
  verificada em execução real) — é o primeiro item de teste antes de qualquer coisa deste plano
  avançar.

## 1. Diagnóstico honesto do tempo, com números reais desta sessão

Não vale a pena prometer um número redondo sem mostrar de onde ele vem. Os tempos medidos nos testes
de hoje, por etapa:

| Etapa | Modelo | Duração observada | Obrigatória? |
|---|---|---|---|
| Planeamento | Sonnet | 90s a 185s (varia com a complexidade da pergunta) | Sempre |
| Suficiência | Haiku | 7s a 11s | Sempre |
| Narrativa | Sonnet | 40s a 65s | Sempre |
| Crítica | Opus + raciocínio prolongado | 110s a 156s | Condicional (já reduzida hoje) |

Mínimo físico de uma análise completa, mesmo sem Crítica: cerca de 140-260s (2,5 a 4,5 minutos),
porque são três chamadas sequenciais ao modelo que não podem correr em paralelo (cada uma precisa
do resultado da anterior). Isto não é um bug; é o preço de um motor que raciocina de verdade em vez
de responder de memória. Nenhuma optimização de código reduz isto para 30s sem cortar profundidade
nalgum sítio.

**Conclusão**: um tecto universal de 30s para qualquer pergunta, com a mesma profundidade de
raciocínio, não é possível. A resposta certa não é forçar o motor completo a ser mais rápido; é
dar duas experiências genuinamente diferentes, como pedido.

## 2. A escolha do utilizador: Resposta Rápida vs Dashboard Completo

Antes de correr a análise, o utilizador escolhe (ecrã de `NovaAnaliseClient.tsx`, ao lado do botão
"Analisar"):

### Modo Resposta Rápida (alvo: até 30s, texto sem dashboard)

Um caminho deliberadamente mais curto, não o pipeline completo com pressa:

1. **Uma só chamada ao modelo** (Sonnet, sem raciocínio prolongado) que faz compreensão + plano
   reduzido + narrativa num único pedido — hoje são três chamadas separadas (planeamento, narrativa,
   e por vezes crítica); aqui é uma.
2. **Catálogo restrito**: só os métodos mais rápidos e mais frequentes (`resumo_estatistico`,
   `comparar_grupos`, `distribuicao_categoria_geo`, `perfil_coluna`) — sem geoestatística avançada
   (Moran, Getis-Ord), sem `execucao_codigo`, sem enriquecimento externo. Se a pergunta genuinamente
   precisar de um destes, o modo Rápido di-lo explicitamente ("Esta pergunta precisa do Dashboard
   Completo para responder com rigor") em vez de forçar uma resposta pobre.
3. **Sem Suficiência, sem Crítica, sem Descoberta**: a honestidade sobre lacunas (R1, R8) mantém-se
   dentro da própria narrativa (o modelo continua obrigado a declarar o que não sabe), só que sem a
   chamada extra dedicada a verificar isso — é o mesmo compromisso de qualidade do "Não escrevas
   código de execução" da Suficiência, só que fundido na única chamada.
4. **Um único cálculo em destaque + 1-2 números de apoio**, sem gráfico, sem mapa. Continua sujeito a
   R1: todo número vem de um cálculo real, nunca inventado só porque o modo é rápido.
5. **Reaproveita a memória de planos (`memoria.ts`) sempre que possível**: se já existe um plano
   validado para uma pergunta parecida sobre os mesmos datasets, pula direamente para executar esse
   plano reduzido em vez de gerar um novo — isto é o que aproxima mais de facto dos 30s, porque
   elimina a chamada de planeamento por completo nesse caso.

Tempo estimado honesto: 15-30s quando há plano em cache reaproveitável; 35-50s numa pergunta nova
sem precedente (ainda assim menos de metade do modo completo). Isto fica escrito na UI como
"normalmente sob 30s", nunca como garantia absoluta — a mesma honestidade que já se aplica aos
números da análise aplica-se ao tempo de resposta.

### Modo Dashboard Completo (o pipeline actual, sem pressa)

Sem alterações ao raciocínio: continua com Suficiência, Enriquecimento, Execução completa, Crítica
condicional, mapas e gráficos. É o modo para quando a pergunta importa a sério e o utilizador quer
profundidade, não velocidade. Tempo esperado: 2,5 a 8 minutos, dependendo da complexidade — e isto
fica dito na UI antes de o utilizador escolher ("Análise completa: normalmente 3 a 8 minutos"), para
nunca ser surpresa.

### Implementação

- `app/api/analise/route.ts` recebe um novo campo `modo: 'rapido' | 'completo'`.
- Novo `lib/analysis/pipeline-rapido.ts`, irmão de `pipeline.ts`, não uma variante com `if`s
  espalhados dentro do pipeline actual — mantém os dois caminhos simples de raciocinar e de testar
  em separado.
- Novo prompt `PROMPT_RAPIDO` em `prompts.ts`, com o catálogo reduzido e a instrução explícita de
  recusar (dizer para usar o Dashboard Completo) quando a pergunta não cabe no catálogo restrito, em
  vez de forçar uma resposta fraca só para caber no tempo.
- UI: dois botões lado a lado antes de "Analisar", cada um com o tempo esperado escrito por baixo.

## 3. Zero falhas: o que ainda falta, além do que já foi corrigido hoje

"Zero falhas" não pode significar "nunca aparece um erro técnico" (impossível de garantir a 100% com
uma API externa) — significa "o utilizador nunca vê um ecrã de falha crua; recebe sempre alguma
resposta honesta". Isto já está parcialmente resolvido (`registarFalhaDegradada`), mas falta:

1. **Retentativa com plano simplificado, não só repetição igual**: hoje, quando o pipeline falha
   duas vezes, tenta exactamente o mesmo duas vezes (`MAX_TENTATIVAS_PIPELINE = 2` em `route.ts`).
   Se a causa foi um plano grande a mais (como aconteceu hoje), repetir o mesmo plano falha outra
   vez pela mesma razão. Corrigir: na segunda tentativa, forçar o modo Rápido (catálogo reduzido)
   como rede de segurança em vez de repetir o modo Completo tal e qual.
2. **Taxonomia de erro estruturada**: hoje os erros ficam em `logger.error` como texto livre. Criar
   uma tabela `analise_falhas` (analise_id, etapa, tipo_erro, mensagem, tentativa, criado_em) grava
   cada falha de forma consultável — é a base de dados de que o item 6 (melhoria contínua) precisa
   para funcionar a sério, em vez de depender de alguém ler logs manualmente.
3. **Circuit breaker para a API da Anthropic**: se a API estiver com problemas (sobrecarga, rate
   limit persistente), hoje cada utilizador espera o tempo completo de retentativas antes de saber
   que vai falhar. Um contador simples (falhas nos últimos 5 minutos) que, acima de um limiar, avisa
   logo "o serviço de IA está temporariamente indisponível, tente daqui a alguns minutos" em vez de
   fazer esperar 5 minutos para chegar à mesma conclusão.
4. **Testes de fumo antes de cada deploy**: um pequeno script (`scripts/testar-analise.ts`) que corre
   3-5 perguntas fixas (uma simples, uma comparativa, uma com datasets de granularidade diferente)
   contra o ambiente antes de qualquer deploy de produção declarar sucesso — apanha regressões como a
   de hoje (schema `maxItems` a quebrar a chamada) antes de chegar ao utilizador real.

## 4. Fontes externas: o que existe e o que reforçar

Hoje (`lib/analysis/enriquecimento-externa.ts`): o modelo usa `web_search`/`web_fetch` da Anthropic
só quando o utilizador pede explicitamente (`fontes_externas: true`), porque uma chamada pode levar
até 150s. Cada resultado externo entra como `enriquecimento_externo` na proveniência do cálculo, com
URL e título — nunca um número sem fonte citável (mesma regra R1, aplicada a fontes fora do portal).

Reforços antes do lançamento:

1. **Lista preferencial de domínios de confiança** (INE Moçambique, Banco Mundial, USAID, HDX, ONU,
   Governo de Moçambique): instruir o modelo a preferir estas fontes sobre resultados genéricos de
   pesquisa, e a declarar explicitamente quando a fonte não é institucional.
2. **Cache de resultados externos**: se duas pessoas perguntarem por "população de Moçambique 2024"
   com semanas de diferença, hoje cada uma paga a pesquisa completa outra vez. Guardar
   `(pergunta_normalizada, resultado, data)` com validade de alguns meses reduz custo e tempo sem
   comprometer a veracidade (a fonte e a data continuam visíveis).
3. **Verificação de URL viva**: antes de aceitar um resultado de `web_search` como fonte citável,
   confirmar que o URL responde (não é um link morto ou alucinado) — falha rara mas real de
   ferramentas de pesquisa por IA, e citar uma fonte que não existe é pior do que não citar nenhuma.

## 5. Aprendizagem: o que existe, o que é falso-aprender, e o que evoluir

**O que já existe** (`lib/analysis/memoria.ts`): quando uma análise passa pela Crítica sem objecção
grave, o plano fica guardado. Uma pergunta nova sobre os mesmos datasets é comparada por
sobreposição de palavras-chave (Jaccard, sem embeddings) com perguntas já respondidas; se a
semelhança passar de 35%, o plano antigo entra como exemplo few-shot no prompt de planeamento. Isto
é real e funciona, mas é limitado: "potencial eléctrico" e "acesso a electricidade" partilham zero
palavras exactas, por isso não se reconhecem como parecidas apesar de serem a mesma pergunta.

**Evolução 1 (a que mais vale a pena)**: trocar a comparação por palavras-chave por embeddings
semânticos. Precisa de um fornecedor de embeddings (não há nenhum integrado hoje) — a API da
Anthropic não tem endpoint de embeddings próprio, por isso isto exige escolher e integrar um serviço
externo (ex.: Voyage AI, que é o parceiro recomendado pela Anthropic para isto). Sem esta peça, a
memória fica sempre a reconhecer só semelhança de vocabulário, nunca de significado.

**Evolução 2**: biblioteca de planos curada por arquétipo, não só por semelhança individual. Hoje
cada plano guardado é um caso isolado; agrupar por arquétipo (comparativo, temporal, geoespacial,
ranking) e manter o plano mais bem-sucedido de cada grupo como exemplo canónico dá exemplos few-shot
mais fortes do que o primeiro que calhou passar no limiar de 35%.

**O que NÃO é aprendizagem, para ser honesto sobre isto**: nada disto treina ou ajusta o modelo
Claude em si. É retrieval (encontrar um exemplo parecido e mostrá-lo no prompt), não aprendizagem
no sentido de rede neuronal a mudar pesos. Isto é a diferença certa a fazer: fine-tuning de um
modelo de uso geral para um caso tão específico não compensaria o custo nem o risco, e o retrieval
já dá a maior parte do benefício prático (respostas mais consistentes, planos já testados como
ponto de partida) sem essa complexidade.

## 6. Melhoria contínua "sozinha": o que é seguro automatizar, e o que exige uma pessoa

Isto é o ponto onde é preciso ser directo: um motor que reescreve os seus próprios prompts ou código
sem supervisão, num portal público de dados oficiais, é um risco real — uma "melhoria" mal avaliada
pelo próprio sistema pode introduzir exactamente o tipo de erro que a Constituição do motor (R1-R12)
existe para prevenir, e ninguém dá por isso até um número errado já estar publicado. Por isso a
versão segura de "melhora sozinho" não é "reescreve-se sozinho"; é **detecta e reporta sozinho, uma
pessoa decide e aplica a correcção**. Isto ainda é uma melhoria enorme sobre o estado actual (nada
disto existe hoje) e é o que se pode automatizar com confiança:

1. **Suite de regressão automática, corrida sozinha todas as semanas**: um conjunto de 15-20
   perguntas reais (tiradas do histórico de `analises`, escolhidas por cobrirem os arquétipos
   principais) corre sozinha contra o motor (ex.: `CronCreate` semanal), grava tempo, se falhou ou
   não, e um resumo do resultado. Compara contra a corrida da semana anterior e assinala qualquer
   pergunta que passou a falhar ou piorou de forma clara.
2. **Painel de tendências de falha para o administrador** (extensão da tabela `analise_falhas` do
   item 3): que tipos de pergunta falham mais, que etapa falha mais, se está a piorar ou a melhorar
   ao longo do tempo. É o mesmo princípio do painel de "Uso de IA" já existente, mas focado em
   qualidade e falhas em vez de volume de uso.
3. **Relatório semanal automático** (e-mail ou notificação no admin) resumindo: perguntas mais
   frequentes da semana, perguntas que falharam e porquê, sugestões geradas automaticamente de que
   tipo de dataset ou método faria essas perguntas passarem a funcionar (isto pode ser uma última
   chamada ao próprio Claude, pedindo-lhe para analisar os avisos acumulados e sugerir — não
   implementar — melhorias ao catálogo ou aos prompts).
4. **A pessoa (a equipa do portal) revê o relatório e decide o que implementar** — exactamente como
   esta sessão resolveu os bugs de hoje: um problema real identificado, uma correcção específica,
   testada antes de ir para produção. O que muda é que a detecção passa a ser automática e contínua,
   em vez de depender de um utilizador reportar um print de ecrã.

Isto entrega o espírito do pedido (o motor melhora com o uso, sem depender só de alguém notar um
problema por acaso) sem o risco de um sistema a alterar-se a si próprio sem supervisão humana num
produto que publica dados oficiais.

## 7. Ordem de implementação e critério de "pronto para lançar"

**Fase A (imediata, antes de mais nada)**: confirmar que o gráfico de fallback (secção 0) funciona
de facto, com uma nova bateria de testes das perguntas já sugeridas nesta conversa. Sem isto
resolvido, nenhuma fase seguinte deve avançar.

**Fase B (fiabilidade, secção 3)**: retentativa com modo Rápido como rede de segurança, tabela
`analise_falhas`, circuit breaker, script de testes de fumo pré-deploy. Isto é o que torna
"zero falhas" uma garantia real, não uma esperança.

**Fase C (os dois modos, secção 2)**: `PROMPT_RAPIDO`, `pipeline-rapido.ts`, UI de escolha. É a
maior peça de trabalho novo deste plano; testar os dois modos lado a lado com as mesmas perguntas
antes de expor ao público.

**Fase D (fontes externas, secção 4)**: lista de domínios preferenciais, cache, verificação de URL.
Pode correr em paralelo à Fase C, é independente.

**Fase E (aprendizagem e melhoria contínua, secções 5 e 6)**: começa pela suite de regressão semanal
e pelo painel de falhas (mais simples, mais valor imediato); embeddings semânticos só depois, porque
exige escolher e pagar um fornecedor externo — decisão que vale a pena tomar com dados reais de uso
já acumulados pelas fases anteriores, não às cegas.

**Critério de "pronto para lançar"**: Fases A e B completas e verificadas com testes reais (não só
compilação limpa), Fase C com os dois modos a funcionar e testados, sem nenhuma falha crua repetida
nos testes de fumo. Fases D e E podem continuar depois do lançamento — não bloqueiam o "está pronto
para o público", porque já hoje o motor responde com honestidade mesmo sem elas; só ficam mais
rápidas, mais baratas e mais espertas com o tempo.
