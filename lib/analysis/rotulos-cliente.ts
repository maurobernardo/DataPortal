/**
 * Rótulos e cores partilhados entre os componentes de apresentação de uma análise (mapa de
 * pontos, tabela exploratória, etc.) — o mesmo nome de coluna e a mesma categoria têm de aparecer
 * sempre com o mesmo rótulo humano e a mesma cor, esteja onde estiver.
 */

/**
 * O nome bruto da coluna ("Admin1", "Facility_t") não diz nada a quem não trabalhou com o
 * ficheiro. Ficheiros shapefile (.dbf) limitam nomes de coluna a 10 caracteres, por isso é
 * frequentíssimo neste portal ver sufixos truncados como "_t" (tipo), "_n" (nome) — expandir
 * esses sufixos e reconhecer os nomes administrativos padrão (Admin1/2/3, Country) cobre a
 * generalidade dos datasets geoespaciais aqui, não só um dataset específico.
 */
export function rotularColuna(coluna: string): string {
  const limpo = coluna.trim()
  const conhecidos: [RegExp, string][] = [
    [/^admin ?1$/i, 'Província'],
    [/^admin ?2$/i, 'Distrito'],
    [/^admin ?3$/i, 'Posto administrativo'],
    [/^(country|pais|país)$/i, 'País'],
    [/^provinc/i, 'Província'],
    [/^distrit|^district/i, 'Distrito'],
    [/^fid$/i, 'ID'],
    [/^lat(itude)?$/i, 'Latitude'],
    [/^long?(itude)?$/i, 'Longitude'],
    // Datasets do OpenStreetMap (aeroportos, estradas, escolas, etc.) trazem sempre este
    // vocabulário fixo de campos — reconhecê-los cobre qualquer dataset importado do OSM, não só
    // este.
    [/^name$/i, 'Nome'],
    [/^name[_:]en$/i, 'Nome (inglês)'],
    [/^name[_:]pt$/i, 'Nome (português)'],
    [/^aeroway$/i, 'Tipo'],
    [/^highway$/i, 'Tipo de via'],
    [/^amenity$/i, 'Tipo'],
    [/^building$/i, 'Edifício'],
    [/^emergency$/i, 'Emergência'],
    [/^capacity/i, 'Capacidade'],
    [/^addr[_:]?full$/i, 'Endereço'],
    [/^addr[_:]?city$/i, 'Cidade'],
    [/^source$/i, 'Fonte'],
    [/^osm[_:]?id$/i, 'ID OSM'],
  ]
  for (const [re, rotulo] of conhecidos) if (re.test(limpo)) return rotulo

  const sufixosTruncados: [RegExp, string][] = [
    [/_ty?pe?$/i, 'Tipo'],
    [/_t$/i, 'Tipo'],
    [/_n(ame)?$/i, 'Nome'],
    [/_c(ode)?$/i, 'Código'],
    [/_d(esc)?$/i, 'Descrição'],
    [/_s(ource)?$/i, 'Fonte'],
  ]
  for (const [re, rotulo] of sufixosTruncados) if (re.test(limpo)) return rotulo

  return limpo
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Valores de categoria vindos de OpenStreetMap são vocabulário controlado em inglês (aeroway=*,
 * amenity=*, ...) — mostrar "aerodrome"/"helipad" tal qual obriga o utilizador a saber inglês
 * técnico de GIS. Só traduz valores deste dicionário fechado (nunca texto livre, como nomes de
 * unidades): fora dele devolve o valor original sem alterar.
 */
const VALORES_CONHECIDOS: Record<string, string> = {
  // aeroway=*
  aerodrome: 'Aeródromo',
  helipad: 'Heliponto',
  heliport: 'Heliporto',
  runway: 'Pista de descolagem',
  taxiway: 'Via de circulação',
  apron: 'Pátio de estacionamento',
  hangar: 'Hangar',
  terminal: 'Terminal',
  windsock: 'Manga de vento',
  navigationaid: 'Ajuda à navegação',
  holding_position: 'Posição de espera',
  parking_position: 'Posição de estacionamento',
  gate: 'Porta de embarque',
  // amenity=* (comuns em datasets de saúde/educação)
  hospital: 'Hospital',
  clinic: 'Clínica',
  pharmacy: 'Farmácia',
  doctors: 'Consultório médico',
  school: 'Escola',
  college: 'Instituto',
  university: 'Universidade',
  // highway=*
  primary: 'Primária',
  secondary: 'Secundária',
  tertiary: 'Terciária',
  residential: 'Residencial',
  unclassified: 'Não classificada',
  track: 'Caminho',
}

export function traduzirValorCategoria(valor: string): string {
  const chave = valor.trim().toLowerCase()
  return VALORES_CONHECIDOS[chave] || valor
}

/** Paleta fixa (CVD-considerada) para até 8 categorias — abaixo desse número fica mais bonita e
 *  previsível do que cores geradas. */
const PALETA_CATEGORICA_BASE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

/**
 * Um dataset com 15 tipos de unidade (ou mais) esgota qualquer paleta fixa pequena — repetir
 * cores entre categorias diferentes é pior do que gerar novas: o utilizador lê a legenda e
 * assume, erradamente, que duas categorias com a mesma cor são a mesma coisa. Acima do tamanho
 * da paleta fixa, gera-se uma cor por categoria espaçada uniformemente à volta do círculo de
 * matiz (HSL) — garante sempre N cores distintas para N categorias, sem repetição.
 */
export function gerarPaletaCategorica(n: number): string[] {
  if (n <= PALETA_CATEGORICA_BASE.length) return PALETA_CATEGORICA_BASE.slice(0, n)
  const cores: string[] = []
  for (let i = 0; i < n; i++) {
    const matiz = Math.round((360 / n) * i)
    // Satura/ilumina alternam ligeiramente a cada volta para diferenciar ainda mais matizes
    // próximos quando N é grande (ex.: 20+ categorias).
    const s = 60 + (i % 3) * 8
    const l = 38 + (i % 2) * 10
    cores.push(`hsl(${matiz}, ${s}%, ${l}%)`)
  }
  return cores
}
