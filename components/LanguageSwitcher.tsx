'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, Search, Check } from 'lucide-react'
import { SOURCE_LANGUAGE, TRANSLATE_LANGUAGES } from '@/lib/translate-languages'

const COOKIE_NAME = 'googtrans'

function readCurrentLangCode(): string {
  if (typeof document === 'undefined') return SOURCE_LANGUAGE.code
  const match = document.cookie.match(/googtrans=\/[^/]+\/([^;]+)/)
  return match?.[1] || SOURCE_LANGUAGE.code
}

function applyLanguage(code: string) {
  const domain = window.location.hostname
  const expire = 'expires=Thu, 01 Jan 1970 00:00:00 UTC'

  // limpa qualquer variante de cookie existente antes de aplicar a nova
  document.cookie = `${COOKIE_NAME}=; path=/; ${expire}`
  document.cookie = `${COOKIE_NAME}=; path=/; domain=${domain}; ${expire}`
  document.cookie = `${COOKIE_NAME}=; path=/; domain=.${domain}; ${expire}`

  if (code !== SOURCE_LANGUAGE.code) {
    const value = `/${SOURCE_LANGUAGE.code}/${code}`
    document.cookie = `${COOKIE_NAME}=${value}; path=/;`
    document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${domain};`
  }

  window.location.reload()
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [current, setCurrent] = useState(SOURCE_LANGUAGE.code)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrent(readCurrentLangCode())
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const currentLang = TRANSLATE_LANGUAGES.find((l) => l.code === current) || SOURCE_LANGUAGE

  const filtered = query.trim()
    ? TRANSLATE_LANGUAGES.filter((l) =>
        `${l.name} ${l.code}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : TRANSLATE_LANGUAGES

  return (
    <div className="pd-lang-switcher notranslate" ref={rootRef}>
      <button
        type="button"
        className="pd-lang-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        title="Mudar de idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={15} strokeWidth={2} aria-hidden />
        {!compact && <span>{currentLang.code.toUpperCase()}</span>}
      </button>

      {open && (
        <div className="pd-lang-switcher-panel notranslate" role="listbox">
          <div className="pd-lang-switcher-search">
            <Search size={13} strokeWidth={2} aria-hidden />
            <input
              autoFocus
              type="text"
              placeholder="Pesquisar idioma…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="pd-lang-switcher-list">
            {filtered.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`pd-lang-switcher-item${l.code === current ? ' active' : ''}`}
                onClick={() => applyLanguage(l.code)}
                role="option"
                aria-selected={l.code === current}
              >
                <span>{l.name}</span>
                {l.code === current && <Check size={14} strokeWidth={2.5} aria-hidden />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="pd-lang-switcher-empty">Nenhum idioma encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
