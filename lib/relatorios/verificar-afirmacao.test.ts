import { describe, expect, it } from 'vitest'
import { compararValores, mesmaGeografia, mesmaUnidade, normalizarTexto } from './verificar-afirmacao'

describe('normalizarTexto', () => {
  it('remove acentos e normaliza caixa/espaços', () => {
    expect(normalizarTexto('  Nampúla  ')).toBe('nampula')
  })
})

describe('mesmaGeografia', () => {
  it('reconhece a mesma unidade com ordem de palavras diferente', () => {
    expect(mesmaGeografia('Maputo Cidade', 'Cidade Maputo')).toBe(true)
  })
  it('não confunde a província com a cidade', () => {
    expect(mesmaGeografia('Maputo', 'Maputo Cidade')).toBe(false)
  })
})

describe('mesmaUnidade', () => {
  it('aceita a mesma unidade em texto diferente dentro do mesmo grupo', () => {
    expect(mesmaUnidade('toneladas', 'ton')).toBe(true)
  })
  it('rejeita unidades de grandezas diferentes', () => {
    expect(mesmaUnidade('toneladas', 'meticais')).toBe(false)
  })
})

describe('compararValores', () => {
  it('confirma quando a diferença está dentro da tolerância', () => {
    const r = compararValores(103, 100, 'pessoas', 0.05)
    expect(r.estado).toBe('confirma')
  })
  it('diverge quando a diferença excede a tolerância', () => {
    const r = compararValores(150, 100, 'pessoas', 0.05)
    expect(r.estado).toBe('diverge')
  })
})
