/**
 * Verificação da lógica que decide se um bloqueio de análise é aceite.
 *
 * `verificarEvidencia` é a peça que impede o motor de recusar trabalho por engano, por isso é a
 * que mais precisa de ser exercida com casos concretos. Não toca na base de dados nem no modelo:
 * monta contextos sintéticos com colunas e ligações conhecidas e confirma que cada veredicto cai
 * do lado certo, incluindo os casos em que o bloqueio TEM de ser recusado.
 *
 * Uso: npx tsx scripts/testar-portao-viabilidade.ts
 */

import { verificarEvidencia } from '../lib/analysis/viabilidade'
import type { ContextoExecucao } from '../lib/analysis/executor'
import type { EvidenciaLacuna } from '../lib/analysis/types'

function contexto(opcoes: {
  colunas: string[]
  linhas?: string[][]
  nivelLigacao?: 'admin1' | 'admin2' | 'admin3' | null
}): ContextoExecucao {
  const ctx: any = {
    tabelas: new Map([
      [
        1,
        {
          dataset_id: 1,
          colunas: opcoes.colunas,
          linhas: opcoes.linhas ?? [],
          n_linhas: (opcoes.linhas ?? []).length,
          truncado: false,
        },
      ],
    ]),
    ligacoes: new Map([
      [
        1,
        opcoes.nivelLigacao
          ? {
              nivel: opcoes.nivelLigacao,
              coluna_usada: 'nome',
              taxa_correspondencia: 0.97,
              metodo: 'nome_exacto',
              nao_correspondidos: [],
              // Uma ligacao real traz o mapa linha -> codigo da unidade. Sem ele, o suporte de
              // teste nao exercita o caminho que conta periodos POR unidade, que e o que interessa
              // verificar na cobertura temporal.
              ligacoes: new Map(
                (opcoes.linhas ?? []).map((l, i) => [i, `cod_${String(l[0] ?? '')}`] as [number, string])
              ),
            }
          : null,
      ],
    ]),
  }
  return ctx as ContextoExecucao
}

type Caso = {
  nome: string
  evidencia: EvidenciaLacuna
  ctx: ContextoExecucao
  esperado: boolean
  /** Pergunta do utilizador. Por omissao assume-se que pede tempo, para nao alterar os casos ja
   *  escritos; os casos novos passam-na explicitamente. */
  pergunta?: string
}

