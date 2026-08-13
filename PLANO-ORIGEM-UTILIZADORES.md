# Plano: origem geográfica dos utilizadores do portal

## Objectivo

Saber de onde (país/região/cidade) vêm as pessoas que usam o portal — não só quantas, mas quantas
por origem — cruzado com o que fazem: ver um dataset, pedir um relatório, ver um mapa, submeter o
formulário de contacto, correr uma análise. Isto informa prioridades de dados: se 40% do tráfego
vem de fora de Moçambique, ou se uma província nunca aparece, é informação accionável para o que
recolher/publicar a seguir.

## O que já existe (não é preciso recriar)

O portal já regista eventos, só sem origem geográfica:
- `DailyUsageStat` — contadores agregados diários (views/downloads), sem detalhe por evento.
- `MapStat` — cada visualização/pedido de mapa, com `slug`, `type`, `userId` opcional.
- `MapRequest` — pedidos de mapa por formulário (nome/email/mensagem).
- `ReportRequest` — pedidos de relatório.
- `analises` (motor de IA) — cada análise pedida, com `utilizador_id`.

Faltam duas coisas em todas estas tabelas: **de onde veio o pedido** (a origem geográfica) e,
nalgumas, **um registo por evento individual** em vez de só o agregado diário.

## Decisão central: geolocalização por IP, sem guardar o IP

A forma prática de saber "de onde" sem pedir localização ao browser (que a maioria recusa) é
mapear o endereço IP do pedido para país/região/cidade. Duas escolhas aqui, com trade-offs reais:

| Opção | Como funciona | Prós | Contras |
|---|---|---|---|
| **Base de dados local (MaxMind GeoLite2, recomendado)** | Ficheiro `.mmdb` descarregado uma vez, consultado localmente, sem chamada de rede por pedido | Grátis, rápido (microsegundos), sem depender de serviço externo, sem enviar o IP de ninguém para fora | Precisão de cidade é aproximada (~ao nível da cidade, não exacta); ficheiro tem de ser actualizado periodicamente (mensal) |
| **API externa (ipapi.co, ipinfo.io, etc.)** | Uma chamada HTTP por pedido para o serviço | Sem manutenção de ficheiro | Custo por pedido a partir de certo volume, adiciona latência a cada página vista, envia o IP de cada visitante a um terceiro — pior para privacidade |

**Recomendação: MaxMind GeoLite2-City**, gratuito com registo, actualizado localmente. Evita
mandar dados de visitantes moçambicanos para um serviço americano/europeu a cada clique, e não
adiciona latência.

### Privacidade: nunca guardar o IP em bruto

O IP identifica uma pessoa (é dado pessoal em praticamente qualquer enquadramento legal,
incluindo a lei de protecção de dados de Moçambique). O plano é: resolver o IP para
país/região/cidade **no momento do pedido**, guardar só o resultado (ex.: "Moçambique, Maputo"),
e **descartar o IP imediatamente** — nunca escrito na base de dados. Isto dá a informação que
interessa (de onde vêm) sem guardar um identificador pessoal permanente.

## O que fica registado

Uma tabela nova, `AcessoOrigem`, para eventos individuais com origem — em vez de espalhar a coluna
`pais`/`regiao` por seis tabelas diferentes:

```sql
CREATE TABLE AcessoOrigem (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  tipo_evento ENUM('vista_dataset','download','vista_mapa','pedido_mapa','pedido_relatorio',
                    'analise_ia','contacto','pesquisa') NOT NULL,
  referencia_id VARCHAR(80) NULL,     -- id/slug do dataset, mapa, relatório, etc.
  pais        VARCHAR(2) NULL,        -- código ISO do país (ex.: MZ, ZA, PT)
  regiao      VARCHAR(120) NULL,      -- província/estado, quando disponível
  cidade      VARCHAR(120) NULL,
  utilizador_id INT NULL,
  criado_em   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_origem_tipo (tipo_evento, criado_em),
  INDEX idx_origem_pais (pais)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
```

