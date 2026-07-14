# RENDA VIGILIA HUD pentru ChatGPT — Extensie Chrome (MV3)

Userscript-ul `CHATGPT_RENDA_HUD.user.js` este **universal**: același fișier rulează
și în Tampermonkey, și ca extensie Chrome. Ca extensie, se **autoactualizează singură
din GitHub, pur în browser** (prin `chrome.userScripts`) — fără scheduled task, fără
PowerShell, cross-platform.

## Structură

| Fișier | Rol |
|---|---|
| `CHATGPT_RENDA_HUD.user.js` | **Unicul fișier de întreținut.** Codul HUD. În pachet e doar „sămânța" primei rulări; după aceea versiunea vie stă în `chrome.storage` și se actualizează din GitHub |
| `background.js` | Service worker, două roluri: (1) proxy spre serverul HUD local `127.0.0.1:8765` (echivalentul `GM_xmlhttpRequest` + `@connect`); (2) la 10 min aduce userscript-ul de pe GitHub și, dacă `@version` e mai nou (semver), îl re-înregistrează prin `chrome.userScripts` — niciodată downgrade |
| `manifest.json` | MV3: permisiuni `userScripts`, `alarms`, `storage`; `host_permissions` pe `127.0.0.1:8765`, `localhost:8765` și `raw.githubusercontent.com`. **Fără `content_scripts`** — scriptul e înregistrat dinamic |
| `bootstrap.ps1` + `remote_install.bat` | Instalarea „de la zero", dintr-un singur fișier: descarcă repo-ul ca ZIP (fără git), îl pune în `D:\apps\renda-hud-chatgpt`, copiază calea în clipboard și deschide `chrome://extensions`. NU instalează niciun task; dacă găsește task-ul VECHI de update (de la instalările inițiale), îl șterge automat |
| `sterge-task-vechi.bat` | Curățare pentru cine a instalat versiunile inițiale: șterge task-ul Windows „RENDA HUD Extension AutoUpdate" (mecanismul vechi de update, înlocuit de cel din browser). Dublu-click, sigur de rulat oricând |
| `icon128.png` | Iconul oficial RENDA |

## Instalare

### Cea mai simplă (un fișier, de trimis colegilor)

Dublu-click pe **`remote_install.bat`** → descarcă extensia în `D:\apps\renda-hud-chatgpt`
și deschide Chrome. Apoi, în Chrome:

1. Pornește **Developer mode** (dreapta-sus)
2. **Load unpacked** → Ctrl+V în bara de cale → Enter → *Select Folder*
3. **Pe Chrome 138+**: pe cardul extensiei, activează **„Allow user scripts"**
   (fără el, `chrome.userScripts` e indisponibil și HUD-ul nu se încarcă)

Apoi deschide chatgpt.com — banda HUD apare sus. Cine folosea userscript-ul în
Tampermonkey trebuie să-l **dezactiveze** (altfel rulează ambele).

### Din arhiva ZIP trimisă manual

Dezarhivezi într-un loc stabil, apoi aceiași pași din Chrome (Developer mode →
Load unpacked → Allow user scripts pe 138+).

## Cum funcționează auto-update-ul (pur în browser)

`background.js` verifică GitHub la 10 minute (`chrome.alarms`). Dacă `@version` de
acolo e mai nou decât cel din `chrome.storage`, descarcă noul cod și îl
re-înregistrează cu `chrome.userScripts.update()`. Codul nou se aplică la
**următorul refresh** al paginii chatgpt.com. Nimic nu se scrie pe disc, nimic din
afara browserului. O gardă refuză userscript-uri fără puntea de extensie și orice
versiune care nu e strict mai nouă (fără downgrade).

**Capcană de reținut** (ne-a costat o zi de depanare): `chrome.userScripts`
acceptă `register()` cu orice `matches` **fără eroare**, dar injectează DOAR pe
site-urile pentru care extensia are `host_permissions` în manifest. De aceea
`https://chatgpt.com/*` și `https://chat.openai.com/*` TREBUIE să rămână în
`host_permissions` — fără ele, totul pare că merge (înregistrare OK, zero erori)
dar scriptul nu rulează niciodată în pagină.

## De ce `chrome.userScripts` și nu `content_scripts` + task?

O extensie unpacked **nu-și poate rescrie fișierele de pe disc**, deci un
`content_scripts` (fișier pe disc) ar avea nevoie de ceva extern (task + PowerShell)
care să-l suprascrie. `chrome.userScripts` permite înregistrarea codului **dintr-un
string** ținut în `chrome.storage`, deci extensia se poate actualiza singură, din
browser. Costul: API-ul cere Chrome 120+ și, pe 138+, comutatorul „Allow user
scripts"; e cod încărcat de la distanță, deci **nu e publicabil în Chrome Web Store**
(pentru distribuție unpacked/internă e în regulă).

## Flux de release (un singur pas)

Editează `CHATGPT_RENDA_HUD.user.js`, incrementează `@version`, commit + push în
`main`. Userii de Tampermonkey primesc update-ul prin `@updateURL`; userii de
extensie prin `background.js` (max ~10 min). Recomandat: ține și `"version"` din
`manifest.json` la aceeași valoare (cosmetic).

## Confidențialitate

Scriptul nu citește și nu transmite conversațiile. Trafic: GET către `127.0.0.1:8765`
(serverul HUD local, dacă există; `background.js` refuză orice alt URL local) și
`raw.githubusercontent.com` (descărcarea versiunilor noi).
