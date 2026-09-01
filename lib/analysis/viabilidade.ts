import type { ContextoExecucao } from './executor'
import type { NivelAdmin } from './dados'
import type { EvidenciaLacuna } from './types'

/**
 * Portão de viabilidade: decide se uma análise chega a ser publicada.
 *
 * O estágio de Suficiência já dizia o que os dados não cobrem, mas era puramente consultivo: o
 * pipeline seguia sempre para Execução e Narrativa, e a Narrativa escrevia a melhor análise
 * possível com o que houvesse. Quando os dados não respondiam à pergunta feita, isso produzia uma
 * resposta a OUTRA pergunta, apresentada com a mesma confiança visual de uma resposta certa.
 *
 * Este módulo é a metade céptica dessa decisão. O modelo propõe o veredicto; aqui verifica-se a
 * prova contra a estrutura real dos dados já carregados antes de aceitar um bloqueio. É a mesma
 * disciplina de `resolverNarrativa` (um {{calc:}} que não resolve rebenta em vez de passar): o
 * modelo nunca é a autoridade final sobre um facto que o código consegue confirmar sozinho.
 */

/**
 * Em modo sombra o veredicto é calculado, verificado e registado, mas a análise é publicada na
 * mesma. Serve para medir em perguntas reais quantas seriam bloqueadas, e se com razão, antes de
 * deixar o motor recusar trabalho a utilizadores. Passar a `activo` liga o bloqueio.
 */
export function modoPortao(): 'sombra' | 'activo' {
  return process.env.ANALISE_PORTAO === 'activo' ? 'activo' : 'sombra'
}

/**
 * O que o motor sabia no momento em que desistiu.
 *
 * Recusar sem guardar isto foi um erro caro: durante semanas as análises `inviavel` gravaram só a
 * narrativa, e `plano`, `resultados` e `achados` ficavam a zero. Quando duas recusas seguidas
 * disseram "1 passo(s) falharam", não havia como saber QUAL passo, porque a única cópia do plano
 * tinha sido deitada fora com o resto. Uma recusa é a altura em que a prova mais faz falta, não a
 * altura de a apagar.
 */
export type DiagnosticoInviavel = {
  /** Onde a decisão foi tomada: antes de executar, ou depois de os cálculos correrem. */
  portao: 'antes_da_execucao' | 'depois_da_execucao'
  plano: unknown
  /** Avisos acumulados na execução, incluindo o texto de cada passo que não pôde ser executado. */
  avisos: string[]
  /** Descrições dos passos que falharam, já isoladas dos avisos gerais. */
  passos_falhados: string[]
  /** Cálculos que chegaram a ficar prontos antes da desistência. */
  calcs: unknown
}

export class AnaliseInviavelError extends Error {
  readonly evidencia: EvidenciaLacuna
  readonly diagnostico: DiagnosticoInviavel | null

  constructor(evidencia: EvidenciaLacuna, diagnostico: DiagnosticoInviavel | null = null) {
    super(`Análise inviável: ${evidencia.tipo} (exigido: ${evidencia.exigido})`)
    this.name = 'AnaliseInviavelError'
    this.evidencia = evidencia
    this.diagnostico = diagnostico
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim()
}

/**
 * Palavras demasiado comuns para servirem de prova de que um assunto está (ou não) nos dados.
 * Inclui o vocabulário de analista ("total", "media", "dados") porque aparece em quase todos os
 * nomes de coluna do portal: deixá-lo entrar faria qualquer evidência parecer refutada.
 */
const VAZIAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
  'que', 'qual', 'quais', 'quantos', 'quantas', 'onde', 'como', 'sobre', 'entre', 'cada',
  'dados', 'dado', 'total', 'totais', 'valor', 'valores', 'numero', 'numeros', 'media', 'medias',
  'coluna', 'colunas', 'variavel', 'variaveis', 'informacao', 'informacoes', 'nivel', 'niveis',
  'ano', 'anos', 'periodo', 'periodos', 'nome', 'nomes', 'tipo', 'tipos', 'codigo', 'codigos',
])

/** Termos com carga semântica suficiente para procurar nos dados. */
function termosSignificativos(texto: string): string[] {
  return Array.from(
    new Set(
      normalizar(texto)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4 && !VAZIAS.has(t))
    )
  )
}

/** Até onde se lê cada coluna à procura de um termo. Chega para confirmar presença. */
const MAX_VALORES_VARRIDOS = 4000