Um evento = uma linha. `tipo_evento` distingue o que a pessoa fez; `pais`/`regiao`/`cidade` vêm da
resolução do IP; nunca há coluna de IP nesta tabela.

## Onde instrumentar (pontos concretos no código)

Um único helper, `registarAcesso(request, tipoEvento, referenciaId?)`, chamado a partir de cada
ponto que já existe:

| Evento | Onde já acontece hoje |
|---|---|
| Vista de dataset | `app/api/datasets/[id]/preview/route.ts`, página de detalhe do dataset |
| Download | `app/api/download/[id]/route.ts`, `app/api/download/batch/route.ts` |
| Vista de mapa | `recordMapStat(slug, 'view', ...)` em `lib/db.ts` — já existe o ponto, só falta a origem |
| Pedido de mapa | `createMapRequest(...)` |
| Pedido de relatório | onde `ReportRequest` é inserido hoje |
| Análise de IA | `criarAnalise(...)` em `lib/analysis/persistencia.ts` |
| Contacto | `app/api/contact/route.ts` |
| Pesquisa | `app/api/search/suggestions/route.ts` (só se fizer sentido registar cada termo — a discutir) |

Cada um destes pontos já tem acesso ao pedido HTTP (`NextRequest`), de onde se lê o IP (via
`x-forwarded-for`, já usado no portal para rate limiting — reaproveita-se a mesma extracção).

## Dashboard de origem (novo)

Uma página `/admin/origem-utilizadores` (área já protegida por `getCurrentAdmin`), com:
- Mapa coroplético por país (contagem de eventos por país, últimos 30/90 dias, filtro por tipo de
  evento) — reaproveita os componentes de mapa já existentes no portal (`AnaliseSerieGeografica`
  ou equivalente, adaptado a país em vez de província).
  Mapa coroplético por província, só para os eventos com `pais = 'MZ'` — a pergunta interna mais
  útil ("de que província do país vem o nosso público") usa a mesma malha administrativa que o
  resto do portal já tem carregada (`geo_unidades`).
- Tabela: país/província × tipo de evento (quantas vistas, quantos pedidos, quantas análises).
- Série temporal: evolução da distribuição geográfica ao longo do tempo (para ver se uma
  campanha ou notícia mudou a origem do público).

## Ordem de implementação

1. **Base de dados GeoIP + helper `registarAcesso`** (Fase 1): sem isto nada dos passos seguintes
   tem dados para mostrar. Inclui o `.mmdb` da MaxMind e a função de resolução IP→localização,
   testada isoladamente.
2. **Migração da tabela `AcessoOrigem`** (mesmo padrão das outras migrações do portal).
3. **Instrumentar os 6-7 pontos da tabela acima**, um de cada vez, verificando no browser que o
   registo aparece com país/região correctos.
4. **Dashboard de origem**: mapa + tabela + série temporal.
5. **Aviso na Política de Privacidade** (`app/politica-privacidade` ou equivalente): declarar que
   se regista a origem geográfica aproximada dos acessos, sem guardar o IP — é o tipo de coisa que
   devia estar documentado publicamente antes de o dashboard entrar em produção.

Cada fase é testável isoladamente antes de avançar para a seguinte, como nos planos anteriores.

## O que fica por decidir (preciso da tua resposta antes de começar)

1. **MaxMind GeoLite2 requer uma conta gratuita** (só para descarregar o ficheiro `.mmdb`, sem
   custo) — confirmas que posso criar/usar essa conta, ou já tens uma chave de licença MaxMind?
2. **Pesquisa** (o `search/suggestions`): registar cada termo pesquisado por origem, ou só os
   eventos de "resultado" (dataset visto a partir de uma pesquisa)? Registar termos de pesquisa
   crus tem mais valor analítico mas também mais peso de privacidade.
3. Confirmas o nome `/admin/origem-utilizadores` para a página nova, ou preferes outro sítio (ex.:
   dentro do dashboard de admin já existente, `dashboard/ia-utilizacao`, como um separador novo)?
