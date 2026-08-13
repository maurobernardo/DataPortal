type DatasetInfo = {
  id: number
  titulo: string
  descricao?: string | null
  fonte?: string | null
  categoria?: string | null
  ano?: number | null
  formato?: string | null
  tamanhoFicheiro?: string | null
  cobertura?: string | null
  unidadeMinima?: string | null
  numRegistos?: number | null
  criadoEm?: string | null
  actualizadoEm?: string | null
}

function formatarData(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Um dataset de referência de 2015 não deixa de ser válido, mas quem lê a análise devia saber
 *  que pode não reflectir a situação actual — sem isto, o ano só aparecia como mais um campo dos
 *  metadados, fácil de saltar por cima. 3 anos é o mesmo horizonte que o portal já usa noutros
 *  avisos de "dado desactualizado" no catálogo. */
const ANOS_PARA_AVISO = 3
function dadoDesactualizado(ano?: number | null): boolean {
  if (!ano) return false
  return new Date().getFullYear() - ano >= ANOS_PARA_AVISO
}

/**
 * Mostra só os campos que o Dataset realmente tem na base de dados (título, descrição, fonte,
 * categoria, ano, formato, tamanho, cobertura, unidade mínima, datas). Sem "Responsável" nem
 * "Licença": não existem no esquema, e inventar um valor violaria a regra de nunca escrever um
 * número ou facto sem fonte real (R1).
 */
export function MetadadosDataset({ datasets }: { datasets: DatasetInfo[] }) {
  if (datasets.length === 0) return null

  return (
    <section className="rounded-2xl border border-[#E2E8E5] bg-white p-5 mb-5">
      <h2 className="text-base font-bold text-[var(--pd-ink-900)] mb-3">Metadados do Dataset</h2>
      <div className={`grid grid-cols-1 gap-4 ${datasets.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {datasets.map((d) => {
          const criado = formatarData(d.criadoEm)
          const actualizado = formatarData(d.actualizadoEm)
          const campos: { rotulo: string; valor: string }[] = [
            ...(d.fonte ? [{ rotulo: 'Fonte', valor: d.fonte }] : []),
            ...(d.categoria ? [{ rotulo: 'Categoria', valor: d.categoria }] : []),
            ...(d.ano ? [{ rotulo: 'Ano', valor: String(d.ano) }] : []),
            ...(d.formato ? [{ rotulo: 'Formato', valor: d.formato }] : []),
            ...(d.tamanhoFicheiro ? [{ rotulo: 'Tamanho', valor: d.tamanhoFicheiro }] : []),
            ...(d.cobertura ? [{ rotulo: 'Cobertura', valor: d.cobertura }] : []),
            ...(d.unidadeMinima ? [{ rotulo: 'Unidade mínima', valor: d.unidadeMinima }] : []),
            ...(d.numRegistos != null ? [{ rotulo: 'Registos', valor: d.numRegistos.toLocaleString('pt-PT') }] : []),
            ...(criado ? [{ rotulo: 'Criado em', valor: criado }] : []),
            ...(actualizado ? [{ rotulo: 'Actualizado em', valor: actualizado }] : []),
          ]
          return (
            <div key={d.id} className="rounded-xl border border-[#E2E8E5] p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[14px] font-bold text-[var(--pd-ink-900)]">{d.titulo}</p>
                {dadoDesactualizado(d.ano) && (
                  <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Dados de {d.ano}
                  </span>
                )}
              </div>
              {d.descricao && (
                <p className="text-[12.5px] text-gray-600 leading-relaxed mb-3 line-clamp-3">{d.descricao}</p>
              )}
              <dl className={`grid grid-cols-2 gap-x-3 gap-y-1.5 ${datasets.length === 1 ? 'sm:grid-cols-3 lg:grid-cols-4' : ''}`}>
                {campos.map((c) => (
                  <div key={c.rotulo} className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{c.rotulo}</dt>
                    <dd className="text-[12.5px] text-[var(--pd-ink-800)] truncate">{c.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
      </div>
    </section>
  )
}
