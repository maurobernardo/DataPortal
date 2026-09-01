/**
 * Rótulos e cores partilhados entre os componentes de apresentação de uma análise (mapa de
 * pontos, tabela exploratória, etc.) — o mesmo nome de coluna e a mesma categoria têm de aparecer
 * sempre com o mesmo rótulo humano e a mesma cor, esteja onde estiver.
 */

/**
 * O coroplético pinta a área administrativa INTEIRA (província/distrito) por um valor agregado —
 * correcto para "quantos X por província", mas nunca mostra ONDE a coisa em si está: uma província
 * pintada de vermelho não diz nada sobre a forma real de um parque nacional, de uma reserva, ou de
 * uma rede de estradas dentro dela. A princípio isto excluía polígonos (a ideia era que um dataset
 * de polígonos pudesse já SER a própria área administrativa reagregada, e nesse caso mostrar a
 * geometria bruta seria redundante) — mas todos os casos reais vistos nesta sessão (parques
 * nacionais, reservas florestais, reservas nacionais) são polígonos de feições DISCRETAS, não
 * unidades administrativas, e ficavam completamente escondidos atrás do coroplético. Aplica-se
 * então a todos os tipos de geometria, sem excepção: a forma real do dataset é sempre informação,
 * nunca só o coroplético isolado.
 */
export function geometriaPrecisaDaSuaPropriaCamada(_tipoGeometria: string): boolean {
  return true
}

/**
 * O nome bruto da coluna ("Admin1", "Facility_t") não diz nada a quem não trabalhou com o
 * ficheiro. Ficheiros shapefile (.dbf) limitam nomes de coluna a 10 caracteres, por isso é
 * frequentíssimo neste portal ver sufixos truncados como "_t" (tipo), "_n" (nome) — expandir
 * esses sufixos e reconhecer os nomes administrativos padrão (Admin1/2/3, Country) cobre a
 * generalidade dos datasets geoespaciais aqui, não só um dataset específico.
 */
/**
 * Colunas de identificador técnico (chave interna do ficheiro, nunca um dado real) — "OBJECTID",
 * "OBJECTID_1" (sufixo que o ArcGIS/shapefile acrescenta quando já existe um campo com esse nome),
 * "FID", "GID", "OGC_FID", "ROWID"/"ROW_ID". Nenhuma tem significado para quem lê a análise; usar
 * o nome bruto como rótulo de uma métrica ("OBJECTID 1 por província") expõe um detalhe interno
 * do ficheiro-fonte, não uma grandeza real. Os pontos de chamada que constroem rótulos de série
 * devem, ao detectar isto, usar a descrição do passo em vez do nome da coluna.
 */
export function ehColunaIdTecnico(coluna: string): boolean {
  return /^(object ?id|f[io]d|gid|ogc[_ ]?fid|row ?id)(_\d+)?$/i.test(coluna.trim())
}

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
    // Datasets de conservação (Biofund e semelhantes) usam nomes de campo em inglês por inteiro,
    // não abreviados — sem isto o rótulo ficava "National Park" tal qual, em inglês, porque já
    // tem espaço a separar palavras e passa despercebido ao teste de "ainda parece técnico".
    [/^national[_ ]?park$/i, 'Parque Nacional'],
    [/^protected[_ ]?area$/i, 'Área protegida'],
    [/^buffer[_ ]?zone$/i, 'Zona-tampão'],
    // Vocabulário comum em datasets de infra-estrutura (estradas, redes) deste portal — nomes de
    // campo truncados/abreviados que apareceram em datasets reais analisados nesta sessão
    // (estradas: "Ligacao", "Manut1996") e o seu padrão geral, não só esses nomes exactos.
    [/^liga[cç][aã]o$/i, 'Ligação'],
    [/^manut(en[cç][aã]o)?[-_ ]?\d*$/i, 'Manutenção'],
    [/^cond(i[cç][aã]o)?$/i, 'Condição'],
    [/^estado$/i, 'Estado'],
    [/^superf(icie)?$/i, 'Superfície'],
    [/^extens[aã]o$/i, 'Extensão'],
    [/^ext[_-]?km$/i, 'Extensão (km)'],
    [/^class(e|ifica[cç][aã]o)?$/i, 'Classificação'],
    [/^regi[aã]o$/i, 'Região'],
    [/^posto$/i, 'Posto administrativo'],
    [/^bairro$/i, 'Bairro'],
    [/^localidade$/i, 'Localidade'],
    [/^ano$/i, 'Ano'],
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
  // Condição/estado de infra-estrutura (estradas, redes) — vocabulário comum em datasets de
  // manutenção rodoviária deste portal.
  good: 'Boa',
  fair: 'Razoável',
  poor: 'Má',
  bad: 'Má',
  paved: 'Pavimentada',
  unpaved: 'Não pavimentada',
  other: 'Outro',
  vicinal: 'Vicinal',
  // Categorias de gestão de conservação (Biofund e semelhantes) — o mesmo texto em inglês aparece
  // como VALOR de uma coluna (ex.: "Management"), não só como nome de coluna (já coberto em
  // rotularColuna); os dois têm de estar traduzidos, senão o rótulo da coluna fica em português
  // mas o valor lá dentro continua em inglês.
  'national park': 'Parque Nacional',
  'protected area': 'Área protegida',
  'buffer zone': 'Zona-tampão',
  'game reserve': 'Reserva de caça',
  'forest reserve': 'Reserva florestal',
  // Classificação de estradas em português (variantes de maiúsculas vindas directamente do
  // dataset, sem tradução nenhuma a fazer — só normalização de maiúscula/minúscula).
  primaria: 'Primária',
  secundaria: 'Secundária',
  terciaria: 'Terciária',
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
