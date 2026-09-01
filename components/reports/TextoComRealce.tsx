import { realcarTexto } from '@/lib/relatorios/realce'

/**
 * Desenha um texto com as citações de página em verde e os anos em dourado, as duas cores que o
 * resto do portal já usa para "está confirmado" e para destaque. Um resumo lê-se ao correr o olho
 * pela página, não palavra a palavra: quem procura "quando" ou "onde é que isto se confirma" vê
 * as duas coisas sem ter de ler a frase toda.
 */
export function TextoComRealce({ texto }: { texto: string }) {
  const segmentos = realcarTexto(texto)
  return (
    <>
      {segmentos.map((s, i) => {
        if (s.tipo === 'pagina') {
          return (
            <span key={i} className="rpt-realce-pagina">
              {s.texto}
            </span>
          )
        }
        if (s.tipo === 'numero') {
          return (
            <span key={i} className="rpt-realce-numero">
              {s.texto}
            </span>
          )
        }
        return <span key={i}>{s.texto}</span>
      })}
    </>
  )
}
