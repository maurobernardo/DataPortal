import fs from 'fs'
import path from 'path'
import { gerarBackupCompleto } from './gerar-backup'

export type NivelBackup = 'diario' | 'semanal' | 'mensal'

// Pequeno de propósito: a tabela `analises` (narrativas de IA Insights) já ocupa ~1,3GB sozinha
// (159 linhas, ~8MB/linha), o que faz cada backup completo rondar 1,4GB — com uma retenção maior
// (ex.: 7+5+12) o disco do servidor facilmente passaria dos 30GB só em backups, mais do que a
// quota de um plano de hosting partilhado comum. Esta retenção mantém o pico por volta de 8
// cópias (~11GB).
const RETENCAO: Record<NivelBackup, number> = {
  diario: 3,
  semanal: 2,
  mensal: 3,
}

const PASTA_BASE = path.join(process.cwd(), 'backups')

export function pastaDoNivel(nivel: NivelBackup): string {
  return path.join(PASTA_BASE, nivel)
}

function timestampParaNomeFicheiro(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function podarBackupsAntigos(nivel: NivelBackup): void {
  const pasta = pastaDoNivel(nivel)
  const ficheiros = fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith('.sql'))
    .sort() // nomes começam por timestamp ISO — ordem alfabética = ordem cronológica
  const excesso = ficheiros.length - RETENCAO[nivel]
  for (let i = 0; i < excesso; i++) {
    fs.unlinkSync(path.join(pasta, ficheiros[i]))
  }
}

/**
 * Gera um novo backup para o nível dado (diário/semanal/mensal) e remove os mais antigos acima do
 * limite de retenção desse nível. Os 3 níveis não partilham ficheiros: cada um tem o seu próprio
 * dump completo e a sua própria pasta — mais simples e mais robusto a corrupção de um único
 * ficheiro do que copiar/symlink entre pastas.
 */
export async function correrBackup(nivel: NivelBackup): Promise<{ ficheiro: string; tabelas: number; tamanhoBytes: number }> {
  const pasta = pastaDoNivel(nivel)
  fs.mkdirSync(pasta, { recursive: true })

  const nomeFicheiro = `${timestampParaNomeFicheiro()}.sql`
  const caminhoCompleto = path.join(pasta, nomeFicheiro)

  const resultado = await gerarBackupCompleto(caminhoCompleto)
  podarBackupsAntigos(nivel)

  return { ficheiro: nomeFicheiro, ...resultado }
}

export type BackupListado = { nome: string; tamanhoBytes: number; criadoEm: string }

export function listarBackups(nivel: NivelBackup): BackupListado[] {
  const pasta = pastaDoNivel(nivel)
  if (!fs.existsSync(pasta)) return []
  return fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith('.sql'))
    .map((nome) => {
      const stats = fs.statSync(path.join(pasta, nome))
      return { nome, tamanhoBytes: stats.size, criadoEm: stats.mtime.toISOString() }
    })
    .sort((a, b) => (a.nome < b.nome ? 1 : -1))
}
