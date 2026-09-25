#!/bin/bash
# ============================================================================
# RENDA HUD - INSTALARE PE MAC (Chrome si Edge), dintr-o singura comanda in Terminal:
#
#   curl -fsSL https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/install-mac.sh | bash
#
# Echivalentul lui remote_install.bat + bootstrap.ps1 de pe Windows. Ce face:
#   1. descarca arhiva ZIP a repo-ului (branch main) - fara git, fara Xcode
#   2. o pune in ~/apps/renda-hud-chatgpt (echivalentul lui D:\apps\renda-hud-chatgpt)
#   3. armeaza auto-update-ul: un LaunchAgent per-utilizator ("holdings.renda.hud.autoupdate")
#      ruleaza update-mac.sh la 10 minute, fara fereastra - echivalentul task-ului Windows
#      "RENDA HUD AutoUpdate". Aduce versiunile noi pe disc, iar extensia se reincarca
#      singura (background.js citeste version.txt), in Chrome SI in Edge
#   4. pune calea in clipboard si deschide chrome://extensions (sau edge://extensions)
# Raman cei 2 pasi din browser, O SINGURA DATA (Developer mode / Load unpacked / Cmd+V).
# Daca extensia era deja incarcata din acest folder: un singur Reload pe cardul ei, in
# fiecare browser, O SINGURA DATA (aceeasi logica ca in bootstrap.ps1).
# Oprirea auto-update-ului: bash ~/apps/renda-hud-chatgpt/opreste-auto-update-mac.sh
#
# De ce o comanda in Terminal si nu un fisier cu dublu-click: un .command descarcat de pe
# net e blocat de Gatekeeper ("unidentified developer") si cere Open Anyway din System
# Settings; comanda de Terminal nu are problema asta. Sigur la "curl | bash": tot codul
# sta intr-o functie apelata pe ultima linie, deci o descarcare trunchiata nu ruleaza nimic.
# Fisier ASCII-only, bash 3.2 (cel din macOS), doar unelte din sistem (curl, unzip, pbcopy).
# Variabile optionale (teste): RENDA_HUD_DIR (folderul tinta), RENDA_HUD_ZIP_URL (arhiva),
# RENDA_HUD_NO_OPEN=1 (nu deschide browserul).
# ============================================================================

