'use client'

import { Printer } from 'lucide-react'

/** "Descarregar" um documento legal é, na prática, imprimir para PDF — o CSS `@media print` do
 *  layout já esconde o índice e ajusta as cores para isso funcionar bem sem gerar um ficheiro
 *  novo no servidor. */
export function BotaoImprimirDocumento() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="legal-doc-print-btn"
    >
      <Printer size={14} aria-hidden />
      Descarregar / imprimir
    </button>
  )
}
