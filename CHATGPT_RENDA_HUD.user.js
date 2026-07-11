// ==UserScript==
// @name         RENDA VIGILIA HUD pentru ChatGPT
// @namespace    renda.vego.virgil.profeanu
// @version      4.2.0
// v4.2.0 (canal): MOD COMPACT (butonul cicleaza FULL -> COMPACT -> OFF) + DIRECTIVELE persistente in blocul canon — continut identic cu v3.4.0 intern.
// v3.4.0 (2026-07-11, cerere autor): (1) DIRECTIVELE persistente intra in blocul canon — endpoint-ul
// /canon_select intoarce si directivele active din directives.json (cheile "all" + "gpt"), blocul
// le adauga ca linii DIRECTIVA; (2) MOD COMPACT — butonul ⚖ cicleaza FULL -> COMPACT -> OFF:
// COMPACT = o singura linie discreta cu CODURILE selectiei ([CANON RENDA R##·R##·R## + ID·ID·ID]),
// gandita pentru arhitectura combinata cu skill-ul renda-canon-memory (skill-ul cara canonul complet
// invizibil in references; modelul rezolva codurile de acolo). Stare persistata; migrare automata
// de la ON/OFF-ul vechi (true->full, false->off).
// v3.3.1 (2026-07-11): FIX 2 defecte prinse la TESTUL REAL (CDP pe cont live): (1) CURSA de
// sincronizare — click-ul pe send in acelasi tick cu execCommand risca trimiterea starii VECHI
// (ProseMirror/React sincronizeaza asincron) => input-event + 140ms inainte de click; (2) callback
// GM THROTTLE-uit in tab de fundal (lectia 5) lasa canonBusy blocat si a doua trimitere trecea RAW
// pe langa garda => watchdog 2.5s + PREFETCH-ON-INPUT (selectia se ia in timpul tastarii, la Enter
// e cache-hit SINCRON) + re-gasirea composer-ului la callback + garda de stare (text schimbat/SPA
// navigat => NU injecta orbeste, badge onest).
// v3.3.0 (2026-07-11, cerere autor): CANON PER-TURA — echivalentul hook-ului UserPromptSubmit de la
// Claude, pe chatgpt.com: la FIECARE trimitere, textul din composer e trimis DOAR la serverul HUD
// local (127.0.0.1:8765/canon_select, care ruleaza CHIAR vigilia_router.pick_reflexes/pick_norme —
// zero drift de selector) iar blocul [CANON RENDA] (3 reflexe VIGILIA + 3 norme ELEAT potrivite
// cererii) e ADAUGAT la finalul mesajului inainte de trimitere. BUTON ⚖ Canon ON/OFF in nav
// (suprimare pentru teste A/B — comportament liber vs canon); linia de selectie vizibila in nav.
// Fail-open: server oprit -> mesajul pleaca NEatins + badge "canon: HUD offline". AMENDAMENT DE
// CONFIDENTIALITATE fata de v3_cl: cand CANON e ON, textul TASTAT DE TINE in composer (doar el,
// nu conversatia) pleaca spre 127.0.0.1 (masina proprie) pentru selectie; OFF = zero trafic nou.
// v3.2.2 (2026-07-11): FIX sidebar (lista de chaturi/sectiuni cu flapping) + robustete la shell-ul
// schimbator ChatGPT. Doua schimbari structurale, probate live pe /c/..., home si /plugins:
// (1) ROOT DETERMINIST: containerul aplicatiei = stramosul lui <main> direct sub <body>
//     (main.closest('body > *')) — nu "cel mai mare DIV" (shell-ul ChatGPT s-a schimbat intre
//     incarcari si euristica de arie marca alt element => push pe elementul gresit).
// (2) CAP INGUST: dispare plafonul lat pe TOTI copiii root-ului (v3.1.2 — atingea si sidebar-ul
//     si strica masuratoarea virtualizatorului listei de chaturi); ramane o singura normalizare:
//     elementele cu clasa h-svh din interiorul root-ului => height:100% (mostenesc inaltimea
//     reala de sub HUD in loc de inaltimea viewportului); composer-ul ramane vizibil pe /c/...
// v3.2.0 (2026-07-11, cerere autor): PROMPT PERPETUU + SABLOANE RENDA — buton ⚡ in bara de nav
// (zero inaltime adaugata; panou PLUTITOR sub banda). Promptul perpetuu = text directiv scris de
// user, INSERAT AUTOMAT in composer la fiecare chat NOU, pana cand userul il sterge din panou;
// o data pe pagina (daca il stergi din composer, nu revine pana la urmatorul chat nou). Sabloanele
// = lista predefinita RENDA (disciplina anti-inventie, contract de sarcina, verificare adversariala
// etc.), click = inserat in composer. Scriptul DOAR SCRIE in composer — NU trimite NICIODATA singur;
// nimic din conversatie nu e citit (verificarea "composer gol" = textContent al campului de INPUT).
// v3.1.2 (2026-07-11): FIX pagina goala pe /plugins (regresie v3.1.1) — root-ul are si un DIV gol
// de sistem printre copii; height:100% fortat il umfla pe TOT ecranul si strivea continutul flex-1
// la 0. Regula devine DOAR plafon (max-height:100%, height:auto) — taie depasirea 100dvh (composer)
// fara sa creasca copiii goi. Probat pe AMBELE: /c/... composer vizibil + /plugins continut plin.
// v3.1.1 (2026-07-11): FIX composer taiat pe paginile de conversatie — ChatGPT isi dimensioneaza
// scena interioara cu 100dvh (inaltimea VIEWPORTULUI), dar root-ul e comprimat la 100dvh-78px =>
// interiorul depasea cu 78px in jos exact unde sta composer-ul. Fix: copiii directi ai root-ului
// fortati la height:100% (mostenesc inaltimea reala); probat pe conversatie reala (composer
// 853->775, header intern intact sub HUD la top=78).
// v3.1 (2026-07-11, cerere autor): HUD COMPACT — inaltimea injumatatita 154px -> 78px (shell 48px
// + nav 26px): status/orbita/subtitlu ascunse, comanda 11px, metricile pe UN rand flex (RUTA scoasa
// — vizibila oricum in bara de adrese; barele decorative ORA scoase). Pliat ramane 38px.
// @description  Carcasă vizuală RENDA/VIGILIA peste ChatGPT + monitor CPU/RAM live din HUD-ul local (localhost:8765/sysmon). Nu citește și nu transmite conversațiile.
// @author       Codex (GPT) v1 + Claude v2_cl/v3_cl pentru Virgil Profeanu
// v3_cl (2026-07-11, Claude): metricile false LINK/RUTĂ/ORA devin monitor REAL — CPU/RAM (sistem +
// RENDA) trase din serverul HUD local prin GM_xmlhttpRequest (@connect 127.0.0.1; serverul nu are
// CORS și NU e atins). Poll la 2s, pauză pe tab ascuns, fallback onest „HUD offline" când serverul
// e oprit. Confidențialitate neschimbată: singura comunicare = GET către 127.0.0.1:8765/sysmon
// (mașina proprie), zero date din pagină trimise.
// v2_cl (2026-07-11, Claude): fix detectie root pe chatgpt.com real — v1 marca overlay-ul de
// toast-uri (pointer-events-none, primul DIV din body) drept container al aplicatiei si CSS-ul
// il forta position:relative cu inaltimea viewportului => aplicatia reala era impinsa sub ecran
// (pagina neagra la montare si la pliere). v2: fallback = cel mai mare DIV vizibil din body
// (excluzand overlay-urile), cu marcaj unic (curata clasa de pe alte noduri la fiecare re-scan).
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @updateURL    https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js
// @downloadURL  https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  if (window.top !== window.self) return;

  const CONFIG = {
    title: 'HUD VIGILIA',
    system: 'RENDA',
    subtitle: 'observator de ordin secund',
    commandTitle: 'PUNTE DE COMANDĂ COGNITIVĂ',
    commandSubtitle: 'Navigăm complexitate · Cartografiem sens',
    rendaHudUrl: 'http://localhost:8765/',
    sysmonUrl: 'http://127.0.0.1:8765/sysmon',
    canonUrl: 'http://127.0.0.1:8765/canon_select',
    sysmonIntervalMs: 2000,
    links: [
      ['Chat', '/'],
      ['Imagini', '/images'],
      ['Aplicații', '/apps'],
      ['GPT-uri', '/gpts'],
      ['Skills', '/skills'],
      ['Plugins', '/plugins'],
      ['Library', '/library']
    ]
  };

  const HUD_ID = 'renda-vigilia-chatgpt-hud';
  const STYLE_ID = 'renda-vigilia-chatgpt-style';
  const ROOT_CLASS = 'renda-chatgpt-root';
  const STORAGE_KEY = 'rendaVigiliaHudCollapsed';
  const PP_KEY = 'rendaVigiliaPerpetualPrompt';
  const PANEL_ID = 'renda-vigilia-pp-panel';
  const CANON_KEY = 'rendaVigiliaCanonOn';     // v3.3: ON/OFF injectie canon per-tura (default ON)
  const CANON_MARK = '[CANON RENDA';           // marker anti-dubla-injectie in acelasi mesaj

  // Sabloane predefinite RENDA (pentru useri mai putin avansati) — click = inserat in composer.
  const TEMPLATES = [
    ['Disciplina RENDA (anti-invenție)',
     'REGULI PENTRU ACEST CHAT (respectă-le la fiecare răspuns):\n1. ZERO INVENȚIE — date, cifre, nume, articole de lege: doar din sursele date sau declarate; ce nu știi = scrie explicit „N/A / neverificat".\n2. FAPT ≠ INTERPRETARE — separă ce scrie sursa de ce deduci tu.\n3. VERDICT BINAR când cer decizie: DA | NU | NEVERIFICAT.\n4. ANTI-ABUR — fără paragrafe de încălzire, fără entuziasm artificial, fără politețe în exces.\n5. Fiecare afirmație importantă = cu sursa ei (fișier/link/pagină).\n\nSarcina mea: '],
    ['Contract de sarcină (CE/DE CE/CUM/FORMA)',
     'Înainte să execuți, confirmă contractul în 4 rânduri:\nCE livrezi (artefactul exact) · DE CE (rostul în lanțul meu de lucru) · CUM (pașii + sursele pe care te bazezi) · FORMA (structura/formatul ieșirii).\nApoi execută. Dacă îți lipsește o informație ca să închizi contractul, întreabă ÎNTÂI.\n\nSarcina: '],
    ['Verificare adversarială',
     'Ia concluzia/textul de mai jos și încearcă activ să o RESPINGI: caută eroarea de fapt, eroarea de logică, cazul-limită care o sparge și ce sursă ar contrazice-o. Verdict final: CONFIRMAT | RESPINS | INCERT + de ce, în maximum 10 rânduri.\n\nTextul: '],
    ['Rezumat executiv (TLDR)',
     'Rezumă materialul de mai jos pentru un decident grăbit: 5 rânduri TLDR + lista deciziilor cerute + riscurile principale (max 3) + ce lipsește ca să se poată decide. Fără introduceri.\n\nMaterialul: '],
    ['Extrage acțiunile',
     'Extrage din textul de mai jos TOATE acțiunile concrete, ca listă: acțiune · responsabil (dacă reiese) · termen (dacă reiese) · sursa (fraza exactă). Ce e ambiguu marchează cu „?". Nu inventa acțiuni care nu sunt în text.\n\nTextul: '],
    ['Format GOAL/HOW/RESPONSE',
     'Structurează răspunsul EXACT așa:\nGOAL: (ce rezolvi)\nHOW: (cum ai procedat, 2-3 rânduri)\nRESPONSE: (miezul, complet)\nINDICATION FOR BETTER NEXT STEPS: (1-3 sugestii)\nUSEFUL FOR USER: (ce merită reținut)\n\nCererea mea: ']
  ];

  const css = String.raw`
    :root.renda-vigilia-theme {
      --rv-bg: #0d0f12;
      --rv-panel: #15181d;
      --rv-panel-2: #1b1f26;
      --rv-line: #262b33;
      --rv-text: #e7e9ee;
      --rv-text-2: #9aa3b0;
      --rv-text-3: #646c78;
      --rv-blue: #378ADD;
      --rv-blue-2: #1b3a57;
      --rv-violet: #7F77DD;
      --rv-violet-2: #2a2752;
      --rv-green: #1D9E75;
      --rv-amber: #BA7517;
      --rv-hud-height: 78px;
      --main-surface-primary: #0d0f12 !important;
      --main-surface-secondary: #15181d !important;
      --main-surface-tertiary: #1b1f26 !important;
      --sidebar-surface-primary: #101318 !important;
      --sidebar-surface-secondary: #15191f !important;
      --message-surface: #15181d !important;
      --composer-surface: #15181d !important;
    }

    :root.renda-vigilia-theme[data-rv-collapsed='true'] {
      --rv-hud-height: 38px;
    }

    :root.renda-vigilia-theme,
    :root.renda-vigilia-theme body {
      background: var(--rv-bg) !important;
      color: var(--rv-text) !important;
    }

    :root.renda-vigilia-theme body {
      overflow: hidden !important;
    }

    :root.renda-vigilia-theme .${ROOT_CLASS} {
      position: relative !important;
      margin-top: var(--rv-hud-height) !important;
      height: calc(100dvh - var(--rv-hud-height)) !important;
      max-height: calc(100dvh - var(--rv-hud-height)) !important;
      min-height: 0 !important;
      transition: margin-top .22s ease, height .22s ease, max-height .22s ease;
    }

    /* v3.2.2: shell-ul ChatGPT se dimensioneaza cu h-svh/100dvh (inaltimea VIEWPORTULUI) desi
       root-ul e comprimat cu inaltimea HUD => composer-ul cadea sub ecran pe /c/...
       Normalizare INGUSTA: doar elementele h-svh mostenesc inaltimea reala (100% din root).
       NU plafonam toti copiii root-ului (lectia v3.1.2: regula lata atingea sidebar-ul si
       strica masuratoarea virtualizatorului listei de chaturi). */
    :root.renda-vigilia-theme .${ROOT_CLASS} [class*="h-svh"] {
      height: 100% !important;
      max-height: 100% !important;
    }

    :root.renda-vigilia-theme [class*='bg-token-sidebar-surface-primary'] {
      background-color: #101318 !important;
    }

    :root.renda-vigilia-theme [class*='bg-token-main-surface-primary'] {
      background-color: var(--rv-bg) !important;
    }

    :root.renda-vigilia-theme [class*='bg-token-main-surface-secondary'],
    :root.renda-vigilia-theme [class*='bg-token-composer-surface'] {
      background-color: var(--rv-panel) !important;
    }

    :root.renda-vigilia-theme #prompt-textarea,
    :root.renda-vigilia-theme textarea,
    :root.renda-vigilia-theme [contenteditable='true'] {
      caret-color: #9cc6f3 !important;
    }

    :root.renda-vigilia-theme ::selection {
      background: rgba(55, 138, 221, .42);
      color: #fff;
    }

    :root.renda-vigilia-theme * {
      scrollbar-color: #344252 #0d0f12;
    }

    #${HUD_ID} {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 40;
      height: var(--rv-hud-height);
      box-sizing: border-box;
      overflow: hidden;
      padding: 4px 18px 0;
      color: var(--rv-text);
      background: #090c10;
      border-bottom: 1px solid var(--rv-line);
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      line-height: 1.35;
      transition: height .22s ease;
    }

    #${HUD_ID}, #${HUD_ID} * { box-sizing: border-box; }

    #${HUD_ID} .rv-shell {
      position: relative;
      height: 46px;
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(300px, 1.2fr) minmax(285px, 1.2fr);
      align-items: center;
      gap: 16px;
      padding: 4px 14px;
      overflow: hidden;
      border: 1px solid var(--rv-line);
      border-radius: 12px;
      box-shadow: inset 0 1px 0 rgba(55,138,221,.10), inset 0 -1px 0 rgba(127,119,221,.16);
      background:
        radial-gradient(135% 210% at 15% -55%, rgba(55,138,221,.22), transparent 60%),
        radial-gradient(110% 200% at 88% -45%, rgba(127,119,221,.19), transparent 58%),
        radial-gradient(60% 150% at 50% 135%, rgba(80,130,200,.11), transparent 62%),
        linear-gradient(180deg,#0b0f17,#06090d);
    }

    #${HUD_ID} .rv-shell::before {
      content: '';
      position: absolute;
      inset: -1px 0 auto;
      height: 2px;
      background:
        linear-gradient(90deg,transparent,rgba(55,138,221,.65) 26%,rgba(127,119,221,.65) 74%,transparent),
        radial-gradient(closest-side,rgba(175,215,255,1),transparent);
      background-size: 100% 100%,26% 260%;
      background-repeat: no-repeat;
      background-position: 0 0,-25% center;
      animation: rvSweep 11s linear infinite;
      pointer-events: none;
    }

    #${HUD_ID} .rv-field {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      opacity: .92;
      -webkit-mask-image: linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
      mask-image: linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);
    }

    #${HUD_ID} .rv-left,
    #${HUD_ID} .rv-center,
    #${HUD_ID} .rv-right { position: relative; z-index: 2; min-width: 0; }

    #${HUD_ID} .rv-left { display: flex; align-items: center; gap: 12px; }
    #${HUD_ID} .rv-dot {
      width: 12px;
      height: 12px;
      flex: 0 0 12px;
      border-radius: 50%;
      background: var(--rv-violet);
      animation: rvPulse 2.4s infinite;
    }
    #${HUD_ID} .rv-brand-line { white-space: nowrap; }
    #${HUD_ID} .rv-brand {
      color: var(--rv-text);
      font-size: 13px;
      font-weight: 650;
      letter-spacing: .7px;
      text-shadow: 0 0 18px rgba(55,138,221,.30);
    }
    #${HUD_ID} .rv-system { color: var(--rv-text-3); letter-spacing: .5px; }
    #${HUD_ID} .rv-status { display: none; }
    #${HUD_ID} .rv-status b { color: var(--rv-green); font-weight: 500; }

    #${HUD_ID} .rv-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 0;
    }
    #${HUD_ID} .rv-orbit { display: none; }
    #${HUD_ID} .rv-orbit-off {
      position: absolute;
      top: -7px;
      width: 62px;
      height: 62px;
      border: 1px solid rgba(110,171,232,.58);
      border-radius: 50%;
      box-shadow: 0 0 24px rgba(55,138,221,.12), inset 0 0 18px rgba(127,119,221,.10);
      opacity: .78;
    }
    #${HUD_ID} .rv-orbit::before,
    #${HUD_ID} .rv-orbit::after {
      content: '';
      position: absolute;
      inset: 8px;
      border: 1px solid rgba(127,119,221,.55);
      border-radius: 50%;
      transform: rotate(55deg) scaleY(.38);
    }
    #${HUD_ID} .rv-orbit::after {
      inset: 17px;
      background: radial-gradient(circle,#dfeaff 0 7%,#378ADD 9% 18%,transparent 20%);
      animation: rvSpin 8s linear infinite;
    }
    #${HUD_ID} .rv-command {
      position: relative;
      margin-top: 0;
      color: #dfeaff;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 3px;
      white-space: nowrap;
      text-shadow: 0 0 18px rgba(90,150,225,.6),0 0 5px rgba(120,170,235,.45);
    }
    #${HUD_ID} .rv-command-sub { color: var(--rv-text-3); font-size: 9px; letter-spacing: .6px; }

    #${HUD_ID} .rv-right {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-self: end;
      min-width: 0;
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    #${HUD_ID} .rv-metric-label { color: var(--rv-text); font-weight: 650; letter-spacing: .6px; margin-left: 8px; }
    #${HUD_ID} .rv-metric-label:first-child { margin-left: 0; }
    #${HUD_ID} .rv-meter { width: 52px; height: 4px; overflow: hidden; border-radius: 4px; background: #1c222b; flex: 0 0 52px; }
    #${HUD_ID} .rv-meter i { display: block; height: 100%; border-radius: inherit; background: var(--rv-blue); }
    #${HUD_ID} .rv-meter.route i { background: var(--rv-violet); }
    #${HUD_ID} .rv-metric-value { color: var(--rv-text-2); font-size: 10px; }
    #${HUD_ID} .rv-metric-value.online { color: var(--rv-green); }
    /* compact v3.1: RUTA (copiii 10-12) ascunsa — e in bara de adrese; bara decorativa a OREI (14) scoasa */
    #${HUD_ID} .rv-right > :nth-child(10),
    #${HUD_ID} .rv-right > :nth-child(11),
    #${HUD_ID} .rv-right > :nth-child(12),
    #${HUD_ID} .rv-right > :nth-child(14) { display: none; }

    #${HUD_ID} .rv-collapse {
      position: absolute;
      z-index: 4;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 24px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(55,138,221,.38);
      border-radius: 7px;
      color: #9cc6f3;
      background: rgba(20,40,60,.62);
      cursor: pointer;
      font: 600 13px/1 'Segoe UI',sans-serif;
    }
    #${HUD_ID} .rv-collapse:hover { border-color: var(--rv-blue); background: var(--rv-blue-2); }

    #${HUD_ID} .rv-nav {
      height: 28px;
      display: flex;
      align-items: center;
      gap: 5px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 3px;
      scrollbar-width: none;
      white-space: nowrap;
    }
    #${HUD_ID} .rv-nav::-webkit-scrollbar { display: none; }
    #${HUD_ID} .rv-nav-label { color: var(--rv-text-3); margin-right: 2px; }
    #${HUD_ID} .rv-nav a {
      color: var(--rv-blue);
      padding: 3px 6px;
      border: 1px solid transparent;
      border-radius: 6px;
      text-decoration: none;
      transition: color .15s ease, background .15s ease, border-color .15s ease;
    }
    #${HUD_ID} .rv-nav a:hover { color: #b9dcff; background: rgba(55,138,221,.10); border-color: rgba(55,138,221,.24); }
    #${HUD_ID} .rv-nav a.active { color: #bcb6f5; background: var(--rv-violet-2); border-color: #3a3470; }
    #${HUD_ID} .rv-nav a.renda { margin-left: auto; color: var(--rv-green); border-color: rgba(29,158,117,.25); }

    /* v3.2: butonul ⚡ Prompt in bara existenta (zero inaltime adaugata) */
    #${HUD_ID} .rv-pp-btn {
      margin-left: 10px;
      padding: 3px 8px;
      border: 1px solid rgba(186,117,23,.45);
      border-radius: 6px;
      color: #e0b24c;
      background: transparent;
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
    }
    #${HUD_ID} .rv-pp-btn:hover { background: rgba(186,117,23,.14); border-color: var(--rv-amber); }
    #${HUD_ID} .rv-pp-btn.on { color: #ffd27a; border-color: var(--rv-amber); background: rgba(186,117,23,.18); }
    #${HUD_ID} .rv-canon-btn.on { color: #8fd3ff; border-color: var(--rv-blue); background: rgba(55,138,221,.18); }
    #${HUD_ID} .rv-canon-btn.compact { color: #b9a7ff; border-color: var(--rv-violet); background: rgba(127,119,221,.18); }
    #${HUD_ID} .rv-canon-line {
      font-size: 10px; color: var(--rv-text-2); max-width: 360px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* v3.2: panoul PLUTITOR (sub banda, nu impinge nimic) */
    #${PANEL_ID} {
      position: fixed;
      top: calc(var(--rv-hud-height) + 6px);
      right: 14px;
      z-index: 60;
      width: min(460px, 92vw);
      max-height: calc(100dvh - var(--rv-hud-height) - 24px);
      overflow-y: auto;
      box-sizing: border-box;
      padding: 12px 14px;
      color: #e7e9ee;
      background: #0e1218;
      border: 1px solid #2a3242;
      border-radius: 12px;
      box-shadow: 0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 rgba(55,138,221,.12);
      font: 12px/1.45 'Segoe UI', system-ui, sans-serif;
      display: none;
    }
    #${PANEL_ID}.open { display: block; }
    #${PANEL_ID} h3 { margin: 0 0 6px; font-size: 12px; letter-spacing: .8px; color: #dfeaff; }
    #${PANEL_ID} .pp-hint { color: #8a93a0; font-size: 10.5px; margin: 2px 0 8px; }
    #${PANEL_ID} textarea {
      width: 100%;
      min-height: 84px;
      box-sizing: border-box;
      resize: vertical;
      padding: 8px;
      color: #e7e9ee;
      background: #131922;
      border: 1px solid #2a3242;
      border-radius: 8px;
      font: 12px/1.4 'Segoe UI', system-ui, sans-serif;
    }
    #${PANEL_ID} .pp-row { display: flex; gap: 8px; margin: 8px 0 4px; align-items: center; }
    #${PANEL_ID} .pp-row .pp-state { margin-left: auto; font-size: 10.5px; color: #8a93a0; }
    #${PANEL_ID} button.pp-act {
      padding: 5px 10px;
      border: 1px solid rgba(55,138,221,.45);
      border-radius: 7px;
      color: #9cc6f3;
      background: rgba(20,40,60,.55);
      cursor: pointer;
      font: 600 11px 'Segoe UI', sans-serif;
    }
    #${PANEL_ID} button.pp-act:hover { background: var(--rv-blue-2); }
    #${PANEL_ID} button.pp-act.danger { border-color: rgba(224,108,108,.4); color: #f09595; background: rgba(90,29,29,.35); }
    #${PANEL_ID} hr { border: 0; border-top: 1px solid #232b38; margin: 10px 0; }
    #${PANEL_ID} .pp-tpl {
      display: block;
      width: 100%;
      text-align: left;
      margin: 4px 0;
      padding: 6px 9px;
      border: 1px solid #253046;
      border-radius: 7px;
      color: #b9dcff;
      background: #121824;
      cursor: pointer;
      font: 12px 'Segoe UI', sans-serif;
    }
    #${PANEL_ID} .pp-tpl:hover { border-color: rgba(55,138,221,.5); background: #16202f; }
    #${PANEL_ID} .pp-close {
      position: absolute; top: 8px; right: 10px;
      border: 0; background: transparent; color: #8a93a0; cursor: pointer; font-size: 14px;
    }

    :root.renda-vigilia-theme[data-rv-collapsed='true'] #${HUD_ID} { padding: 0 8px; }
    :root.renda-vigilia-theme[data-rv-collapsed='true'] #${HUD_ID} .rv-shell { display: none; }
    :root.renda-vigilia-theme[data-rv-collapsed='true'] #${HUD_ID} .rv-nav { height: 38px; padding-right: 42px; }
    :root.renda-vigilia-theme[data-rv-collapsed='true'] #${HUD_ID} .rv-collapse { top: 7px; }

    @keyframes rvPulse {
      0% { box-shadow: 0 0 0 0 rgba(127,119,221,.55); }
      70% { box-shadow: 0 0 0 12px rgba(127,119,221,0); }
      100% { box-shadow: 0 0 0 0 rgba(127,119,221,0); }
    }
    @keyframes rvSweep { from { background-position: 0 0,-25% center; } to { background-position: 0 0,125% center; } }
    @keyframes rvSpin { to { transform: rotate(415deg) scaleY(.38); } }

    @media (max-width: 980px) {
      #${HUD_ID} .rv-shell { grid-template-columns: 1fr 1.25fr; }
      #${HUD_ID} .rv-right { display: none; }
      #${HUD_ID} .rv-command { letter-spacing: 2px; font-size: 11px; }
    }

    @media (max-width: 680px) {
      #${HUD_ID} .rv-shell { grid-template-columns: 1fr; }
      #${HUD_ID} .rv-left { display: none; }
      #${HUD_ID} .rv-command { font-size: 10px; }
      #${HUD_ID} .rv-nav a { padding-inline: 4px; }
    }

    @media (prefers-reduced-motion: reduce) {
      #${HUD_ID} *, .${ROOT_CLASS} { animation: none !important; transition: none !important; }
    }
  `;

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function findAndMarkRoot() {
    const candidates = [...document.body.children].filter((node) =>
      node instanceof HTMLElement && node.tagName === 'DIV' && node.id !== HUD_ID
    );
    const preferred = candidates.find((node) =>
      node.id === '__next' || node.id === 'app' || node.getAttribute('data-testid') === 'app-root'
    );
    let root = preferred || null;
    if (!root) {
      // v3.2.2: ancora DETERMINISTA — containerul aplicatiei = stramosul lui <main> direct sub
      // body (shell-ul ChatGPT isi schimba structura intre incarcari; euristica de arie maxima
      // a marcat elementul gresit pe shell-ul nou => push aplicat aiurea).
      const main = document.querySelector('main');
      const viaMain = main ? main.closest('body > *') : null;
      if (viaMain && viaMain.tagName === 'DIV' && viaMain.id !== HUD_ID) root = viaMain;
    }
    if (!root) {
      // v2_cl: containerul real al aplicatiei = cel mai mare DIV vizibil din body.
      // Overlay-urile (toast-uri pointer-events-none, dialoguri, alerte) sunt excluse —
      // pe chatgpt.com apar INAINTEA aplicatiei in body si v1 le marca gresit drept root.
      let bestArea = 0;
      for (const node of candidates) {
        if (node.matches('[role="dialog"], [role="alert"], .pointer-events-none')) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width < 300 || rect.height < 200) continue;
        const area = rect.width * rect.height;
        if (area > bestArea) { bestArea = area; root = node; }
      }
    }
    if (root) {
      // marcaj UNIC: observer-ul re-ruleaza pe mutatii de body — curata orice marcaj vechi
      // ramas pe alt nod (altfel un overlay marcat gresit ocupa inaltimea viewportului).
      document.querySelectorAll('.' + ROOT_CLASS).forEach((node) => {
        if (node !== root) node.classList.remove(ROOT_CLASS);
      });
      root.classList.add(ROOT_CLASS);
    }
    return root;
  }

  function createHud() {
    const existing = document.getElementById(HUD_ID);
    if (existing) return existing;

    const hud = document.createElement('section');
    hud.id = HUD_ID;
    hud.setAttribute('aria-label', 'RENDA VIGILIA HUD');

    const navLinks = CONFIG.links.map(([label, href]) =>
      `<a href="${href}" data-rv-path="${href}">${label}</a>`
    ).join('');

    hud.innerHTML = `
      <div class="rv-shell">
        <canvas class="rv-field" aria-hidden="true"></canvas>
        <div class="rv-left">
          <span class="rv-dot" aria-hidden="true"></span>
          <div>
            <div class="rv-brand-line"><span class="rv-brand">${CONFIG.title}</span><span class="rv-system"> · ${CONFIG.system} · ${CONFIG.subtitle}</span></div>
            <div class="rv-status">● <b data-rv-online>conectat · live</b></div>
          </div>
        </div>
        <div class="rv-center">
          <span class="rv-orbit" aria-hidden="true"></span>
          <div class="rv-command">${CONFIG.commandTitle}</div>
          <div class="rv-command-sub">${CONFIG.commandSubtitle}</div>
        </div>
        <div class="rv-right" aria-label="Stare reală pagină + monitor HUD local">
          <span class="rv-metric-label">HUD</span><span class="rv-meter"><i data-rv-hud-bar style="width:0%"></i></span><span class="rv-metric-value" data-rv-hud>…</span>
          <span class="rv-metric-label">CPU</span><span class="rv-meter"><i data-rv-cpu-bar style="width:0%"></i></span><span class="rv-metric-value" data-rv-cpu>—</span>
          <span class="rv-metric-label">RAM</span><span class="rv-meter"><i data-rv-ram-bar style="width:0%"></i></span><span class="rv-metric-value" data-rv-ram>—</span>
          <span class="rv-metric-label">RUTĂ</span><span class="rv-meter route"><i style="width:72%"></i></span><span class="rv-metric-value" data-rv-route>/</span>
          <span class="rv-metric-label">ORA</span><span class="rv-meter"><i style="width:45%"></i></span><span class="rv-metric-value" data-rv-clock>--:--:--</span>
        </div>
      </div>
      <nav class="rv-nav" aria-label="Navigare RENDA ChatGPT">
        <span class="rv-nav-label">pagini:</span>${navLinks}
        <button class="rv-pp-btn" type="button" title="Prompt perpetuu + șabloane RENDA">⚡ Prompt</button>
        <button class="rv-pp-btn rv-canon-btn" type="button" title="CANON per-tură: la fiecare trimitere, blocul [CANON RENDA] (reflexe VIGILIA + norme ELEAT selectate de serverul HUD local) se adaugă la mesaj. OFF = comportament liber (teste A/B).">⚖ Canon</button>
        <span class="rv-canon-line" data-rv-canon>canon: —</span>
        <a class="renda" href="${CONFIG.rendaHudUrl}" target="_blank" rel="noopener">◉ RENDA HUD ↗</a>
      </nav>
      <button class="rv-collapse" type="button" title="Pliază HUD-ul" aria-label="Pliază HUD-ul">−</button>
    `;

    document.body.prepend(hud);
    return hud;
  }

  function setCollapsed(hud, collapsed) {
    document.documentElement.dataset.rvCollapsed = String(collapsed);
    const button = hud.querySelector('.rv-collapse');
    if (button) {
      button.textContent = collapsed ? '+' : '−';
      button.title = collapsed ? 'Extinde HUD-ul' : 'Pliază HUD-ul';
      button.setAttribute('aria-label', button.title);
    }
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch (_) {}
  }

  function updateState(hud) {
    const online = navigator.onLine;
    const onlineNode = hud.querySelector('[data-rv-online]');
    const linkNode = hud.querySelector('[data-rv-link]');
    const routeNode = hud.querySelector('[data-rv-route]');
    const clockNode = hud.querySelector('[data-rv-clock]');
    if (onlineNode) onlineNode.textContent = online ? 'conectat · live' : 'offline';
    if (linkNode) {
      linkNode.textContent = online ? 'ONLINE' : 'OFFLINE';
      linkNode.classList.toggle('online', online);
    }
    if (routeNode) routeNode.textContent = location.pathname.length > 12 ? '…' + location.pathname.slice(-10) : location.pathname;
    if (clockNode) clockNode.textContent = new Intl.DateTimeFormat('ro-RO', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date());

    hud.querySelectorAll('[data-rv-path]').forEach((link) => {
      const path = link.getAttribute('data-rv-path');
      link.classList.toggle('active', path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
    });
  }

  // === v3.2: PROMPT PERPETUU + SABLOANE (scriptul DOAR SCRIE in composer, nu trimite niciodata) ===
  function getPP() { try { return localStorage.getItem(PP_KEY) || ''; } catch (_) { return ''; } }
  function setPP(text) { try { text ? localStorage.setItem(PP_KEY, text) : localStorage.removeItem(PP_KEY); } catch (_) {} }

  function findComposer() { return document.getElementById('prompt-textarea'); }

  function insertIntoComposer(text) {
    const ed = findComposer();
    if (!ed) return false;
    ed.focus();
    try { document.execCommand('insertText', false, text); } catch (_) { return false; }
    return true;
  }

  function buildPanel(hud) {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = PANEL_ID;
    const tpls = TEMPLATES.map((t, i) => `<button class="pp-tpl" type="button" data-tpl="${i}">📋 ${t[0]}</button>`).join('');
    panel.innerHTML = `
      <button class="pp-close" type="button" aria-label="Închide">✕</button>
      <h3>⚡ PROMPT PERPETUU</h3>
      <div class="pp-hint">Text directiv scris de tine, inserat automat în composer la fiecare chat NOU — până îl ștergi de aici. Scriptul doar scrie; trimiterea rămâne a ta.</div>
      <textarea class="pp-text" placeholder="ex. Reguli: zero invenție; separă fapt de interpretare; verdict binar când cer decizie."></textarea>
      <div class="pp-row">
        <button class="pp-act pp-save" type="button">Salvează</button>
        <button class="pp-act danger pp-clear" type="button">Șterge (dezactivează)</button>
        <span class="pp-state"></span>
      </div>
      <hr>
      <h3>ȘABLOANE RENDA</h3>
      <div class="pp-hint">Click = textul intră în composer, la poziția cursorului; completezi și trimiți tu.</div>
      ${tpls}
    `;
    document.body.appendChild(panel);
    const ta = panel.querySelector('.pp-text');
    const state = panel.querySelector('.pp-state');
    const btn = hud.querySelector('.rv-pp-btn');
    function refresh() {
      const pp = getPP();
      ta.value = pp;
      state.textContent = pp ? 'ACTIV — se inserează la chat nou' : 'inactiv';
      if (btn) btn.classList.toggle('on', !!pp);
    }
    panel.querySelector('.pp-save').addEventListener('click', () => { setPP(ta.value.trim()); refresh(); });
    panel.querySelector('.pp-clear').addEventListener('click', () => { setPP(''); refresh(); });
    panel.querySelector('.pp-close').addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelectorAll('.pp-tpl').forEach((b) => b.addEventListener('click', () => {
      const t = TEMPLATES[Number(b.dataset.tpl)];
      if (t && insertIntoComposer(t[1])) panel.classList.remove('open');
    }));
    refresh();
    return panel;
  }

  // Auto-insertie: O SINGURA data per sosire pe o pagina de chat NOU, doar in composer GOL
  // (nu suprascrie draftul omului; daca omul sterge textul din composer, nu revine pana la
  // urmatorul chat nou). "Perpetuu" = pana la stergerea din panou (setPP('')).
  let ppInsertedHere = false;
  function isNewChatPage() {
    const p = location.pathname;
    return p === '/' || p.startsWith('/g/');
  }
  function autoInsertPerpetual() {
    if (!isNewChatPage()) { ppInsertedHere = false; return; }
    if (ppInsertedHere) return;
    const pp = getPP();
    if (!pp) return;
    const ed = findComposer();
    if (!ed) return;
    if ((ed.textContent || '').trim() !== '') { ppInsertedHere = true; return; }
    if (insertIntoComposer(pp)) ppInsertedHere = true;
  }

  // === v3.3: CANON PER-TURA (echivalentul hook-ului UserPromptSubmit de la Claude) ===
  // La fiecare trimitere (Enter sau butonul de send), textul TASTAT e trimis serverului HUD local
  // (/canon_select ruleaza vigilia_router.pick_reflexes + pick_norme — ACELASI selector ca la Claude),
  // iar blocul [CANON RENDA] se adauga la FINALUL mesajului inainte de trimitere. Fail-open: server
  // oprit / timeout -> mesajul pleaca NEatins. Butonul ⚖ Canon = suprimare (teste A/B).
  // v3.4: trei stari — 'full' | 'compact' | 'off' (migrare din vechiul true/false)
  function getCanonMode() {
    try {
      const v = localStorage.getItem(CANON_KEY);
      if (v === 'full' || v === 'compact' || v === 'off') return v;
      if (v === 'false') return 'off';
      return 'full';
    } catch (_) { return 'full'; }
  }
  function setCanonMode(m) { try { localStorage.setItem(CANON_KEY, m); } catch (_) {} }
  function getCanonOn() { return getCanonMode() !== 'off'; }

  function setCanonLine(hud, text, ok) {
    const n = hud.querySelector('[data-rv-canon]');
    if (n) { n.textContent = text; n.style.color = ok ? '' : '#e0b24c'; }
  }

  function gmCanonSelect(text, cb) {
    const gm = (typeof GM_xmlhttpRequest === 'function') ? GM_xmlhttpRequest
      : (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') ? GM.xmlHttpRequest : null;
    if (!gm) return cb(null);
    gm({
      method: 'GET',
      url: CONFIG.canonUrl + '?q=' + encodeURIComponent(String(text).slice(0, 2000)),
      timeout: 900,
      onload: (res) => { try { const d = JSON.parse(res.responseText); cb(d && d.ok ? d : null); } catch (_) { cb(null); } },
      onerror: () => cb(null),
      ontimeout: () => cb(null)
    });
  }

  function buildCanonBlock(d, mode) {
    const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
    if (mode === 'compact') {
      // o linie discreta, doar coduri — canonul complet il cara skill-ul renda-canon-memory (references);
      // modelul rezolva codurile de acolo. DIR:n = cate directive active insotesc cererea (textul lor integral
      // e prea lung pt modul compact -> intra DOAR daca exista, prescurtat la 200 char total).
      const r = (d.reflexe || []).map((x) => x.code).join('·');
      const n = (d.norme || []).map((x) => x.id).join('·');
      let line = '\n\n' + CANON_MARK + ' ' + r + ' + ' + n + ' — aplică reflexele și normele cu aceste coduri din canonul RENDA; R01 prevalează]';
      (d.directive || []).forEach((dd) => { line += '\n[DIRECTIVĂ ' + dd.key + ': ' + cut(dd.text, 200) + ']'; });
      return line;
    }
    const lines = ['', '', CANON_MARK + ' · reflexe+norme selectate pentru această cerere — aplică-le ca proces și lentilă; la conflict R01 ZERO INVENȚIE prevalează]'];
    (d.reflexe || []).forEach((r) => {
      lines.push('REFLEX ' + r.code + ' ' + cut(r.axis, 60) + ' | DPI: ' + cut(r.dpi, 150) + ' | DNI: ' + cut(r.dni, 150));
    });
    (d.norme || []).forEach((n) => {
      lines.push('NORMA [' + n.id + '] ' + cut(n.name, 70) + ' — ' + cut(n.formula, 170) + ' (' + (n.why === 'zi' ? 'rotație/zi' : 'potrivire') + ')');
    });
    (d.directive || []).forEach((dd) => {
      lines.push('DIRECTIVĂ [' + dd.key + ']: ' + cut(dd.text, 400));
    });
    return lines.join('\n');
  }

  function canonSummary(d) {
    const r = (d.reflexe || []).map((x) => x.code).join('·');
    const n = (d.norme || []).map((x) => x.id).join('·');
    const dir = (d.directive || []).length ? ' + DIR:' + d.directive.length : '';
    const mode = getCanonMode() === 'compact' ? ' (compact)' : '';
    return 'canon: ' + r + ' + ' + n + dir + mode;
  }

  function moveCursorToEnd(ed) {
    try {
      const range = document.createRange();
      range.selectNodeContents(ed);
      range.collapse(false);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function findSendButton() {
    return document.querySelector('button[data-testid="send-button"]')
        || document.querySelector('#composer-submit-button')
        || document.querySelector('button[aria-label*="Send" i], button[aria-label*="Trimite" i]');
  }

  let canonBusy = false;    // injectia e in curs (asteptam serverul)
  let canonBypass = false;  // urmatoarea trimitere trece NEinterceptata (re-dispatch programatic / fail-open)
  let canonBusyWatchdog = 0;
  // v3.3.1: PREFETCH-ON-INPUT — selectia se ia DIN TIMP (cat userul tasteaza), ca la Enter sa fie
  // cache-hit SINCRON (fara gaura asincrona in care tab-ul de fundal throttle-uieste callback-ul GM).
  const canonCache = {key: '', data: null, ts: 0};

  function cacheKey(text) { return text.length + ':' + text.slice(0, 48) + ':' + text.slice(-24); }

  function prefetchCanon() {
    if (!getCanonOn()) return;
    const ed = findComposer();
    if (!ed) return;
    const text = (ed.textContent || '').trim();
    if (!text || text.includes(CANON_MARK)) return;
    const k = cacheKey(text);
    if (canonCache.key === k && canonCache.data && Date.now() - canonCache.ts < 20000) return;
    gmCanonSelect(text, (d) => {
      if (d) { canonCache.key = k; canonCache.data = d; canonCache.ts = Date.now(); }
    });
  }

  function wireCanonIntercept(hud) {
    function proceedSend(ed) {
      canonBypass = true;
      // sincronizarea ProseMirror/React: input-event + un tick INAINTE de click pe send —
      // click-ul in acelasi tick cu execCommand risca sa trimita starea VECHE (cursa reala, prinsa la test)
      try { ed.dispatchEvent(new InputEvent('input', {bubbles: true})); } catch (_) {}
      setTimeout(() => {
        const btn = findSendButton();
        if (btn) { btn.click(); return; }
        try {
          ed.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true}));
        } catch (_) { canonBypass = false; }
      }, 140);
    }
    function injectAndSend(hud2, d, expectText) {
      const ed = findComposer();                           // RE-gaseste composer-ul (SPA-ul il poate inlocui)
      if (!ed) { setCanonLine(hud2, 'canon: composer disparut — netrimis', false); return; }
      const now = (ed.textContent || '').trim();
      if (!now || now.includes(CANON_MARK)) { setCanonLine(hud2, 'canon: stare schimbata — netrimis', false); return; }
      if (expectText && now !== expectText) { setCanonLine(hud2, 'canon: text schimbat intre timp — reia Enter', false); return; }
      ed.focus();
      moveCursorToEnd(ed);
      let injected = false;
      try { injected = document.execCommand('insertText', false, buildCanonBlock(d, getCanonMode())); } catch (_) {}
      setCanonLine(hud2, injected ? canonSummary(d) : 'canon: injectie esuata — trimis LIBER', !!injected);
      proceedSend(ed);
    }
    function handleAttempt(e) {
      if (canonBypass) { canonBypass = false; return; }   // trimiterea noastra programatica / fail-open
      if (!getCanonOn() || canonBusy) return;
      const ed = findComposer();
      if (!ed) return;
      const text = (ed.textContent || '').trim();
      if (!text) return;
      if (text.includes(CANON_MARK)) return;               // deja injectat in acest mesaj
      e.preventDefault();
      e.stopImmediatePropagation();
      // CACHE-HIT (calea normala, sincrona): selectia e deja luata in timpul tastarii
      if (canonCache.data && canonCache.key === cacheKey(text) && Date.now() - canonCache.ts < 20000) {
        injectAndSend(hud, canonCache.data, text);
        return;
      }
      canonBusy = true;
      clearTimeout(canonBusyWatchdog);
      canonBusyWatchdog = setTimeout(() => { canonBusy = false; }, 2500);   // anti-blocaj: callback pierdut != garda blocata
      gmCanonSelect(text, (d) => {
        canonBusy = false;
        clearTimeout(canonBusyWatchdog);
        if (!d) {                                          // fail-open: pleaca neatins + badge onest
          setCanonLine(hud, 'canon: HUD offline — mesaj trimis LIBER', false);
          proceedSend(findComposer() || ed);
          return;
        }
        injectAndSend(hud, d, text);
      });
    }
    // v3.3.1: prefetch pe tastare (debounce) — la Enter selectia e deja in cache (cale sincrona)
    let ppDeb = 0;
    document.addEventListener('input', (e) => {
      const ed = findComposer();
      if (!ed || !e.target || (e.target !== ed && !(ed.contains && ed.contains(e.target)))) return;
      clearTimeout(ppDeb);
      ppDeb = setTimeout(prefetchCanon, 500);
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      const ed = findComposer();
      if (!ed) return;
      const a = document.activeElement;
      if (a !== ed && !(ed.contains && ed.contains(a))) return;
      handleAttempt(e);
    }, true);
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const btn = t.closest('button[data-testid="send-button"], #composer-submit-button');
      if (!btn) return;
      handleAttempt(e);
    }, true);
  }

  // v3_cl: monitor CPU/RAM live din serverul HUD local (/sysmon). GM_xmlhttpRequest ocolește CORS
  // (serverul HUD nu trimite Access-Control-* și rămâne neatins); @connect limitează la 127.0.0.1.
  // Trafic: DOAR GET pe mașina proprie; nimic din pagină nu pleacă nicăieri.
  function startSysmon(hud) {
    const gm = (typeof GM_xmlhttpRequest === 'function') ? GM_xmlhttpRequest
      : (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') ? GM.xmlHttpRequest : null;
    const hudNode = hud.querySelector('[data-rv-hud]');
    const cpuNode = hud.querySelector('[data-rv-cpu]');
    const ramNode = hud.querySelector('[data-rv-ram]');
    const hudBar = hud.querySelector('[data-rv-hud-bar]');
    const cpuBar = hud.querySelector('[data-rv-cpu-bar]');
    const ramBar = hud.querySelector('[data-rv-ram-bar]');
    if (!gm) { if (hudNode) hudNode.textContent = 'fără GM'; return; }
    const color = (p) => p >= 85 ? '#e06c6c' : (p >= 65 ? '#e0b24c' : '#378ADD');
    function setOffline() {
      if (hudNode) { hudNode.textContent = 'OFFLINE'; hudNode.classList.remove('online'); }
      if (hudBar) { hudBar.style.width = '100%'; hudBar.style.background = '#5a1d1d'; }
      if (cpuNode) cpuNode.textContent = '—';
      if (ramNode) ramNode.textContent = '—';
      if (cpuBar) cpuBar.style.width = '0%';
      if (ramBar) ramBar.style.width = '0%';
    }
    function tick() {
      if (document.hidden) return;
      gm({
        method: 'GET',
        url: CONFIG.sysmonUrl,
        timeout: 1500,
        onload: (res) => {
          try {
            const d = JSON.parse(res.responseText);
            if (!d) return setOffline();
            if (!d.ok) {
              // serverul HUD e VIU dar samplerul CPU/RAM nu are date (ex. copil sysmon oprit) —
              // stare reala distincta de "server oprit" (onest, nu OFFLINE fals)
              if (hudNode) { hudNode.textContent = 'LIVE'; hudNode.classList.add('online'); }
              if (hudBar) { hudBar.style.width = '100%'; hudBar.style.background = '#1D9E75'; }
              if (cpuNode) cpuNode.textContent = '—';
              if (ramNode) ramNode.textContent = '—';
              if (cpuBar) cpuBar.style.width = '0%';
              if (ramBar) ramBar.style.width = '0%';
              return;
            }
            const cpu = Math.round(d.cpu || 0);
            const ram = Math.round(d.ram_pct || 0);
            const rcpu = Math.round(d.renda_cpu || 0);
            const rram = d.renda_ram_gb || 0;
            if (hudNode) { hudNode.textContent = 'LIVE'; hudNode.classList.add('online'); }
            if (hudBar) { hudBar.style.width = '100%'; hudBar.style.background = '#1D9E75'; }
            if (cpuNode) cpuNode.textContent = cpu + '% · R ' + rcpu + '%';
            if (ramNode) ramNode.textContent = ram + '% · R ' + rram + 'G';
            if (cpuBar) { cpuBar.style.width = cpu + '%'; cpuBar.style.background = color(cpu); }
            if (ramBar) { ramBar.style.width = ram + '%'; ramBar.style.background = color(ram); }
          } catch (_) { setOffline(); }
        },
        onerror: setOffline,
        ontimeout: setOffline
      });
    }
    tick();
    setInterval(tick, CONFIG.sysmonIntervalMs);
  }

  function startField(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 1;
    let height = 1;
    let frame = 0;
    let nodes = [];
    let last = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['55,138,221', '127,119,221', '120,190,235'];

    function resetNodes() {
      const count = Math.max(24, Math.min(52, Math.round(width / 36)));
      nodes = Array.from({length: count}, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .045,
        vy: (Math.random() - .5) * .028,
        r: .7 + Math.random() * 1.35,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length]
      }));
    }

    function resize() {
      cancelAnimationFrame(frame);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetNodes();
      draw(performance.now(), true);
    }

    function draw(now, forced = false) {
      if (!forced && now - last < 32) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const delta = last ? Math.min(50, now - last) : 16;
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reduced) {
          a.x += a.vx * delta;
          a.y += a.vy * delta;
          if (a.x < -8) a.x = width + 8;
          if (a.x > width + 8) a.x = -8;
          if (a.y < -8) a.y = height + 8;
          if (a.y > height + 8) a.y = -8;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 105) {
            ctx.strokeStyle = `rgba(110,150,210,${((1 - distance / 105) * .14).toFixed(3)})`;
            ctx.lineWidth = .55;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const glow = .38 + .28 * Math.sin(now / 820 + a.phase);
        const gradient = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.r * 4.5);
        gradient.addColorStop(0, `rgba(${a.color},${Math.max(.2, glow).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${a.color},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${a.color},${Math.min(1, glow * 1.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced && !document.hidden) frame = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(draw);
    });
  }

  function mount() {
    if (!document.head || !document.body) return;
    document.documentElement.classList.add('renda-vigilia-theme');
    addStyle();
    findAndMarkRoot();
    const hud = createHud();

    let collapsed = false;
    try { collapsed = localStorage.getItem(STORAGE_KEY) === 'true'; } catch (_) {}
    setCollapsed(hud, collapsed);

    hud.querySelector('.rv-collapse')?.addEventListener('click', () => {
      const next = document.documentElement.dataset.rvCollapsed !== 'true';
      setCollapsed(hud, next);
    });

    updateState(hud);
    setInterval(() => updateState(hud), 1000);
    addEventListener('online', () => updateState(hud));
    addEventListener('offline', () => updateState(hud));
    addEventListener('popstate', () => updateState(hud));
    startField(hud.querySelector('.rv-field'));
    startSysmon(hud);

    // v3.2: panou prompt perpetuu + sabloane
    const panel = buildPanel(hud);
    hud.querySelector('.rv-pp-btn')?.addEventListener('click', () => panel.classList.toggle('open'));
    setInterval(autoInsertPerpetual, 1200);

    // v3.4: CANON per-tura — buton ⚖ ciclic FULL -> COMPACT -> OFF (persistat) + interceptarea trimiterii
    const canonBtn = hud.querySelector('.rv-canon-btn');
    function refreshCanonBtn() {
      const m = getCanonMode();
      if (canonBtn) {
        canonBtn.classList.toggle('on', m !== 'off');
        canonBtn.classList.toggle('compact', m === 'compact');
        canonBtn.textContent = m === 'compact' ? '⚖ Canon·c' : '⚖ Canon';
      }
      setCanonLine(hud,
        m === 'off' ? 'canon: OFF — comportament liber'
          : m === 'compact' ? 'canon: COMPACT — doar codurile (canonul complet = skill-ul renda-canon-memory)'
          : 'canon: ON — se selectează la trimitere', true);
    }
    canonBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = {full: 'compact', compact: 'off', off: 'full'}[getCanonMode()] || 'full';
      setCanonMode(next);
      refreshCanonBtn();
    });
    refreshCanonBtn();
    wireCanonIntercept(hud);

    const bodyObserver = new MutationObserver(() => {
      findAndMarkRoot();
      updateState(hud);
    });
    bodyObserver.observe(document.body, {childList: true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
})();

