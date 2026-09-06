import { describe, expect, it } from 'vitest'
import { isStrongPassword, isValidEmail, normalizeEmail, normalizeText } from './security'

describe('isValidEmail', () => {
  it('aceita emails válidos', () => {
    expect(isValidEmail('user@data4moz.com')).toBe(true)
  })
  it('rejeita emails sem @ ou domínio', () => {
    expect(isValidEmail('user')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('user@dominio')).toBe(false)
  })
})

describe('isStrongPassword', () => {
  it('exige maiúscula, minúscula, número, símbolo e 12+ caracteres', () => {
    expect(isStrongPassword('Abc123!@#xyz')).toBe(true)
    expect(isStrongPassword('abc123!@#xyz')).toBe(false) // sem maiúscula
    expect(isStrongPassword('ABC123!@#XYZ')).toBe(false) // sem minúscula
    expect(isStrongPassword('Abcdefgh!@#$')).toBe(false) // sem número
    expect(isStrongPassword('Abc12345678')).toBe(false) // sem símbolo
    expect(isStrongPassword('Ab1!')).toBe(false) // curta
  })
})

describe('normalizeEmail / normalizeText', () => {
  it('normaliza espaços e caixa do email', () => {
    expect(normalizeEmail('  User@Data4Moz.com  ')).toBe('user@data4moz.com')
  })
  it('colapsa espaços e corta ao tamanho máximo', () => {
    expect(normalizeText('  a   b  c  ', 3)).toBe('a b')
  })
})
