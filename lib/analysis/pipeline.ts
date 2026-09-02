import { randomBytes } from 'crypto'
import { findDatasetsByIds } from '@/lib/db'
import { catalogoParaPrompt } from './library'
import { chamarEstagio, custoUsd, modeloPara } from './router'
import { criarContexto, executarPasso, gerarGraficosDeGarantia, desambiguarRotulosSeries, type ContextoExecucao } from './executor'
import { eLacunaPopulacional, tentarEnriquecerPopulacao } from './enriquecimento'
import { tentarEnriquecerExterno } from './enriquecimento-externa'
import { formatarCelula, resolverNarrativa, TokenPorResolverError } from './render'
import { formatarExemploFewShot, guardarPlanoResolvido, procurarPlanoSemelhante } from './memoria'
import { obterPerfilDataset, formatarPerfilParaPrompt } from './perfil'
import { calcularConfianca, type ConfiancaAnalise } from './confianca'
import { AnaliseInviavelError, limparTextoVisivel, modoPortao, verificarEvidencia } from './viabilidade'
import { manifestoProvisorio } from '@/lib/semantic/schema'
import { logger } from '@/lib/logger'
import {
  PROMPT_PLANEAMENTO_COMPLETO,
  PROMPT_SUFICIENCIA,
  PROMPT_NARRATIVA,
  PROMPT_CRITICA,
  SCHEMA_PLANEAMENTO_COMPLETO,
  SCHEMA_SUFICIENCIA,
  SCHEMA_NARRATIVA,
  SCHEMA_CRITICA,
} from './prompts'
import type {
  Achado,
  Compreensao,
  Critica,
  EventoPipeline,
  Narrativa,
  Objeccao,
  PassoPlano,
  Plano,
  Suficiencia,
} from './types'

export function novoIdAnalise(): string {
  return `an_${randomBytes(4).toString('hex')}`
}

type Emissor = (evento: EventoPipeline) => void

export type ResultadoPipeline = {
  analise_id: string
  compreensao: Compreensao
  plano: Plano
  suficiencia: Suficiencia
  contexto: ContextoExecucao
  achados: Achado[]
  narrativa: Narrativa
  narrativa_resolvida: ReturnType<typeof resolverNarrativa>
  critica: Critica
  custo_usd: number
  // Melhor esforço: cobre os estágios chamados directamente por este ficheiro (planeamento,
  // suficiência, narrativa, crítica) — a maior parte do consumo real. Não inclui os tokens
  // consumidos dentro de `tentarEnriquecerExterno` nem de `execucao-codigo.ts`, que só devolvem
  // o custo já convertido em USD, não os tokens brutos; esse custo continua incluído em
  // `custo_usd`, só não neste total de tokens.
  tokens_entrada: number
  tokens_saida: number
  duracao_ms: number
  confianca: ConfiancaAnalise
}

/**
 * Descrição estável dos datasets, enviada sob prompt caching a todos os estágios.
 *
 * Usa o manifesto provisório derivado dos metadados do portal quando não existe manifesto
 * aprovado: assim o motor funciona desde já sobre os 40 datasets existentes, em vez de exigir
 * que todos sejam processados primeiro.
 */
async function contextoDatasets(datasetIds: number[], ctx: ContextoExecucao): Promise<string> {
  const datasets = await findDatasetsByIds(datasetIds)
  // PLANO-ARQUITETURA-DUAS-FASES.md: perfil calculado uma vez por dataset (cache em
  // dataset_perfis), não recalculado a cada análise — o Planeamento passa a "saber" as colunas,
  // tipos e correlações fortes de antemão em vez de as adivinhar a partir de 3 linhas de amostra.
  // Best-effort: nunca lança (obterPerfilDataset já engole os próprios erros), por isso um dataset
  // sem perfil ainda calculado não bloqueia nada, só fica com menos contexto, como sempre foi.
  const perfis = await Promise.all(datasets.map((d: any) => obterPerfilDataset(d.id)))
  const perfilPorId = new Map<number, Awaited<ReturnType<typeof obterPerfilDataset>>>(
    datasets.map((d: any, i: number) => [d.id, perfis[i]])
  )

  const blocos = datasets.map((d: any) => {
    const m = manifestoProvisorio(d)
    const tabela = ctx.tabelas.get(d.id)
    const ligacao = ctx.ligacoes.get(d.id)
    const perfil = perfilPorId.get(d.id)

    const linhas = [
      `## Dataset ${d.id}: ${m.titulo}`,
      `Fonte: ${m.fonte.instituicao} (${d.year})`,
      `Tipo: ${d.dataType} | Cobertura: ${m.cobertura_geografica} | Nível mínimo declarado: ${m.nivel_geografico_min}`,
      `Descrição: ${m.descricao_curta}`,
    ]

    if (tabela) {
      linhas.push(`Linhas: ${tabela.n_linhas}${tabela.truncado ? ' (truncado)' : ''}`)
      linhas.push(`Colunas: ${tabela.colunas.join(', ')}`)
    }

    if (perfil) {
      linhas.push(formatarPerfilParaPrompt(perfil))
    } else if (tabela) {
      // Sem perfil ainda calculado (dataset novo ou primeira vez): a amostra pequena continua a
      // servir de rede de segurança para o planeador ver a forma dos valores.
      const amostra = tabela.linhas.slice(0, 3).map((l) => l.slice(0, 10).join(' | '))
      if (amostra.length) linhas.push(`Amostra:\n${amostra.join('\n')}`)
    }

    if (ligacao) {
      linhas.push(
        `Ligação geográfica detectada: coluna "${ligacao.coluna_usada}" ao nível ${ligacao.nivel} ` +
          `(${(ligacao.taxa_correspondencia * 100).toFixed(1)}% de correspondência, método ${ligacao.metodo}). ` +
          `É este o nível mais fino disponível: usa-o (R4).`
      )
    } else {
      linhas.push('Sem ligação geográfica automática: não planeies passos geoestatísticos.')
    }

    return linhas.join('\n')
  })

  return `# DATASETS SELECCIONADOS\n\n${blocos.join('\n\n')}\n\n# CATÁLOGO DE MÉTODOS\n${catalogoParaPrompt()}`
}

