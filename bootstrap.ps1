# ============================================================================
# RENDA HUD - BOOTSTRAP: instalare completa direct de pe GitHub, fara git.
#   1. descarca arhiva ZIP a repo-ului (branch main) - nu cere git instalat
#   2. dezarhiveaza si copiaza fisierele in D:\apps\renda-hud-chatgpt
#      (daca nu exista unitatea D:, cade pe %LOCALAPPDATA%\apps\renda-hud-chatgpt)
#   3. porneste install.ps1 de acolo: task auto-update + ultima versiune +
#      calea in clipboard + deschide chrome://extensions
# Utilizatorului ii raman doar cei 3 pasi din Chrome (Developer mode /
# Load unpacked / Ctrl+V) - singurii pe care Chrome nu-i lasa automatizati.
# Rulabil si pentru RE-instalare/reparare: suprascrie fisierele, task-ul se
# re-inregistreaza curat. Fisier ASCII-only (PS 5.1 fara BOM = ANSI).
# ============================================================================
$ErrorActionPreference = 'Stop'
$repoZip = 'https://github.com/virgilprofeanu/renda-chatgpt-hud/archive/refs/heads/main.zip'
$appName = 'renda-hud-chatgpt'

# TLS 1.2 pentru Windows-uri mai vechi (PS 5.1 porneste uneori doar cu TLS 1.0)
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}

$base = 'D:\apps'
if (-not (Test-Path 'D:\')) {
  $base = Join-Path $env:LOCALAPPDATA 'apps'
  Write-Host "Unitatea D: nu exista pe acest calculator - instalez in $base" -ForegroundColor Yellow
}
$dest = Join-Path $base $appName

$tmpZip = Join-Path $env:TEMP 'renda-hud-repo.zip'
$tmpDir = Join-Path $env:TEMP 'renda-hud-repo'
Write-Host "Descarc repo-ul de pe GitHub (fara git)..."
Invoke-WebRequest -Uri $repoZip -OutFile $tmpZip -UseBasicParsing -TimeoutSec 60
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

# arhiva GitHub contine un singur folder radacina: <repo>-main
$src = Get-ChildItem $tmpDir -Directory | Select-Object -First 1
if (-not $src -or -not (Test-Path (Join-Path $src.FullName 'manifest.json'))) {
  Write-Host 'EROARE: repo-ul nu contine (inca) fisierele extensiei (manifest.json).' -ForegroundColor Red
  Write-Host 'Fa commit la TOT folderul extensiei in GitHub (branch main), apoi ruleaza din nou.' -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item (Join-Path $src.FullName '*') $dest -Recurse -Force
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Fisierele extensiei sunt in: $dest" -ForegroundColor Green
Write-Host ""

# restul (task, update, clipboard, Chrome) il face installer-ul din folder
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dest 'install.ps1')
