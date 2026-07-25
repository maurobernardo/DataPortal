export default function TermosCondicoesPage() {
  return (
    <section className="px-4 pt-8 pb-8 sm:pt-10 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 p-6 text-white shadow-xl sm:p-8">
          <h1 className="text-3xl md:text-4xl font-bold">Termos e Condicoes</h1>
          <p className="mt-3 text-white/90">
            Regras de uso do Data Portal para garantir seguranca, legalidade e qualidade dos dados.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Uso da plataforma</h2>
            <p className="text-gray-700 leading-relaxed">
              Ao utilizar o Data Portal, voce concorda em usar a plataforma de forma legal e etica,
              respeitando a legislacao aplicavel.
            </p>
          </article>

          <article className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Responsabilidade dos dados</h2>
            <p className="text-gray-700 leading-relaxed">
              Os dados disponibilizados sao de responsabilidade das entidades fornecedoras. O uso
              final das informacoes deve considerar validacao tecnica adequada.
            </p>
          </article>

          <article className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Seguranca</h2>
            <p className="text-gray-700 leading-relaxed">
              E proibido tentar acesso nao autorizado, automatizar abuso da plataforma ou submeter
              qualquer conteudo malicioso.
            </p>
          </article>

          <article className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Atualizacoes</h2>
            <p className="text-gray-700 leading-relaxed">
              O portal pode atualizar funcionalidades e conteudos sem aviso previo, visando melhorar
              desempenho, confiabilidade e conformidade.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
