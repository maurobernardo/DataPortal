/**
 * Contratos do pipeline de análise (Parte 5.1 da especificação).
 *
 * Estes tipos são a fronteira entre estágios: cada estágio consome a saída tipada do anterior
 * e produz a sua. Ficam separados dos schemas Zod (lib/semantic/schema.ts) porque nem toda a
 * saída precisa de validação em runtime; a que precisa tem o schema correspondente lá.
 */

export type EstadoPipeline =
  | 'compreensao'
  | 'planeamento'
  | 'suficiencia'
  | 'enriquecimento'
  | 'execucao'
  | 'descoberta'
  | 'narrativa'
  | 'critica'
  | 'composicao'

export type Arquetipo =
  | 'exploratorio'
  | 'comparativo'
  | 'temporal'
  | 'geoespacial'
  | 'ranking'
  | 'diagnostico'
  | 'preditivo'
  | 'executivo'
  | 'monitorizacao'
  | 'narrativo'

export type PerfilUtilizador =
  | 'cidadao'
  | 'jornalista'
  | 'investigador'
  | 'gestor_publico'
  | 'ong'
  | 'privado'

export type NivelGeografico =
  | 'admin0'
  | 'admin1'
  | 'admin2'
  | 'admin3'
  | 'admin4'
  | 'ponto'
  | 'grelha'

// ==================== ESTÁGIO 1: COMPREENSÃO ====================

export interface Compreensao {
  pergunta_original: string
  pergunta_normalizada: string
  idioma: 'pt' | 'en'
  intencao:
    | 'descritiva'
    | 'comparativa'
    | 'temporal'
    | 'geoespacial'
    | 'diagnostica'
    | 'preditiva'
    | 'exploratoria'
    | 'ranking'
  arquetipo_sugerido: Arquetipo
  entidades: {
    geografias: { nome: string; nivel: string; codigo?: string }[]
    periodos: { inicio?: number; fim?: number; expressao: string }[]
    metricas: string[]
    filtros: { campo: string; operador: string; valor: unknown }[]
  }
  ambiguidades: { descricao: string; opcoes: string[] }[]
  perfil_utilizador_inferido: PerfilUtilizador
  requer_desambiguacao: boolean
}

// ==================== ESTÁGIO 2: PLANEAMENTO ====================

export interface PassoPlano {
  id: string
  tipo: 'consulta' | 'calculo' | 'geoestatistica' | 'modelo' | 'enriquecimento' | 'validacao'
  /** Mostrada ao utilizador em streaming: tem de ser legível por um não técnico. */
  descricao_humana: string
  depende_de: string[]
  /** Nome da função da biblioteca de análise. */
  metodo: string
  parametros: Record<string, unknown>
  /** Ids de cálculo que este passo garante produzir. Usado para validar R1. */
  produz: string[]
}

export interface Plano {
  sub_perguntas: string[]
  passos: PassoPlano[]
  /** R4: desce até ao mais fino disponível. */
  nivel_geo_alvo: NivelGeografico[]
  metricas_alvo: string[]
  justificacao_arquetipo: string
}

// ==================== ESTÁGIO 3: SUFICIÊNCIA ====================

export type FonteCobertura =
  | 'dataset_selecionado'
  | 'outro_dataset_portal'
  | 'externa'
  | 'nenhuma'

export interface AlvoEnriquecimento {
  sub_pergunta: string
  lacuna: string
  /** Ordem da cascata da Parte 8: 1 = outros datasets do portal. */
  prioridade: number
  fonte_alvo: string
  parametros?: Record<string, unknown>
}

/**
 * Veredicto categórico do portão de viabilidade.
 *
 * Substitui a decisão por limiar sobre `confianca_sem_enriquecimento`: um número contínuo convida
 * a deriva (0.85 disparava quase sempre, 0.6 quase nunca), enquanto o que se quer aqui é uma
 * decisão de três estados com critérios nomeados.
 */
export type VeredictoViabilidade = 'suficiente' | 'parcial' | 'insuficiente'

