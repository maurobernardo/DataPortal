import { describe, expect, it } from 'vitest'
import { colunasSemelhantes } from './detectar-contradicoes'

describe('colunasSemelhantes', () => {
  it('reconhece nomes exactamente iguais e específicos', () => {
    expect(colunasSemelhantes('area_km2', 'area_km2')).toBe(true)
  })
  it('reconhece sinónimos conhecidos (população/habitantes)', () => {
    expect(colunasSemelhantes('populacao', 'habitantes')).toBe(true)
  })
  it('não trata nomes genéricos como "value"/"total" como a mesma métrica só por serem iguais', () => {
    expect(colunasSemelhantes('value', 'value')).toBe(false)
    expect(colunasSemelhantes('total', 'total')).toBe(false)
  })
  it('rejeita colunas sem relação nenhuma', () => {
    expect(colunasSemelhantes('area_km2', 'numero_casos')).toBe(false)
  })
})