/**
 * Procura um termo no vocabulário real dos datasets: nomes de coluna e valores de células.
 *
 * Usa as tabelas já carregadas em memória para esta análise, por isso não custa nenhum acesso
 * extra a disco nem à base de dados.
 */
function termoPresenteNosDados(termo: string, ctx: ContextoExecucao): boolean {
  for (const tabela of Array.from(ctx.tabelas.values())) {
    for (const coluna of tabela.colunas) {
      if (normalizar(coluna).includes(termo)) return true
    }
    const limite = Math.min(tabela.linhas.length, MAX_VALORES_VARRIDOS)
    for (let i = 0; i < limite; i++) {
      for (const celula of tabela.linhas[i]) {
        if (celula && normalizar(String(celula)).includes(termo)) return true
      }
    }
  }
  return false
}

const NIVEL_POR_PALAVRA: Record<string, NivelAdmin> = {
  provincia: 'admin1',
  provincias: 'admin1',
  provincial: 'admin1',
  admin1: 'admin1',
  distrito: 'admin2',
  distritos: 'admin2',
  distrital: 'admin2',
  admin2: 'admin2',
  posto: 'admin3',
  postos: 'admin3',
  administrativo: 'admin3',
  localidade: 'admin3',
  localidades: 'admin3',
  admin3: 'admin3',
}

function nivelPedido(texto: string): NivelAdmin | null {
  for (const palavra of normalizar(texto).split(/[^a-z0-9]+/)) {
    const nivel = NIVEL_POR_PALAVRA[palavra]
    if (nivel) return nivel
  }
  return null
}

/** Colunas cujo nome sugere um eixo temporal, para contar quantos períodos existem mesmo. */
const PADRAO_COLUNA_TEMPORAL = /(^|_|\s)(ano|year|periodo|data|date|mes|month|trimestre)($|_|\s)/i

function periodosDistintos(ctx: ContextoExecucao): number {
  let maximo = 0
  for (const tabela of Array.from(ctx.tabelas.values())) {
    tabela.colunas.forEach((coluna, indice) => {
      if (!PADRAO_COLUNA_TEMPORAL.test(coluna)) return
      const distintos = new Set<string>()
      for (const linha of tabela.linhas) {
        const valor = linha[indice]
        if (valor != null && String(valor).trim() !== '') distintos.add(String(valor).trim())
      }
      maximo = Math.max(maximo, distintos.size)
    })
  }
  return maximo
}

/**
 * Mede se há células suficientes para desenhar uma trajectória por unidade.
 *
 * Uma pergunta como "como evoluiu a produção em cada província entre 2015 e 2024" precisa, por
 * província, de vários anos com valor. Ter dez anos no ficheiro não chega: se metade das células
 * está vazia, a linha de cada província é feita de buracos, e o motor acabava por responder com
 * totais acumulados, que é outra pergunta.
 *
 * Devolve a fracção de células preenchidas e quantos períodos, na mediana, cada unidade tem com
 * valor. Null quando a tabela não tem forma temporal ou não há como saber.
 */