export type TipoLacunaBloqueante =
  | 'variavel_ausente'
  | 'granularidade_insuficiente'
  | 'serie_temporal_insuficiente'
  | 'cobertura_geografica'
  | 'dominio_diferente'
  // Os períodos existem, mas estão vazios de mais para a trajectória pedida. Distinto de
  // 'serie_temporal_insuficiente' (que é ter um só período): aqui há dez anos e quase metade das
  // células por preencher, e uma "evolução por província" construída sobre isso seria uma linha
  // desenhada a partir de buracos.
  | 'cobertura_dados_insuficiente'
  /**
   * Os dados chegavam, mas o cálculo rebentou.
   *
   * Existe separado porque não é uma lacuna dos dados e não deve ser descrito ao utilizador como
   * tal. Durante algum tempo estas recusas saíam rotuladas `variavel_ausente` com o termo ausente
   * "resultado calculável para esta pergunta", uma frase que não nomeia variável nenhuma: quem
   * lesse os registos concluía que faltava uma coluna quando o que falhou foi um passo. Verificado
   * ao vivo em duas análises de turismo seguidas, ambas com um passo falhado e ambas arquivadas
   * como se o ficheiro não tivesse o assunto.
   */
  | 'execucao_falhou'

/**
 * Prova concreta que sustenta um veredicto `insuficiente`.
 *
 * O veredicto sozinho não basta para bloquear: é o mesmo modelo que acabou de planear a análise a
 * dizer se ela é possível, e pedir-lhe uma auto-avaliação logo a seguir ao plano gera ancoragem.
 * Exigir que nomeie exactamente o que falta transforma a opinião em algo que o código consegue
 * verificar contra o perfil real do dataset (ver `verificarEvidencia`) antes de aceitar o bloqueio.
 */
export interface EvidenciaLacuna {
  tipo: TipoLacunaBloqueante
  /** O que a pergunta exige: nome da variável, nível administrativo ou ano/intervalo. */
  exigido: string
  /**
   * Só a coisa que falta, em uma ou duas palavras, sem a entidade que existe.
   *
   * Existe separado de `exigido` porque `exigido` é prosa para ler no ecrã e descreve as duas
   * coisas ao mesmo tempo: a medida em falta e o objecto medido. Verificado ao vivo: para
   * "contagem de passageiros por aeroporto", a palavra "aeroporto" está nos dados e fazia a
   * verificação concluir que nada faltava. É este campo, e não a frase, que o código confronta
   * com os dados.
   */
  termo_ausente?: string
  /** O que os datasets realmente têm nesse eixo. Vazio quando não têm nada. */
  disponivel: string
  /** Uma frase, em linguagem de utilizador, sobre porque isto impede a resposta. */
  explicacao: string
}

export interface Suficiencia {
  cobertura: {
    sub_pergunta: string
    coberto: boolean
    fonte: FonteCobertura
    lacuna?: string
    accao?: string
  }[]
  confianca_sem_enriquecimento: number
  precisa_enriquecimento: boolean
  alvos_enriquecimento: AlvoEnriquecimento[]
  veredicto: VeredictoViabilidade
  /** Obrigatório quando o veredicto é `insuficiente`; ignorado nos outros casos. */
  evidencia?: EvidenciaLacuna
}

// ==================== PERGUNTAS VIÁVEIS ====================

/**
 * Pergunta que os datasets seleccionados conseguem responder bem.
 *
 * Cada uma declara como seria respondida (colunas, método do catálogo, nível geográfico) para que
 * o código possa validar a proposta contra a estrutura real dos dados antes de a mostrar. É a
 * mesma disciplina de `resolverNarrativa`: o modelo propõe, o código verifica, o que não resolve
 * não chega ao utilizador.
 */
export interface PerguntaViavel {
  pergunta: string
  /** Porque é que estes dados respondem bem a isto, numa frase. */
  porque: string
  colunas_usadas: string[]
  metodo: string
  nivel_geo?: string
  dataset_ids: number[]
}

// ==================== ESTÁGIO 5: EXECUÇÃO ====================

/**
 * O produto atómico do motor. R1: todo o número que chega ao utilizador é uma destas células,
 * referida na narrativa por {{calc:id}}. A proveniência é registada para auditoria mas nunca
 * aparece na superfície do gráfico (R3).
 */
export interface CelulaCalculada {
  id: string
  valor: number | string
  unidade: string
  /** Ex.: '#,##0.0"%"' | 'inteiro' | 'pp' */
  formato: string
  passo_id: string
  proveniencia: {
    datasets: string[]
    linhas_usadas: number
    metodo: string
    /** Usado só no rodapé "Fontes e método", nunca na superfície (R3). */
    fontes: string[]
  }
  intervalo_confianca?: [number, number]
}

