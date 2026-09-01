'use client'

import { useEffect, useState } from 'react'
import {
  BadgeCheck,
  History,
  Loader2,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  PenLine,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

type Versao = {
  versaoId: number
  editadoPor: string
  criadoEm: string
  titulo: string
  descricao: string | null
  ano: number | null
}

type Qualidade = {
  nivel: 'ok' | 'aviso' | 'critico'
  avisos: string[]
  estatisticas: Record<string, unknown> | null
}

const CORES_NIVEL: Record<Qualidade['nivel'], string> = {
  ok: 'text-green-700 bg-green-50 border-green-200',
  aviso: 'text-amber-700 bg-amber-50 border-amber-200',
  critico: 'text-red-700 bg-red-50 border-red-200',
}

/**
 * Painel de "inteligência" por dataset, agrupado num só lugar para não espalhar mais botões pela
 * já longa DatasetForm: certificação de proveniência, resumo automático, verificação de qualidade
 * e histórico de versões (PLANO-INTELIGENCIA-PORTAL.md). Aparece só quando se está a editar um
 * dataset existente, nunca ao criar um novo (ainda não há nada para certificar/verificar/reverter).
 */
export function DatasetInteligenciaPainel({ datasetId }: { datasetId: number }) {
  const [certificacao, setCertificacao] = useState<string | null>(null)
  const [aCertificar, setACertificar] = useState(false)

  const [resumo, setResumo] = useState<string | null>(null)
  const [aGerarResumo, setAGerarResumo] = useState(false)

  const [qualidade, setQualidade] = useState<Qualidade | null>(null)
  const [aVerificarQualidade, setAVerificarQualidade] = useState(false)

  const [versoes, setVersoes] = useState<Versao[] | null>(null)
  const [aCarregarVersoes, setACarregarVersoes] = useState(false)
  const [aRestaurar, setARestaurar] = useState<number | null>(null)

  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    setCertificacao(null)
    setResumo(null)
    setQualidade(null)
    setVersoes(null)
    setMensagem(null)
  }, [datasetId])

  async function alternarCertificacao() {
    setACertificar(true)
    try {
      const novoValor = certificacao === 'fonte_oficial_confirmada' ? 'nao_verificado' : 'fonte_oficial_confirmada'
      const resposta = await fetch(`/api/admin/datasets/${datasetId}/certificacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificacao: novoValor }),
      })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error)
      setCertificacao(dados.certificacao)
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao actualizar certificação.')
    } finally {
      setACertificar(false)
    }
  }

  async function gerarResumo() {
    setAGerarResumo(true)
    setMensagem(null)
    try {
      const resposta = await fetch(`/api/admin/datasets/${datasetId}/resumo-ia`, { method: 'POST' })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error)
      setResumo(dados.resumo)
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao gerar resumo.')
    } finally {
      setAGerarResumo(false)
    }
  }

  async function verificarQualidade() {
    setAVerificarQualidade(true)
    setMensagem(null)
    try {
      const resposta = await fetch(`/api/admin/datasets/${datasetId}/qualidade`)
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error)
      setQualidade(dados)
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao verificar qualidade.')
    } finally {
      setAVerificarQualidade(false)
    }
  }

  async function carregarVersoes() {
    setACarregarVersoes(true)
    setMensagem(null)
    try {
      const resposta = await fetch(`/api/admin/datasets/${datasetId}/versoes`)
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error)
      setVersoes(dados.versoes)
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao carregar histórico.')
    } finally {
      setACarregarVersoes(false)
    }
  }

  async function restaurarVersao(versaoId: number) {
    setARestaurar(versaoId)
    try {
      const resposta = await fetch(`/api/admin/datasets/${datasetId}/versoes/${versaoId}`, { method: 'POST' })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.error)
      setMensagem('Versão restaurada. Recarregue a página para ver os campos actualizados.')
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao restaurar versão.')
    } finally {
      setARestaurar(null)
    }
  }

  return (
    <div className="animate-slide-up bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-6">
      <div className="bg-[#064E2C] p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Inteligência deste dataset</h2>
            <p className="text-white/80 text-sm">Certificação, resumo automático, qualidade e histórico de versões.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {mensagem && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">{mensagem}</div>
        )}

        {/* Certificação */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#064E2C] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-gray-900">Certificação de proveniência</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Marca este dataset como fonte oficial confirmada por uma pessoa, distinto de um
                dataset ainda não verificado.
              </p>
              {certificacao === 'fonte_oficial_confirmada' && (
                <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 text-[11px] font-bold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Fonte oficial confirmada
                </span>
              )}
            </div>
          </div>
          <button
            onClick={alternarCertificacao}
            disabled={aCertificar}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            {aCertificar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
            {certificacao === 'fonte_oficial_confirmada' ? 'Remover certificação' : 'Certificar como fonte oficial'}
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Resumo automático */}
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <PenLine className="w-5 h-5 text-[#064E2C] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">Resumo gerado por IA</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sintetiza título, categoria, fonte, ano e palavras-chave num resumo legível.
                </p>
              </div>
            </div>
            <button
              onClick={gerarResumo}
              disabled={aGerarResumo}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#064E2C] text-white text-xs font-semibold px-3 py-2 hover:bg-[#04361F] disabled:opacity-60"
            >
              {aGerarResumo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
              {aGerarResumo ? 'A gerar...' : 'Gerar resumo'}
            </button>
          </div>
          {resumo && (
            <p className="mt-3 text-[13px] text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-3">
              {resumo}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Qualidade */}
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <ScanSearch className="w-5 h-5 text-[#064E2C] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">Verificação de qualidade</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Metadados sempre; conteúdo do ficheiro para CSV, Excel, GeoJSON e Shapefile alojados no portal.
                </p>
              </div>
            </div>
            <button
              onClick={verificarQualidade}
              disabled={aVerificarQualidade}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
            >
              {aVerificarQualidade ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
              Verificar
            </button>
          </div>
          {qualidade && (
            <div className={`mt-3 rounded-lg border px-3.5 py-3 ${CORES_NIVEL[qualidade.nivel]}`}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                {qualidade.nivel === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {qualidade.nivel === 'ok' ? 'Sem problemas encontrados' : qualidade.nivel === 'aviso' ? 'Avisos' : 'Problemas críticos'}
              </p>
              {qualidade.avisos.length > 0 ? (
                <ul className="space-y-1 text-[12.5px]">
                  {qualidade.avisos.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12.5px]">Metadados e ficheiro (quando aplicável) sem sinais de problema.</p>
              )}
              {qualidade.estatisticas && 'feicoes' in qualidade.estatisticas ? (
                <p className="text-[11px] mt-2 opacity-75">
                  {String((qualidade.estatisticas as any).feicoes ?? 0)} feição/feições, {String((qualidade.estatisticas as any).feicoesSemGeometria ?? 0)} sem geometria, {String((qualidade.estatisticas as any).feicoesSemAtributos ?? 0)} sem atributos.
                </p>
              ) : qualidade.estatisticas && (
                <p className="text-[11px] mt-2 opacity-75">
                  {String((qualidade.estatisticas as any).linhas ?? 0)} linha(s), {String((qualidade.estatisticas as any).colunas ?? 0)} coluna(s), {String((qualidade.estatisticas as any).linhasDuplicadas ?? 0)} duplicada(s).
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Versões */}
        <div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <History className="w-5 h-5 text-[#064E2C] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">Histórico de versões</p>
                <p className="text-xs text-gray-500 mt-0.5">Cada edição fica gravada e pode ser revertida.</p>
              </div>
            </div>
            <button
              onClick={carregarVersoes}
              disabled={aCarregarVersoes}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 hover:bg-gray-50 disabled:opacity-60"
            >
              {aCarregarVersoes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
              Ver histórico
            </button>
          </div>

          {versoes && (
            versoes.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">Ainda não há edições registadas para este dataset.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                {versoes.map((v) => (
                  <li key={v.versaoId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-gray-800 truncate">{v.titulo}</p>
                      <p className="text-[11px] text-gray-400">
                        {v.editadoPor} · {new Date(v.criadoEm).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <button
                      onClick={() => restaurarVersao(v.versaoId)}
                      disabled={aRestaurar === v.versaoId}
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#064E2C] hover:text-[#04361F] disabled:opacity-60"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </div>
  )
}
