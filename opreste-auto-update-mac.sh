#!/bin/bash
# ============================================================================
# RENDA HUD - OPRESTE auto-update-ul pe disc (Mac).
# Scoate LaunchAgent-ul "holdings.renda.hud.autoupdate" (cel care ruleaza update-mac.sh
# la 10 minute ca sa aduca versiunile noi din GitHub in folderul extensiei). Extensia
# ramane instalata si functionala, la versiunea de acum. Repornirea auto-update-ului:
# ruleaza din nou comanda de instalare (install-mac.sh, vezi README).
# Sigur de rulat oricand: daca agentul nu exista, nu face nimic.
# Rulare: bash ~/apps/renda-hud-chatgpt/opreste-auto-update-mac.sh
# ============================================================================
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
label='holdings.renda.hud.autoupdate'
plist="$HOME/Library/LaunchAgents/$label.plist"
me_uid="$(id -u)"
found=0
if launchctl print "gui/$me_uid/$label" >/dev/null 2>&1; then found=1; launchctl bootout "gui/$me_uid/$label" >/dev/null 2>&1; fi
if [ -f "$plist" ]; then found=1; rm -f "$plist"; fi
if [ "$found" = 1 ]; then
  echo "LaunchAgent-ul \"$label\" a fost STERS. Auto-update-ul pe disc e oprit."
else
  echo "LaunchAgent-ul \"$label\" nu exista pe acest Mac - nimic de oprit."
fi
