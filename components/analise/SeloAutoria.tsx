/**
 * Selo de autoria do relatório.
 *
 * Vai dentro do bloco que é exportado, e não na barra de acções: um PDF ou um HTML gerado aqui
 * circula por correio electrónico e por WhatsApp, longe do portal, e tem de dizer sozinho de onde
 * veio e quando. Usa <img> e não next/image de propósito: o export corre por html2canvas sobre o
 * DOM já desenhado, e o `srcset` responsivo do next/image chegava a resolver para um ficheiro
 * ainda não carregado no momento da captura.
 */
export function SeloAutoria({ analiseId, criadoEm }: { analiseId?: string; criadoEm?: string }) {
  const data = criadoEm ? new Date(criadoEm) : null
  const dataValida = data && !Number.isNaN(data.getTime()) ? data : null

  return (
    <div className="pdx-selo-autoria">
      <img src="/images/logo.png" alt="" width={40} height={37} />
      <div className="texto">
        <p className="titulo">Data Portal · Data4Moz</p>
        <p className="sub">
          Análise gerada pelo motor de análise do Data Portal, o portal de dados de Moçambique, a
          partir dos conjuntos de dados publicados em dataportal.co.mz.
        </p>
        {(dataValida || analiseId) && (
          <p className="ref">
            {dataValida &&
              dataValida.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
            {dataValida && analiseId ? ' · ' : ''}
            {analiseId && `Referência ${analiseId}`}
          </p>
        )}
      </div>
    </div>
  )
}
