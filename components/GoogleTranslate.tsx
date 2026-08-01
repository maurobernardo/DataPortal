'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

declare global {
  interface Window {
    google?: any
    googleTranslateElementInit?: () => void
  }
}

/**
 * O widget da Google só varre o DOM automaticamente no carregamento inicial da página. Nas
 * navegações do Next.js App Router (via <Link>) o DOM muda sem reload completo, por isso o
 * conteúdo da rota nova fica por traduzir até se forçar uma nova passagem — troca-se o valor do
 * <select> escondido que o próprio widget cria (.goog-te-combo) e dispara-se o evento "change",
 * que é o gatilho que a Google usa internamente para retraduzir o DOM actual.
 */
// Enquanto uma retradução está em curso, a própria Google reescreve nós de texto espalhados
// por toda a página (não só dentro do seu wrapper) — sem esta janela de supressão, o
// MutationObserver via abaixo confundia essas mutações com "conteúdo novo" e voltava a pedir
// tradução, entrando num ciclo que fazia o texto oscilar entre português e inglês sem parar.
let suppressMutationsUntil = 0
const TRANSLATION_SETTLE_MS = 2000

function retriggerTranslation() {
  const combo = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (!combo || !combo.value) return
  suppressMutationsUntil = Date.now() + TRANSLATION_SETTLE_MS
  const value = combo.value
  combo.value = value
  combo.dispatchEvent(new Event('change'))
}

let domPatched = false

/**
 * O widget da Google reescreve nós de texto directamente no DOM, fora do controlo do React.
 * Quando o React tenta depois reconciliar essa mesma sub-árvore (ex.: ao alternar um menu),
 * tenta remover/inserir um nó que a Google já substituiu, e o React rebenta com
 * "NotFoundError: Failed to execute 'removeChild'/'insertBefore' on 'Node'". Este é o conflito
 * conhecido entre o Google Translate e frameworks baseados em DOM virtual — a correcção robusta
 * não é evitar o widget, é tornar as duas operações mais comuns tolerantes a um nó já ausente.
 */
function patchDomForTranslateConflicts() {
  if (domPatched || typeof Node === 'undefined') return
  domPatched = true

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      return child
    }
    return originalRemoveChild.call(this, child) as T
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T
  }
}

export function GoogleTranslate() {
  const pathname = usePathname()

  useEffect(() => {
    patchDomForTranslateConflicts()
  }, [])

  useEffect(() => {
    if (window.google?.translate || document.getElementById('google-translate-script')) return

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'pt',
          autoDisplay: false,
        },
        'google_translate_element'
      )
    }

    const script = document.createElement('script')
    script.id = 'google-translate-script'
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    script.async = true
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    // Pequeno atraso para dar tempo ao React de terminar de montar o conteúdo da nova rota
    // antes de pedir à Google para o varrer.
    const timeout = window.setTimeout(retriggerTranslation, 300)
    return () => window.clearTimeout(timeout)
  }, [pathname])

  useEffect(() => {
    // Conteúdo que aparece sem mudar de rota (menus, modais, cards carregados por fetch) também
    // fica por traduzir, porque a Google só varre o DOM no carregamento e nas trocas de rota
    // acima. Observa-se o DOM e, sempre que aparecem nós novos que não vieram da própria Google,
    // pede-se uma nova passagem de tradução — com debounce para não disparar em catadupa e sem
    // reagir às mutações da própria Google (senão entrava em ciclo).
    let debounceId: number | null = null

    const isOwnMutation = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return false
      const el = node as Element
      return (
        el.id === 'google_translate_element' ||
        el.classList?.contains('skiptranslate') ||
        !!el.closest?.('#google_translate_element, .goog-te-banner-frame, .skiptranslate')
      )
    }

    const observer = new MutationObserver((mutations) => {
      if (Date.now() < suppressMutationsUntil) return
      const hasNewContent = mutations.some(
        (m) => m.addedNodes.length > 0 && !Array.from(m.addedNodes).every(isOwnMutation)
      )
      if (!hasNewContent) return
      if (debounceId) window.clearTimeout(debounceId)
      debounceId = window.setTimeout(retriggerTranslation, 500)
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (debounceId) window.clearTimeout(debounceId)
    }
  }, [])

  useEffect(() => {
    // O widget da Google reafirma a barra de topo e o deslocamento do <body>
    // periodicamente; o CSS sozinho não é suficiente, por isso reforça-se via JS.
    const enforce = () => {
      document.body.style.top = '0px'
      document.documentElement.style.top = '0px'
      document
        .querySelectorAll('.goog-te-banner-frame, iframe.skiptranslate')
        .forEach((el) => {
          const frame = el as HTMLElement
          frame.style.display = 'none'
          frame.style.visibility = 'hidden'
          frame.style.height = '0'
        })
    }

    enforce()
    const observer = new MutationObserver(enforce)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    observer.observe(document.documentElement, { childList: true, subtree: false })
    const interval = window.setInterval(enforce, 500)

    return () => {
      observer.disconnect()
      window.clearInterval(interval)
    }
  }, [])

  return <div id="google_translate_element" className="pd-google-translate-hidden" aria-hidden="true" />
}
