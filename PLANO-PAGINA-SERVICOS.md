# Plano: página de Serviços do Data Portal

## Referência externa (data4moz.com, explorado)

Estrutura deles: 4 serviços núcleo (Data Survey, Data Analysis, Data Visualization, Strategic
Advisory) + 4 soluções digitais (Geospatial Intelligence & Mapping, Decision-Support Dashboards,
AI & Predictive Analytics, Digital Literacy & Capacity Building), organizados por sector
(agricultura, terra, pescas, clima, juventude, energia). É consultoria de dados posicionada por
projecto/sector — o nosso portal é uma plataforma self-service já construída. A página de
Serviços deve reflectir essa diferença: não "contrate-nos para um projecto", mas "isto já existe,
experimente agora".

## Princípio: cada serviço na página tem de apontar para algo que já funciona

Nenhum serviço nesta página promete o que o portal não faz — isso é o oposto do que já aconteceu
nesta sessão com o dashboard "IA Insights" que prometia análise real e não fazia nada (memória do
projecto). A página de Serviços vende o que já está construído, com um link a carregar directo
para a funcionalidade.

## Serviços já reais no portal (núcleo da página)

| Serviço | Onde já existe | O que a página deve mostrar |
|---|---|---|
| **Catálogo de Dados Geoespaciais** | `/dados-espaciais` | Datasets com geometria real (mapas, shapefiles, GeoTIFF), pré-visualização, download |
| **Catálogo de Dados Alfanuméricos** | `/dados-alfanumericos` | Tabelas, séries, indicadores — mesma lógica sem componente espacial |
| **Mapas Inteligentes** | `/maps` | Mapas temáticos prontos (saúde, infra-estrutura, etc.), camadas, filtros, pedido de mapa personalizado |
| **Dashboards Alfanuméricos** | `/dashboards-alfanumericos` | Painéis interactivos sobre os dados tabulares, sem precisar de saber programar |
| **Motor de Análise por IA** | `/analise/nova` | A peça mais forte e mais recente: pergunta em português, o motor planeia, calcula, cruza fontes, critica-se a si próprio e devolve um dashboard com proveniência auditável por número — isto NÃO existe no site da Data4Moz, é um diferencial real |
| **Relatórios** | `/relatorios` | Relatórios prontos + pedido de relatório personalizado |
| **Alertas de actualização** | subscrição por dataset já implementada | Ser avisado quando um dataset que se segue é actualizado |
| **Download de dados** | `/api/download/*` (temporariamente desactivado) | Não incluir na página enquanto estiver desactivado, ou incluir com nota "brevemente" — a confirmar contigo |

## Serviços que a Data4Moz oferece e nós ainda não — decidir com o utilizador antes de incluir

Estes são reais na Data4Moz mas **não existem ainda** no portal como funcionalidade — só listá-los
"promete e não cumpre" outra vez. Três opções por cada um: (a) não incluir agora, (b) incluir como
"pedido sob consulta" com formulário de contacto a apontar para uma pessoa real que os presta
manualmente, (c) construir a funcionalidade primeiro.

1. **Recolha de dados customizada (Data Survey)** — desenho de inquéritos/recolha em campo para
   um cliente. O portal publica dados, não recolhe dados por encomenda hoje.
2. **Consultoria e advisory estratégico** — apoio à decisão fora do que o motor de IA já faz.
3. **Formação e capacitação digital** — workshops sobre como usar dados/portal.
4. **Integração de dados em tempo real de terceiros** — streaming de fontes externas para o portal.

## Estrutura da página proposta

1. **Hero**: "O que o Data Portal faz por si" — não um slogan genérico, uma frase que diga o que
   torna isto diferente de um repositório de ficheiros (a IA que responde perguntas, não só lista
   ficheiros).
2. **Grelha de serviços núcleo** (os 7 da primeira tabela): cartão por serviço com ícone, uma
   frase do que faz, um exemplo concreto (ex.: "pergunta como 'quais distritos têm menor cobertura
   de água potável' e recebe um dashboard completo em minutos"), botão a abrir a funcionalidade
   real.
3. **Secção "Como funciona"**: 3-4 passos genéricos (escolher dados → visualizar/perguntar →
   exportar/partilhar), reaproveitando texto já existente no `ComoFuncionaDrawer` do motor de
   análise, se fizer sentido.
4. **Secção sectorial** (inspirada na Data4Moz, mas honesta): que categorias de dataset o portal
   já cobre hoje (via `Category` table) — não inventar sectores que não têm dados.
5. **CTA final**: link para `/analise/nova` (o serviço mais forte) e para `/catalogo`.
6. Se decidires incluir os serviços da secção 2 acima: uma secção separada, claramente rotulada
   "Serviços sob consulta", com formulário de contacto dedicado.

## Antes de implementar

Preciso que decidas duas coisas:
1. **Download de dados**: incluir na página com nota "temporariamente indisponível", ou omitir por
   agora enquanto estiver desactivado?
2. **Serviços da Data4Moz que não temos** (recolha de dados, consultoria, formação): incluir como
   "sob consulta" com contacto, ou deixar fora desta primeira versão da página?
