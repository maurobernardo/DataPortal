# Plano: motor mais inteligente sem abrir mão de R1

R1 fica: nunca um número sem `{{calc:id}}` rastreável a um cálculo real. O problema real que hoje
faz o motor parecer "burro" nunca foi a regra — foi a **cobertura**: perguntas legítimas para as
quais existia uma resposta honesta calculável, mas o motor não tinha o método certo no catálogo, ou
o plano não sabia combinar os métodos existentes da forma certa. Isto já ficou demonstrado hoje: 4
bugs reais resolvidos nesta sessão (nível geográfico com nome errado, normalização a substituir a
pergunta feita, falta de cruzamento categoria×geografia, falta de filtro por unidade-mãe) eram
todos "não consigo responder" a perguntas que TINHAM resposta — não exigiam inventar nada, só
exigiam mais capacidade determinística.

## Onde a "inteligência" tem de crescer

### 1. Catálogo de métodos mais largo (esforço médio, maior retorno)

Cada bug de hoje só apareceu porque faltava um método específico. O padrão repete-se: vai
continuar a aparecer para outros tipos de pergunta que ainda não testámos. Em vez de esperar por
cada bug individual, mapear sistematicamente as combinações de pergunta que o catálogo actual não
cobre:

- **Comparação entre dois períodos por unidade geográfica** (ex.: "que distritos pioraram entre
  2017 e 2022"): hoje `comparar_periodos` não tem variante geográfica.
- **Correlação entre uma métrica de um dataset e outra de um dataset diferente, ao mesmo nível
  geográfico** (ex.: "escolas correlacionam com estradas?"): `juntar_datasets` existe mas só
  produz um gráfico de dispersão, não um coeficiente com p-value directamente citável.
- **Proximidade/distância** (ex.: "que escolas ficam a mais de 10km de uma estrada"): não existe
  nenhum método de distância entre dois datasets geoespaciais.
- **Perguntas de "e se" sobre cobertura** (ex.: "quantas pessoas vivem a mais de 5km do hospital
  mais próximo"): exige buffer geoespacial + junção com população, nenhum dos dois existe hoje.

Cada um destes é um método novo no catálogo, no mesmo padrão que `distribuicao_categoria_geo` foi
adicionado hoje: função pura, testável, documentada no catálogo para o planeador escolher.

### 2. Via agêntica com ferramentas (já estava na Etapa 12 do PLANO-CORRECCAO.md)

Isto é o mecanismo real para "não sabemos que perguntas vão fazer": em vez de um plano fixo
decidido de uma vez, dar ao modelo um LOOP de ferramentas determinísticas —
`listar_dimensoes(dataset)`, `listar_metricas(dataset)`, `consultar_cubo(pedido)`,
`perfil_coluna(dataset, coluna)`, `amostra(dataset, n<=20)` — para explorar o dataset e tentar
combinações antes de desistir. A diferença chave face a "adivinhar": cada ferramenta só devolve
factos verificados (o que existe, os valores reais), nunca deixa o modelo inventar um resultado.
Se depois de 4-6 rondas de exploração real ainda não há resposta, aí sim declara-se a lacuna —
mas agora é uma lacuna a sério, não uma lacuna por falta de tentativa.

Isto só compensa depois do catálogo de métodos (item 1) estar mais largo — um agente com poucas
ferramentas só descobre mais depressa que não há ferramenta certa.

### 3. Resolução determinística de entidades mais rica (Etapa 6 do PLANO-CORRECCAO.md)

Hoje "por província"/"por distrito" já resolve bem. O que falta: reconhecer intenções compostas
antes do Planeamento — "nos últimos 5 anos" já existe, mas "comparado com o ano passado", "os 3
maiores", "abaixo da média nacional" ainda dependem inteiramente do LLM interpretar correctamente
em cada chamada, sem um dicionário prévio. Um dicionário de padrões (regex + sinónimos) reduz a
ambiguidade que chega ao Planeamento, o que por si só já produz planos mais capazes sem precisar
de mais nenhum método novo.

### 4. Quando genuinamente não há dado: aproximar em vez de recusar em bloco

Isto é o meio-termo real entre "recusar" e "inventar". Quando a métrica exacta pedida não existe
mas uma PRÓXIMA existe e é honesta sobre a diferença — ex.: perguntou-se "hospitais" e só há
"unidades sanitárias" (que inclui hospitais e mais); perguntou-se "2023" e só há dados até 2022 —
o motor deve responder com a métrica próxima, dizendo explicitamente a diferença ("isto inclui
todos os tipos de unidade sanitária, não só hospitais" / "o dado mais recente disponível é de
2022"). Isto já acontece nalguns casos (a Suficiência já declara lacunas), mas não é sistemático:
falta uma regra explícita no Planeamento para SEMPRE tentar a métrica mais próxima disponível antes
de desistir, com a diferença declarada — em vez de: existe a métrica exacta → responde; não existe
→ desiste.

## O que NÃO muda

- R1 mantém-se: zero números sem `{{calc:id}}`.
- R3 mantém-se: um único objecto de resultados, sem dois caminhos de código com verdades
  diferentes.
- Quando genuinamente não há dado nem proxy honesto, a resposta continua a ser "não sei", nunca um
  número inventado.

## Ordem sugerida

1. Mapear (com perguntas reais de teste, não hipotéticas) 10-15 tipos de pergunta que falham hoje,
   para ver o padrão real de lacunas — os 4 bugs de hoje vieram de testar ao vivo, não de
   adivinhar; vale a pena continuar assim antes de construir métodos especulativos.
2. Adicionar os métodos que aparecerem repetidamente nesse mapeamento (item 1 acima).
3. Dicionário de entidades compostas (item 3).
4. Regra de "métrica mais próxima" no Planeamento (item 4) — pequeno, alto retorno.
5. Via agêntica (item 2) — só depois do catálogo estar mais largo, senão explora pouco.