export function coberturaTemporal(
  ctx: ContextoExecucao
): { fraccaoPreenchida: number; periodosMedianos: number; periodosNacionais: number } | null {
  for (const [id, tabela] of Array.from(ctx.tabelas.entries())) {
    const iTempo = tabela.colunas.findIndex((c) => PADRAO_COLUNA_TEMPORAL.test(c))
    if (iTempo === -1) continue

    // Coluna de valores: a genérica dos ficheiros de formato longo, ou a primeira que tenha
    // números a sério. Sem ela não há nada cuja completude medir.
    const preferida = tabela.colunas.findIndex((c) => /^(value|valor|quantidade|total)$/i.test(c.trim()))
    const iValor =
      preferida !== -1
        ? preferida
        : tabela.colunas.findIndex(
            (c, i) =>
              i !== iTempo &&
              tabela.linhas.some((l) => {
                const v = l[i]
                return v != null && String(v).trim() !== '' && Number.isFinite(Number(v))
              })
          )
    if (iValor === -1) continue

    const ligacao = ctx.ligacoes.get(id)
    const preenchida = (v: unknown) => v != null && String(v).trim() !== ''

    /*
     * Períodos INTEIRAMENTE vazios não contam como buracos.
     *
     * Um ano que existe na coluna e não tem um único valor em lado nenhum não é um buraco nos
     * dados: é um ano que ainda não foi recolhido. Uma coluna de anos costuma cobrir a ambição do
     * plano de recolha, não a realidade do ficheiro, e contar esses anos como falhas faz qualquer
     * conjunto de dados com horizonte declarado parecer meio vazio.
     *
     * O caso que obrigou a isto: a produção de cereais tem valores de 2018 a 2024 e a coluna vai de
     * 2015 a 2025. Quatro anos totalmente vazios puxavam a completude para 48,5%, abaixo do limiar,
     * e o portão recusava "mostra a evolução por província no mapa" mesmo com o plano correcto e
     * zero passos falhados. Pior: recusava-a por causa de buracos, quando o método que a análise ia
     * usar (mapas por período) existe precisamente para mostrar onde faltam dados. A ferramenta que
     * resolve o problema era barrada por o problema existir.
     */
    const periodosComAlgum = new Set<string>()
    tabela.linhas.forEach((linha) => {
      if (preenchida(linha[iValor])) periodosComAlgum.add(String(linha[iTempo] ?? '').trim())
    })

    let comValor = 0
    let linhasContadas = 0
    // Períodos com dados no país inteiro, independentemente de que unidade os trouxe: é o que
    // sustenta uma trajectória nacional.
    const periodosNacionais = new Set<string>()
    const periodosPorUnidade = new Map<string, Set<string>>()
    tabela.linhas.forEach((linha, indice) => {
      const periodoDaLinha = String(linha[iTempo] ?? '').trim()
      if (!periodosComAlgum.has(periodoDaLinha)) return
      linhasContadas++
      const temValor = preenchida(linha[iValor])
      if (temValor) comValor++
      if (!temValor) return
      const unidade = ligacao?.ligacoes?.get(indice) ?? '__todas__'
      const periodo = String(linha[iTempo] ?? '').trim()
      if (!periodo) return
      periodosNacionais.add(periodo)
      if (!periodosPorUnidade.has(unidade)) periodosPorUnidade.set(unidade, new Set())
      periodosPorUnidade.get(unidade)!.add(periodo)
    })

    if (linhasContadas === 0 || periodosPorUnidade.size === 0) continue
    const contagens = Array.from(periodosPorUnidade.values())
      .map((s) => s.size)
      .sort((a, b) => a - b)
    const meio = Math.floor(contagens.length / 2)
    return {
      fraccaoPreenchida: comValor / linhasContadas,
      periodosMedianos:
        contagens.length % 2 ? contagens[meio] : (contagens[meio - 1] + contagens[meio]) / 2,
      periodosNacionais: periodosNacionais.size,
    }
  }
  return null
}

/** Abaixo disto, uma trajectória por unidade é feita mais de buracos do que de dados. */
const MIN_FRACCAO_PREENCHIDA = 0.7
/**
 * Menos períodos do que isto por unidade não desenha uma evolução, desenha pontos soltos.
 *
 * Três é o mínimo com que se fala de tendência, e não quatro: começou em quatro e a bateria
 * apanhou logo o exagero, ao bloquear uma série de três anos completos que é legítima. O caso real
 * que motivou esta verificação (48,5% de células vazias) continua a ser travado pela fracção
 * preenchida, que é o sinal certo para ele.
 */
const MIN_PERIODOS_POR_UNIDADE = 3

/** Uma pergunta que pede a série DE CADA unidade, e não um total ou uma série nacional. */
export function pedeTrajectoriaPorUnidade(texto: string): boolean {
  return /(por|em cada|de cada)\s+(provincia|distrito|posto|unidade|municipio)/.test(normalizar(texto))
}

/**
 * Aplica a uma pergunta proposta o MESMO critério de cobertura que o portão usará sobre ela.
 *
 * Existe para as sugestões não prometerem o que o portão vai recusar. Verificado ao vivo: o motor
 * sugeriu uma evolução, o utilizador clicou, e foi bloqueada — as sugestões validavam que as
 * colunas e o método existiam, enquanto o portão media a cobertura, e ninguém confrontava as duas
 * regras. Partilhar a função é o que garante que continuam a dizer o mesmo.
 */
export function coberturaChegaPara(texto: string, ctx: ContextoExecucao): boolean {
  const cobertura = coberturaTemporal(ctx)
  if (!cobertura) return true // sem eixo temporal, esta regra não se aplica
  if (!/(evolu|tendenc|traject|ao longo do tempo|entre \d{4})/.test(normalizar(texto))) return true

  return pedeTrajectoriaPorUnidade(texto)
    ? cobertura.fraccaoPreenchida >= MIN_FRACCAO_PREENCHIDA &&
        cobertura.periodosMedianos >= MIN_PERIODOS_POR_UNIDADE
    : cobertura.periodosNacionais >= MIN_PERIODOS_POR_UNIDADE
}

