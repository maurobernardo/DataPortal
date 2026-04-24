export default function PoliticaCookiesPage() {
  return (
    <section className="px-4 py-12 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-yellow-500 to-green-500 p-8 text-white shadow-xl">
          <h1 className="text-3xl md:text-4xl font-bold">Politica de Cookies</h1>
          <p className="mt-3 text-white/90">
            Informacoes sobre cookies essenciais e tecnicos utilizados no portal.
          </p>
        </div>

        <div className="space-y-4">
          <article className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cookies essenciais</h2>
            <p className="text-gray-700 leading-relaxed">
              Sao utilizados para autenticacao, seguranca de sessao e funcionamento do portal. Sem
              eles, funcionalidades administrativas podem nao operar corretamente.
            </p>
          </article>

          <article className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cookies tecnicos</h2>
            <p className="text-gray-700 leading-relaxed">
              Podem ser usados para desempenho e estabilidade da plataforma, sem venda de dados
              pessoais a terceiros.
            </p>
          </article>

          <article className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestao pelo utilizador</h2>
            <p className="text-gray-700 leading-relaxed">
              Voce pode gerir cookies no navegador. Ao bloquear cookies essenciais, partes do portal
              podem ficar indisponiveis.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
