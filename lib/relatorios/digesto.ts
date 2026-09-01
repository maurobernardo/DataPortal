import { chamarEstagioRelatorio, custoUsd, modeloParaRelatorio } from './router'

/**
 * O digesto estruturado de um relatório.
 *
 * A diferença entre isto e "resumir o PDF" está na estrutura, não no comprimento. Um resumo em
 * bloco é o que qualquer chatbot dá de graça; o que interessa a quem trabalha com um relatório de
 * doador é separar o que foi ESTUDADO do que se ACHOU do que se RECOMENDA, e saber onde no
 * documento está cada peça, para poder confirmar antes de citar.
 *
 * `afirmacoes_numericas` é a ponte para `verificar-afirmacao.ts`: cada número extraído fica numa
 * forma que se pode comparar contra os dados do próprio portal, com geografia, período e unidade
 * separados do texto em prosa que os envolve.
 */

export type Digesto = {
  o_que_e: {
    assunto: string
    geografia: string
    periodo: string
    metodologia: string
  }
  resumo_curto: string
  resumo_medio: string
  achados: { texto: string; pagina: number; ano: number | null }[]
  recomendacoes: { texto: string; responsavel: string | null; prazo: string | null; pagina: number }[]
  o_que_nao_diz: string[]
  fontes: { instituicao: string; documento: string | null; ano: number | null }[]
  resultado: {
    tipo: 'obtido' | 'esperado' | 'nao_aplicavel'
    texto: string | null
    pagina: number | null
  }
  glossario: { termo: string; definicao: string; pagina: number }[]
  credibilidade: {
    tipo_dado: 'primario' | 'secundario' | 'misto' | null
    tamanho_amostra: string | null
    observacoes: string | null
  }
  afirmacoes_numericas: {
    texto: string
    tema: string
    geografia: string
    periodo_inicio: number | null
    periodo_fim: number | null
    valor: number
    unidade: string
    pagina: number
    tipo: 'nivel' | 'variacao'
  }[]
}

const SCHEMA = {
  type: 'object',
  properties: {
    o_que_e: {
      type: 'object',
      properties: {
        assunto: { type: 'string' },
        geografia: { type: 'string' },
        periodo: { type: 'string' },
        metodologia: { type: 'string' },
      },
      required: ['assunto', 'geografia', 'periodo', 'metodologia'],
      additionalProperties: false,
    },
    resumo_curto: { type: 'string' },
    resumo_medio: { type: 'string' },
    achados: {
      type: 'array',
      items: {
        type: 'object',
        properties: { texto: { type: 'string' }, pagina: { type: 'integer' }, ano: { type: ['integer', 'null'] } },
        required: ['texto', 'pagina', 'ano'],
        additionalProperties: false,
      },
    },
    recomendacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          responsavel: { type: ['string', 'null'] },
          prazo: { type: ['string', 'null'] },
          pagina: { type: 'integer' },
        },
        required: ['texto', 'responsavel', 'prazo', 'pagina'],
        additionalProperties: false,
      },
    },
    o_que_nao_diz: { type: 'array', items: { type: 'string' } },
    fontes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          instituicao: { type: 'string' },
          documento: { type: ['string', 'null'] },
          ano: { type: ['integer', 'null'] },
        },
        required: ['instituicao', 'documento', 'ano'],
        additionalProperties: false,
      },
    },
    resultado: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['obtido', 'esperado', 'nao_aplicavel'] },
        texto: { type: ['string', 'null'] },
        pagina: { type: ['integer', 'null'] },
      },
      required: ['tipo', 'texto', 'pagina'],
      additionalProperties: false,
    },
    afirmacoes_numericas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          tema: { type: 'string' },
          geografia: { type: 'string' },
          periodo_inicio: { type: ['integer', 'null'] },
          periodo_fim: { type: ['integer', 'null'] },
          valor: { type: 'number' },
          unidade: { type: 'string' },
          pagina: { type: 'integer' },
          tipo: { type: 'string', enum: ['nivel', 'variacao'] },
        },
        required: ['texto', 'tema', 'geografia', 'periodo_inicio', 'periodo_fim', 'valor', 'unidade', 'pagina', 'tipo'],
        additionalProperties: false,
      },
    },
    glossario: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          termo: { type: 'string' },
          definicao: { type: 'string' },
          pagina: { type: 'integer' },
        },
        required: ['termo', 'definicao', 'pagina'],
        additionalProperties: false,
      },
    },
    credibilidade: {
      type: 'object',
      properties: {
        tipo_dado: { anyOf: [{ type: 'string', enum: ['primario', 'secundario', 'misto'] }, { type: 'null' }] },
        tamanho_amostra: { type: ['string', 'null'] },
        observacoes: { type: ['string', 'null'] },
      },
      required: ['tipo_dado', 'tamanho_amostra', 'observacoes'],
      additionalProperties: false,
    },
  },
  required: [
    'o_que_e', 'resumo_curto', 'resumo_medio', 'achados', 'recomendacoes', 'o_que_nao_diz', 'fontes',
    'resultado', 'afirmacoes_numericas', 'glossario', 'credibilidade',
  ],
  additionalProperties: false,
} as const