const casos: Caso[] = [
  {
    nome: 'variável genuinamente ausente: bloqueia',
    evidencia: {
      tipo: 'variavel_ausente',
      exigido: 'orçamento municipal executado',
      termo_ausente: 'orcamento',
      disponivel: 'apenas contagem de escolas',
      explicacao: 'Os dados não têm nenhuma informação financeira.',
    },
    ctx: contexto({ colunas: ['provincia', 'escolas', 'alunos'] }),
    esperado: true,
  },
  {
    nome: 'variável dita ausente mas presente numa COLUNA: recusa o bloqueio',
    evidencia: {
      tipo: 'variavel_ausente',
      exigido: 'número de alunos matriculados',
      termo_ausente: 'alunos',
      disponivel: 'nada sobre alunos',
      explicacao: 'Os dados não falam de alunos.',
    },
    ctx: contexto({ colunas: ['provincia', 'escolas', 'alunos'] }),
    esperado: false,
  },
  {
    nome: 'assunto dito ausente mas presente num VALOR de célula: recusa o bloqueio',
    evidencia: {
      tipo: 'dominio_diferente',
      exigido: 'dados sobre malária',
      termo_ausente: 'malaria',
      disponivel: 'outro domínio',
      explicacao: 'Estes dados são de outro assunto.',
    },
    ctx: contexto({
      colunas: ['provincia', 'doenca', 'casos'],
      linhas: [['Sofala', 'Malaria', '120']],
    }),
    esperado: false,
  },
  {
    nome: 'pergunta distrital sem ligação nenhuma: bloqueia',
    evidencia: {
      tipo: 'granularidade_insuficiente',
      exigido: 'dados ao nível do distrito',
      disponivel: 'nenhuma ligação geográfica detectada',
      explicacao: 'Não há como localizar as linhas num distrito.',
    },
    ctx: contexto({ colunas: ['instituicao', 'valor'], nivelLigacao: null }),
    esperado: true,
  },
  {
    nome: 'pergunta distrital com ligação distrital detectada: recusa o bloqueio',
    evidencia: {
      tipo: 'granularidade_insuficiente',
      exigido: 'dados ao nível do distrito',
      disponivel: 'só província',
      explicacao: 'Os dados só chegam a província.',
    },
    ctx: contexto({ colunas: ['nome', 'valor'], nivelLigacao: 'admin2' }),
    esperado: false,
  },
  {
    nome: 'pergunta distrital com ligação só provincial: bloqueia',
    evidencia: {
      tipo: 'granularidade_insuficiente',
      exigido: 'comparação por distrito',
      disponivel: 'agregado por província',
      explicacao: 'Os dados param no nível provincial.',
    },
    ctx: contexto({ colunas: ['nome', 'valor'], nivelLigacao: 'admin1' }),
    esperado: true,
  },
  {
    nome: 'tendência pedida com um só ano: bloqueia',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'evolução entre 2015 e 2020',
      disponivel: 'um único ano',
      explicacao: 'Só existe um período nos dados.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'valor'],
      linhas: [
        ['Sofala', '2020', '10'],
        ['Manica', '2020', '12'],
      ],
    }),
    esperado: true,
  },
  {
    nome: 'tendência pedida com vários anos presentes: recusa o bloqueio',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'evolução ao longo do tempo',
      disponivel: 'um único ano',
      explicacao: 'Só existe um período nos dados.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'valor'],
      linhas: [
        ['Sofala', '2018', '10'],
        ['Sofala', '2019', '11'],
        ['Sofala', '2020', '12'],
      ],
    }),
    esperado: false,
  },
  {
    nome: 'trajectoria pedida com metade das celulas vazias: bloqueia',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'trajectória ano a ano por província entre 2015 e 2024',
      disponivel: 'só 48,5% das células preenchidas',
      explicacao: 'A linha de cada província seria feita de buracos.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      // 12 linhas, 5 com valor: 41,7% preenchido
      linhas: [
        ['A', '2015', '10'], ['A', '2016', ''], ['A', '2017', ''], ['A', '2018', '12'],
        ['B', '2015', ''], ['B', '2016', '8'], ['B', '2017', ''], ['B', '2018', ''],
        ['C', '2015', '5'], ['C', '2016', ''], ['C', '2017', '7'], ['C', '2018', ''],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: true,
  },
  {
    nome: 'cobertura boa: recusa o bloqueio, a evolucao e calculavel',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'trajectória ano a ano por província',
      disponivel: 'poucas células',
      explicacao: 'Diz que faltam dados.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2016', '11'], ['A', '2017', '12'], ['A', '2018', '13'],
        ['B', '2015', '8'], ['B', '2016', '9'], ['B', '2017', '10'], ['B', '2018', '11'],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: false,
  },
  {
    nome: 'so 2 periodos por unidade: bloqueia (dois pontos nao e evolucao)',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'evolução ano a ano por província',
      disponivel: 'dois anos por província',
      explicacao: 'Dois pontos não desenham uma trajectória.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2024', '12'],
        ['B', '2015', '8'], ['B', '2024', '9'],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: true,
  },
  {
    nome: 'tabela sem coluna temporal: nao ha cobertura a medir, recusa',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'trajectória anual',
      disponivel: 'nada',
      explicacao: 'Faltam anos.',
    },
    ctx: contexto({ colunas: ['provincia', 'value'], linhas: [['A', '1'], ['B', '2']], nivelLigacao: 'admin1' }),
    esperado: false,
  },
  {
    // Caso real: o modelo escolheu a gaveta vizinha ("serie_temporal") para um problema de
    // cobertura. Ha 4 anos distintos, mas metade das celulas vazias: o bloqueio tem de valer na
    // mesma, senao publica-se uma evolucao desenhada a partir de buracos.
    nome: 'serie_temporal marcada mas o problema e cobertura: bloqueia na mesma',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'evolução anual por província com poucos buracos',
      disponivel: '11 anos no ficheiro mas só 48,5% das células preenchidas',
      explicacao: 'A série existe mas está fragmentada de mais.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2016', ''], ['A', '2017', ''], ['A', '2018', '12'],
        ['B', '2015', ''], ['B', '2016', '8'], ['B', '2017', ''], ['B', '2018', ''],
        ['C', '2015', '5'], ['C', '2016', ''], ['C', '2017', '7'], ['C', '2018', ''],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: true,
  },
  {
    nome: 'serie_temporal marcada com varios anos E boa cobertura: recusa',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'evolução ao longo do tempo',
      disponivel: 'um só ano',
      explicacao: 'Diz que só há um período.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2016', '11'], ['A', '2017', '12'], ['A', '2018', '13'],
        ['B', '2015', '8'], ['B', '2016', '9'], ['B', '2017', '10'], ['B', '2018', '11'],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: false,
  },
  {
    // Caso reportado pelo utilizador: o motor sugeriu uma tendencia NACIONAL e depois bloqueou-a.
    // Nacionalmente os buracos de cada provincia somam-se e a serie fica densa: nao ha razao para
    // travar. So a pergunta POR UNIDADE precisa da serie completa de cada uma.
    nome: 'trajectoria NACIONAL com ficheiro esparso: recusa o bloqueio',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'evolução da produção nacional de milho entre 2018 e 2024',
      disponivel: 'ficheiro com 48,5% preenchido',
      explicacao: 'Diz que faltam dados.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2016', ''], ['A', '2017', ''], ['A', '2018', '12'],
        ['B', '2015', ''], ['B', '2016', '8'], ['B', '2017', ''], ['B', '2018', ''],
        ['C', '2015', '5'], ['C', '2016', ''], ['C', '2017', '7'], ['C', '2018', ''],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: false,
  },
  {
    nome: 'trajectoria POR PROVINCIA no mesmo ficheiro esparso: bloqueia',
    evidencia: {
      tipo: 'cobertura_dados_insuficiente',
      exigido: 'evolução da produção por província entre 2015 e 2018',
      disponivel: 'ficheiro com 48,5% preenchido',
      explicacao: 'A linha de cada província seria feita de buracos.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [
        ['A', '2015', '10'], ['A', '2016', ''], ['A', '2017', ''], ['A', '2018', '12'],
        ['B', '2015', ''], ['B', '2016', '8'], ['B', '2017', ''], ['B', '2018', ''],
        ['C', '2015', '5'], ['C', '2016', ''], ['C', '2017', '7'], ['C', '2018', ''],
      ],
      nivelLigacao: 'admin1',
    }),
    esperado: true,
  },
  {
    // Caso real: perguntaram se existe RELACAO entre duas variaveis (correlacao transversal) e o
    // modelo bloqueou por nao conseguir provar a direccao CAUSAL, que exigiria serie anual. Ninguem
    // pediu a causa. Bloquear por uma capacidade nao pedida recusa trabalho que estava bem feito.
    nome: 'pergunta transversal bloqueada por falta de serie: recusa o bloqueio',
    pergunta: 'Existe relação entre a percentagem de mulheres testadas para HIV e a prevalência do HIV?',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'múltiplos anos de testagem e de prevalência por província',
      disponivel: 'poucas observações, concentradas em poucos anos',
      explicacao: 'Sem série anual não se distingue a direcção causal.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [['A', '2015', '10'], ['B', '2015', '8'], ['C', '2015', '5']],
      nivelLigacao: 'admin1',
    }),
    esperado: false,
  },
  {
    nome: 'a mesma lacuna quando a pergunta PEDE evolucao: bloqueia',
    pergunta: 'Como evoluiu a testagem de HIV ao longo do tempo?',
    evidencia: {
      tipo: 'serie_temporal_insuficiente',
      exigido: 'múltiplos anos de testagem',
      disponivel: 'um único ano',
      explicacao: 'Só existe um período.',
    },
    ctx: contexto({
      colunas: ['provincia', 'ano', 'value'],
      linhas: [['A', '2015', '10'], ['B', '2015', '8'], ['C', '2015', '5']],
      nivelLigacao: 'admin1',
    }),
    esperado: true,
  },
  {
    nome: 'evidência sem explicação: recusa o bloqueio',
    evidencia: {
      tipo: 'variavel_ausente',
      exigido: 'orçamento',
      termo_ausente: 'orcamento',
      disponivel: 'nada',
      explicacao: '   ',
    },
    ctx: contexto({ colunas: ['provincia'] }),
    esperado: false,
  },
  {
    nome: 'evidência sem termo_ausente: recusa o bloqueio',
    evidencia: {
      tipo: 'variavel_ausente',
      exigido: 'os dados sobre o orcamento municipal',
      disponivel: 'nada',
      explicacao: 'Faltam dados.',
    },
    ctx: contexto({ colunas: ['provincia'] }),
    esperado: false,
  },
]

let falhas = 0
for (const caso of casos) {
  const resultado = verificarEvidencia(
    caso.evidencia,
    caso.ctx,
    caso.pergunta ?? 'como evoluiu entre 2015 e 2024'
  )
  const passou = resultado.aceite === caso.esperado
  if (!passou) falhas++
  const marca = passou ? 'OK  ' : 'FALHA'
  const detalhe = resultado.aceite ? 'bloqueio aceite' : `bloqueio recusado: ${resultado.razao}`
  console.log(`${marca} ${caso.nome}\n      -> ${detalhe}`)
}

console.log(`\n${casos.length - falhas}/${casos.length} casos correctos`)
if (falhas > 0) process.exit(1)
