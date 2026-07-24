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
| `manifest.json` | MV3 HIBRID: **`content_scripts` injectează direct `CHATGPT_RENDA_HUD.user.js`** (baza garantată — merge pe Chrome și Edge fără nicio setare) + permisiuni `userScripts`, `alarms`, `storage` pentru stratul opțional de auto-update; `host_permissions` pe `chatgpt.com`, `127.0.0.1:8765`, `localhost:8765`, `renda.holdings` și `raw.githubusercontent.com` |
| `bootstrap.ps1` + `remote_install.bat` | Instalarea „de la zero", dintr-un singur fișier: descarcă repo-ul ca ZIP (fără git), îl pune în `D:\apps\renda-hud-chatgpt`, copiază calea în clipboard și deschide `chrome://extensions`. NU instalează niciun task; dacă găsește task-ul VECHI de update (de la instalările inițiale), îl șterge automat |
| `sterge-task-vechi.bat` | Curățare pentru cine a instalat versiunile inițiale: șterge task-ul Windows „RENDA HUD Extension AutoUpdate" (mecanismul vechi de update, înlocuit de cel din browser). Dublu-click, sigur de rulat oricând |
| `icon128.png` | Iconul oficial RENDA |

## Instalare

### Cea mai simplă (un fișier, de trimis colegilor)

Dublu-click pe **`remote_install.bat`** → descarcă extensia în `D:\apps\renda-hud-chatgpt`
și deschide Chrome. Apoi, în Chrome:

1. Pornește **Developer mode** (dreapta-sus)
2. **Load unpacked** → Ctrl+V în bara de cale → Enter → *Select Folder*
3. Gata — HUD-ul pornește **fără nicio altă setare** (baza = `content_scripts`).
   *Opțional*, pe Chrome/Edge 138+: activează **„Allow user scripts"** pe cardul
   extensiei ca să primești și **auto-update din GitHub** (fără el HUD-ul merge
   oricum, dar rămâi pe versiunea din pachet până reinstalezi)

Apoi deschide chatgpt.com — banda HUD apare sus. Cine folosea userscript-ul în
Tampermonkey trebuie să-l **dezactiveze** (altfel rulează ambele).

### Din arhiva ZIP trimisă manual

Dezarhivezi într-un loc stabil, apoi aceiași pași din Chrome (Developer mode →
Load unpacked; „Allow user scripts" rămâne opțional, doar pentru auto-update).

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

## De ce HIBRID: `content_scripts` CA BAZĂ + `chrome.userScripts` ca strat de update?

Lecția din 2026-07-24: o versiune doar-pe-`userScripts` **nu pornea deloc** fără
comutatorul „Allow user scripts" (Chrome/Edge 138+) — adică cerea o setare de
browser doar ca să existe. Inacceptabil ca bază.

- **`content_scripts`** (fișierul din pachet) = **baza garantată**: se injectează pe
  orice Chrome/Edge, la instalare curată, zero setări. Userscript-ul e
  dual-environment din v4.9.3 (`extHudRequest` vorbește cu `background.js` când
  `GM_xmlhttpRequest` nu există), deci același fișier merge nemodificat.
- **`chrome.userScripts`** = **stratul opțional**: o extensie unpacked nu-și poate
  rescrie fișierele de pe disc, dar `userScripts` înregistrează cod **dintr-un
  string** ținut în `chrome.storage` → auto-update pur în browser. Se activează
  DOAR dacă userul pornește comutatorul; `background.js` înregistrează exclusiv
  versiuni **strict mai noi** decât sămânța din pachet.
- O **gardă anti-dublă-montare** (atribut `data-rv-hud-loaded` pe `<html>`,
  test-and-set sincron) garantează o singură instanță indiferent câte rute rulează.
- Limită cunoscută (declarată onest): când baza câștigă cursa de injectare,
  versiunea nouă din storage nu se vede în acel tab — updater-ul devine efectiv la
  refresh-ul următor sau la actualizarea pachetului. Niciodată HUD dublu, niciodată
  HUD lipsă.

Poarta de release **G9** (`hud_release.py`) face regresia imposibilă prin
construcție: niciun release nu trece fără `content_scripts` valid, cu fișierul
referit prezent în HEAD, inclus în pachet și purtând capabilitățile dual-env.
Codul încărcat de la distanță rămâne nepublicabil în Chrome Web Store (pentru
distribuție unpacked/internă e în regulă).

## Flux de release (un singur pas)

Editează `CHATGPT_RENDA_HUD.user.js`, incrementează `@version`, commit + push în
`main`. Userii de Tampermonkey primesc update-ul prin `@updateURL`; userii de
extensie prin `background.js` (max ~10 min). Recomandat: ține și `"version"` din
`manifest.json` la aceeași valoare (cosmetic).

## Confidențialitate

Scriptul nu citește și nu transmite conversațiile. Trafic: GET către `127.0.0.1:8765`
(serverul HUD local, dacă există; `background.js` refuză orice alt URL local) și
`raw.githubusercontent.com` (descărcarea versiunilor noi).
