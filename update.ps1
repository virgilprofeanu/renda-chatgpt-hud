# ============================================================================
# RENDA HUD - AUTO-UPDATE PE DISC (rulat de Task Scheduler la 10 minute).
# Aduce pachetul extensiei din GitHub (branch main) in folderul din care
# Chrome SI Edge o incarca ("Load unpacked"). Un singur folder, un singur task,
# ambele browsere. Omul nu mai apasa nimic:
#   1. citeste version.txt din GitHub (cateva zeci de octeti)
#   2. daca e STRICT mai nou decat cel de pe disc: descarca TOT pachetul intr-un
#      folder temporar si il VERIFICA (versiuni aliniate, puntea de extensie,
#      manifest valid, plasa content_scripts, reincarcarea proprie in background)
#   3. abia apoi copiaza peste folderul extensiei si scrie version.txt ULTIMUL
#   4. background.js vede version.txt mai nou decat versiunea care ruleaza si
#      se reincarca singur (echivalentul butonului Reload) - in fiecare browser
# SIGURANTA: orice verificare picata = nu se scrie NIMIC, fisierele vechi raman.
# Niciodata downgrade. Jurnal: update.log, langa acest fisier.
# Fisier ASCII-only (PowerShell 5.1 citeste .ps1 fara BOM ca ANSI).
# ============================================================================
param([switch]$Force)   # -Force: rescrie chiar daca versiunea e aceeasi
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $dir 'update.log'
function Log($m) {
  try {
    if ((Test-Path $logFile) -and ((Get-Item $logFile).Length -gt 200KB)) {
      Get-Content $logFile -Tail 200 | Set-Content $logFile -Encoding ASCII
    }
    Add-Content -Path $logFile -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m)
  } catch {}
}
function IsNewer($a, $b) {
  try { return ([version]$a -gt [version]$b) } catch { return ($a -ne $b) }
}

$stage = $null
try {
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
  $rawBase = 'https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main'

  # --- 1. versiunea din GitHub vs versiunea de pe disc -------------------------
  $newVer = (Invoke-WebRequest -Uri "$rawBase/version.txt" -UseBasicParsing -TimeoutSec 30).Content
  if ($newVer -is [byte[]]) { $newVer = [System.Text.Encoding]::ASCII.GetString($newVer) }
  $newVer = ([string]$newVer).Trim()
  if ($newVer -notmatch '^\d+(\.\d+){1,3}$') { Log "EROARE: version.txt din GitHub nu e o versiune ($newVer)"; exit 1 }

  $verFile = Join-Path $dir 'version.txt'
  $curVer = ''
  if (Test-Path $verFile) { $curVer = (Get-Content $verFile -Raw).Trim() }
  if (-not $curVer) {
    try { $curVer = ((Get-Content (Join-Path $dir 'manifest.json') -Raw -Encoding UTF8) | ConvertFrom-Json).version } catch { $curVer = '0.0.0' }
  }
  if (-not $Force -and -not (IsNewer $newVer $curVer)) { exit 0 }

  # --- 2. descarcare in folder temporar ----------------------------------------
  $required = @('CHATGPT_RENDA_HUD.user.js', 'manifest.json', 'background.js')
  $optional = @('icon.png', 'icon128.png', 'README.md', 'bootstrap.ps1', 'remote_install.bat',
                'sterge-task-vechi.bat', 'opreste-auto-update.bat', 'update.ps1')
  $stage = Join-Path $env:TEMP ('renda_hud_stage_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force $stage | Out-Null
  foreach ($f in $required) {
    Invoke-WebRequest -Uri "$rawBase/$f" -OutFile (Join-Path $stage $f) -UseBasicParsing -TimeoutSec 60
  }
  foreach ($f in $optional) {
    try { Invoke-WebRequest -Uri "$rawBase/$f" -OutFile (Join-Path $stage $f) -UseBasicParsing -TimeoutSec 60 } catch {}
  }

  # --- 3. verificari (orice esec = abandon, nimic scris) -----------------------
  $src = [System.IO.File]::ReadAllText((Join-Path $stage 'CHATGPT_RENDA_HUD.user.js'), [System.Text.Encoding]::UTF8)
  if ($src -notmatch '//\s*@version\s+(\S+)') { Log 'EROARE: @version negasit in userscript - ABANDONAT'; exit 1 }
  $usVer = $Matches[1]
  if ($usVer -ne $newVer) { Log "EROARE: userscript v$usVer nu se potriveste cu version.txt v$newVer (GitHub inca se propaga?) - ABANDONAT, reincerc la urmatoarea rulare"; exit 1 }
  foreach ($marker in @('function extHudRequest', 'function extRuntimeOk', 'chrome.runtime.getManifest()')) {
    if (-not $src.Contains($marker)) { Log "EROARE: userscript v$usVer fara '$marker' (nu mai e dual-environment) - ABANDONAT"; exit 1 }
  }
  $maniTxt = [System.IO.File]::ReadAllText((Join-Path $stage 'manifest.json'), [System.Text.Encoding]::UTF8)
  $mani = $maniTxt | ConvertFrom-Json
  if ($mani.version -ne $newVer) { Log "EROARE: manifest v$($mani.version) nu se potriveste cu v$newVer - ABANDONAT"; exit 1 }
  if (-not $mani.content_scripts) { Log 'EROARE: manifest fara content_scripts (plasa de baza) - ABANDONAT'; exit 1 }
  $bg = [System.IO.File]::ReadAllText((Join-Path $stage 'background.js'), [System.Text.Encoding]::UTF8)
  if ($bg.Length -lt 1000 -or -not $bg.Contains('version.txt')) { Log 'EROARE: background.js fara reincarcarea proprie (version.txt) - ABANDONAT'; exit 1 }

  # --- 4. instalare: fisierele, apoi version.txt ULTIMUL -----------------------
  foreach ($f in ($required + $optional)) {
    $p = Join-Path $stage $f
    if (Test-Path $p) { Copy-Item $p (Join-Path $dir $f) -Force }
  }
  $ascii = New-Object System.Text.ASCIIEncoding
  [System.IO.File]::WriteAllText($verFile, $newVer, $ascii)
  Log "UPDATE OK: $curVer -> $newVer"
} catch {
  try { Log ("EROARE: " + $_.Exception.Message) } catch {}
  exit 1
} finally {
  if ($stage -and (Test-Path $stage)) { Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue }
}
