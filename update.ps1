# ============================================================================
# RENDA HUD - auto-update din GitHub (rulat de Task Scheduler la 10 minute).
# Din v4.9.3 userscript-ul e UNIVERSAL (ruleaza si in Tampermonkey, si ca
# content script de extensie Chrome), iar fisierul din extensie poarta CHIAR
# numele lui din repo: CHATGPT_RENDA_HUD.user.js. NU mai exista patch-uri.
# Scriptul doar:
#   1. descarca userscript-ul din repo si citeste @version
#   2. daca difera de version.txt: il copiaza IDENTIC peste
#      CHATGPT_RENDA_HUD.user.js, sincronizeaza "version" in manifest.json,
#      actualizeaza icon-ul si scrie version.txt ULTIMUL (marcaj de final)
#   3. background.js vede version.txt != versiunea care ruleaza -> reload
# SIGURANTA: daca userscript-ul descarcat NU e varianta universala (lipseste
# puntea extHudRequest), nu se scrie nimic - fisierele vechi raman.
# NOTA: fisier tinut intentionat ASCII-only (PowerShell 5.1 citeste .ps1 fara
# BOM ca ANSI; diacriticele/em-dash-urile UTF-8 ar corupe parsarea).
# ============================================================================
param([switch]$Force)   # -Force: rescrie chiar daca versiunea e aceeasi
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $dir 'update.log'
function Log($m) { Add-Content -Path $logFile -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) }

try {
  $rawBase = 'https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main'
  $tmp = Join-Path $env:TEMP 'renda_hud_update.user.js'
  Invoke-WebRequest -Uri "$rawBase/CHATGPT_RENDA_HUD.user.js" -OutFile $tmp -UseBasicParsing -TimeoutSec 30
  $src = [System.IO.File]::ReadAllText($tmp, [System.Text.Encoding]::UTF8)

  if ($src -notmatch '//\s*@version\s+(\S+)') { Log 'EROARE: @version negasit in userscript'; exit 1 }
  $newVer = $Matches[1]

  $verFile = Join-Path $dir 'version.txt'
  $curVer = ''
  if (Test-Path $verFile) { $curVer = (Get-Content $verFile -Raw).Trim() }
  # actualizam DOAR spre o versiune mai noua (semver), niciodata downgrade -
  # asa o versiune locala mai avansata (ex. instalata manual) nu e data inapoi
  if (-not $Force) {
    try {
      if ([version]$newVer -le [version]$curVer) { exit 0 }
    } catch {
      if ($newVer -eq $curVer) { exit 0 }   # fallback daca versiunile nu-s numerice
    }
  }

  # garda de compatibilitate: fara puntea de extensie, scriptul ar ramane fara
  # acces la serverul HUD local -> nu instalam orbeste
  if ($src -notmatch 'function extHudRequest') {
    Log "EROARE: userscript v$newVer NU contine puntea de extensie (extHudRequest) - update ABANDONAT, fisierele vechi raman"
    exit 1
  }

  # fisierul extensiei = copie IDENTICA a fisierului din repo, cu acelasi nume
  Copy-Item $tmp (Join-Path $dir 'CHATGPT_RENDA_HUD.user.js') -Force

  # manifest.json: versiunea tinuta in pas cu @version
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  $maniPath = Join-Path $dir 'manifest.json'
  $mani = [System.IO.File]::ReadAllText($maniPath, [System.Text.Encoding]::UTF8)
  $mani = [regex]::Replace($mani, '"version"\s*:\s*"[^"]*"', ('"version": "' + $newVer + '"'))
  [System.IO.File]::WriteAllText($maniPath, $mani, $utf8)

  # iconul se poate schimba si el - best effort, nu blocheaza update-ul
  try { Invoke-WebRequest -Uri "$rawBase/icon128.png" -OutFile (Join-Path $dir 'icon128.png') -UseBasicParsing -TimeoutSec 30 } catch {}

  # version.txt SE SCRIE ULTIMUL = marcajul ca update-ul e complet;
  # background.js il compara cu versiunea care ruleaza si da reload
  [System.IO.File]::WriteAllText($verFile, $newVer, $utf8)
  Log "UPDATE OK: $curVer -> $newVer"
} catch {
  try { Log ("EROARE: " + $_.Exception.Message) } catch {}
  exit 1
}