renda_install() {
  set -u
  export PATH=/usr/bin:/bin:/usr/sbin:/sbin
  export LC_ALL=C
  local repo_zip="${RENDA_HUD_ZIP_URL:-https://github.com/virgilprofeanu/renda-chatgpt-hud/archive/refs/heads/main.zip}"
  local dest="${RENDA_HUD_DIR:-$HOME/apps/renda-hud-chatgpt}"
  local label='holdings.renda.hud.autoupdate'
  local plist="$HOME/Library/LaunchAgents/$label.plist"
  local me_uid; me_uid="$(id -u)"

  local C_G='' C_Y='' C_R='' C_C='' C_0=''
  if [ -t 1 ]; then C_G=$'\033[32m'; C_Y=$'\033[33m'; C_R=$'\033[31m'; C_C=$'\033[36m'; C_0=$'\033[0m'; fi
  say()  { printf '%s\n' "$*"; }
  ok()   { printf '%s%s%s\n' "$C_G" "$*" "$C_0"; }
  warn() { printf '%s%s%s\n' "$C_Y" "$*" "$C_0"; }
  die()  { printf '%sEROARE: %s%s\n' "$C_R" "$*" "$C_0" >&2; exit 1; }
  xml_escape() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

  # folderul temporar e variabila GLOBALA: trap-ul EXIT ruleaza dupa ce functia s-a incheiat,
  # cand variabilele local nu mai exista (altfel: "unbound variable" + folder ramas pe disc)
  RENDA_TMP="$(mktemp -d "${TMPDIR:-/tmp}/renda-hud-install.XXXXXX")" || die "nu pot crea folderul temporar"
  trap 'rm -rf "$RENDA_TMP"' EXIT
  local tmp="$RENDA_TMP"

  # --- 1. descarcare ZIP (fara git) ------------------------------------------
  say "Descarc extensia de pe GitHub (fara git)..."
  curl -fsSL --max-time 120 --retry 2 -o "$tmp/repo.zip" "$repo_zip" </dev/null \
    || die "descarcarea a esuat ($repo_zip). Verifica internetul si incearca din nou."
  unzip -q -o "$tmp/repo.zip" -d "$tmp/repo" </dev/null || die "arhiva nu a putut fi dezarhivata"
  local src
  src="$(find "$tmp/repo" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  if [ -z "$src" ] || [ ! -f "$src/manifest.json" ]; then
    die "repo-ul nu contine (inca) fisierele extensiei (manifest.json). Publica pachetul in GitHub (branch main), apoi ruleaza din nou."
  fi

  # --- 2. copiere in folderul stabil -----------------------------------------
  mkdir -p "$dest" || die "nu pot crea $dest"
  cp -R "$src/." "$dest/" || die "copierea in $dest a esuat"
  xattr -dr com.apple.quarantine "$dest" 2>/dev/null || true
  chmod +x "$dest"/*.sh 2>/dev/null || true
  local ver=''
  [ -f "$dest/version.txt" ] && ver="$(tr -d '[:space:]' < "$dest/version.txt")"

  # --- 3. auto-update pe disc: LaunchAgent per-utilizator, la 10 minute ------
  # bootout inainte (re-instalare = re-inregistrare curata); enable anuleaza un eventual
  # "launchctl disable" mai vechi; RunAtLoad = prima verificare imediat, apoi la 600 s.
  local task_ok=0
  local upd="$dest/update-mac.sh"
  if [ -f "$upd" ]; then
    mkdir -p "$HOME/Library/LaunchAgents"
    launchctl bootout "gui/$me_uid/$label" >/dev/null 2>&1 || true
    local x_upd x_log
    x_upd="$(xml_escape "$upd")"; x_log="$(xml_escape "$dest/launchd.log")"
    cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$x_upd</string>
  </array>
  <key>StartInterval</key><integer>600</integer>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>LowPriorityIO</key><true/>
  <key>Nice</key><integer>10</integer>
  <key>StandardOutPath</key><string>$x_log</string>
  <key>StandardErrorPath</key><string>$x_log</string>
</dict>
</plist>
PLIST
    launchctl enable "gui/$me_uid/$label" >/dev/null 2>&1 || true
    if plutil -lint "$plist" >/dev/null 2>&1 && launchctl bootstrap "gui/$me_uid" "$plist" >/dev/null 2>&1; then
      task_ok=1
      ok "Auto-update armat: LaunchAgent \"$label\" (la 10 minute, fara fereastra)."
    else
      warn "Nu am putut inregistra LaunchAgent-ul de auto-update ($plist)."
      warn "Extensia merge oricum; actualizarea ramane manuala (ruleaza din nou aceasta comanda)."
    fi
  else
    warn "update-mac.sh lipseste din pachet - auto-update-ul NU e armat (extensia merge oricum)."
  fi

  # --- 4. clipboard + browser -------------------------------------------------
  printf '%s' "$dest" | pbcopy 2>/dev/null || true
  local browser=''
  if [ "${RENDA_HUD_NO_OPEN:-0}" != "1" ]; then
    if open -b com.google.Chrome "chrome://extensions/" >/dev/null 2>&1; then browser='Chrome (chrome://extensions)'
    elif open -b com.microsoft.edgemac "edge://extensions/" >/dev/null 2>&1; then browser='Edge (edge://extensions)'
    fi
  fi

  say ""
  ok "Extensia (v${ver:-?}) e in: $dest"
  ok "Calea e in CLIPBOARD (Cmd+V la 'Load unpacked')."
  if [ -n "$browser" ]; then ok "Am deschis $browser."; else warn "Deschide manual chrome://extensions (sau edge://extensions)"; fi
  say ""
  printf '%s\n' "${C_C}MAI AI DE FACUT IN CHROME (o singura data):${C_0}"
  say "  1. Porneste 'Developer mode' (dreapta-sus)"
  say "  2. 'Load unpacked' -> in fereastra de fisiere apasa Cmd+Shift+G, apoi Cmd+V, Enter -> Select"
  say "  (gata - HUD-ul merge fara alte setari; la fel in Edge: edge://extensions, acelasi folder)"
  say "  Daca extensia era DEJA incarcata din acest folder: sari peste cei 2 pasi si apasa"
  say "  O SINGURA DATA Reload pe cardul ei, in fiecare browser (Chrome si Edge)."
  say ""
  say "Apoi deschide https://chatgpt.com - banda HUD apare sus."
  if [ "$task_ok" = 1 ]; then
    say "De acum extensia se actualizeaza SINGURA (LaunchAgent la 10 minute + reincarcare proprie)."
    say "Dupa o actualizare, tab-urile ChatGPT deja deschise cer un Cmd+R."
    say "Oprire: bash \"$dest/opreste-auto-update-mac.sh\""
  else
    say "Auto-update-ul NU e armat pe acest Mac (vezi mesajul de mai sus)."
  fi
  say "Daca folosesti userscript-ul in Tampermonkey: DEZACTIVEAZA-L (altfel HUD dublu)."
}

renda_install </dev/null
