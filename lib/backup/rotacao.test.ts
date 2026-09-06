import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./gerar-backup', () => ({
  gerarBackupCompleto: vi.fn(async (caminho: string) => {
    fs.writeFileSync(caminho, '-- fake dump\n')
    return { tabelas: 1, tamanhoBytes: 14 }
  }),
}))

describe('correrBackup / rotação', () => {
  it('poda backups antigos acima do limite de retenção', async () => {
    const pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-backup-test-'))
    vi.spyOn(process, 'cwd').mockReturnValue(pastaTemp)
    vi.resetModules()
    const { correrBackup, listarBackups } = await import('./rotacao')

    for (let i = 0; i < 5; i++) {
      await correrBackup('diario')
      await new Promise((r) => setTimeout(r, 5)) // garante nomes de ficheiro (timestamp) distintos
    }

    const restantes = listarBackups('diario')
    expect(restantes.length).toBe(3) // RETENCAO.diario = 3

    fs.rmSync(pastaTemp, { recursive: true, force: true })
  })
})