const PROMPT = `Lê o relatório completo (dado abaixo, marcado por página, [PAGINA N]) e produz um digesto
estruturado em português de Moçambique.

- "resumo_curto": duas a três frases. Alguém tem de decidir, em trinta segundos, se este relatório
  lhe interessa.
- "resumo_medio": um a dois parágrafos, cobrindo assunto, achados principais e recomendações
  principais. Alguém tem de ficar equipado para uma conversa em três minutos.
- "achados": os factos MAIS IMPORTANTES que o relatório estabelece, cada um com a página exacta.
  No máximo 12: um relatório longo tem dezenas de factos possíveis, e o valor deste campo está em
  escolher os que importam, não em listar tudo o que o documento diz. Preenche "ano" só quando o
  achado está claramente associado a um ano específico no documento (ex.: "em 2019, a taxa...");
  usa null quando o achado é atemporal ou o documento não data esse facto em particular. A maioria
  dos achados vai ficar com "ano": null, e está certo ficar assim.
- "recomendacoes": as recomendações MAIS IMPORTANTES, no máximo 10. Preenche "responsavel" e
  "prazo" só quando o documento os nomeia explicitamente; caso contrário usa null, nunca inventes
  um responsável ou um prazo plausível.
- "o_que_nao_diz": geografias, períodos, perguntas ou grupos que o relatório NÃO cobre e que um
  leitor podia razoavelmente esperar que cobrisse. No máximo 6. Nunca uma frase genérica.
- "fontes": instituições e documentos citados como fonte de dados ou de outras conclusões. No
  máximo 10.
- "resultado": só quando o relatório tem um enquadramento de desfecho. Usa "obtido" quando o
  relatório descreve um resultado JÁ alcançado (uma avaliação de impacto, um piloto concluído, um
  antes/depois com dados) e escreve esse resultado em "texto", com a página em "pagina". Usa
  "esperado" quando o relatório é um plano, uma proposta ou um estudo de base que ainda não tem
  resultado, mas diz o que se espera alcançar; escreve isso em "texto". Usa "nao_aplicavel" para um
  relatório puramente descritivo (um censo, um levantamento sem intervenção associada) sem nenhum
  enquadramento de resultado, e nesse caso "texto" e "pagina" ficam null. Nunca inventes um
  resultado que o documento não descreve.
- "afirmacoes_numericas": até 15 das afirmações numéricas MAIS VERIFICÁVEIS (associadas a uma
  geografia clara, mesmo que seja "Moçambique" no total nacional, e a um período quando o
  documento o permitir). Não é uma lista exaustiva de todos os números do documento: escolhe as
  que mais interessa confirmar contra outra fonte. Usa "tipo": "nivel" para um valor num momento,
  "variacao" para uma diferença entre dois momentos (nesse caso "periodo_inicio" e "periodo_fim"
  são os dois anos, e "valor" é a variação, na unidade que o relatório usa: "%", "pp" ou uma
  unidade absoluta). Quando o relatório não data a afirmação, usa null nos dois períodos. A
  "unidade" é sempre a que o documento usa, tal como está escrita. IMPORTANTE: quando o relatório
  mostrar a MESMA variável em vários anos (uma série, ex.: rendimento do milho em 2002, 2010 e
  2020), regista um "nivel" separado para CADA ano dessa série, com "tema", "geografia" e
  "unidade" idênticos entre eles: é isso que permite depois desenhar um gráfico da evolução. Não
  reduzas uma série a um único ponto só para caber mais variáveis diferentes na lista; uma
  variável com evolução ao longo do tempo vale mais do que várias variáveis de um só ponto cada.
- "glossario": até 10 siglas ou termos técnicos que o relatório usa sem os voltar a explicar (ex.:
  "BANP", "CCP", nomes de metodologias). Para cada um, a definição TAL COMO o documento a dá (ou,
  se o documento só a der uma vez por extenso antes de abreviar, essa forma por extenso) e a página
  onde aparece pela primeira vez. Um relatório sem siglas nem jargão devolve uma lista vazia; não
  inventes entradas óbvias só para preencher.
- "credibilidade": "tipo_dado" é "primario" quando o relatório recolheu os seus próprios dados
  (inquérito, entrevista, medição em campo), "secundario" quando usa dados já publicados por outra
  fonte, "misto" quando combina os dois, e null quando o documento não deixa claro. "tamanho_amostra"
  é o número ou descrição da amostra TAL COMO o documento a dá (ex.: "1 204 agregados familiares"),
  null se não for mencionado. "observacoes" é uma frase curta sobre limitações metodológicas que o
  PRÓPRIO documento reconhece (não a tua opinião sobre a qualidade do estudo), null se não houver
  nenhuma. Nunca inventes um tamanho de amostra ou uma limitação que o documento não menciona.

Estes limites existem para a resposta caber num único pedido: um relatório de 40 páginas tem
matéria para muito mais do que isto, e a tarefa é escolher o que mais importa, não esgotar o
documento.`

