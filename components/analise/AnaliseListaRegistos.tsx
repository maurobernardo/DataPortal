'use client'

import { useMemo, useState } from 'react'

/**
 * Os registos que a pergunta pediu pelo nome.
 *
 * Existe por causa de uma resposta pela metade: a "quantas escolas temos na cidade da Beira e quais
 * são?" o portal respondeu 105 e não nomeou uma única escola. O número estava certo e a segunda
 * metade da pergunta ficou por responder, o que é uma forma silenciosa de errar: quem lê vê uma
 * resposta completa porque vê um número grande.
 *
 * O painel mostra a lista inteira, não uma amostra. Cortar seria repetir o mesmo defeito com menos
 * ambição. O que se corta é a ALTURA: acima de algumas dezenas de nomes o resto fica atrás de um
 * botão, com a contagem no rótulo para que ninguém confunda o que está à vista com o que existe.
 *
 * A procura aparece só quando a lista é grande o suficiente para valer a pena. Numa lista de doze
 * nomes, uma caixa de procura é mobília.
 */
const VISIVEIS_POR_OMISSAO = 24
const MINIMO_PARA_PROCURA = 30

export type ListaRegistosVista = {
  passo_id: string
  titulo: string
  coluna: string
  ambito: string | null
  itens: string[]
  total: number
  truncada: boolean
}

function semAcentos(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function AnaliseListaRegistos({ lista }: { lista: ListaRegistosVista }) {
  const [expandido, setExpandido] = useState(false)
  const [procura, setProcura] = useState('')

  const filtrados = useMemo(() => {
    const termo = semAcentos(procura.trim())
    if (!termo) return lista.itens
    return lista.itens.filter((i) => semAcentos(i).includes(termo))
  }, [lista.itens, procura])

  if (!lista.itens?.length) return null

  const aProcurar = procura.trim().length > 0
  // Com uma procura activa mostra-se tudo o que ela devolveu: quem procurou já disse o que quer.
  const visiveis = expandido || aProcurar ? filtrados : filtrados.slice(0, VISIVEIS_POR_OMISSAO)
  const escondidos = filtrados.length - visiveis.length

  return (
    <section className="pdx-panel">
      <div className="pdx-panel-head">
        <h2>{lista.titulo}</h2>
        <span className="pdx-panel-sub">
          {lista.total} {lista.total === 1 ? 'registo' : 'registos'}
          {lista.ambito ? ` em ${lista.ambito}` : ''}
        </span>
      </div>

      <div className="pdx-panel-body">
        {lista.itens.length >= MINIMO_PARA_PROCURA && (
          <input
            type="search"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Procurar nesta lista..."
            aria-label={`Procurar em ${lista.titulo}`}
            className="pdx-campo pdx-campo-com-icone mb-4"
          />
        )}

        {visiveis.length === 0 ? (
          <p className="pdx-nota">Nenhum registo corresponde a &quot;{procura.trim()}&quot;.</p>
        ) : (
          <ul className="pdx-lista-registos">
            {visiveis.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ul>
        )}

        {!aProcurar && escondidos > 0 && (
          <button type="button" onClick={() => setExpandido(true)} className="pdx-ligacao mt-3">
            Ver os outros {escondidos} nomes
          </button>
        )}
        {!aProcurar && expandido && filtrados.length > VISIVEIS_POR_OMISSAO && (
          <button type="button" onClick={() => setExpandido(false)} className="pdx-ligacao mt-3">
            Mostrar menos
          </button>
        )}

        <p className="pdx-nota mt-3">
          Nomes lidos da coluna &quot;{lista.coluna}&quot;, tal como estão registados no ficheiro.
          {lista.truncada
            ? ` A lista mostra ${lista.itens.length} dos ${lista.total} encontrados.`
            : ''}
        </p>
      </div>
    </section>
  )
}
