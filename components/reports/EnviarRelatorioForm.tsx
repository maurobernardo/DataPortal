'use client'

import { useState } from 'react'
import { Loader2, RotateCcw, UploadCloud } from 'lucide-react'
import { PainelDigesto } from './PainelDigesto'
import { PerguntarAoRelatorio } from './PerguntarAoRelatorio'

/**
 * Deixa qualquer utilizador com sessão iniciada enviar o seu próprio relatório em PDF para o
 * portal analisar — o mesmo motor (extracção de texto + digesto por IA) que já corre sobre os
 * relatórios oficiais. Ver app/api/reports/upload/route.ts.
 *
 * De propósito, sem navegar para /relatorios/[id]: quem acabou de enviar um PDF continua nesta
 * mesma secção, e o cartão de processamento (e depois o resultado) aparece aqui mesmo — sair para
 * outra página a meio do envio deixava a pessoa a perguntar-se se tinha mesmo funcionado.
 */
// Quantas vezes tentar de novo sem incomodar quem está a usar: apanhado ao vivo em produção, o
// proxy à frente da aplicação (Apache/LiteSpeed do cPanel) por vezes fecha a ligação a meio de um
// upload sem motivo aparente (nunca chega a responder nada, nem um erro) — na tentativa seguinte,
// segundos depois, o mesmo pedido passa sem problema nenhum. Repetir sozinho aqui poupa a pessoa
// de ter de perceber isto e voltar a carregar no botão à mão.
const TENTATIVAS_MAX = 3
const ESPERA_ENTRE_TENTATIVAS_MS = 1200

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function EnviarRelatorioForm({ analisesRestantes }: { analisesRestantes: number | null }) {
  const [titulo, setTitulo] = useState('')
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [aEnviar, setAEnviar] = useState(false)
  const [tentativaActual, setTentativaActual] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState<{ id: number; titulo: string } | null>(null)

  async function enviar() {
    if (!ficheiro) {
      setErro('Escolha um ficheiro PDF antes de enviar.')
      return
    }
    setErro(null)
    setAEnviar(true)

    for (let tentativa = 1; tentativa <= TENTATIVAS_MAX; tentativa++) {
      setTentativaActual(tentativa)
      try {
        const dados = new FormData()
        dados.append('file', ficheiro)
        if (titulo.trim()) dados.append('title', titulo.trim())
        const resposta = await fetch('/api/reports/upload', { method: 'POST', body: dados })
        const corpo = await resposta.json().catch(() => null)
        if (!resposta.ok) {
          // Erro real (limite atingido, ficheiro inválido, etc.): a resposta chegou, por isso não
          // é uma falha de ligação transitória — repetir não ia mudar nada, mostra logo o motivo.
          setErro(corpo?.error || 'Não foi possível enviar o relatório.')
          setAEnviar(false)
          return
        }
        setEnviado({ id: corpo.id, titulo: titulo.trim() || ficheiro.name.replace(/\.pdf$/i, '') })
        setAEnviar(false)
        return
      } catch {
        // fetch() rejeitou antes de haver resposta nenhuma: é a falha de ligação transitória.
        if (tentativa < TENTATIVAS_MAX) {
          await esperar(ESPERA_ENTRE_TENTATIVAS_MS * tentativa)
          continue
        }
        setErro('Não foi possível enviar o relatório após várias tentativas. Tente novamente daqui a instantes.')
        setAEnviar(false)
      }
    }
  }

  if (enviado) {
    return (
      <div className="rpt-enviar-card">
        <div className="rpt-enviar-card-topo">
          <UploadCloud className="size-5" aria-hidden />
          <div>
            <p className="rpt-enviar-card-titulo">{enviado.titulo}</p>
            <p className="rpt-enviar-card-desc">Enviado. A análise aparece aqui em baixo assim que estiver pronta.</p>
          </div>
        </div>
        <PainelDigesto
          reportId={enviado.id}
          titulo={enviado.titulo}
          ano={String(new Date().getFullYear())}
          autenticado
        />
        <PerguntarAoRelatorio reportId={enviado.id} autenticado />
        <button
          type="button"
          onClick={() => {
            setEnviado(null)
            setTitulo('')
            setFicheiro(null)
          }}
          className="rpt-enviar-outro"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Enviar outro relatório
        </button>
      </div>
    )
  }

  return (
    <div className="rpt-enviar-card">
      <div className="rpt-enviar-card-topo">
        <UploadCloud className="size-5" aria-hidden />
        <div>
          <p className="rpt-enviar-card-titulo">Enviar o meu relatório</p>
          <p className="rpt-enviar-card-desc">
            Carregue um PDF seu e receba o mesmo resumo automático que os relatórios oficiais do
            portal têm: pontos principais com a página onde se confirmam, e perguntas directas ao
            documento.
          </p>
        </div>
      </div>
      {analisesRestantes !== null && (
        <p className={`rpt-enviar-limite${analisesRestantes === 0 ? ' rpt-enviar-limite-esgotado' : ''}`}>
          {analisesRestantes === 0
            ? 'Já usou as suas 2 análises gratuitas (dados e relatórios contam para o mesmo limite). Contacte a equipa do portal para continuar a analisar.'
            : `Tem ${analisesRestantes} ${analisesRestantes === 1 ? 'análise gratuita' : 'análises gratuitas'} restante${analisesRestantes === 1 ? '' : 's'}: conta partilhada com o AI Insights.`}
        </p>
      )}
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título do relatório (opcional)"
        maxLength={200}
        className="rpt-enviar-input"
        disabled={aEnviar}
      />
      <label className="rpt-enviar-ficheiro">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFicheiro(e.target.files?.[0] || null)}
          disabled={aEnviar}
          className="sr-only"
        />
        {ficheiro ? ficheiro.name : 'Escolher ficheiro PDF…'}
      </label>
      {erro && <p className="rpt-enviar-erro">{erro}</p>}
      <button
        type="button"
        onClick={enviar}
        disabled={aEnviar || !ficheiro || analisesRestantes === 0}
        className="rpt-enviar-btn"
      >
        {aEnviar ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UploadCloud className="size-4" aria-hidden />}
        {aEnviar
          ? tentativaActual > 1
            ? `A tentar novamente (${tentativaActual}/${TENTATIVAS_MAX})…`
            : 'A enviar…'
          : 'Enviar e analisar'}
      </button>
    </div>
  )
}
