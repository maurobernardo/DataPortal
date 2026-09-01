# Empacota a aplicação para o cPanel.
#
# Existe como script, e não como comandos escritos à mão de cada vez, por causa de dois acidentes
# reais: um zip levou `.env.local` para o servidor (o Next.js dá-lhe prioridade sobre `.env`, e a
# ligação de desenvolvimento apontada para root sem palavra-passe derrubou a base de dados em
# produção), e outro levou zips de deploys antigos e pastas de teste dentro de si, passando de
# 83 MB para 636 MB. As duas exclusões estão aqui para não voltarem a depender de memória.
#
# Uso: powershell -File scripts/empacotar-deploy.ps1 [-Sufixo "fix-hooks"]

param([string]$Sufixo = "")

$ErrorActionPreference = "Stop"
$origem = Split-Path -Parent $PSScriptRoot
$raiz = Split-Path -Parent $origem
$nome = "deploy-producao-" + (Get-Date -Format "yyyy-MM-dd") + $(if ($Sufixo) { "-$Sufixo" } else { "" })
$destino = Join-Path $raiz $nome
$zip = "$destino.zip"

if (Test-Path $destino) { Remove-Item -Recurse -Force $destino }
if (Test-Path $zip) { Remove-Item -Force $zip }
New-Item -ItemType Directory -Force $destino | Out-Null

# .next/cache e node_modules: reconstruídos no servidor, centenas de MB sem utilidade no zip.
# public/uploads: ficheiros enviados pelos utilizadores, que vivem no servidor e não devem ser
#   substituídos por uma cópia local desactualizada.
# scratch-testes-*: dados de teste locais.
$excluirPastas = @(
  (Join-Path $origem ".next\cache"),
  (Join-Path $origem "node_modules"),
  (Join-Path $origem "public\uploads"),
  (Join-Path $origem ".git"),
  (Join-Path $origem ".claude"),
  (Join-Path $origem ".vscode"),
  (Join-Path $origem "scratch-testes-geo"),
  (Join-Path $origem "scratch-testes-alf")
)

# .env.local e .env.development têm prioridade sobre .env no Next.js: se forem no zip, a
# configuração local ganha à de produção. O .env de produção é mantido e gerido no servidor.
$excluirFicheiros = @("*.log", "*.zip", ".env.local", ".env.local.*", ".env.development", ".env.development.*", ".env.test")

robocopy $origem $destino /E /XD $excluirPastas /XF $excluirFicheiros /NFL /NDL /NJH /NJS | Out-Null

# Confirmação explícita: um zip com estes ficheiros já custou uma paragem em produção, por isso
# vale mais falhar aqui do que descobrir no servidor.
$fugas = Get-ChildItem -Path $destino -Recurse -Force -Include ".env.local", ".env.development", "*.zip" -ErrorAction SilentlyContinue
if ($fugas) {
  Write-Error ("Ficheiros que nao podem ir para producao ficaram no pacote:`n" + ($fugas.FullName -join "`n"))
}

Compress-Archive -Path "$destino\*" -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -Recurse -Force $destino

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Output "$zip ($mb MB)"
