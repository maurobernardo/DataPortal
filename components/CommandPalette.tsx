'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Compass,
  Database,
  FileText,
  Globe2,
  LineChart,
  MapPinned,
  Search,
} from 'lucide-react'

type Entrada = { label: string; href: string }

/** Atalhos fixos do portal — mostrados quando o campo está vazio, para servir também como
 *  navegação rápida entre secções, não só pesquisa de conteúdo. */
const ATALHOS: (Entrada & { icon: typeof Search })[] = [
  { label: 'Perguntar aos dados por IA', href: '/analise/nova', icon: LineChart },
  { label: 'Dados Geoespaciais', href: '/dados-espaciais', icon: Globe2 },
  { label: 'Dados Alfanuméricos', href: '/dados-alfanumericos', icon: Database },
  { label: 'Mapas Inteligentes', href: '/maps', icon: MapPinned },
  { label: 'Relatórios', href: '/relatorios', icon: FileText },
  { label: 'Estatísticas do portal', href: '/estatisticas', icon: BarChart3 },
]

function iconeParaKind(kind?: string) {
  switch (kind) {
    case 'geoespacial':
      return Globe2
    case 'alfanumerico':
      return Database
    case 'mapa':
      return MapPinned
    case 'relatorio':
      return FileText
    case 'dashboard':
      return BarChart3
    case 'analise':
      return LineChart
    default:
      return Compass
  }
}

/**
 * Pesquisa global do portal (Cmd/Ctrl+K), disponível em qualquer página. Reutiliza a mesma API
 * (/api/search/suggestions) já usada pela pesquisa da home — datasets, mapas, dashboards e
 * relatórios num único resultado combinado, em vez de obrigar a escolher o catálogo certo antes
 * de pesquisar.
 */
export function CommandPalette() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [query, setQuery] = useState('')
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [aCarregar, setACarregar] = useState(false)
  const [activo, setActivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null
      const emCampo = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAberto((v) => !v)
        return
      }
      if (e.key === '/' && !emCampo && !aberto) {
        e.preventDefault()
        setAberto(true)
      }
    }
    function aoAbrirViaBotao() {
      setAberto(true)
    }
    document.addEventListener('keydown', aoTeclar)
    window.addEventListener('pd:open-search', aoAbrirViaBotao)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('pd:open-search', aoAbrirViaBotao)
    }
  }, [aberto])

  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 10)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setEntradas([])
      setActivo(0)
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [aberto])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setEntradas([])
      return
    }
    const timeout = setTimeout(() => {
      setACarregar(true)
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          const lista = Array.isArray(data?.entries) ? data.entries : []
          setEntradas(lista)
          setActivo(0)
        })
        .catch(() => setEntradas([]))
        .finally(() => setACarregar(false))
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  const lista: (Entrada & { icon?: typeof Search })[] = query.trim().length >= 2 ? entradas : ATALHOS

  function irPara(href: string) {
    setAberto(false)
    router.push(href)
  }

  function aoTeclarNaLista(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberto(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((v) => Math.min(v + 1, lista.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = lista[activo]
      if (item) irPara(item.href)
    }
  }

  if (!aberto) return null

  return (
    <div className="pd-cmdk-overlay" onClick={() => setAberto(false)}>
      <div className="pd-cmdk-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Pesquisa global do portal">
        <div className="pd-cmdk-input-row">
          <Search className="size-4.5 shrink-0 text-gray-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={aoTeclarNaLista}
            placeholder="Pesquisar datasets, mapas, relatórios, dashboards…"
            className="pd-cmdk-input"
            aria-label="Pesquisa global"
          />
          <kbd className="pd-cmdk-esc">Esc</kbd>
        </div>

        <div className="pd-cmdk-results">
          {query.trim().length >= 2 && aCarregar && (
            <p className="pd-cmdk-empty">A procurar…</p>
          )}
          {query.trim().length >= 2 && !aCarregar && lista.length === 0 && (
            <p className="pd-cmdk-empty">Sem resultados para «{query.trim()}».</p>
          )}
          {!query.trim() && (
            <p className="pd-cmdk-section-label">Atalhos</p>
          )}
          {lista.map((item, i) => {
            const Icon = item.icon || iconeParaKind((item as any).kind)
            return (
              <button
                key={`${item.href}-${i}`}
                type="button"
                onClick={() => irPara(item.href)}
                onMouseEnter={() => setActivo(i)}
                className={`pd-cmdk-item${i === activo ? ' active' : ''}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="pd-cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span className="ml-auto">Pesquisa de todo o portal</span>
        </div>
      </div>
    </div>
  )
}