export async function executarPipeline(
  pergunta: string,
  datasetIds: number[],
  emitir: Emissor = () => {},
  analiseId: string = novoIdAnalise(),
  // Pesquisa externa (web_search/web_fetch) é a maior fatia de tempo variável de uma análise —
  // uma só chamada pode ir até 150s, e cada análise pode disparar até 3 (população + 2 outros
  // alvos). Por omissão fica desligada para caber no orçamento de 30-60s; quem quiser fontes
  // fora do portal pede-o explicitamente (opcoes.fontesExternas), sabendo que vai demorar mais.
  // modoDegradado (PLANO-MOTOR-FINAL.md, secção 3): rede de segurança para a retentativa em
  // route.ts. Repetir o mesmo plano depois de uma falha costuma falhar pela mesma razão (ex.:
  // plano grande a mais); em modo degradado o pedido ao Planeamento pede explicitamente um plano
  // mínimo (2-3 sub-perguntas) e a Crítica não corre, para maximizar a chance de a segunda
  // tentativa produzir alguma coisa em vez de repetir o erro.
  opcoes: { fontesExternas?: boolean; modoDegradado?: boolean } = {}
): Promise<ResultadoPipeline> {
  const inicio = Date.now()
  let custo = 0
  let tokensEntrada = 0
  let tokensSaida = 0
  // Modo degradado força fontesExternas=false independentemente do que foi pedido: pesquisa
  // externa pode levar até 150s e é mais um ponto de falha — a retentativa quer é terminar.
  if (opcoes.modoDegradado) opcoes = { ...opcoes, fontesExternas: false }

  // PLANO-ROTULOS-E-VELOCIDADE.md, Frente B Fase 1: antes de cortar tempo de análise, medir onde
  // ele vai de facto — sem isto, qualquer optimização é palpite. Marca-se o instante de cada
  // "estagio_inicio" já emitido para a UI (não é um evento novo, só um registo local do mesmo
  // sinal) e, no fim, calcula-se a duração de cada estágio pela diferença entre marcos
  // consecutivos. Só regista em log (logger.info), nunca é persistido na análise nem afecta o
  // que o utilizador vê — puramente instrumentação para decidir a Fase 2/3 do plano com números
  // reais em vez de adivinhar.
  const marcosEstagios: { estagio: string; t: number }[] = []
  const emitirOriginal = emitir
  emitir = (evento) => {
    if (evento.tipo === 'estagio_inicio') marcosEstagios.push({ estagio: evento.estagio, t: Date.now() })
    emitirOriginal(evento)
  }

  // ---------- Carregamento de dados (antes dos estágios: o planeador precisa de ver os dados) ----------
  emitir({ tipo: 'estagio_inicio', estagio: 'compreensao', descricao_humana: 'A ler os dados seleccionados' })
  const ctx = await criarContexto(datasetIds)
  if (ctx.tabelas.size === 0) {
    throw new Error('Nenhum dos datasets seleccionados pôde ser lido')
  }
  const contextoEstavel = await contextoDatasets(datasetIds, ctx)

  // ---------- 1+2. Compreensão + Planeamento fundidos (Etapa 7) ----------
  // Antes eram duas chamadas: Compreensão respondia, o resultado era serializado de volta em
  // JSON dentro do prompt do Planeamento, que o lia outra vez. Uma volta de rede inteira só para
  // reler o que o próprio modelo tinha acabado de perceber. Agora é uma chamada só: o modelo
  // interpreta e planeia no mesmo raciocínio, com estritamente mais contexto disponível ao
  // planear (nunca menos), e emite os dois conjuntos de campos no mesmo schema.
  emitir({ tipo: 'estagio_inicio', estagio: 'planeamento', descricao_humana: 'A interpretar a pergunta e planear a análise' })

  // Fase 4 (memória entre análises): se uma pergunta parecida sobre exactamente os mesmos
  // datasets já foi respondida com sucesso, o plano encontrado entra como exemplo few-shot — não
  // substitui o raciocínio do modelo, só lhe dá um ponto de partida já testado. Best-effort: uma
  // falha aqui (ex.: tabela ainda não migrada) não pode impedir a análise de correr.
  let exemploFewShot = ''
  const tAntesMemoria = Date.now()
  try {
    const planoSemelhante = await procurarPlanoSemelhante(pergunta, datasetIds)
    if (planoSemelhante) exemploFewShot = formatarExemploFewShot(planoSemelhante)
  } catch {
    // silencioso: memória é uma optimização, não uma dependência da análise
  }
  // Instrumentação temporária (PLANO-ROTULOS-E-VELOCIDADE.md): o bucket "planeamento" no log
  // duracao_estagios_analise apareceu 3-10x maior do que a duração da própria chamada ao modelo
  // (logada em [analise:tempo]), sem nenhum código visível entre as duas marcas que explicasse a
  // diferença — isto isola se é a procura de memória (pouco provável, tabela pequena e indexada)
  // ou algo antes da própria chamada ao SDK.
  console.log(`[analise:tempo:detalhe] procurarPlanoSemelhante em ${Date.now() - tAntesMemoria}ms`)
  const tAntesChamada = Date.now()

  const rCompleto = await chamarEstagio<Omit<Compreensao, 'pergunta_original'> & Plano>({
    estagio: 'planeamento',
    sistema: PROMPT_PLANEAMENTO_COMPLETO,
    contextoEstavel,
    utilizador:
      `Pergunta do utilizador:\n${pergunta}\n\n` +
      `Interpreta a pergunta e planeia a análise. Usa exclusivamente métodos do catálogo e colunas que existem nos datasets.` +
      (opcoes.modoDegradado
        ? '\n\nModo de segurança: a tentativa anterior falhou. Faz um plano MÍNIMO desta vez — no ' +
          'máximo 2 sub-perguntas e 4 passos, só com os métodos mais simples e directos ' +
          '(resumo_estatistico, comparar_grupos, perfil_coluna), sem geoestatística avançada nem ' +
          'execucao_codigo. É preferível responder a menos com segurança do que arriscar falhar outra vez.'
        : '') +
      exemploFewShot,
    schema: SCHEMA_PLANEAMENTO_COMPLETO,
    // 12000 chegava para a maioria das perguntas, mas uma pergunta com vários critérios
    // simultâneos (ex.: cruzar 3+ condições geográficas/temporais) gera um plano com muitas
    // sub_perguntas e passos, e truncava aqui em vez de produzir um plano mais pequeno — a
    // etapa falhava por completo em vez de responder com um plano genuinamente maior. Em modo
    // degradado o plano pedido é pequeno de propósito, por isso um tecto menor já chega.
    maxTokens: opcoes.modoDegradado ? 6000 : 20000,
  })
  console.log(`[analise:tempo:detalhe] chamarEstagio(planeamento) visto de fora em ${Date.now() - tAntesChamada}ms`)
  custo += custoUsd(modeloPara('planeamento'), rCompleto.tokens_entrada, rCompleto.tokens_saida)
  tokensEntrada += rCompleto.tokens_entrada
  tokensSaida += rCompleto.tokens_saida
  const compreensao: Compreensao = { ...rCompleto.dados, pergunta_original: pergunta }
  const plano: Plano = {
    sub_perguntas: rCompleto.dados.sub_perguntas,
    passos: rCompleto.dados.passos,
    nivel_geo_alvo: rCompleto.dados.nivel_geo_alvo,
    metricas_alvo: rCompleto.dados.metricas_alvo,
    justificacao_arquetipo: rCompleto.dados.justificacao_arquetipo,
  }
  emitir({
    tipo: 'plano_pronto',
    passos: plano.passos.map((p) => ({ id: p.id, descricao_humana: p.descricao_humana })),
  })

  // ---------- 3. Suficiência ----------
  emitir({ tipo: 'estagio_inicio', estagio: 'suficiencia', descricao_humana: 'A verificar se os dados chegam' })
  const rSuficiencia = await chamarEstagio<Suficiencia>({
    estagio: 'suficiencia',
    sistema: PROMPT_SUFICIENCIA,
    contextoEstavel,
    utilizador: `Pergunta: ${pergunta}\n\nPlano:\n${JSON.stringify(plano, null, 2)}`,
    schema: SCHEMA_SUFICIENCIA,
    maxTokens: 8000,
  })
  custo += custoUsd(modeloPara('suficiencia'), rSuficiencia.tokens_entrada, rSuficiencia.tokens_saida)
  tokensEntrada += rSuficiencia.tokens_entrada
  tokensSaida += rSuficiencia.tokens_saida
  const suficiencia = rSuficiencia.dados

  // ---------- 3b. Portão de viabilidade ----------
  // Fica aqui, e não mais à frente, porque é o último ponto barato: a seguir vêm enriquecimento,
  // execução e narrativa, que são o grosso do tempo e do custo. Uma pergunta que os dados não
  // respondem passa assim a custar duas chamadas curtas em vez de uma análise inteira.
  //
  // O veredicto do modelo sozinho não basta para recusar trabalho a um utilizador: é o mesmo
  // modelo que acabou de planear a análise a dizer se ela é possível. Só bloqueia quando o código
  // confirma a prova contra os dados já carregados (ver `verificarEvidencia`), e qualquer dúvida
  // resolve-se a publicar.
  {
    // Verifica sempre que houver evidência, mesmo num veredicto "parcial".
    //
    // A gravidade que o modelo atribui oscila entre corridas: a mesma pergunta sobre os mesmos
    // dados saiu "insuficiente" com confiança 0 numa corrida e "parcial" com 0,72 na seguinte,
    // com a mesma evidência correcta nas duas. O que não oscila é o facto: ou o código confirma a
    // lacuna contra os dados carregados, ou não confirma. É esse facto que decide, e não o rótulo
    // de severidade, pela mesma razão que levou a exigir evidência desde o início.
    const verificacao = suficiencia.evidencia
      ? verificarEvidencia(suficiencia.evidencia, ctx, pergunta)
      : null
    const modo = modoPortao()
    // Regista TODOS os veredictos, não só os que bloqueiam. Sem as linhas de "suficiente" e
    // "parcial" não haveria como ver, ao rever o modo sombra, as perguntas que deviam ter sido
    // travadas e não foram: só se veria o que o portão apanhou, nunca o que lhe escapou.
    logger.info('portao_viabilidade', {
      analiseId,
      pergunta,
      datasetIds,
      modo,
      veredicto: suficiencia.veredicto,
      confianca: suficiencia.confianca_sem_enriquecimento,
      tipo_lacuna: suficiencia.evidencia?.tipo ?? null,
      termo_ausente: suficiencia.evidencia?.termo_ausente ?? null,
      exigido: suficiencia.evidencia?.exigido ?? null,
      disponivel: suficiencia.evidencia?.disponivel ?? null,
      evidencia_aceite: verificacao ? verificacao.aceite : null,
      razao_recusa: verificacao && !verificacao.aceite ? verificacao.razao : null,
      bloqueou: !!verificacao?.aceite && modo === 'activo',
      // Distingue os bloqueios que vieram de um veredicto "parcial" dos que vieram de
      // "insuficiente". É o número a vigiar no modo sombra: se muitos bloqueios nascerem de
      // "parcial", o portão está a recusar análises que ainda serviam alguém.
      bloqueio_veio_de_parcial: !!verificacao?.aceite && suficiencia.veredicto !== 'insuficiente',
    })

    if (verificacao?.aceite && modo === 'activo') {
      const evidencia = suficiencia.evidencia!
      throw new AnaliseInviavelError(
        {
          ...evidencia,
          explicacao: limparTextoVisivel(evidencia.explicacao),
          exigido: limparTextoVisivel(evidencia.exigido),
          disponivel: limparTextoVisivel(evidencia.disponivel),
        },
        {
          portao: 'antes_da_execucao',
          plano,
          avisos: [...ctx.avisos],
          passos_falhados: [],
          calcs: {},
        }
      )
    }
    // Em modo sombra nada mais acontece de propósito: nem um aviso extra, nem uma nota na
    // narrativa. O objectivo é medir o portão contra perguntas reais sem alterar em nada o que o
    // utilizador recebe, para que os números recolhidos descrevam o motor de hoje.
  }

  // ---------- 4. Enriquecimento ----------
  // R2: antes de aceitar a lacuna, procura-se noutros datasets do portal. Só está implementado
  // para denominador populacional (o único caso com resolução verificada) — outras lacunas não
  // têm um caminho interno genérico ainda, por isso vão directas à cascata externa (4b).
  const alvosPopulacionais = suficiencia.alvos_enriquecimento.filter(eLacunaPopulacional)
  if (suficiencia.precisa_enriquecimento && alvosPopulacionais.length > 0) {
    emitir({
      tipo: 'estagio_inicio',
      estagio: 'enriquecimento',
      descricao_humana: 'A procurar denominadores noutros datasets do portal',
    })
    const niveisNecessarios = (['admin3', 'admin2', 'admin1'] as const).filter((n) =>
      plano.nivel_geo_alvo.includes(n)
    )
    // Um nível por tentativa, não um nível por (alvo x nível): a fonte encontrada é a mesma
    // população nacional independentemente de qual sub-pergunta a pediu, por isso tentar de
    // novo por cada alvo só repetia a mesma pesquisa e produzia avisos quase idênticos sem
    // acrescentar cobertura.
    for (const nivel of niveisNecessarios.length ? niveisNecessarios : (['admin2'] as const)) {
      if (ctx.enriquecimentoPopulacao.has(nivel)) continue
      const fonte = await tentarEnriquecerPopulacao(alvosPopulacionais[0], datasetIds, nivel).catch(() => null)
      if (fonte && !ctx.enriquecimentoPopulacao.has(fonte.nivel)) {
        ctx.enriquecimentoPopulacao.set(fonte.nivel, fonte.porCodigo)
        ctx.avisos.push(
          `Enriquecimento: "${fonte.titulo}" (dataset do portal ${fonte.datasetId}) forneceu ` +
            `população ao nível ${fonte.nivel} para preencher a falta de denominador populacional.` +
            (fonte.nivel !== nivel
              ? ` Só cobre ${fonte.nivel}, mais grosso do que o pedido (${nivel}): a normalização ` +
                `por habitante fica limitada a esse nível.`
              : '')
        )
      }
    }
    if (ctx.enriquecimentoPopulacao.size === 0) {
      ctx.avisos.push(
        `Enriquecimento: procurei no portal por denominador populacional para "${alvosPopulacionais[0].lacuna}" ` +
          `e não encontrei fonte utilizável.`
      )

      // R2, segunda prioridade da cascata: só se chega aqui depois do portal falhar por
      // completo. O modelo pesquisa na web em tempo real; nenhum número dessa pesquisa entra
      // sem primeiro passar pela extracção estruturada e pela ligação por código a
      // geo_unidades, exactamente como a fonte do portal. Fica atrás de opcoes.fontesExternas:
      // cada chamada pode levar até 150s, incompatível com o orçamento de 30-60s por omissão.
      if (opcoes.fontesExternas) {
        emitir({
          tipo: 'estagio_inicio',
          estagio: 'enriquecimento',
          descricao_humana: 'A procurar fontes externas (Banco Mundial, INE, HDX, ...)',
        })
        const { resultado, custoUsd: custoExterno, tentado } = await tentarEnriquecerExterno(
          alvosPopulacionais[0]
        ).catch(() => ({ resultado: null, custoUsd: 0, tentado: false }))
        custo += custoExterno

        if (resultado?.tipo === 'reparticao') {
          ctx.enriquecimentoPopulacao.set(resultado.nivel, resultado.porCodigo)
          ctx.avisos.push(
            `Enriquecimento externo: "${resultado.titulo}"${resultado.ano ? ` (${resultado.ano})` : ''} ` +
              `[${resultado.url}] forneceu população ao nível ${resultado.nivel}, fora do portal, porque ` +
              `nenhum dataset interno cobria esta lacuna.`
          )
        } else if (tentado) {
          ctx.avisos.push(
            `Enriquecimento: procurei também fora do portal por "${alvosPopulacionais[0].lacuna}" ` +
              `e não encontrei uma repartição provincial/distrital numa fonte confirmável; a ` +
              `lacuna mantém-se por declarar.`
          )
        }
      } else {
        ctx.avisos.push(
          `Enriquecimento: pesquisa de fontes externas desligada nesta análise (mais lenta); ` +
            `a lacuna de "${alvosPopulacionais[0].lacuna}" mantém-se por declarar.`
        )
      }
    }
  }

  // ---------- 4b. Enriquecimento externo genérico ----------
  // Qualquer outra lacuna que a Suficiência identificou (não é sobre denominador populacional)
  // vai directa à pesquisa externa: não existe ainda um caminho de extracção genérico para
  // datasets do portal (só o de população, acima, tem forma verificada). Tecto de 2 pesquisas
  // por análise — cada uma custa dinheiro real e tempo real; sem tecto, uma pergunta com muitas
  // sub-perguntas descobertas poderia disparar uma pesquisa web por sub-pergunta. Tal como o
  // bloco 4: só corre se opcoes.fontesExternas for pedido explicitamente.
  const outrosAlvos = opcoes.fontesExternas
    ? suficiencia.alvos_enriquecimento.filter((a) => !eLacunaPopulacional(a)).slice(0, 2)
    : []
  if (outrosAlvos.length === 0 && suficiencia.alvos_enriquecimento.some((a) => !eLacunaPopulacional(a))) {
    ctx.avisos.push(
      'Enriquecimento: pesquisa de fontes externas desligada nesta análise (mais lenta); ' +
        'as lacunas identificadas fora de denominador populacional mantêm-se por declarar.'
    )
  }
  if (outrosAlvos.length > 0) {
    emitir({
      tipo: 'estagio_inicio',
      estagio: 'enriquecimento',
      descricao_humana: 'A procurar fontes externas (Banco Mundial, INE, HDX, ...)',
    })
    let seq = 0
    for (const alvo of outrosAlvos) {
      const { resultado, custoUsd: custoExterno, tentado } = await tentarEnriquecerExterno(alvo).catch(
        () => ({ resultado: null, custoUsd: 0, tentado: false })
      )
      custo += custoExterno

      if (resultado?.tipo === 'escalar') {
        const fonteTexto = `${resultado.titulo}${resultado.ano ? ` (${resultado.ano})` : ''}: ${resultado.url}`
        const idsCriados: string[] = []
        for (const v of resultado.valores) {
          const id = `enriq_ext_${++seq}`
          ctx.calcs[id] = {
            id,
            valor: v.valor,
            unidade: '',
            formato: Number.isInteger(v.valor) ? 'inteiro' : 'decimal',
            passo_id: id,
            proveniencia: { datasets: [], linhas_usadas: 0, metodo: 'enriquecimento_externo', fontes: [fonteTexto] },
          }
          idsCriados.push(id)
        }
        ctx.avisos.push(
          `Enriquecimento externo: "${fonteTexto}" respondeu a "${alvo.lacuna}" com ` +
            `${resultado.valores.map((v) => `${v.nome}: ${v.valor}`).join(', ')}. Estes valores estão ` +
            `disponíveis para citar como {{calc:${idsCriados.join('}}, {{calc:')}}}. É uma fonte externa ` +
            `ao portal: refere-a em "fontes".`
        )
      } else if (resultado?.tipo === 'reparticao') {
        // Repartição administrativa fora do âmbito de denominador populacional (ex.: área por
        // província): fica registada como aviso com os valores, mas não entra em
        // ctx.enriquecimentoPopulacao (isso é exclusivo de denominadores de habitantes).
        const fonteTexto = `${resultado.titulo}${resultado.ano ? ` (${resultado.ano})` : ''}: ${resultado.url}`
        ctx.avisos.push(
          `Enriquecimento externo: "${fonteTexto}" encontrou uma repartição por província para ` +
            `"${alvo.lacuna}", fora do portal. Não foi incorporada nos cálculos automaticamente; ` +
            `considera-a apenas como contexto adicional.`
        )
      } else if (tentado) {
        ctx.avisos.push(
          `Enriquecimento: procurei fora do portal por "${alvo.lacuna}" e não encontrei uma fonte ` +
            `confirmável; a lacuna mantém-se por declarar.`
        )
      }
    }
  }

  // ---------- 5. Execução ----------
  // Passos correm em paralelo (Promise.all), não um a um: a maioria não depende uns dos outros,
  // só lêem tabelas já carregadas em ctx e escrevem em ctx.calcs/series/graficos sob a sua própria
  // chave — JS não tem paralelismo real de memória partilhada, por isso não há corrupção, só
  // menos tempo de relógio quando um passo é I/O-bound (ex.: agregação sobre muitas linhas).
  // Excepção: "juntar_datasets" cria um dataset sintético que passos seguintes podem referenciar
  // por dataset_id — esses têm de correr primeiro e em série, senão o passo que lê o resultado da
  // junção arranca antes dela existir.
  emitir({ tipo: 'estagio_inicio', estagio: 'execucao', descricao_humana: 'A calcular' })
  // Métodos "estruturais" (cruzam dois datasets seleccionados directamente por dataset_id/
  // dataset_id_2) têm de correr aqui sempre, mesmo que o Planeamento os classifique por engano
  // com tipo "enriquecimento" — verificado ao vivo: "Cruza X com Y" soa semanticamente a
  // enriquecimento, e quando isso acontece o passo era descartado em silêncio (nunca corria, nunca
  // entrava em avisos como falhado) e a Narrativa inventava uma razão qualquer para a ausência do
  // resultado, em vez de dizer a verdade. "Enriquecimento" aqui é só a cascata de denominador
  // externo/de outro dataset resolvida no estágio de Suficiência, não estes métodos do catálogo.
  const METODOS_ESTRUTURAIS = new Set([
    'juntar_datasets', 'distancia_minima', 'contagem_buffer', 'distribuicao_categoria_geo', 'execucao_codigo',
  ])
  const passosExecutaveis = plano.passos.filter(
    (p) => p.tipo !== 'enriquecimento' || METODOS_ESTRUTURAIS.has(p.metodo)
  )
  const passosJuncao = passosExecutaveis.filter((p) => p.metodo === 'juntar_datasets')
  const passosNormais = passosExecutaveis.filter((p) => p.metodo !== 'juntar_datasets')

  async function correrPasso(passo: PassoPlano) {
    emitir({ tipo: 'passo_inicio', id: passo.id })
    const t0 = Date.now()
    try {
      await executarPasso(passo, ctx)
      emitir({
        tipo: 'passo_fim',
        id: passo.id,
        resumo: passo.descricao_humana,
        duracao_ms: Date.now() - t0,
      })
      for (const [id, celula] of Object.entries(ctx.calcs)) {
        if (celula.passo_id === passo.id) {
          emitir({ tipo: 'calc_pronto', id, valor: celula.valor, unidade: celula.unidade })
        }
      }
    } catch (erro: any) {
      // Um passo que falha não aborta a análise: entra em avisos e a narrativa terá de
      // declarar a limitação. Abortar tudo por um passo seria pior do que responder ao resto.
      ctx.avisos.push(`Passo "${passo.descricao_humana}" não pôde ser executado: ${erro?.message}`)
      emitir({ tipo: 'passo_fim', id: passo.id, resumo: `falhou: ${erro?.message}`, duracao_ms: Date.now() - t0 })
    }
  }

  // PLANO-ROTULOS-E-VELOCIDADE.md, Frente B Fase 2: junções não dependem umas das outras (só os
  // passos NORMAIS que leem o resultado de uma junção têm de esperar por ela) — corriam em série
  // uma a seguir à outra sem razão, quando um plano com 2+ junções independentes podia correr as
  // duas ao mesmo tempo.
  await Promise.all(passosJuncao.map((passo) => correrPasso(passo as PassoPlano)))
  await Promise.all(passosNormais.map((passo) => correrPasso(passo as PassoPlano)))

  // execucao_codigo (Fase 2 do PLANO-INTELIGENCIA-PRO-MAX.md) chama o modelo directamente dentro
  // do executor, fora dos estágios chamarEstagio() que o resto deste ficheiro já soma a `custo`.
  custo += ctx.custoExecucaoCodigo

  if (Object.keys(ctx.calcs).length === 0) {
    throw new Error('Nenhum passo do plano produziu resultados: a análise não pode ser publicada')
  }

  // Rede de segurança de código (PLANO-DATAPROPROMAX.md): a instrução no prompt para garantir
  // pelo menos 3 gráficos nem sempre é seguida. Se não saiu nenhum gráfico da execução, mas há
  // pelo menos uma série geográfica real, gera-se um gráfico de barras a partir dela.
  // Antes do gráfico de garantia: os títulos desses gráficos vêm de serie.metrica, por isso os
  // rótulos têm de ficar distintos primeiro, senão o gráfico de garantia herda a ambiguidade.
  desambiguarRotulosSeries(ctx, plano.passos.map((p) => ({ id: p.id, descricao_humana: p.descricao_humana })))
  gerarGraficosDeGarantia(ctx)

  // Mostra como o valor será RENDERIZADO, não o valor bruto: sem isto o modelo escrevia
  // "{{calc:x}}%" sobre um cálculo já formatado como percentagem, produzindo "50,9%%".
  const listaCalcs = Object.values(ctx.calcs)
    .map(
      (c) =>
        `- ${c.id}: aparece como "${formatarCelula(c)}" (via ${c.proveniencia.metodo}, ` +
        `${c.proveniencia.linhas_usadas} linhas). Não acrescentes unidade nem símbolo: já vêm incluídos.`
    )
    .join('\n')

  // ---------- 6. Descoberta: cortada a pedido (Opus + raciocínio prolongado, a etapa mais lenta
  // depois da Revisão, só para achados extra que não são a resposta pedida). A Narrativa e a
  // Revisão continuam intactas: nenhuma delas depende de achados para garantir R1/R8.
  const achados: Achado[] = []

  // ---------- 7. Narrativa ----------
  emitir({ tipo: 'estagio_inicio', estagio: 'narrativa', descricao_humana: 'A escrever a análise' })
  const pedidoNarrativa =
    `Pergunta: ${pergunta}\n\nPerfil do utilizador: ${compreensao.perfil_utilizador_inferido}\n\n` +
    `Cálculos disponíveis (usa APENAS estes ids em {{calc:}}):\n${listaCalcs}\n\n` +
    `Achados:\n${JSON.stringify(achados, null, 2)}\n\n` +
    `Avisos da execução (têm de aparecer em o_que_nao_diz se forem materiais):\n${ctx.avisos.join('\n') || 'nenhum'}\n\n` +
    `Cobertura das sub-perguntas:\n${JSON.stringify(suficiencia.cobertura, null, 2)}`

  const rNarrativa = await chamarEstagio<Narrativa>({
    estagio: 'narrativa',
    sistema: PROMPT_NARRATIVA,
    contextoEstavel,
    utilizador: pedidoNarrativa,
    schema: SCHEMA_NARRATIVA,
    // Sem isto cai no tecto por omissão de 8000: chega para perguntas simples, mas uma análise
    // nacional com muitas províncias/distritos e muitos cálculos disponíveis (listaCalcs grande)
    // pode genuinamente precisar de mais para cobrir numeros_chave + todos os campos de texto.
    // 12000 ainda truncava em cruzamentos distritais nacionais (ex.: electrificação x área
    // cultivada por distrito, ~150 distritos) mesmo em modo degradado (plano mínimo). 64000 é o
    // tecto máximo de output aceite pela API para claude-sonnet-5 (usado neste estágio); pedir
    // mais do que isso (ex.: 100000) falha logo no pedido em vez de dar mais margem.
    maxTokens: 64000,
  })
  // Faltava aqui: esta é a chamada mais cara de todo o pipeline (maxTokens 64000, a única do
  // estágio "narrativa" que corre sempre) e o seu custo nunca tinha sido somado a `custo` — só a
  // eventual chamada de correcção (mais abaixo) é que era contabilizada. Com isto corrigido,
  // `custo_usd` deixa de estar sistematicamente subavaliado.
  custo += custoUsd(modeloPara('narrativa'), rNarrativa.tokens_entrada, rNarrativa.tokens_saida)
  tokensEntrada += rNarrativa.tokens_entrada
  tokensSaida += rNarrativa.tokens_saida
  let narrativa = rNarrativa.dados

  // R1 na prática: se a narrativa referir um cálculo inexistente, pede-se uma correcção com a
  // lista exacta em falta. Só se falhar de novo é que a análise é recusada.
  let resolvida
  try {
    resolvida = resolverNarrativa(narrativa, ctx.calcs)
  } catch (erro) {
    if (!(erro instanceof TokenPorResolverError)) throw erro
    const rCorreccao = await chamarEstagio<Narrativa>({
      estagio: 'narrativa',
      sistema: PROMPT_NARRATIVA,
      contextoEstavel,
      utilizador:
        `${pedidoNarrativa}\n\n---\nA tua versão anterior referiu cálculos que NÃO existem: ` +
        `${erro.tokensEmFalta.join(', ')}. Reescreve usando apenas ids da lista, ou declara a ` +
        `limitação em o_que_nao_diz.`,
      schema: SCHEMA_NARRATIVA,
      maxTokens: 12000,
    })
    custo += custoUsd(modeloPara('narrativa'), rCorreccao.tokens_entrada, rCorreccao.tokens_saida)
    tokensEntrada += rCorreccao.tokens_entrada
    tokensSaida += rCorreccao.tokens_saida
    narrativa = rCorreccao.dados
    resolvida = resolverNarrativa(narrativa, ctx.calcs)
  }

  // ---------- 7b. Revisão antes de publicar ----------
  // O portão de viabilidade corre ANTES da execução e só sabe o que os dados têm, não o que os
  // cálculos conseguiram. Quando o passo central falha já a meio, ninguém volta a avaliar, e o
  // resultado é um dashboard sobre o seu próprio fracasso: visto ao vivo, com o título "o cálculo
  // directo de produtividade por província falhou: os dados actuais não permitem apontar quem
  // cultiva muito e produz pouco". Publicar isso é pior do que recusar: ocupa o ecrã inteiro para
  // dizer que não há resposta, e não oferece nenhuma saída.
  //
  // O sinal é o próprio título. Um título que ABRE a admitir que não conseguiu é a análise a
  // declarar-se inútil; ressalvas no corpo do texto são outra coisa e continuam bem-vindas, por
  // isso só o título é examinado.
  const tituloDesiste =
    /^(n[ãa]o (foi|é|e) poss[ií]vel|n[ãa]o (h[áa]|se pode|d[áa]|permitem?)|sem dados|imposs[ií]vel|o c[áa]lculo .{0,40}falh|falh(ou|aram))/i.test(
      resolvida.titulo.trim()
    ) || /\bfalh(ou|aram)\b/i.test(resolvida.titulo.split(':')[0])

  if (tituloDesiste) {
    const passosFalhados = ctx.avisos.filter((a) => /não pôde ser executado/i.test(a))
    logger.info('revisao_pos_execucao', {
      analiseId,
      pergunta,
      titulo: resolvida.titulo,
      passos_falhados: passosFalhados.length,
      modo: modoPortao(),
    })
    if (modoPortao() === 'activo') {
      // `execucao_falhou`, e não `variavel_ausente`. A distinção não é cosmética: o utilizador que
      // lê "falta esta variável" vai procurar outro dataset, quando o ficheiro tinha o assunto e o
      // que rebentou foi o cálculo. E quem lê os registos para corrigir o motor precisa de saber
      // se procura um problema de dados ou um problema de código.
      throw new AnaliseInviavelError(
        {
          tipo: 'execucao_falhou',
          exigido: limparTextoVisivel(compreensao.pergunta_original),
          disponivel:
            passosFalhados.length > 0
              ? `os cálculos necessários não puderam ser feitos (${passosFalhados.length} passo(s) falharam)`
              : 'os cálculos produzidos não respondem ao que foi perguntado',
          explicacao:
            'Os dados falam do assunto, mas o cálculo que a pergunta exigia não chegou ao fim. ' +
            'Em vez de publicar um painel a explicar o próprio falhanço, aqui ficam perguntas que ' +
            'estes dados respondem bem.',
          termo_ausente: 'resultado calculável para esta pergunta',
        },
        {
          portao: 'depois_da_execucao',
          plano,
          avisos: [...ctx.avisos],
          passos_falhados: passosFalhados,
          calcs: ctx.calcs,
        }
      )
    }
  }

  // ---------- 8. Auto-crítica adversarial (PLANO-INTELIGENCIA-PRO-MAX.md, Fase 5): condicional,
  // não "sempre" nem "nunca". Corre só quando o risco de erro de raciocínio é maior (confiança
  // baixa antes de enriquecer, ou intenção comparativa — onde o paradoxo de Simpson e a
  // inversão de tendência por MAUP são erros reais já vistos nesta base de código); nas perguntas
  // simples de contagem/ranking com confiança alta, o custo extra (Opus + raciocínio prolongado,
  // ~2min sozinho) não compensa e fica-se com a publicação directa, como antes.
  // Limiar baixado de 0.85 para 0.6 e "temporal" removido do gatilho automático: 0.85 disparava a
  // etapa mais lenta do pipeline em quase todas as perguntas (a maioria fica abaixo de 0.85 por
  // omissão), tornando "condicional" praticamente equivalente a "sempre" na prática.
  // Em modo degradado (retentativa depois de uma falha) a Crítica não corre mesmo que os critérios
  // abaixo a pedissem: é a etapa mais lenta (Opus + raciocínio, ~2min) e a prioridade da segunda
  // tentativa é entregar alguma resposta depressa, não aprofundar a revisão.
  const deveCriticar =
    !opcoes.modoDegradado &&
    (suficiencia.confianca_sem_enriquecimento < 0.6 ||
      compreensao.intencao === 'comparativa' ||
      compreensao.arquetipo_sugerido === 'comparativo')

  // Publicar sempre alguma coisa é uma decisão de produto deliberada (PLANO-30S.md): recusar a
  // análise inteira por causa de uma objecção da Crítica deixava o utilizador sem nada, mesmo
  // quando os números individuais eram reais e correctos (R1 já o garante) e só a CONCLUSÃO
  // composta é que estava metodologicamente errada. Uma única chamada a Crítica, sem tentativa de
  // reescrita/reverificação (isso duplicava a etapa mais lenta do pipeline exactamente nas
  // perguntas comparativas/temporais onde já era mais provável correr): qualquer objecção vira
  // aviso bem visível em "o que isto não diz" — nunca escondida, nunca a impedir a página de
  // aparecer.
  let critica: Critica = { objeccoes: [], bloqueia_publicacao: false }
  if (deveCriticar) {
    emitir({
      tipo: 'estagio_inicio',
      estagio: 'critica',
      descricao_humana: 'A rever criticamente a análise antes de publicar',
    })

    const resumoCalcs = Object.values(ctx.calcs)
      .map(
        (c) =>
          `${c.id} = ${c.valor}${c.unidade} (método: ${c.proveniencia.metodo}, ` +
          `${c.proveniencia.linhas_usadas} linhas)`
      )
      .join('\n')

    const pedidoCritica =
      `Pergunta original: ${compreensao.pergunta_original}\n\n` +
      `Arquétipo: ${compreensao.arquetipo_sugerido}\n\n` +
      `Título: ${narrativa.titulo}\n` +
      `Resposta directa: ${narrativa.resposta_directa}\n` +
      `O que mostram: ${narrativa.o_que_mostram}\n` +
      `Porquê: ${narrativa.porque}\n` +
      `O que não diz: ${resolvida.o_que_nao_diz.join('; ')}\n\n` +
      `Cálculos usados:\n${resumoCalcs}\n\n` +
      (ctx.avisos.length ? `Avisos ocorridos durante a execução: ${ctx.avisos.join('; ')}\n\n` : '') +
      'Procura falhas de raciocínio reais (paradoxo de Simpson, comparação de grupos não ' +
      'comparáveis, confusão entre correlação e causalidade, agregação que esconde variação ' +
      'relevante, escala/normalização enganosa). Não repitas objecções cosméticas.'

    const rCritica = await chamarEstagio<{ objeccoes: Objeccao[] }>({
      estagio: 'critica',
      sistema: PROMPT_CRITICA,
      contextoEstavel,
      utilizador: pedidoCritica,
      schema: SCHEMA_CRITICA,
    })
    custo += custoUsd(modeloPara('critica'), rCritica.tokens_entrada, rCritica.tokens_saida)
    tokensEntrada += rCritica.tokens_entrada
    tokensSaida += rCritica.tokens_saida

    const objeccoes = rCritica.dados.objeccoes ?? []
    const materiais = objeccoes.filter((o) => o.gravidade === 'MATERIAL').map((o) => o.descricao)
    const fatais = objeccoes.filter((o) => o.gravidade === 'FATAL').map((o) => `Aviso de fiabilidade: ${o.descricao}`)
    critica = { objeccoes, bloqueia_publicacao: false }
    if (materiais.length || fatais.length) {
      resolvida = { ...resolvida, o_que_nao_diz: [...resolvida.o_que_nao_diz, ...fatais, ...materiais] }
    }
  }

  // Só entra na memória (Fase 4) um plano que passou pela Crítica sem objecção FATAL — publicar
  // como exemplo few-shot um plano que a própria análise recusaria como fiável seria reforçar o
  // erro na próxima pergunta parecida, em vez de aprender com o que já foi bem-sucedido.
  if (!critica.objeccoes.some((o) => o.gravidade === 'FATAL')) {
    try {
      await guardarPlanoResolvido(pergunta, datasetIds, compreensao.arquetipo_sugerido, plano)
    } catch {
      // silencioso: mesma razão do try/catch na leitura, acima
    }
  }

  // O evento 'concluido' NÃO é emitido aqui: o chamador (route.ts) ainda vai gravar este
  // resultado na base de dados via guardarResultado(), e o cliente navega para /analise/{id}
  // assim que recebe 'concluido'. Emitir aqui faria o browser chegar à página antes do UPDATE
  // na tabela `analises` ter terminado, mostrando "análise não foi publicada" apesar do
  // pipeline ter corrido com sucesso.
  const duracaoTotalMs = Date.now() - inicio
  const duracaoPorEstagio: Record<string, number> = {}
  marcosEstagios.forEach((marco, i) => {
    const fim = i + 1 < marcosEstagios.length ? marcosEstagios[i + 1].t : inicio + duracaoTotalMs
    duracaoPorEstagio[marco.estagio] = (duracaoPorEstagio[marco.estagio] || 0) + (fim - marco.t)
  })
  logger.info('duracao_estagios_analise', { analiseId, duracaoTotalMs, duracaoPorEstagio })

  return {
    analise_id: analiseId,
    compreensao,
    plano,
    suficiencia,
    contexto: ctx,
    achados,
    narrativa,
    narrativa_resolvida: resolvida,
    critica,
    custo_usd: custo,
    tokens_entrada: tokensEntrada,
    tokens_saida: tokensSaida,
    duracao_ms: Date.now() - inicio,
    confianca: calcularConfianca(ctx, plano, suficiencia),
  }
}
