# RENDA VIGILIA HUD pentru ChatGPT

Carcasă vizuală RENDA/VIGILIA peste `chatgpt.com`: bandă HUD compactă (78px) cu câmp neural animat,
navigare rapidă, monitor CPU/RAM (opțional, din HUD-ul local RENDA), **prompt perpetuu** (text directiv
inserat automat la fiecare chat nou, până îl ștergi) și **șabloane de prompt predefinite**.

**Confidențialitate:** scriptul NU citește și NU transmite conversațiile. Zero cereri de rețea către
terți (singura comunicare opțională: `GET http://127.0.0.1:8765/sysmon` — HUD-ul local de pe propria
mașină, dacă există). Singura persistență: două chei în `localStorage` (starea de pliere + promptul
perpetuu). Scriptul doar SCRIE în composer la cererea ta — nu trimite niciodată mesaje singur.

## Instalare (Chrome)

1. Instalează **Tampermonkey** — DOAR din [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
   ⚠ Tampermonkey NU e niciodată un fișier `.exe` descărcat — dacă un site îți dă un „Setup.exe", e adware; închide-l.
2. Pe Chrome recent (≥138): `chrome://extensions` → Tampermonkey → **Detalii** → activează
   „**Permiteți scripturile utilizatorului**" (Allow User Scripts). Fără acest pas scriptul se
   instalează dar nu rulează.
3. Instalează scriptul din URL-ul stabil (iei mereu ultima versiune):
   Tampermonkey → Dashboard → **Utilities** → *Install from URL*:
   ```
   https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js
   ```
4. Reîncarcă `https://chatgpt.com/`.

## Actualizări

Automat. Scriptul poartă `@updateURL` către acest repo — Tampermonkey verifică periodic și
instalează singur versiunile noi. Nu ai nimic de făcut.

## Dezactivare / dezinstalare

Instant, din comutatorul Tampermonkey (sau șterge scriptul). Pagina revine exact la ChatGPT standard.

---
© Virgil Profeanu (RENDA VEGO). Codul temei: v1 Codex (GPT) + v2–v4 Claude, sub direcția autorului.