/**
 * Concatena as páginas num único texto marcado, com um tecto de segurança.
 *
 * Os modelos usados aqui têm janela de um milhão de tokens, o que cobre confortavelmente um
 * relatório de várias centenas de páginas sem truncar nada. O tecto existe só para o caso
 * patológico (um PDF corrompido que produz texto repetido sem fim), e quando actua fica registado
 * como limitação em vez de estourar o pedido em silêncio.
 */
const LIMITE_CARACTERES = 900_000

function montarDocumento(paginas: { pagina: number; texto: string }[]): { texto: string; truncado: boolean } {
  let texto = ''
  let truncado = false
  for (const p of paginas) {
    const bloco = `\n\n[PAGINA ${p.pagina}]\n${p.texto}`
    if (texto.length + bloco.length > LIMITE_CARACTERES) {
      truncado = true
      break
    }
    texto += bloco
  }
  return { texto, truncado }
}

export async function gerarDigesto(
  paginas: { pagina: number; texto: string }[]
): Promise<{ digesto: Digesto; truncado: boolean; custoUsd: number }> {
  const { texto, truncado } = montarDocumento(paginas)
  const resposta = await chamarEstagioRelatorio<Digesto>({
    estagio: 'digesto',
    utilizador: `${PROMPT}\n\n---\n${texto}`,
    schema: SCHEMA,
    // 16000 truncava a resposta em relatórios normais (verificado ao vivo, um caso real de 500 por
    // "resposta truncada no limite de 16000 tokens"): mesmo com os limites de itens acima, o texto
    // de cada achado/recomendação em prosa some depressa. 32000 dá folga confortável, e o limite de
    // ITENS acima é que evita o problema oposto, uma resposta sem fim sobre um documento longo.
    maxTokens: 32000,
  })

  const digesto = resposta.dados
  if (truncado) {
    digesto.o_que_nao_diz = [
      ...digesto.o_que_nao_diz,
      `O documento é demasiado longo e foi lido apenas até um ponto: partes finais podem estar por reflectir neste digesto.`,
    ]
  }

  return {
    digesto,
    truncado,
    custoUsd: custoUsd(modeloParaRelatorio('digesto'), resposta.tokens_entrada, resposta.tokens_saida),
  }
}
