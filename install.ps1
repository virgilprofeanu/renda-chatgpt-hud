# ============================================================================
# RENDA HUD - INSTALATOR COMPLET (dublu-click pe INSTALEAZA.bat).
# Face TOT ce se poate face automat:
#   1. inregistreaza task-ul de auto-update (la 10 minute, fereastra ascunsa)
#   2. ruleaza o data update.ps1 (te aduce pe ultima versiune din GitHub)
#   3. pune calea folderului in CLIPBOARD
#   4. deschide chrome://extensions
# Singurul pas pe care Chrome NU il lasa automatizat (securitate, by design -
# instalarea silentioasa de extensii e vector de malware): Developer mode +
# Load unpacked + alegerea folderului. Calea e deja in clipboard: Ctrl+V.
# Task-ul se creeaza cu Register-ScheduledTask, nu schtasks.exe: fara probleme
# de ghilimele la cai cu spatii (C:\Users\Ion Popescu\...) si fara stderr care
# omoara scriptul sub EAP=Stop. Fisier ASCII-only (PS 5.1 fara BOM = ANSI).
# ============================================================================
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$upd  = Join-Path $here 'update.ps1'
if (-not (Test-Path $upd)) {
  Write-Host "EROARE: update.ps1 nu e langa install.ps1 ($here). Dezarhiveaza TOT folderul, nu doar cateva fisiere." -ForegroundColor Red
  exit 1
}

# --- 1. task auto-update -----------------------------------------------------
$taskName = 'RENDA HUD Extension AutoUpdate'
$act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $upd + '"')
$trg = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration (New-TimeSpan -Days 3650)
$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trg -Settings $set -Force | Out-Null
Write-Host "[1/4] Task de auto-update inregistrat (la 10 minute, din: $here)" -ForegroundColor Green

# --- 2. update imediat (daca repo-ul are versiune mai noua decat arhiva) ------
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$upd"
Write-Host "[2/4] Verificare versiune in GitHub: gata" -ForegroundColor Green

# --- 3. calea folderului in clipboard -----------------------------------------
try {
  Set-Clipboard -Value $here
  Write-Host "[3/4] Calea folderului e in CLIPBOARD - la 'Load unpacked' doar Ctrl+V" -ForegroundColor Green
} catch {
  Write-Host "[3/4] N-am putut folosi clipboard-ul - copiaza calea manual: $here" -ForegroundColor Yellow
}

# --- 4. deschide chrome://extensions ------------------------------------------
$chromeOk = $false
try { Start-Process 'chrome' 'chrome://extensions/'; $chromeOk = $true } catch {}
if ($chromeOk) { Write-Host "[4/4] Am deschis chrome://extensions" -ForegroundColor Green }
else { Write-Host "[4/4] N-am gasit Chrome - deschide manual chrome://extensions in bara de adrese" -ForegroundColor Yellow }

Write-Host ""
Write-Host "MAI AI DOAR 3 CLICKURI (pe acestea Chrome nu le lasa automatizate):" -ForegroundColor Cyan
Write-Host "  1. Porneste 'Developer mode' (comutatorul din dreapta-sus)"
Write-Host "  2. Apasa 'Load unpacked' (stanga-sus)"
Write-Host "  3. In fereastra de foldere: Ctrl+V in bara de cale -> Enter -> Select Folder"
Write-Host ""
Write-Host "Apoi deschide https://chatgpt.com - banda HUD apare sus."
Write-Host "Daca extensia era DEJA incarcata in Chrome, sari peste cei 3 pasi - totul e gata."
Write-Host "Daca folosesti userscript-ul in Tampermonkey: DEZACTIVEAZA-L (altfel HUD dublu)."
