import { db, countDatasets } from '@/lib/db'
import { contarServicos } from '@/lib/db'
import { MAP_CATALOG } from '@/lib/maps-catalog'
import { ServicosClient } from '@/components/servicos/ServicosClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Serviços | Data Portal',
  description:
    'Tudo o que o Data Portal oferece: catálogo de dados geoespaciais e alfanuméricos, mapas inteligentes, dashboards, análise por IA, relatórios e alertas, em Moçambique.',
}

async function getOrganizacoes(): Promise<number> {
  try {
    const [rows] = (await db.execute(
      'SELECT COUNT(DISTINCT source) as organizations FROM Dataset WHERE source IS NOT NULL AND source != ""'
    )) as any
    return Number(rows[0]?.organizations || 0)
  } catch {
    return 0
  }
}

export default async function ServicosPage() {
  const [totalDatasets, organizacoes, contagens] = await Promise.all([
    countDatasets(),
    getOrganizacoes(),
    contarServicos(),
  ])
  const totalMapas = MAP_CATALOG.length

  const ferramentas = [
    {
      numero: '01',
      titulo: 'Catálogo Geoespacial',
      desc: 'Fronteiras administrativas, infraestrutura e uso do solo, com pré-visualização em mapa.',
      meta: `${contagens.geoespaciais} datasets`,
      who: 'Planeamento · SIG',
      href: '/dados-espaciais',
      icon: 'geo' as const,
    },
    {
      numero: '02',
      titulo: 'Catálogo Alfanumérico',
      desc: 'Tabelas e indicadores de demografia, economia, saúde e educação, prontos a consultar.',
      meta: `${contagens.alfanumericos} datasets`,
      who: 'Analistas · M&A',
      href: '/dados-alfanumericos',
      icon: 'alfa' as const,
    },
    {
      numero: '03',
      titulo: 'Mapas Inteligentes',
      desc: 'Mapas temáticos já montados, com camadas, KPIs e filtros interactivos.',
      meta: `${totalMapas} publicados`,
      who: 'Direcções provinciais',
      href: '/maps',
      icon: 'mapa' as const,
    },
    {
      numero: '04',
      titulo: 'Dashboards Alfanuméricos',
      desc: 'Painéis interactivos sobre os dados tabulares do portal, sem precisar de programar.',
      meta: `${contagens.dashboards} publicados`,
      who: 'Direcção · Gabinete',
      href: '/dashboards-alfanumericos',
      icon: 'dash' as const,
    },
    {
      numero: '05',
      titulo: 'Análise por Inteligência Artificial',
      desc: 'Pergunte em português. O sistema cruza fontes reais e devolve números rastreáveis.',
      meta: 'Fontes citadas',
      who: 'Todos os perfis',
      href: '/analise/nova',
      icon: 'ia' as const,
      badge: { texto: 'IA', classe: 'new' as const },
    },
    {
      numero: '06',
      titulo: 'Relatórios',
      desc: 'Relatórios já publicados, prontos a consultar, ou pedido de um relatório personalizado.',
      meta: `${contagens.relatorios} publicados`,
      who: 'Doadores · ONG',
      href: '/relatorios',
      icon: 'relatorio' as const,
    },
    {
      numero: '07',
      titulo: 'Alertas de Actualização',
      desc: 'Segue um dataset e recebe aviso automático sempre que for actualizado.',
      meta: `${totalDatasets} a seguir`,
      who: 'Equipas de M&A',
      href: '/dados-alfanumericos',
      icon: 'alerta' as const,
      badge: { texto: 'Pro', classe: 'pro' as const },
    },
    {
      numero: '08',
      titulo: 'Download de Dados',
      desc: 'Ficheiro original de qualquer dataset publicado, no formato de origem: SHP, GeoJSON, CSV, XLSX.',
      meta: 'Notificar-me',
      who: 'Programadores',
      href: '#',
      icon: 'download' as const,
      badge: { texto: 'Em breve', classe: 'soon' as const },
    },
    {
      numero: '09',
      titulo: 'Ruas 360°',
      desc: 'Ruas de Maputo e Chimoio captadas em 360°, com sinais de trânsito georreferenciados, navegáveis no portal.',
      meta: 'Maputo e Chimoio',
      who: 'Planeamento · Trânsito',
      href: '/ruas-360',
      icon: 'ruas360' as const,
      badge: { texto: 'Novo', classe: 'new' as const },
    },
  ]

  const consulta = [
    {
      titulo: 'Recolha de Dados Sob Encomenda',
      desc: 'Desenho e execução de inquéritos ou recolha em campo para responder a uma pergunta específica.',
      out: 'Entregável: dataset validado + nota metodológica',
      href: '#consultoria',
      icon: 'recolha' as const,
    },
    {
      titulo: 'Consultoria e Advisory Estratégico',
      desc: 'Diagnóstico, modelação de cenários e recomendações com base nos dados do portal.',
      out: 'Entregável: relatório + sessão de decisão',
      href: '#consultoria',
      icon: 'consultoria' as const,
    },
    {
      titulo: 'Formação e Capacitação',
      desc: 'Workshops práticos sobre dados abertos e as ferramentas do portal na sua organização.',
      out: 'Entregável: turma certificada + manual',
      href: '#consultoria',
      icon: 'formacao' as const,
    },
    {
      titulo: 'Integração de Dados em Tempo Real',
      desc: 'Ligação de fontes externas ao portal, para actualização contínua em vez de carregamento manual.',
      out: 'Entregável: API activa + monitorização',
      href: '#consultoria',
      icon: 'integracao' as const,
    },
    {
      titulo: 'Levantamento Ruas 360°',
      desc: 'Captação de novas ruas ou zonas em imagens 360°, com sinais de trânsito georreferenciados.',
      out: 'Entregável: percurso navegável no visor + dados de sinalização',
      href: '#consultoria',
      icon: 'recolha' as const,
    },
  ]

  return (
    <ServicosClient
      totalDatasets={totalDatasets}
      organizacoes={organizacoes}
      ferramentas={ferramentas}
      consulta={consulta}
    />
  )
}
