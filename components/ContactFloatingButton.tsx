'use client'

import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useContactModal } from '@/components/ContactModalProvider'

export function ContactFloatingButton() {
  const pathname = usePathname()
  const { openContact } = useContactModal()

  if (pathname === '/dashboard' || pathname?.startsWith('/dashboard/') || pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => openContact()}
      className="pd-contact-fab"
      aria-label="Falar connosco"
      title="Falar connosco"
    >
      <MessageCircle size={22} strokeWidth={2} aria-hidden />
      <span>Falar connosco</span>
    </button>
  )
}
