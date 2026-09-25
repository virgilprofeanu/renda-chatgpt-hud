#!/bin/bash
# ============================================================================
# RENDA HUD - AUTO-UPDATE PE DISC, MAC (rulat de launchd la 10 minute).
# Echivalentul EXACT al lui update.ps1 de pe Windows. Aduce pachetul extensiei din
# GitHub (branch main) in folderul din care Chrome SI Edge o incarca ("Load unpacked").
# Un singur folder, un singur LaunchAgent, ambele browsere. Omul nu mai apasa nimic:
#   1. citeste version.txt din GitHub (cateva zeci de octeti)
#   2. daca e STRICT mai nou decat cel de pe disc: descarca TOT pachetul intr-un folder
#      temporar si il VERIFICA (versiuni aliniate, puntea de extensie, manifest valid,
#      plasa content_scripts, reincarcarea proprie in background)
#   3. abia apoi muta fisierele in folderul extensiei si scrie version.txt ULTIMUL
#   4. background.js vede version.txt mai nou decat versiunea care ruleaza si se
#      reincarca singur (echivalentul butonului Reload) - in fiecare browser
# SIGURANTA: orice verificare picata = nu se scrie NIMIC, fisierele vechi raman.
# Niciodata downgrade. Jurnal: update.log, langa acest fisier.
# Detalii Mac: fisierele se instaleaza prin mv (rename atomic, inode nou) - bash citeste
# scriptul in timp ce ruleaza, iar suprascrierea in loc a lui update-mac.sh (care se
# actualizeaza si el) ar corupe rularea curenta; in plus tot codul sta intr-o functie
# apelata pe ultima linie. Folderul temporar sta in folderul extensiei (acelasi volum =>
# mv atomic). manifest.json e citit cu plutil (parser JSON real, macOS 12+; altfel sed).
# Fara git, fara python, fara Xcode: doar curl, plutil, sed, grep (bash 3.2 din macOS).
# Optiuni: --force (rescrie chiar daca versiunea e aceeasi). Test: RENDA_HUD_RAW_BASE.
# ============================================================================

