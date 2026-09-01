'use client'

import { useEffect, useState } from 'react'
import { Mail, Plus, Trash2, CalendarClock, Loader2 } from 'lucide-react'

type Frequencia = 'semanal' | 'mensal'

type RelatorioAgendado = {
  id: number
  nome: string
  frequencia: Frequencia
  diaSemana: number | null
  diaMes: number | null
  destinatarios: string[]
  activo: boolean
  ultimoEnvioEm: string | null
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function RelatoriosAgendadosPainel() {
  const [agendamentos, setAgendamentos] = useState<RelatorioAgendado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aCriar, setACriar] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [frequencia, setFrequencia] = useState<Frequencia>('semanal')
  const [diaSemana, setDiaSemana] = useState(1)
  const [diaMes, setDiaMes] = useState(1)
  const [destinatarios, setDestinatarios] = useState('')

  async function carregar() {
    setCarregando(true)
    try {
      const res = await fetch('/api/admin/relatorios-agendados', { credentials: 'include' })
      const dados = await res.json()
      setAgendamentos(Array.isArray(dados?.agendamentos) ? dados.agendamentos : [])
    } catch {
      setMensagem('Não foi possível carregar os relatórios agendados.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setACriar(true)
    setMensagem(null)
    try {
      const res = await fetch('/api/admin/relatorios-agendados', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          frequencia,
          diaSemana,
          diaMes,
          destinatarios: destinatarios.split(',').map((e) => e.trim()).filter(Boolean),
        }),
      })
      const dados = await res.json()
      if (!res.ok) throw new Error(dados.error || 'Falha ao criar agendamento')
      setNome('')
      setDestinatarios('')
      setMostrarForm(false)
      await carregar()
    } catch (erro: any) {
      setMensagem(erro?.message || 'Erro ao criar agendamento.')
    } finally {
      setACriar(false)
    }
  }

  async function alternarActivo(id: number, activo: boolean) {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, activo } : a)))
    await fetch(`/api/admin/relatorios-agendados/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo }),
    })
  }

  async function remover(id: number) {
    if (!confirm('Remover este relatório agendado?')) return
    await fetch(`/api/admin/relatorios-agendados/${id}`, { method: 'DELETE', credentials: 'include' })
    setAgendamentos((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Exportação agendada de relatórios
        </h3>
        <button
          type="button"
          onClick={() => setMostrarForm((v) => !v)}
          className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-[#064E2C] text-white rounded-lg text-sm font-medium hover:bg-[#04361F]"
        >
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Envia automaticamente o relatório em PDF por email, toda semana ou todo mês, sem precisar de vir aqui gerar manualmente.
      </p>

      {mensagem && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{mensagem}</div>
      )}

      {mostrarForm && (
        <form onSubmit={criar} className="mb-5 p-4 rounded-lg border border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do agendamento</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Relatório semanal para a direcção"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value as Frequencia)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          {frequencia === 'semanal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia da semana</label>
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                {DIAS_SEMANA.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dia do mês</label>
              <input
                type="number"
                min={1}
                max={28}
                value={diaMes}
                onChange={(e) => setDiaMes(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Destinatários (emails separados por vírgula)</label>
            <input
              type="text"
              required
              value={destinatarios}
              onChange={(e) => setDestinatarios(e.target.value)}
              placeholder="admin@data4moz.com, direccao@data4moz.com"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={aCriar}
              className="flex items-center gap-2 px-4 py-2 bg-[#064E2C] text-white rounded-lg text-sm font-medium hover:bg-[#04361F] disabled:opacity-60"
            >
              {aCriar && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar agendamento
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> A carregar…
        </div>
      ) : agendamentos.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Nenhum relatório agendado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {agendamentos.map((a) => (
            <li key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-800">{a.nome}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {a.destinatarios.join(', ')}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.frequencia === 'semanal'
                    ? `Toda ${DIAS_SEMANA[a.diaSemana ?? 1]}`
                    : `Todo dia ${a.diaMes} do mês`}
                  {a.ultimoEnvioEm ? ` · último envio: ${new Date(a.ultimoEnvioEm).toLocaleDateString('pt-PT')}` : ' · ainda não enviado'}
                </p>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.activo}
                    onChange={(e) => alternarActivo(a.id, e.target.checked)}
                  />
                  Activo
                </label>
                <button
                  type="button"
                  onClick={() => remover(a.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remover agendamento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