export interface ResultadoExecucao {
  calcs: Record<string, CelulaCalculada>
  passos_concluidos: string[]
  passos_falhados: { id: string; erro: string }[]
}

// ==================== ESTÁGIO 6: DESCOBERTA ====================

export type TipoAchado =
  | 'anomalia'
  | 'simpson'
  | 'quebra_tendencia'
  | 'outlier_espacial'
  | 'relacao_inesperada'
  | 'qualidade'
  | 'comparabilidade'
  | 'concentracao'
  | 'contexto_historico'
  | 'lacuna_cobertura'

export interface Achado {
  tipo: TipoAchado
  /** R6: conclusão, não descrição. */
  titulo: string
  /** Pode conter tokens {{calc:...}}. */
  texto: string
  severidade: 'critico' | 'alto' | 'medio' | 'informativo'
  relevancia: number
  calcs_relacionados: string[]
  /** Que visualização prova este achado. */
  bloco_sugerido?: string
}

// ==================== ESTÁGIO 7: NARRATIVA ====================

export interface Narrativa {
  /** R6: a conclusão, com sujeito e verbo. */
  titulo: string
  subtitulo: string
  resposta_directa: string
  numeros_chave: { calc_id: string; rotulo: string; contexto: string }[]
  o_que_mostram: string
  /** R7: tem de nomear explicação alternativa quando reporta associação. */
  porque: string
  /** R8: mínimo 2 itens concretos. Nunca vazio. */
  o_que_nao_diz: string[]
  como_chegamos: string
  fontes: { instituicao: string; documento?: string; ano?: number; url?: string }[]
}

// ==================== AUTO-CRÍTICA ADVERSARIAL ====================

export interface Objeccao {
  gravidade: 'FATAL' | 'MATERIAL' | 'MENOR'
  categoria: string
  descricao: string
  /** Onde deve ser incorporada se MATERIAL. */
  accao_sugerida: string
}

export interface Critica {
  objeccoes: Objeccao[]
  bloqueia_publicacao: boolean
}

// ==================== EVENTOS DE STREAMING (Parte 5.2) ====================

export type EventoPipeline =
  | { tipo: 'estagio_inicio'; estagio: EstadoPipeline; descricao_humana: string }
  | { tipo: 'plano_pronto'; passos: { id: string; descricao_humana: string }[] }
  | { tipo: 'passo_inicio'; id: string }
  | { tipo: 'passo_fim'; id: string; resumo: string; duracao_ms: number }
  | { tipo: 'calc_pronto'; id: string; valor: number | string; unidade: string }
  | { tipo: 'bloco_pronto'; bloco: unknown }
  | { tipo: 'achado'; achado: Achado }
  | { tipo: 'narrativa_delta'; texto: string }
  | { tipo: 'concluido'; analise_id: string; url: string }
  // Os dados não respondem à pergunta. Não é erro (nada falhou) nem sucesso (não há análise): o
  // cliente fica onde está e mostra a causa mais as perguntas que estes dados respondem bem, em
  // vez de navegar para um dashboard que responderia a outra coisa.
  | {
      tipo: 'inviavel'
      analise_id: string
      evidencia: EvidenciaLacuna
      sugestoes: PerguntaViavel[]
    }
  | { tipo: 'erro'; estagio: EstadoPipeline; mensagem: string; recuperavel: boolean }

// ==================== REGISTO DA ANÁLISE ====================

// 'inviavel': o motor recusou responder porque os dados não chegam. Estado próprio de propósito:
// não é 'erro' (nada falhou tecnicamente, e contá-lo como falha estragaria as métricas de
// fiabilidade) nem 'pronto' (não há dashboard nenhum para mostrar).
export type EstadoAnalise = 'planeando' | 'executando' | 'compondo' | 'pronto' | 'erro' | 'inviavel'

export interface Analise {
  id: string
  utilizador_id: number | null
  pergunta: string
  datasets_ids: number[]
  arquetipo: Arquetipo | null
  estado: EstadoAnalise
  plano: Plano | null
  resultados: Record<string, CelulaCalculada> | null
  achados: Achado[] | null
  narrativa: Narrativa | null
  dashboard_spec: unknown | null
  fontes: unknown | null
  confianca: number | null
  custo_usd: number | null
  duracao_ms: number | null
  publico: boolean
  criado_em: string
}
