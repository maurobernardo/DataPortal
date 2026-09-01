'use client'

import { useState } from 'react'
import { LineChart } from 'lucide-react'
import { SelectorParceiro } from './SelectorParceiro'
import type { Parceiro } from '@/lib/parceiros'

/**
 * O cabeçalho do painel, com a marca de quem o vai receber.
 *
 * Reutiliza o mesmo selector do relatório, e por isso a escolha é a mesma: quem prepara relatórios
 * para um financiador prepara-lhe também o painel, e ter de o dizer duas vezes seria trabalho
 * inventado. A escolha vive no browser de quem prepara, não na conta nem nas análises.
 *
 * "Preparado para", como no relatório, e pelo mesmo motivo: o parceiro é o destinatário do trabalho.
 */
export function CabecalhoDoPainel({ total }: { total: number }) {
  const [parceiro, setParceiro] = useState<Parceiro | null>(null)

  return (
    <div className="pdx-cabecalho-pagina flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="pdx-selo">
          <LineChart className="size-3.5" aria-hidden />
          Acompanhamento contínuo
        </p>
        <h1>Painel</h1>
        <p>
          {total === 0
            ? 'As perguntas que puser a ser acompanhadas aparecem aqui, com a data de cada corrida.'
            : `${total} ${total === 1 ? 'pergunta acompanhada' : 'perguntas acompanhadas'}. Cada uma volta a correr sozinha e diz o que mudou.`}
        </p>
        {parceiro && (
          <p className="pdx-painel-parceiro">
            {/* <img> e nao next/image, para o logotipo estar desenhado quando o ecra for capturado. */}
            <img src={parceiro.logo} alt="" height={24} />
            <span>Preparado para {parceiro.rotulo}</span>
          </p>
        )}
      </div>
      <SelectorParceiro parceiro={parceiro} onEscolher={setParceiro} />
    </div>
  )
}
