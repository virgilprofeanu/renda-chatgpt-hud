# RENDA VIGILIA HUD pentru ChatGPT — Extensie Chrome (MV3)

Din v4.9.3, userscript-ul `CHATGPT_RENDA_HUD.user.js` este **universal**: același
fișier, neatins, rulează și în Tampermonkey, și ca content script de extensie
Chrome. Nu mai există `content.js`, patch-uri sau adaptări — **un singur fișier
de întreținut, cu un singur nume, pe GitHub**.

## Structură

| Fișier | Rol |
|---|---|
| `CHATGPT_RENDA_HUD.user.js` | **Unicul fișier de întreținut.** Își detectează singur mediul: `GM_xmlhttpRequest` (Tampermonkey) → puntea `extHudRequest` prin `background.js` (extensie) → comportament local (nici GM, nici extensie). Versiunea din bandă: `GM_info` → `chrome.runtime.getManifest()` → `?` |
| `manifest.json` | Manifest V3: rulează `CHATGPT_RENDA_HUD.user.js` pe chatgpt.com / chat.openai.com; `host_permissions` pe `127.0.0.1:8765` + `localhost:8765`; permisiunea `alarms` pentru verificarea de update. `version` e sincronizat automat cu `@version` de către `update.ps1` |
| `background.js` | Service worker, două roluri: (1) proxy spre serverul HUD local — content script-urile MV3 nu pot ocoli CORS-ul, service worker-ul cu `host_permissions` poate (echivalentul `GM_xmlhttpRequest` + `@connect`); (2) la 10 minute compară `version.txt` de pe disc cu versiunea care rulează și dă `chrome.runtime.reload()` când diferă |
| `update.ps1` | Rulat de task-ul Windows la 10 minute: descarcă userscript-ul din repo și, dacă `@version` e nou, îl copiază **identic** peste cel local, sincronizează `manifest.json` + iconul și scrie `version.txt` ultimul. Gardă: dacă fișierul descărcat nu conține puntea `extHudRequest`, update-ul se abandonează (log în `update.log`) |
| `install.ps1` + `INSTALEAZA.bat` | Instalatorul complet: dublu-click pe `.bat` → înregistrează task-ul de auto-update, aduce ultima versiune, pune calea folderului în clipboard și deschide `chrome://extensions` — rămân doar 3 clickuri în Chrome (vezi mai jos) |
| `bootstrap.ps1` + `remote_install.bat` | Instalarea „de la zero", dintr-un singur fișier: `.bat`-ul (singurul care se trimite colegilor) descarcă repo-ul ca ZIP (fără git), îl pune în `D:\apps\renda-hud-chatgpt` și pornește `install.ps1` de acolo |
| `version.txt` | Marcajul versiunii instalate (scris ultimul = update complet) |
| `icon128.png` | Iconul oficial RENDA |

## Instalare — varianta cea mai simplă (un singur fișier)

Trimite colegului doar **`remote_install.bat`**. Dublu-click și:
descarcă tot repo-ul de pe GitHub (fără git), instalează în
**`D:\apps\renda-hud-chatgpt`** (sau `%LOCALAPPDATA%\apps\...` dacă nu există
unitatea D:), armează auto-update-ul și deschide Chrome pe pagina de extensii cu
calea deja în clipboard. Rămân cei 3 pași din Chrome de la punctul 3 de mai jos.
Sub capotă: `.bat`-ul descarcă și rulează `bootstrap.ps1` din repo, care la
rândul lui pornește `install.ps1` din folderul instalat.

## Instalare — din arhivă ZIP trimisă manual

1. Dezarhivează folderul într-un loc **stabil** (ex. `Documents\RENDA-HUD` — nu-l
   muta după aceea: extensia scrie în el la fiecare update).
2. Dublu-click pe **`INSTALEAZA.bat`** — face automat tot ce se poate: task-ul de
   auto-update, aducerea ultimei versiuni, calea în clipboard, deschide
   `chrome://extensions`. (La „Windows protected your PC": *More info* → *Run anyway*.)
3. În Chrome (singurii pași pe care Chrome nu-i lasă automatizați — instalarea
   silențioasă de extensii e blocată prin design, ca protecție anti-malware):
   - pornește **Developer mode** (dreapta-sus)
   - **Load unpacked** (stânga-sus)
   - în fereastra de foldere: **Ctrl+V** în bara de cale → Enter → *Select Folder*

Apoi deschide chatgpt.com — banda HUD apare sus. Cine folosea userscript-ul în
Tampermonkey trebuie să-l **dezactiveze** (altfel rulează ambele: HUD dublu,
dublă injecție canon).

## Cum funcționează auto-update-ul

1. Task-ul Windows (`RENDA HUD Extension AutoUpdate`, la 10 min) rulează `update.ps1`,
   care aduce versiunea nouă din GitHub pe disc și scrie `version.txt` **ultimul**.
2. `background.js` (alarmă la 10 min) vede `version.txt` ≠ versiunea care rulează
   → `chrome.runtime.reload()` — echivalentul butonului ⟳ din `chrome://extensions`.
3. Taburile ChatGPT deja deschise rămân pe scriptul vechi până la un refresh de
   pagină (între timp canonul cade elegant pe modul `[local]`).

Deci o versiune nouă publicată în repo e activă la toată lumea în ~10–20 de minute.

## Flux de release (un singur pas)

Editezi `CHATGPT_RENDA_HUD.user.js`, incrementezi `@version`, commit + push în
`main`. Atât — nu există build, patch sau împachetare:

- userii de **Tampermonkey** primesc update-ul prin `@updateURL` (mecanismul clasic);
- userii de **extensie** îl primesc prin task + reload (punctele de mai sus).

Repo-ul poate conține direct și `manifest.json` + `background.js` + restul —
atunci **repo-ul este extensia**: clone/ZIP → Load unpacked → gata.

## Confidențialitate

Scriptul nu citește și nu transmite conversațiile. Singurul trafic: GET către
`127.0.0.1:8765` (serverul HUD local, dacă există; `background.js` refuză orice
alt URL) și GitHub-ul public (descărcarea versiunilor noi de către `update.ps1`).

## Istoric al portării

- v4.9.3: userscript universal (puntea `extHudRequest` inclusă în fișier) + fix
  light mode (recolorarea întunecată a paginii se aplică doar pe tema dark);
  `content.js` a dispărut — fișierul extensiei = fișierul din repo, același nume.
- Anterior: `content.js` era generat din userscript prin 3 patch-uri mecanice
  (`GM_xmlhttpRequest` → shim, `GM_info` → manifest, inserarea shim-ului).
