import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth'
import { agruparPorPalavraChave, gerarSugestoes, listarSugestoesTiposPorCategoria } from '@/lib/analysis/sugestoes-datasets'
import { AdminSidebar } from '@/components/AdminSidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import { SugestoesDatasetsClient } from '@/components/admin/SugestoesDatasetsClient'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function SugestoesDatasetsPage() {
  const user = await getCurrentUserProfile()

  if (!user) {
    redirect('/login?next=/admin/sugestoes-datasets')
  }
  if (user.role !== 'admin') {
    redirect('/')
  }

  // Mesmo princípio de defesa da página de utilização do AI Insights: um dado antigo imprevisível
  // não pode transformar toda a página num "Application error" em branco — mostra os painéis
  // vazios e regista o erro para investigar, em vez de rebentar.
  const [palavrasChave, sugestoesInfo, tiposPorCategoria] = await Promise.all([
    agruparPorPalavraChave().catch((error) => {
      logger.error('erro_agrupar_palavras_chave', { error })
      return []
    }),
    gerarSugestoes().catch((error) => {
      logger.error('erro_gerar_sugestoes_datasets', { error })
      return { sugestoes: [], temasCobertos: [], totalPerguntasClassificadas: 0 }
    }),
    listarSugestoesTiposPorCategoria().catch((error) => {
      logger.error('erro_listar_sugestoes_tipos_categoria', { error })
      return []
    }),
  ])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden md:block">
        <AdminSidebar user={user} />
      </div>

      <div className="flex-1 min-w-0 md:ml-64">
        <DashboardHeader user={user} />

        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <SugestoesDatasetsClient
              palavrasChaveInicial={palavrasChave}
              sugestoesInicial={sugestoesInfo.sugestoes}
              temasCobertosInicial={sugestoesInfo.temasCobertos}
              totalPerguntasClassificadasInicial={sugestoesInfo.totalPerguntasClassificadas}
              tiposPorCategoriaInicial={tiposPorCategoria}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
