'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * A pré-visualização real de um PDF, desenhada página a página em canvas.
 *
 * Havia tentativas antes desta que dependiam do VISUALIZADOR NATIVO do browser (`<iframe>`,
 * `<object>`) ou de um ficheiro de worker copiado à mão para `/vendor/`. As duas famílias de
 * problema, resolvidas aqui:
 *
 * 1. Um visualizador nativo nem sempre existe, e quando falta não avisa: fica uma caixa branca.
 *    Por isso o pdf.js desenha as páginas ele próprio, em canvas, e o que se vê é sempre o que foi
 *    desenhado por nós.
 *
 * 2. O worker do pdf.js correr numa Web Worker exige que o browser consiga carregar esse ficheiro,
 *    e um caminho estático em `/vendor/` depende da política de segurança do site (`worker-src`) e
 *    do próprio browser tratarem esse pedido da mesma forma — que não aconteceu sempre (visto ao
 *    vivo: funcionou num browser e falhou noutro). `new Worker(new URL(..., import.meta.url))` é o
 *    padrão que o webpack (o compilador do Next.js) reconhece e resolve ele próprio, emitindo o
 *    worker como mais um ficheiro do build: deixa de haver um caminho escrito à mão para divergir
 *    do que o browser aceita.
 */
export function PreVisualizacaoPdf({ url, titulo }: { url: string; titulo: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'a_carregar' | 'pronto' | 'erro'>('a_carregar')
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [paginasDesenhadas, setPaginasDesenhadas] = useState(0)
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  // Acima disto não se desenha mais: um relatório de duzentas páginas não precisa de as ter todas
  // no DOM para se saber do que trata, e cada página desenhada é uma imagem em memória.
  const LIMITE_PAGINAS = 15

  useEffect(() => {
    let cancelado = false
    let worker: Worker | null = null

    async function desenhar() {
      setEstado('a_carregar')
      setPaginasDesenhadas(0)
      setMensagemErro(null)
      try {
        const pdfjsLib = await import('pdfjs-dist')

        // Padrão de worker do próprio webpack: ver o comentário do módulo. Precisa do caminho
        // completo do ficheiro (não a raiz do pacote), que é o que o pdf.js publica pronto a usar.
        worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url))
        pdfjsLib.GlobalWorkerOptions.workerPort = worker as any

        /*
         * `disableRange`/`disableStream`: por omissão o pdf.js sonda o ficheiro com um pedido
         * `Range` antes de o ler todo, para poder começar a mostrar a primeira página sem esperar
         * pelo download completo. Visto ao vivo: "Unexpected server response (204) while
         * retrieving PDF" — um 204 é a resposta típica de um extra do browser (um gestor de
         * downloads) a intercepetar esse pedido específico e a devolver uma resposta vazia em vez
         * de deixar o pdf.js segui-lo. Desligar as duas opções faz o pdf.js pedir o ficheiro
         * completo de uma vez, com um GET normal, que é o mesmo pedido que "Abrir ficheiro" já usa
         * sem problema nenhum — mais lento a começar num ficheiro muito grande, mas sem depender de
         * um pedido pouco comum que nem todos os intermediários tratam da mesma forma.
         */
        const documento = await pdfjsLib.getDocument({ url, disableRange: true, disableStream: true }).promise
        if (cancelado) return
        setTotalPaginas(documento.numPages)

        const contentor = containerRef.current
        if (!contentor) return
        contentor.innerHTML = ''

        const aDesenhar = Math.min(documento.numPages, LIMITE_PAGINAS)
        for (let i = 1; i <= aDesenhar; i++) {
          if (cancelado) return
          const pagina = await documento.getPage(i)
          const viewportBase = pagina.getViewport({ scale: 1 })

          /*
           * A RESOLUÇÃO do canvas (para onde o pdf.js desenha) e o TAMANHO na página (como o CSS o
           * mostra) são duas coisas separadas de propósito, e a versão anterior confundia as duas:
           * calculava um "escala" só a partir da largura do ecrã e usava-o também para o tamanho de
           * desenho, com um tecto arbitrário de 2x. Numa página larga, isso desenhava um canvas
           * pequeno e deixava o resto do cartão vazio à volta — exactamente o que se via.
           *
           * Agora o canvas desenha-se numa resolução alta (a largura real do ecrã vezes a
           * densidade de pixels do ecrã, para ficar nítido em ecrãs retina), e o CSS estica-o
           * sempre a 100% da largura do cartão (`width:100%` na classe `.rpt-pdf-pagina`); a altura
           * segue automaticamente pela proporção da imagem.
           */
          const larguraAlvo = contentor.clientWidth || 760
          const escalaRender = Math.min((larguraAlvo * (window.devicePixelRatio || 1)) / viewportBase.width, 4)
          const viewport = pagina.getViewport({ scale: escalaRender })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.className = 'rpt-pdf-pagina'
          const contexto = canvas.getContext('2d')
          if (!contexto) continue

          await pagina.render({ canvasContext: contexto, viewport }).promise
          if (cancelado) return
          contentor.appendChild(canvas)
          setPaginasDesenhadas(i)
        }
        if (!cancelado) setEstado('pronto')
      } catch (erro: any) {
        // A mensagem fica visível (pequena, discreta) e não só na consola: da última vez que isto
        // falhou, o único rasto que sobrou foi um print do ecrã sem a mensagem nenhuma.
        console.error('Falha ao desenhar a pré-visualização do PDF:', erro)
        if (!cancelado) {
          setMensagemErro(String(erro?.message || erro))
          setEstado('erro')
        }
      }
    }

    desenhar()
    return () => {
      cancelado = true
      worker?.terminate()
    }
  }, [url])

  return (
    <div className="rpt-pdf-preview-real">
      {estado === 'a_carregar' && (
        <div className="rpt-pdf-preview-estado">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>{paginasDesenhadas > 0 ? `A desenhar a página ${paginasDesenhadas}…` : 'A abrir o documento…'}</span>
        </div>
      )}
      {estado === 'erro' && (
        <div className="rpt-pdf-preview-estado">
          <p>Não foi possível desenhar a pré-visualização deste ficheiro aqui.</p>
          {mensagemErro && <p className="rpt-pdf-preview-erro-tecnico">{mensagemErro}</p>}
        </div>
      )}
      <div ref={containerRef} className="rpt-pdf-preview-paginas" aria-label={`Páginas de ${titulo}`} />
      {/*
        Sem link nenhum para `url` (o ficheiro original): o portal nunca deve entregar o
        documento inteiro em lado nenhum desta página, só esta pré-visualização (desenhada, não
        descarregável) e os resumos gerados a partir dele. Antes havia "Abrir o documento
        completo" aqui, e foi removido de propósito.
      */}
      {estado === 'pronto' && totalPaginas > LIMITE_PAGINAS && (
        <p className="rpt-pdf-preview-nota">
          A mostrar as primeiras {LIMITE_PAGINAS} de {totalPaginas} páginas. Peça a análise deste
          relatório para ler um resumo com todo o conteúdo.
        </p>
      )}
    </div>
  )
}
