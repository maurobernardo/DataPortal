'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { ContactsSection } from '@/components/ContactsSection'

type ContactModalContextValue = {
  openContact: () => void
  closeContact: () => void
}

const ContactModalContext = createContext<ContactModalContextValue | null>(null)

export function useContactModal() {
  const ctx = useContext(ContactModalContext)
  if (!ctx) throw new Error('useContactModal must be used within ContactModalProvider')
  return ctx
}

export function openContactGlobally() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('pd-open-contact'))
}

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openContact = useCallback(() => setOpen(true), [])
  const closeContact = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onGlobal = () => openContact()
    window.addEventListener('pd-open-contact', onGlobal)
    return () => window.removeEventListener('pd-open-contact', onGlobal)
  }, [openContact])

  useEffect(() => {
    const syncFromHash = () => {
      if (window.location.hash !== '#contato') return
      openContact()
      const next = `${window.location.pathname}${window.location.search}`
      window.history.replaceState(null, '', next || '/')
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [openContact])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContact()
    }
    document.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [open, closeContact])

  return (
    <ContactModalContext.Provider value={{ openContact, closeContact }}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-14 sm:items-center sm:pt-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Fechar janela de contacto"
            onClick={closeContact}
          />
          <div
            className="relative z-10 mt-2 w-full max-w-6xl max-h-[min(92vh,calc(100dvh-1rem))] overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
            style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 z-[1] flex justify-end rounded-t-2xl bg-gradient-to-b from-[#f0f5f1] via-[#f0f5f1]/95 to-transparent px-2 pb-12 -mb-12 pt-2">
              <button
                type="button"
                className="inline-flex rounded-full p-2 text-gray-600 transition hover:bg-white/90 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064E2C]"
                aria-label="Fechar"
                onClick={closeContact}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <ContactsSection variant="modal" />
          </div>
        </div>
      ) : null}
    </ContactModalContext.Provider>
  )
}
