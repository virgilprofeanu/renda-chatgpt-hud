# RENDA VIGILIA HUD pentru ChatGPT

Carcasă vizuală RENDA/VIGILIA peste `chatgpt.com`: bandă HUD compactă (78px) cu câmp neural animat,
navigare rapidă, monitor CPU/RAM (opțional, din HUD-ul local RENDA), **prompt perpetuu** (text directiv
inserat automat la fiecare chat nou, până îl ștergi), **șabloane de prompt predefinite** și
**canon per-tură ⚖** (opțional: la fiecare mesaj trimis, un bloc de reguli RENDA — reflexe + norme
potrivite cererii — se adaugă automat la finalul mesajului; buton ON/OFF în bandă).

**Confidențialitate:** scriptul NU citește și NU transmite conversațiile. Zero cereri de rețea către
terți (singura comunicare opțională: `GET http://127.0.0.1:8765/sysmon` — HUD-ul local de pe propria
mașină, dacă există). Singura persistență: câteva chei în `localStorage` (pliere, prompt perpetuu,
starea Canon). Scriptul doar SCRIE în composer la cererea ta — nu trimite niciodată mesaje singur.

**Confidențialitate Canon ⚖ (funcție opțională):** cu Canon **ON**, textul pe care ÎL TASTEZI în
composer (doar el — niciodată conversația sau răspunsurile) este trimis către `127.0.0.1:8765`
(serverul HUD RENDA de pe **propria ta mașină**) pentru selecția regulilor potrivite. Nimic nu
părăsește calculatorul tău. Dacă NU ai HUD-ul RENDA local, funcția e inertă — fail-open: mesajul
pleacă neatins, iar banda arată onest „canon: HUD offline". Cu Canon **OFF** (un click pe ⚖):
zero trafic nou, comportament complet liber.

## Instalare (Chrome)

1. Instalează **Tampermonkey** — DOAR din [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
   ⚠ Tampermonkey NU e niciodată un fișier `.exe` descărcat — dacă un site îți dă un „Setup.exe", e adware; închide-l.
2. Pe Chrome recent (≥138): `chrome://extensions` → Tampermonkey → **Detalii** → activează
   „**Permiteți scripturile utilizatorului**" (Allow User Scripts). Fără acest pas scriptul se
   instalează dar nu rulează.
3. Instalează scriptul din URL-ul stabil (iei mereu ultima versiune), click cu click:
   - iconița **Tampermonkey** din bara Chrome (piesa de puzzle 🧩 → Tampermonkey) → **Dashboard**;
   - fila **Utilities** (sus, dreapta);
   - jos de tot, secțiunea **„Import from URL"** → lipește în câmp EXACT acest link:
   ```
   https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js
   ```
   - apasă **Install** → se deschide pagina scriptului → apasă încă o dată **Install**.

   ℹ️ Câmpul „Import from URL" NU reține linkul după instalare — e normal: e o unealtă de
   unică folosință. După instalare, linkul trăiește în interiorul scriptului (`@updateURL`),
   de unde se fac actualizările automate.
4. Reîncarcă `https://chatgpt.com/` — banda RENDA apare sus (versiunea e afișată în bandă).

## Actualizări

Automat. Scriptul poartă `@updateURL` către acest repo — Tampermonkey verifică periodic și
instalează singur versiunile noi. Nu ai nimic de făcut.

## Dezactivare / dezinstalare

Instant, din comutatorul Tampermonkey (sau șterge scriptul). Pagina revine exact la ChatGPT standard.

---
© Virgil Profeanu (RENDA VEGO). Codul temei: v1 Codex (GPT) + v2–v4 Claude, sub direcția autorului.
