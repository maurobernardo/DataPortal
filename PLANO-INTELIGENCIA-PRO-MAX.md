# Plano Pro Max: motor de análise super inteligente, sem abrir mão de R1

Isto é a versão ambiciosa do PLANO-INTELIGENCIA.md — não substitui esse documento, estende-o até
onde a tecnologia hoje disponível permite ir sem comprometer a regra fundamental: **todo número
publicado vem de um cálculo real, reproduzível, sobre os dados reais seleccionados.** "Super
inteligente" aqui significa "capaz de responder correctamente a quase qualquer pergunta que os
dados permitam responder", não "capaz de parecer seguro mesmo quando está a adivinhar".

## A peça central: execução de código real, não só um catálogo fixo

Hoje o motor só sabe responder com os ~20 métodos do catálogo (`resumo_estatistico`,
`comparar_grupos`, `distribuicao_categoria_geo`, etc.). Cada pergunta nova que não encaixa em
nenhum destes vira um "não consigo" — foi exactamente o padrão dos bugs desta sessão. Escrever um
método novo por cada pergunta nova não escala.

**A alternativa real**: dar ao modelo acesso a **execução de código server-side** (a ferramenta de
Code Execution da API da Anthropic — o modelo escreve Python/JS, corre num sandbox controlado pela
Anthropic, e o resultado volta como saída real de execução, não texto gerado). Isto muda a pergunta
de "este método existe no catálogo?" para "os dados seleccionados contêm informação suficiente
para calcular isto, de alguma forma?" — que é uma pergunta muito mais rara de responder "não".

Porque isto não é o mesmo que "remover R1": o número nunca sai da cabeça do modelo, sai de código
que correu de facto sobre os dados carregados. R1 continua a exigir `{{calc:id}}` rastreável — só
que agora o "cálculo" pode ser gerado dinamicamente em vez de vir só de uma função pré-escrita.
Continua a ser verificável: o código gerado fica guardado (tal como já se guarda `codigo` na
tabela `analise_execucoes`), pode ser reexecutado, auditado, e comparado ao resultado.

**Camadas de segurança necessárias** (isto é a parte que exige cuidado a sério):
1. O código só vê os dados já carregados em memória (as tabelas/geometrias do contexto), nunca
   acesso à rede, ao sistema de ficheiros do servidor, ou à base de dados de produção directamente
   — só a um snapshot dos dados seleccionados para esta análise.
2. Timeout curto (o catálogo já usa este princípio: `executar_sql` no plano agêntico já previa
   10s).
3. O resultado tem de passar pela MESMA validação de schema que qualquer outro cálculo antes de
   entrar em `ctx.calcs` — um número, string ou array de pontos, nunca texto livre não estruturado.
4. Fica registado permanentemente (código + resultado + hash dos dados de entrada) para qualquer
   análise poder ser auditada depois — isto já é parcialmente o padrão de `analise_execucoes`.

## Pilares do plano

### 1. Execução de código como último recurso do catálogo (não substituto)

Ordem de tentativa por sub-pergunta, do mais rápido/seguro ao mais flexível:
1. Um método existente no catálogo resolve directamente → usa-o (caminho actual, mais rápido).
2. Uma combinação de 2-3 métodos existentes resolve → via agêntica com ferramentas (já no
   PLANO-CORRECCAO.md, Etapa 12).
3. Nenhum dos anteriores chega → gerar código Python/JS específico para esta sub-pergunta, correr
   no sandbox, validar o resultado, registar como cálculo normal.

O nível 3 só entra quando 1 e 2 genuinamente não bastam — mantém a via rápida rápida para as
perguntas comuns, e só paga o custo extra de latência/tokens quando é preciso.

### 2. Geoestatística completa (não só ponto-em-polígono)

Hoje: ponto-em-polígono (E1), pcode/nome (E3/E4/E5), ponto representativo para linhas/polígonos
(aproximação adicionada nesta sessão). Em falta para "super inteligente" a sério em perguntas
espaciais:
- **Distância e proximidade**: "que escolas ficam a mais de 10km de uma estrada", "hospital mais
  próximo de cada posto administrativo".
- **Buffer + junção**: "quantas pessoas vivem a menos de 5km de um centro de saúde" (buffer
  geoespacial à volta de cada unidade, sobreposto com população).
- **Intersecção geométrica exacta** (não só ponto representativo): uma linha que atravessa 3
  distritos deveria contar nos 3, não só no do seu ponto médio — Turf.js ou similar dá isto sem
  reinventar geometria computacional à mão.
- **Análise de rede** (mais avançado, só se justificar pela procura real): distância por estrada
  em vez de linha recta, para perguntas de acessibilidade.

### 3. Raciocínio cruzado entre datasets, sem precisar de junção geográfica explícita

Hoje `juntar_datasets` exige que ambos tenham ligação geográfica detectada. Em falta:
- Detecção automática de chave de junção **não geográfica** (ex.: código de escola comum a dois
  ficheiros, nome de distrito em texto livre a comparar por fuzzy matching mesmo sem pcode).
