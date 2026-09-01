# Zipa só o necessário para produção: build (.next), ficheiros públicos e config de runtime.
# node_modules NÃO entra — corre "npm install --omit=dev" no servidor depois de descomprimir.
# public/uploads NÃO entra — são os datasets já publicados no servidor; os daqui são só testes
# locais e sobrepor isso apagaria/poluiria o que já está em produção.
# Corre a partir da raiz do projecto: powershell -File scripts\zip-deploy.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$destino = Join-Path $raiz "deploy-producao.zip"
if (Test-Path $destino) { Remove-Item $destino -Force }

$staging = Join-Path $env:TEMP "dataportal-deploy-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Write-Host "A preparar ficheiros..."
Copy-Item ".next" (Join-Path $staging ".next") -Recurse
Remove-Item (Join-Path $staging ".next\cache") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "public" (Join-Path $staging "public") -Recurse
Remove-Item (Join-Path $staging "public\uploads") -Recurse -Force -ErrorAction SilentlyContinue

foreach ($f in @("package.json", "package-lock.json", "next.config.js", "server.js")) {
  if (Test-Path $f) { Copy-Item $f (Join-Path $staging $f) }
}

Write-Host "A zipar..."
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $destino -CompressionLevel Optimal

Remove-Item $staging -Recurse -Force

$tamanho = [math]::Round((Get-Item $destino).Length / 1MB, 1)
Write-Host "Pronto: $destino ($tamanho MB)"
Write-Host ""
Write-Host "No servidor, depois de descomprimir por cima da pasta actual:"
Write-Host "  npm install --omit=dev"
Write-Host "  (depois: Restart App no cPanel)"
