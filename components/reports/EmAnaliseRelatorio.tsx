'use client'

import { useEffect, useState } from 'react'
import { BookOpenCheck, Languages, Loader2, MessageCircleQuestion, ScaleIcon } from 'lucide-react'

/**
 * O que mostrar enquanto o resumo é preparado.
 *
 * Mesma ideia do ecrã de espera da análise de dados (NovaAnaliseClient): um espaço vazio com um
 * spinner, durante um a três minutos, sente-se como estar pendurado. Em vez disso, um carrossel de
 * factos VERDADEIROS sobre o que esta funcionalidade já sabe fazer, para quem espera saber o que
 * vai poder fazer a seguir, assim que o resumo estiver pronto.
 */
const FACTOS = [
  {
    icone: BookOpenCheck,
    texto: 'O resumo vem em três profundidades: um resumo rápido para decidir se interessa, um resumo médio para uma conversa, e tudo, com os achados e as recomendações do documento.',
  },
  {
    icone: MessageCircleQuestion,
    texto: 'Depois de pronto, pode perguntar directamente ao relatório em vez de o ler todo: a resposta vem sempre com a página onde se confirma.',
  },
  {
    icone: ScaleIcon,
    texto: 'A nossa equipa pode comparar os números deste relatório com os conjuntos de dados do portal, para confirmar se batem certo.',
  },
  {
    icone: Languages,
    texto: 'O resumo também fica disponível em inglês, com uma verificação que recusa a tradução se algum número for alterado.',
  },
]

export function EmAnaliseRelatorio() {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIndice((i) => (i + 1) % FACTOS.length), 5000)
    return () => clearInterval(t)
  }, [])

  const actual = FACTOS[indice]
  const Icone = actual.icone

  return (
    <div className="rpt-emanalise">
      <div className="rpt-emanalise-topo">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>A preparar o resumo deste relatório. Um documento longo pode levar alguns minutos.</span>
      </div>
      <div key={indice} className="pd-live-calc-in rpt-emanalise-facto">
        <span className="rpt-emanalise-icone">
          <Icone className="size-4" aria-hidden />
        </span>
        <p>{actual.texto}</p>
      </div>
      <div className="rpt-emanalise-pontos">
        {FACTOS.map((_, i) => (
          <span key={i} className="rpt-ponto" data-activo={i === indice} aria-hidden />
        ))}
      </div>
    </div>
  )
}
