'use client'

import { useState } from 'react'

/**
 * A lista de "O que isto não diz".
 *
 * O bloco é obrigatório e o seu conteúdo não se corta: cada limitação é uma ressalva honesta que o
 * motor levantou, e apagar qualquer uma tornaria a análise mais confiante do que os dados
 * permitem. O que se corta é a altura. Numa análise com dez ressalvas longas, este painel ficava
 * cinco vezes mais alto do que o "Como chegámos aqui" ao lado, e a grelha de duas colunas passava
 * a ser uma coluna de texto com um cartão pequeno encostado ao topo.
 *
 * Por isso as primeiras ficam à vista e as restantes atrás de um botão, com a contagem no rótulo:
 * quem só passa os olhos vê um cartão da altura do vizinho, e quem quer a auditoria completa
 * continua a um clique dela.
 */
const VISIVEIS_POR_OMISSAO = 3

export function ListaLimitacoes({ limitacoes }: { limitacoes: string[] }) {
  const [expandido, setExpandido] = useState(false)

  if (!limitacoes?.length) return null

  const escondidas = limitacoes.length - VISIVEIS_POR_OMISSAO
  const visiveis = expandido ? limitacoes : limitacoes.slice(0, VISIVEIS_POR_OMISSAO)

  return (
    <div className="pdx-panel-body">
      <ul className="pdx-lista">
        {visiveis.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {escondidas > 0 && (
        <button type="button" onClick={() => setExpandido((v) => !v)} className="pdx-ligacao mt-3">
          {expandido
            ? 'Mostrar menos'
            : `Ver as outras ${escondidas} ${escondidas === 1 ? 'ressalva' : 'ressalvas'}`}
        </button>
      )}
    </div>
  )
}
