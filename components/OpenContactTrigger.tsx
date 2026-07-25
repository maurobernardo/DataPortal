'use client'

import type { ReactNode } from 'react'
import { useContactModal } from '@/components/ContactModalProvider'

type OpenContactTriggerProps = {
  children: ReactNode
  className?: string
}

/** Botão/acção acessível com aparência de texto ou link para abrir o modal de contacto. */
export function OpenContactTrigger({ children, className = '' }: OpenContactTriggerProps) {
  const { openContact } = useContactModal()
  return (
    <button
      type="button"
      className={`inline cursor-pointer border-0 bg-transparent p-0 font-inherit ${className}`.trim()}
      onClick={() => openContact()}
    >
      {children}
    </button>
  )
}
