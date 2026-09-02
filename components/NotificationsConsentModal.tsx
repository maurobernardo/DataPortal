'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'

/**
 * Pergunta uma única vez, no primeiro login, se o utilizador quer receber por email os avisos de
 * novo conteúdo publicado (datasets, relatórios, dashboards). Antes disto o portal enviava esse
 * email a TODA a base de utilizadores registados, sem hipótese de recusar — este popup substitui
 * isso por uma escolha explícita, sim ou não.
 *
 * `receber_notificacoes` na tabela `users` começa a NULL ("ainda não perguntámos"); é esse NULL,
 * devolvido por /api/auth/me, que faz este popup aparecer. Responder (sim ou não) grava 1/0 via
 * PATCH /api/auth/notificacoes e o popup nunca mais volta a aparecer para essa conta. A mesma
 * escolha pode ser mudada depois na página de Perfil.
 */
export function NotificationsConsentModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [aGravar, setAGravar] = useState(false)

  useEffect(() => {
    const rotasEscondidas = ['/admin', '/login', '/registo', '/verificar-email', '/verificar-2fa', '/embed']
    if (rotasEscondidas.some((r) => pathname.startsWith(r))) {
      setIsOpen(false)
      return
    }

    let activo = true
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!activo) return
        if (data?.user && data.user.receberNotificacoes === null) setIsOpen(true)
      })
      .catch(() => {})
    return () => {
      activo = false
    }
  }, [pathname])

  async function responder(receber: boolean) {
    setAGravar(true)
    try {
      await fetch('/api/auth/notificacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receber }),
      })
    } catch {
      // Falhar a gravar não deve prender o utilizador atrás do popup para sempre: fecha na mesma
      // e a pergunta volta a aparecer no login seguinte (a coluna continua NULL na base de dados).
    } finally {
      setAGravar(false)
      setIsOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl bg-white border border-[#E2E8E5] shadow-2xl shadow-black/10 overflow-hidden animate-slide-up">
        <div className="h-[3px] bg-[#064E2C]" />
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F1F8F4] border border-[#CFE3D6] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-[#064E2C]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 leading-tight">
                Quer receber notificações do portal?
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Um email sempre que houver um novo dataset, relatório ou dashboard.
              </p>
            </div>
          </div>

          <p className="text-[13px] text-gray-600 leading-relaxed mb-5">
            Pode mudar de ideias a qualquer momento na sua página de Perfil.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => responder(false)}
              disabled={aGravar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E8E5] bg-white text-[12px] font-semibold text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Não, obrigado
            </button>
            <button
              type="button"
              onClick={() => responder(true)}
              disabled={aGravar}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064E2C] text-white text-[13px] font-bold rounded-xl hover:bg-[#04361F] disabled:opacity-40 transition-all duration-200 hover:-translate-y-0.5 disabled:translate-y-0"
            >
              <Check className="w-4 h-4" />
              Sim, quero receber
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