export type ResultadoVerificacao = { aceite: true } | { aceite: false; razao: string }

/**
 * Confirma que a prova apresentada para bloquear bate certo com os dados carregados.
 *
 * Falha sempre em segurança: quando a verificação não consegue confirmar a lacuna, ou quando
 * encontra sinais de que a lacuna não existe, o bloqueio é recusado e a análise segue como
 * parcial. Publicar com ressalvas serve alguém; bloquear por engano não serve ninguém.
 */
/** A pergunta pede mesmo alguma coisa ao longo do tempo? */
function perguntaPedeTempo(pergunta: string): boolean {
  return /(evolu|tendenc|traject|ao longo do tempo|desde |ate |entre \d{4}|\d{4}\s*(e|a)\s*\d{4}|crescimento|variacao|aumentou|diminuiu|antes|depois)/.test(
    normalizar(pergunta)
  )
}

export function verificarEvidencia(
  evidencia: EvidenciaLacuna | undefined,
  ctx: ContextoExecucao,
  pergunta?: string
): ResultadoVerificacao {
  if (!evidencia) {
    return { aceite: false, razao: 'veredicto insuficiente sem evidência preenchida' }
  }

  // Recusar por falta de série temporal só faz sentido se a PERGUNTA pedir tempo. Verificado ao
  // vivo, e é uma recusa que custa caro: perguntaram "existe relação entre testagem e prevalência
  // de HIV", uma correlação transversal que o próprio modelo declarou "calculável", e o bloqueio
  // veio porque sem série anual não se prova a direcção causal. Só que ninguém perguntou pela
  // causa. Bloquear por uma capacidade que o utilizador não pediu é o pior tipo de excesso de zelo:
  // recusa trabalho que estava a ser bem feito.
  const eTemporal =
    evidencia.tipo === 'serie_temporal_insuficiente' || evidencia.tipo === 'cobertura_dados_insuficiente'
  if (eTemporal && pergunta !== undefined && !perguntaPedeTempo(pergunta)) {
    return {
      aceite: false,
      razao: 'a pergunta não pede evolução nem comparação entre períodos, logo a falta de série temporal não a impede',
    }
  }
  if (!evidencia.exigido?.trim() || !evidencia.explicacao?.trim()) {
    return { aceite: false, razao: 'evidência sem "exigido" ou "explicacao" preenchidos' }
  }

  switch (evidencia.tipo) {
    // Não passa por refutação nenhuma: o código VIU o passo falhar. Todos os outros tipos são
    // afirmações do modelo sobre os dados, e por isso têm de ser confirmadas contra o ficheiro
    // antes de se recusar trabalho a alguém. Este é um facto observado pelo próprio pipeline.
    case 'execucao_falhou':
      return { aceite: true }

    // O assunto/variável não existe nos dados. Refuta-se mostrando que existe: se qualquer termo
    // com carga semântica do que foi exigido aparece num nome de coluna ou num valor, os dados
    // falam do assunto e o bloqueio cai.
    case 'variavel_ausente':
    case 'dominio_diferente':
    case 'cobertura_geografica': {
      // Usa `termo_ausente` e nunca a prosa de `exigido`: a frase descreve ao mesmo tempo a medida
      // que falta e o objecto que existe ("contagem de passageiros por aeroporto"), por isso
      // procurá-la inteira encontrava sempre o objecto e concluía que nada faltava.
      const termos = termosSignificativos(evidencia.termo_ausente ?? '')
      if (termos.length === 0) {
        return {
          aceite: false,
          razao: 'evidência sem "termo_ausente" concreto que se possa procurar nos dados',
        }
      }
      // Exige que TODAS as palavras do termo estejam ausentes. Se alguma aparece, os dados falam
      // de algo suficientemente próximo para não se recusar a análise por causa disso.
      const presente = termos.find((t) => termoPresenteNosDados(t, ctx))
      if (presente) {
        return {
          aceite: false,
          razao: `"${presente}" aparece nos dados (coluna ou valor), logo o assunto não está ausente`,
        }
      }
      return { aceite: true }
    }

    // A pergunta pede um nível mais fino do que os dados dão. Refuta-se mostrando que existe uma
    // ligação geográfica detectada nesse nível ou mais fina: se existe, dá para responder.
    case 'granularidade_insuficiente': {
      const pedido = nivelPedido(evidencia.exigido)
      if (!pedido) {
        return { aceite: false, razao: 'evidência não nomeia um nível administrativo reconhecível' }
      }
      const ordem: Record<NivelAdmin, number> = { admin1: 1, admin2: 2, admin3: 3 }
      for (const ligacao of Array.from(ctx.ligacoes.values())) {
        if (ligacao && ordem[ligacao.nivel as NivelAdmin] >= ordem[pedido]) {
          return {
            aceite: false,
            razao: `existe ligação geográfica detectada ao nível ${ligacao.nivel}, que cobre o pedido (${pedido})`,
          }
        }
      }
      return { aceite: true }
    }

    // A pergunta pede evolução e os dados têm um só período. Refuta-se contando os períodos
    // realmente distintos nas colunas temporais.
    case 'serie_temporal_insuficiente': {
      const periodos = periodosDistintos(ctx)
      if (periodos > 1) {
        // Antes de deixar passar, mede a cobertura. As duas lacunas são vizinhas e os nomes
        // parecidos: verificado ao vivo, o modelo marcou "serie_temporal_insuficiente" num caso que
        // era de cobertura (11 anos no ficheiro, 48,5% das células vazias), e a evidência descrevia
        // correctamente o problema. Recusar por causa da gaveta escolhida seria publicar uma
        // evolução por província desenhada a partir de buracos, que é o que se quer evitar.
        const cobertura = coberturaTemporal(ctx)
        const escassa =
          !!cobertura &&
          (cobertura.fraccaoPreenchida < MIN_FRACCAO_PREENCHIDA ||
            cobertura.periodosMedianos < MIN_PERIODOS_POR_UNIDADE)
        if (escassa) return { aceite: true }
        return {
          aceite: false,
          razao: `os dados têm ${periodos} períodos distintos, logo há série temporal para comparar`,
        }
      }
      return { aceite: true }
    }

    // Os períodos existem mas estão vazios de mais para a trajectória pedida. Refuta-se mostrando
    // que a cobertura afinal chega: aí a evolução é calculável e a análise deve sair.
    case 'cobertura_dados_insuficiente': {
      const cobertura = coberturaTemporal(ctx)
      if (!cobertura) {
        return { aceite: false, razao: 'não foi possível medir a cobertura temporal destes dados' }
      }

      // A exigência de cobertura depende do que a pergunta pede. Uma trajectória POR UNIDADE
      // precisa da série de cada província; uma trajectória NACIONAL soma-as todas, e os buracos de
      // cada província deixam de importar desde que o país tenha valores em anos suficientes.
      //
      // Sem esta distinção, o teste media o ficheiro inteiro (48,5% preenchido) e condenava tudo o
      // que lhe tocasse: verificado ao vivo, bloqueou a tendência nacional de milho, que é
      // perfeitamente calculável, e ainda por cima era uma sugestão do próprio motor.
      // A mesma função que as sugestões usam antes de oferecer uma pergunta. Duas cópias da regra
      // divergem com o tempo, e foi assim que o motor chegou a sugerir uma análise que ele próprio
      // recusava a seguir.
      const pedePorUnidade = pedeTrajectoriaPorUnidade(evidencia.exigido)
      if (!pedePorUnidade) {
        if (cobertura.periodosNacionais >= MIN_PERIODOS_POR_UNIDADE) {
          return {
            aceite: false,
            razao:
              `a pergunta não é por unidade e existem ${cobertura.periodosNacionais} períodos com ` +
              `dados no total, o que chega para uma trajectória nacional`,
          }
        }
        return { aceite: true }
      }

      const escassa =
        cobertura.fraccaoPreenchida < MIN_FRACCAO_PREENCHIDA ||
        cobertura.periodosMedianos < MIN_PERIODOS_POR_UNIDADE
      if (!escassa) {
        return {
          aceite: false,
          razao:
            `a cobertura chega para uma trajectória: ${(cobertura.fraccaoPreenchida * 100).toFixed(1)}% ` +
            `de células preenchidas e ${cobertura.periodosMedianos} períodos por unidade na mediana`,
        }
      }
      return { aceite: true }
    }

    default:
      return { aceite: false, razao: 'tipo de lacuna desconhecido' }
  }
}

/**
 * O travessão é proibido em texto visível deste portal, e estes campos vêm do modelo e vão
 * directos para o ecrã. A instrução no prompt cobre o caso normal; isto garante o resultado
 * mesmo quando o modelo a ignora, tal como já se faz na API do chatbot.
 */
export function limparTextoVisivel(texto: string): string {
  return texto.replace(/\s*—\s*/g, ': ').replace(/\s*–\s*/g, ': ')
}