- Raciocínio temporal cruzado: "como é que X mudou depois de Y" quando X e Y são datasets
  diferentes com datas diferentes, não só séries do mesmo dataset.

### 4. Memória entre análises (aprender com o que já foi calculado)

- **Cache semântico de perguntas** (já estava na lista de optimizações do PLANO-CORRECCAO.md):
  perguntas parecidas (por embedding) a datasets iguais reaproveitam o plano, não só a resposta
  final — acelera E melhora a qualidade, porque um plano já testado e bem-sucedido é mais fiável
  do que gerar de novo às cegas.
- **Biblioteca de planos resolvidos por arquétipo**: se "quantas escolas por província" já foi
  respondida bem uma vez com um dataset de escolas, a mesma estrutura de plano é um óptimo ponto
  de partida para "quantas unidades sanitárias por província" — não copiar cegamente, mas usar
  como exemplo few-shot dentro do prompt de planeamento.
- **Registo de perguntas que falharam e porquê** (isto já existe em `ctx.avisos`, mas fica preso
  dentro de cada análise) — agregado ao longo do tempo, mostra ao administrador (não ao
  utilizador) que tipos de pergunta continuam a falhar, para priorizar que método construir a
  seguir. Isto fecha o ciclo: bugs reais → plano de correcção → métrica de que está a melhorar.

### 5. Auto-crítica adaptativa (não binário "sempre" ou "nunca")

A Crítica adversarial (Opus + raciocínio prolongado) foi removida por ser lenta. Em vez de nunca
mais correr, torná-la **condicional**:
- Correr sempre que `confianca_sem_enriquecimento` (já calculado na Suficiência) for baixa.
- Correr sempre que a pergunta envolver comparação temporal ou entre grupos (onde o paradoxo de
  Simpson e a inversão de tendência por MAUP são erros reais, já vistos nesta base de código).
- Não correr para perguntas simples de contagem/ranking com confiança alta — aí o custo extra não
  compensa.

Isto dá "mais inteligência" exactamente onde o risco de erro é maior, sem pagar o custo em todas
as análises.

### 6. Modelação honesta quando HÁ sinal real

Hoje "sem tendência significativa" só mostra os valores brutos (corrigido nesta sessão). Quando
HÁ tendência significativa, ainda não há projecção nenhuma — só o teste de significância. Para
"super inteligente" a sério: quando Mann-Kendall/regressão confirmam tendência real, adicionar
uma projecção simples (declive de Sen, já mencionado no documento original desta sessão como
método a considerar) com intervalo de confiança explícito e a frase "projecção estatística, não
garantia" — isto é diferente de "inventar": é modelação declarada como modelação, com a incerteza
visível, sobre uma tendência que passou no teste.

### 7. Explicabilidade de ponta a ponta

- Cada `{{calc:id}}` já tem `proveniencia` (método, datasets, linhas usadas) — expor isto na UI
  como um "porquê confio nisto" clicável em cada número do dashboard, não só no texto corrido.
- Quando o motor usa o pilar 1 (código gerado), mostrar o código real correndo, não escondê-lo —
  reforça confiança em vez de parecer uma caixa preta ainda mais opaca.

## O que NÃO muda, outra vez, porque é a base de tudo isto

- R1: zero números sem cálculo real por trás, sempre rastreável.
- R3: um único objecto de resultados, sem dois caminhos com verdades diferentes.
- Quando mesmo assim não há dado nem proxy honesto: "não sei", nunca inventado.

## Ordem de implementação (faseada, cada fase testável sozinha)

**Fase 1 — Fundações já em curso** (PLANO-INTELIGENCIA.md, já aprovado): catálogo mais largo,
resolução determinística, regra de métrica mais próxima. Continua a correr em paralelo a isto.

**Fase 2 — Execução de código (pilar 1), com sandbox restrito**
1. Desenhar o contrato de segurança (dados disponíveis, timeout, validação de saída) antes de
   qualquer linha de implementação — é a parte que mais pode correr mal se apressada.
2. Protótipo isolado: uma sub-pergunta de teste, sem afectar o pipeline principal.
3. Integrar como último recurso (nunca primeira tentativa) no executor.
4. Testar com as perguntas reais que já falharam nesta sessão e outras novas, comparando latência
   e correcção contra o catálogo fixo.

**Fase 3 — Geoestatística completa (pilar 2)**: distância, buffer, intersecção exacta — cada um
como método novo no catálogo, testável isoladamente, não depende da Fase 2.

**Fase 4 — Memória entre análises (pilar 4)**: cache semântico primeiro (só latência, baixo
risco), biblioteca de planos depois (mais valioso, mais trabalho de curadoria).

**Fase 5 — Auto-crítica adaptativa (pilar 5) + modelação honesta (pilar 6)**: quando as fases
anteriores já reduziram os "não consigo" ao mínimo, isto sobe a qualidade do que já responde bem.

**Fase 6 — Explicabilidade (pilar 7)**: pode entrar em paralelo a qualquer fase, é sobretudo UI.

Cada fase pára para revisão antes da seguinte — tal como combinado nos planos anteriores.