renda_update() {
  export PATH=/usr/bin:/bin:/usr/sbin:/sbin
  export LC_ALL=C
  local force=0
  if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-Force" ]; then force=1; fi
  local dir; dir="$(cd "$(dirname "$0")" && pwd -P)" || return 1
  local log_file="$dir/update.log"
  local raw_base="${RENDA_HUD_RAW_BASE:-https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main}"

  rotate() { # $1 = fisier jurnal; peste 200KB pastreaza ultimele 200 de linii
    local f="$1" sz
    [ -f "$f" ] || return 0
    sz="$(stat -f%z "$f" 2>/dev/null || echo 0)"
    if [ "$sz" -gt 204800 ]; then tail -n 200 "$f" > "$f.tmp" 2>/dev/null && mv -f "$f.tmp" "$f"; fi
  }
  log() { rotate "$log_file"; printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$log_file" 2>/dev/null; }
  is_newer() { # $1 strict mai nou decat $2? semver numeric; necomparabil => diferit = nou (ca in update.ps1)
    local a="$1" b="$2" re='^[0-9]+(\.[0-9]+)*$' i n x y
    if ! [[ $a =~ $re ]] || ! [[ $b =~ $re ]]; then [ "$a" != "$b" ]; return; fi
    local IFS=.
    local pa=( $a ) pb=( $b )
    n=${#pa[@]}; [ "${#pb[@]}" -gt "$n" ] && n=${#pb[@]}
    for (( i=0; i<n; i++ )); do
      x=$(( 10#${pa[$i]:-0} )); y=$(( 10#${pb[$i]:-0} ))
      if [ "$x" -ne "$y" ]; then [ "$x" -gt "$y" ]; return; fi
    done
    return 1
  }
  fetch() { curl -fsSL --max-time 60 --retry 2 -o "$2" "$1" </dev/null 2>/dev/null; }  # $1 url -> $2 fisier
  have_plutil_extract() { [ "$(printf '{"v":"1"}' | plutil -extract v raw -o - - 2>/dev/null)" = "1" ]; }
  manifest_version() { # $1 manifest.json -> "version"; cu plutil = JSON invalid => gol (abandon)
    if have_plutil_extract; then plutil -extract version raw -o - "$1" 2>/dev/null | tr -d '[:space:]'
    else sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$1" 2>/dev/null | head -n 1; fi
  }
  manifest_has_content_scripts() { # $1 manifest.json
    local n
    if have_plutil_extract; then
      n="$(plutil -extract content_scripts raw -o - "$1" 2>/dev/null | tr -d '[:space:]')"
      [ -n "$n" ] && [ "$n" -gt 0 ] 2>/dev/null
    else grep -q '"content_scripts"' "$1" 2>/dev/null; fi
  }

  rotate "$dir/launchd.log"

  # --- 1. versiunea din GitHub vs versiunea de pe disc -------------------------
  local new_ver cur_ver
  new_ver="$(curl -fsSL --max-time 30 --retry 2 "$raw_base/version.txt" </dev/null 2>/dev/null | tr -d '[:space:]')"
  if [ -z "$new_ver" ]; then log "EROARE: nu pot citi version.txt din GitHub ($raw_base)"; return 1; fi
  local re_ver='^[0-9]+(\.[0-9]+){1,3}$'
  if ! [[ $new_ver =~ $re_ver ]]; then log "EROARE: version.txt din GitHub nu e o versiune ($new_ver)"; return 1; fi

  local ver_file="$dir/version.txt"
  cur_ver=''
  [ -f "$ver_file" ] && cur_ver="$(tr -d '[:space:]' < "$ver_file")"
  if [ -z "$cur_ver" ]; then cur_ver="$(manifest_version "$dir/manifest.json")"; [ -z "$cur_ver" ] && cur_ver='0.0.0'; fi
  if [ "$force" != 1 ] && ! is_newer "$new_ver" "$cur_ver"; then return 0; fi

  # --- 2. descarcare in folder temporar (in folderul extensiei: acelasi volum => mv atomic)
  rm -rf "$dir"/.renda_hud_stage.* 2>/dev/null
  # variabila GLOBALA (nu local): trap-ul EXIT ruleaza dupa iesirea din functie, cand
  # variabilele local nu mai exista - altfel folderul temporar ramanea pe disc
  RENDA_STAGE="$(mktemp -d "$dir/.renda_hud_stage.XXXXXX")" || { log "EROARE: nu pot crea folderul temporar in $dir"; return 1; }
  trap 'rm -rf "$RENDA_STAGE"' EXIT
  local stage="$RENDA_STAGE"
  local required="CHATGPT_RENDA_HUD.user.js manifest.json background.js"
  local optional="icon.png icon128.png README.md bootstrap.ps1 remote_install.bat sterge-task-vechi.bat opreste-auto-update.bat update.ps1 install-mac.sh update-mac.sh opreste-auto-update-mac.sh"
  local f
  for f in $required; do
    fetch "$raw_base/$f" "$stage/$f" || { log "EROARE: descarcarea lui $f a esuat - ABANDONAT"; return 1; }
  done
  for f in $optional; do fetch "$raw_base/$f" "$stage/$f" || rm -f "$stage/$f"; done

  # --- 3. verificari (orice esec = abandon, nimic scris) -----------------------
  local us="$stage/CHATGPT_RENDA_HUD.user.js" us_ver marker
  us_ver="$(sed -nE 's#^//[[:space:]]*@version[[:space:]]+([^[:space:]]+).*#\1#p' "$us" | head -n 1)"
  [ -n "$us_ver" ] || { log "EROARE: @version negasit in userscript - ABANDONAT"; return 1; }
  [ "$us_ver" = "$new_ver" ] || { log "EROARE: userscript v$us_ver nu se potriveste cu version.txt v$new_ver (GitHub inca se propaga?) - ABANDONAT, reincerc la urmatoarea rulare"; return 1; }
  for marker in 'function extHudRequest' 'function extRuntimeOk' 'chrome.runtime.getManifest()'; do
    grep -qaF -- "$marker" "$us" || { log "EROARE: userscript v$us_ver fara '$marker' (nu mai e dual-environment) - ABANDONAT"; return 1; }
  done
  local mani="$stage/manifest.json" mani_ver
  mani_ver="$(manifest_version "$mani")"
  [ -n "$mani_ver" ] || { log "EROARE: manifest.json invalid sau fara version - ABANDONAT"; return 1; }
  [ "$mani_ver" = "$new_ver" ] || { log "EROARE: manifest v$mani_ver nu se potriveste cu v$new_ver - ABANDONAT"; return 1; }
  manifest_has_content_scripts "$mani" || { log "EROARE: manifest fara content_scripts (plasa de baza) - ABANDONAT"; return 1; }
  local bg="$stage/background.js" bg_size
  bg_size="$(stat -f%z "$bg" 2>/dev/null || echo 0)"
  if [ "$bg_size" -lt 1000 ] || ! grep -qaF 'version.txt' "$bg"; then log "EROARE: background.js fara reincarcarea proprie (version.txt) - ABANDONAT"; return 1; fi

  # --- 4. instalare: fisierele (mv = rename atomic), apoi version.txt ULTIMUL --
  for f in $required $optional; do
    if [ -f "$stage/$f" ]; then
      mv -f "$stage/$f" "$dir/$f" || { log "EROARE: nu pot scrie $f in $dir - ABANDONAT (posibil partial)"; return 1; }
    fi
  done
  chmod +x "$dir"/*.sh 2>/dev/null
  { printf '%s' "$new_ver" > "$stage/version.txt" && mv -f "$stage/version.txt" "$ver_file"; } || { log "EROARE: nu pot scrie version.txt"; return 1; }
  log "UPDATE OK: $cur_ver -> $new_ver"
  return 0
}

renda_update ${1+"$@"}
