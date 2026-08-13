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
  | { tipo: 'erro'; estagio: EstadoPipeline; mensagem: string; recuperavel: boolean }

// ==================== REGISTO DA ANÁLISE ====================

export type EstadoAnalise = 'planeando' | 'executando' | 'compondo' | 'pronto' | 'erro'

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
