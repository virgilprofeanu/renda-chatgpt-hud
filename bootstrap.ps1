# ============================================================================
# RENDA HUD - BOOTSTRAP: pune extensia pe disc, armeaza auto-update-ul, deschide Chrome.
# Acest script:
#   1. descarca arhiva ZIP a repo-ului (branch main) - fara git
#   2. o pune in D:\apps\renda-hud-chatgpt (sau %LOCALAPPDATA%\apps\... daca nu e D:)
#   3. inregistreaza task-ul Windows "RENDA HUD AutoUpdate" (update.ps1 la 10 minute,
#      fara fereastra): aduce versiunile noi pe disc, iar extensia se reincarca singura
#      in Chrome SI in Edge (ambele incarca acelasi folder) - omul nu mai apasa nimic
#   4. pune calea in clipboard si deschide chrome://extensions
# Raman cei 2 pasi din browser, O SINGURA DATA (Developer mode / Load unpacked / Ctrl+V).
# Daca extensia era deja incarcata din acest folder: un singur Reload pe cardul ei (sau
# repornirea browserului), O SINGURA DATA - versiunea veche din memorie nu are codul de
# reincarcare proprie; de la 4.36.0 in sus extensia se reincarca singura.
# Oprirea auto-update-ului: opreste-auto-update.bat din folderul extensiei.
# Fisier ASCII-only (PS 5.1 fara BOM = ANSI).
# ============================================================================
$ErrorActionPreference = 'Stop'
$repoZip = 'https://github.com/virgilprofeanu/renda-chatgpt-hud/archive/refs/heads/main.zip'
$appName = 'renda-hud-chatgpt'

try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}

$base = 'D:\apps'
if (-not (Test-Path 'D:\')) {
  $base = Join-Path $env:LOCALAPPDATA 'apps'
  Write-Host "Unitatea D: nu exista - instalez in $base" -ForegroundColor Yellow
}
$dest = Join-Path $base $appName

$tmpZip = Join-Path $env:TEMP 'renda-hud-repo.zip'
$tmpDir = Join-Path $env:TEMP 'renda-hud-repo'
Write-Host "Descarc extensia de pe GitHub (fara git)..."
Invoke-WebRequest -Uri $repoZip -OutFile $tmpZip -UseBasicParsing -TimeoutSec 60
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

$src = Get-ChildItem $tmpDir -Directory | Select-Object -First 1
if (-not $src -or -not (Test-Path (Join-Path $src.FullName 'manifest.json'))) {
  Write-Host 'EROARE: repo-ul nu contine (inca) fisierele extensiei (manifest.json).' -ForegroundColor Red
  Write-Host 'Publica pachetul in GitHub (branch main), apoi ruleaza din nou.' -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item (Join-Path $src.FullName '*') $dest -Recurse -Force
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

# curatenie: mecanismul VECHI de update (task Windows), daca acest calculator a avut
# o instalare initiala. try/catch obligatoriu: cu EAP=Stop, stderr-ul de la schtasks
# (task inexistent = cazul obisnuit) ar deveni eroare fatala in PS 5.1.
try {
  schtasks /Delete /TN 'RENDA HUD Extension AutoUpdate' /F 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host 'Task-ul vechi de auto-update a fost sters (il inlocuieste cel nou).' -ForegroundColor Yellow }
} catch {}

# auto-update pe disc: task per-utilizator, la 10 minute, fara fereastra. Register-ScheduledTask
# (nu schtasks.exe): fara probleme de ghilimele la cai cu spatii. conhost --headless (Windows 10
# 1809+) ruleaza PowerShell fara nicio fereastra; pe sisteme mai vechi: -WindowStyle Hidden.
$taskOk = $false
try {
  $upd = Join-Path $dest 'update.ps1'
  if (Test-Path $upd) {
    $psArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $upd + '"'
    if ([Environment]::OSVersion.Version.Build -ge 17763) {
      $act = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument ('--headless powershell.exe ' + $psArgs)
    } else {
      $act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $psArgs
    }
    $trg = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
    $set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
    Register-ScheduledTask -TaskName 'RENDA HUD AutoUpdate' -Action $act -Trigger $trg -Settings $set -Force | Out-Null
    $taskOk = $true
    Write-Host 'Auto-update armat: task-ul "RENDA HUD AutoUpdate" (la 10 minute, fara fereastra).' -ForegroundColor Green
  }
} catch {
  Write-Host ('Nu am putut inregistra task-ul de auto-update: ' + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Extensia merge oricum; actualizarea ramane manuala (ruleaza din nou acest instalator).' -ForegroundColor Yellow
}

try { Set-Clipboard -Value $dest } catch {}
$chromeOk = $false
try { Start-Process 'chrome' 'chrome://extensions/'; $chromeOk = $true } catch {}

Write-Host ""
Write-Host "Extensia e in: $dest" -ForegroundColor Green
Write-Host "Calea e in CLIPBOARD (Ctrl+V la 'Load unpacked')." -ForegroundColor Green
if ($chromeOk) { Write-Host "Am deschis chrome://extensions." -ForegroundColor Green } else { Write-Host "Deschide manual chrome://extensions" -ForegroundColor Yellow }
Write-Host ""
Write-Host "MAI AI DE FACUT IN CHROME (o singura data):" -ForegroundColor Cyan
Write-Host "  1. Porneste 'Developer mode' (dreapta-sus)"
Write-Host "  2. 'Load unpacked' -> Ctrl+V in bara de cale -> Enter -> Select Folder"
Write-Host "  (gata - HUD-ul merge fara alte setari; la fel in Edge: edge://extensions)"
Write-Host "  Daca extensia era DEJA incarcata din acest folder: sari peste cei 2 pasi si apasa"
Write-Host "  O SINGURA DATA Reload pe cardul ei (sau reporneste browserul). E ultima data:"
Write-Host "  de la versiunea 4.36.0 in sus extensia se reincarca singura."
Write-Host ""
Write-Host "Apoi deschide https://chatgpt.com - banda HUD apare sus."
if ($taskOk) {
  Write-Host "De acum extensia se actualizeaza SINGURA (task la 10 minute + reincarcare proprie)."
  Write-Host "Dupa o actualizare, tab-urile ChatGPT deja deschise cer un F5."
} else {
  Write-Host "Auto-update-ul NU e armat pe acest calculator (vezi mesajul de mai sus)."
}
Write-Host "Daca folosesti userscript-ul in Tampermonkey: DEZACTIVEAZA-L (altfel HUD dublu)."
