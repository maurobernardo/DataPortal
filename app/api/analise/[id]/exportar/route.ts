export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { obterAnalise } from '@/lib/analysis/persistencia'

/**
 * Exportação em HTML autónomo (Parte 20: dashboard descarregável).
 *
 * Ao contrário do PDF (que captura o DOM já renderizado no browser, com Leaflet e Recharts), este
 * ficheiro é gerado aqui, no servidor, com SVG desenhado à mão: um mapa interactivo ou um gráfico
 * Recharts não sobrevivem fora da página que os carrega, e um HTML "autónomo" que precisasse da
 * internet para funcionar não seria autónomo. Cada série e cada gráfico tornam-se uma barra SVG
 * simples, sem qualquer dependência externa.
 */

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatarNumero(v: number): string {
  const casas = Number.isInteger(v) ? 0 : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2
  return v.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

const ROTULO_NIVEL: Record<string, string> = {
  admin1: 'Província',
  admin2: 'Distrito',
  admin3: 'Posto administrativo',
}

function barrasSerie(serie: any): string {
  const ordenadas = [...serie.unidades].sort((a: any, b: any) => b.valor - a.valor).slice(0, 20)
  const maximo = ordenadas[0]?.valor || 1
  const linhas = ordenadas
    .map(
      (u: any, i: number) => `
        <div class="linha-barra">
          <span class="linha-rotulo">${i + 1}. ${escaparHtml(u.nome)}</span>
          <div class="linha-fundo"><div class="linha-preenchida" style="width:${Math.max(2, (u.valor / maximo) * 100)}%"></div></div>
          <span class="linha-valor">${formatarNumero(u.valor)}</span>
        </div>`
    )
    .join('')

  return `
    <section class="cartao">
      <h2>${ROTULO_NIVEL[serie.nivel] || serie.nivel}: ${escaparHtml(serie.metrica)}</h2>
      <p class="legenda">${serie.unidades.length} unidades${ordenadas.length < serie.unidades.length ? ` · mostrando as ${ordenadas.length} maiores` : ''}</p>
      <div class="lista-barras">${linhas}</div>
    </section>`
}

function graficoSvg(g: any): string {
  const largura = 560
  const altura = 220
  const margem = { esq: 40, dir: 10, cima: 10, baixo: 24 }
  const n = g.eixoX.length
  const todosValores = g.series.flatMap((s: any) => s.valores).filter((v: any) => v != null) as number[]
  const maximo = Math.max(...todosValores, 0)
  const minimo = Math.min(...todosValores, 0)
  const amplitude = maximo - minimo || 1
  const largUtil = largura - margem.esq - margem.dir
  const altUtil = altura - margem.cima - margem.baixo

  function y(v: number): number {
    return margem.cima + altUtil - ((v - minimo) / amplitude) * altUtil
  }

  const cores = ['#064E2C', '#0a6339', '#3D8B5F', '#7BB596', '#B8DBC8', '#CFE3D6']
  // Categorias sem ordem entre si (fatias de pizza): matizes distintos, não tons do mesmo verde.
  const coresCategoricas = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
  let corpo = ''
  let legenda = ''

  if (g.tipo === 'barra') {
    const largGrupo = largUtil / n
    const largBarra = (largGrupo * 0.7) / g.series.length
    g.series.forEach((s: any, si: number) => {
      s.valores.forEach((v: number | null, i: number) => {
        if (v == null) return
        const x = margem.esq + i * largGrupo + largGrupo * 0.15 + si * largBarra
        const alt = altUtil - (y(v) - margem.cima)
        corpo += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${largBarra.toFixed(1)}" height="${alt.toFixed(1)}" fill="${cores[si % cores.length]}" />`
      })
    })
    legenda = g.series.map((s: any, i: number) => `<span class="chave"><i style="background:${cores[i % cores.length]}"></i>${escaparHtml(s.nome)}</span>`).join('')
  } else if (g.tipo === 'pizza') {
    const valores = (g.series[0]?.valores || []).map((v: number | null) => v ?? 0)
    const total = valores.reduce((a: number, b: number) => a + b, 0) || 1
    const cx = largura / 2
    const cy = altura / 2
    const raio = Math.min(largura, altura) / 2 - 20
    let anguloActual = -Math.PI / 2
    valores.forEach((v: number, i: number) => {
      const fatia = (v / total) * Math.PI * 2
      const x1 = cx + raio * Math.cos(anguloActual)
      const y1 = cy + raio * Math.sin(anguloActual)
      anguloActual += fatia
      const x2 = cx + raio * Math.cos(anguloActual)
      const y2 = cy + raio * Math.sin(anguloActual)
      const largoArco = fatia > Math.PI ? 1 : 0
      corpo += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${raio},${raio} 0 ${largoArco} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${coresCategoricas[i % coresCategoricas.length]}" stroke="#fff" stroke-width="1.5" />`
    })
    legenda = g.eixoX.map((nome: string, i: number) => `<span class="chave"><i style="background:${coresCategoricas[i % coresCategoricas.length]}"></i>${escaparHtml(nome)}</span>`).join('')
  } else if (g.tipo === 'dispersao') {
    const y2 = (g.series[0]?.valores || []) as (number | null)[]
    const xsNumericos = g.eixoX.map((v: string) => Number.parseFloat(v))
    const minX = Math.min(...xsNumericos)
    const maxX = Math.max(...xsNumericos)
    const ampX = maxX - minX || 1
    xsNumericos.forEach((xv: number, i: number) => {
      const yv = y2[i]
      if (yv == null || !Number.isFinite(xv)) return
      const px = margem.esq + ((xv - minX) / ampX) * largUtil
      corpo += `<circle cx="${px.toFixed(1)}" cy="${y(yv).toFixed(1)}" r="3" fill="${cores[0]}" fill-opacity="0.6" />`
    })
  } else {
    // linha e area: ambas ficam bem como polilinha simples no export estático.
    g.series.forEach((s: any, si: number) => {
      const pontos = s.valores
        .map((v: number | null, i: number) => (v == null ? null : `${(margem.esq + (i / (n - 1 || 1)) * largUtil).toFixed(1)},${y(v).toFixed(1)}`))
        .filter(Boolean)
        .join(' ')
      corpo += `<polyline points="${pontos}" fill="none" stroke="${cores[si % cores.length]}" stroke-width="2" />`
    })
    legenda = g.series.map((s: any, i: number) => `<span class="chave"><i style="background:${cores[i % cores.length]}"></i>${escaparHtml(s.nome)}</span>`).join('')
  }

  return `
    <section class="cartao">
      <h2>${escaparHtml(g.titulo)}</h2>
      <svg viewBox="0 0 ${largura} ${altura}" class="grafico-svg" role="img" aria-label="${escaparHtml(g.titulo)}">${corpo}</svg>
      <div class="legenda-grafico">${legenda}</div>
    </section>`
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sessao = await getCurrentUser()
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const analise = await obterAnalise(params.id)
  if (!analise) return NextResponse.json({ erro: 'Análise não encontrada' }, { status: 404 })
  if (!analise.publico && analise.utilizador_id !== sessao.userId) {
    return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  }
  if (analise.estado === 'erro' || !analise.narrativa?.resolvida) {
    return NextResponse.json({ erro: 'Análise sem narrativa publicável' }, { status: 409 })
  }

  const n = analise.narrativa.resolvida
  const series = (analise.resultados?.series || []).filter((s: any) => s.unidades?.length > 0)
  const graficos = analise.resultados?.graficos || []
  const destaques = analise.resultados?.destaques || []
  const achados = analise.achados || []

  const html = `<!doctype html>
<html lang="pt-MZ">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(n.titulo)} · Data Portal</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #FAFBFA; color: #1A2E22; }
  .pagina { max-width: 880px; margin: 0 auto; padding: 32px 20px 60px; }
  header.hero { background: linear-gradient(135deg, #064E2C, #0a6339); color: #fff; border-radius: 16px; padding: 40px 36px; margin-bottom: 28px; }
  header.hero p.eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 11px; font-weight: 700; color: #9FD4B4; margin: 0 0 14px; }
  header.hero h1 { font-size: 32px; line-height: 1.15; margin: 0 0 14px; font-weight: 800; }
  header.hero p.subtitulo { font-size: 16px; color: rgba(255,255,255,.85); line-height: 1.6; margin: 0; max-width: 640px; }
  header.hero .rodape { margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.15); font-size: 12px; color: rgba(255,255,255,.6); }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .kpi { background: #fff; border: 1px solid #E2E8E5; border-radius: 14px; padding: 18px; text-align: center; }
  .kpi .valor { font-size: 30px; font-weight: 800; color: #064E2C; line-height: 1; margin-bottom: 6px; }
  .kpi .rotulo { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; }
  .cartao { background: #fff; border: 1px solid #E2E8E5; border-radius: 14px; padding: 22px 24px; margin-bottom: 18px; }
  .cartao h2 { font-size: 15px; font-weight: 700; margin: 0 0 6px; }
  .cartao .legenda { font-size: 12px; color: #6B7280; margin: 0 0 14px; }
  .cartao p.resposta { font-size: 16px; line-height: 1.65; margin: 0; }
  .linha-barra { display: grid; grid-template-columns: 160px 1fr 70px; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 12px; }
  .linha-rotulo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .linha-fundo { background: #F1F4F2; border-radius: 4px; height: 16px; overflow: hidden; }
  .linha-preenchida { background: #B8DBC8; height: 100%; }
  .linha-valor { font-weight: 700; color: #064E2C; text-align: right; font-variant-numeric: tabular-nums; }
  .grafico-svg { width: 100%; height: auto; }
  .legenda-grafico { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
  .chave { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #4B5563; }
  .chave i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .achados { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
  .achado { border-left: 4px solid #064E2C; background: #fff; border: 1px solid #E2E8E5; border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 700; }
  .aviso { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 14px; padding: 20px 22px; margin-bottom: 18px; }
  .aviso h2 { color: #92400E; font-size: 15px; margin: 0 0 10px; }
  .aviso li { color: #92400E; font-size: 13px; line-height: 1.6; }
  footer { font-size: 12px; color: #6B7280; border-top: 1px solid #E2E8E5; padding-top: 16px; }
</style>
</head>
<body>
<div class="pagina">
  <header class="hero">
    <p class="eyebrow">Data Portal · dataportal.co.mz</p>
    <h1>${escaparHtml(n.titulo)}</h1>
    <p class="subtitulo">${escaparHtml(n.subtitulo)}</p>
    <div class="rodape">${escaparHtml(analise.pergunta)} · ${new Date(analise.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </header>

  ${
    n.numeros_chave?.length
      ? `<div class="kpis">${n.numeros_chave
          .map((k: any) => `<div class="kpi"><div class="valor">${escaparHtml(String(k.valor))}</div><div class="rotulo">${escaparHtml(k.rotulo)}</div></div>`)
          .join('')}</div>`
      : ''
  }

  <div class="cartao"><p class="resposta">${escaparHtml(n.resposta_directa)}</p></div>

  ${destaques
    .map(
      (d: any) => `
    <section class="cartao">
      <h2>${escaparHtml(d.titulo)}</h2>
      <p class="resposta" style="font-size:15px;color:#B91C1C;font-weight:700;margin:0">${escaparHtml(d.nome)}</p>
      <p class="legenda" style="margin-top:6px">${escaparHtml(String(d.valor))} ${escaparHtml(d.metrica)} · mapa interactivo disponível na versão online</p>
    </section>`
    )
    .join('')}

  ${series.map(barrasSerie).join('')}
  ${graficos.map(graficoSvg).join('')}

  ${
    achados.length
      ? `<section class="cartao"><h2>O que não perguntou mas devia saber</h2><div class="achados">${achados
          .slice(0, 6)
          .map((a: any) => `<div class="achado">${escaparHtml(a.titulo)}</div>`)
          .join('')}</div></section>`
      : ''
  }

  <section class="aviso">
    <h2>O que isto não diz</h2>
    <ul>${n.o_que_nao_diz.map((l: string) => `<li>${escaparHtml(l)}</li>`).join('')}</ul>
  </section>

  <footer>
    <p><strong>Fontes:</strong> ${n.fontes.map((f: any) => `${escaparHtml(f.instituicao)}${f.ano ? ` (${f.ano})` : ''}`).join('; ')}</p>
    <p>Produzido por dataportal.co.mz, o portal de dados oficial de Moçambique.</p>
  </footer>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="analise-${params.id}.html"`,
    },
  })
}