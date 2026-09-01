/**
 * Que províncias de Moçambique um relatório menciona, para as poder desenhar num mapa.
 *
 * Casamento por substring normalizado, não por igualdade: o texto de geografia de um digesto é
 * prosa livre ("Sofala, Manica, Tete e Zambézia (Moçambique)", "Região Sul de Moçambique"), nunca
 * um código de província. Substring é suficiente para nomes de província (só 10, sem ambiguidade
 * entre eles) e é o mesmo tipo de correspondência que `AnaliseMapaCoropletico.tsx` já usa para
 * ligar rótulos de gráfico a unidades do mapa.
 */

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export type ProvinciaMencionada = { codigo: string; nome: string; mencoes: number }

export function identificarProvincias(
  textos: string[],
  provincias: { codigo: string; nome: string }[]
): ProvinciaMencionada[] {
  const contagem = new Map<string, ProvinciaMencionada>()
  const textosNormalizados = textos.filter(Boolean).map(normalizar)
  if (textosNormalizados.length === 0) return []

  for (const provincia of provincias) {
    const nomeNormalizado = normalizar(provincia.nome)
    if (!nomeNormalizado) continue

    let mencoes = 0
    for (const texto of textosNormalizados) {
      mencoes += texto.split(nomeNormalizado).length - 1
    }
    if (mencoes > 0) {
      contagem.set(provincia.codigo, { codigo: provincia.codigo, nome: provincia.nome, mencoes })
    }
  }

  return Array.from(contagem.values()).sort((a, b) => b.mencoes - a.mencoes)
}
