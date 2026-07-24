// Service worker de fundal — model HIBRID de injectare:
//
//   BAZA GARANTATA  = content_scripts din manifest (fisierul CHATGPT_RENDA_HUD.user.js,
//                     acelasi cod, incarcat de browser fara NICIO setare). Merge pe Chrome
//                     si pe Edge, la instalare curata. Aici nu e nevoie de service worker.
//   STRAT OPTIONAL  = chrome.userScripts, folosit EXCLUSIV pentru auto-update de pe GitHub.
//                     Cere comutatorul "Allow user scripts" pe cardul extensiei (Chrome/Edge
//                     138+). Daca lipseste, HUD-ul ruleaza oricum din pachet — se pierde doar
//                     actualizarea automata, nu functionarea.
//
// 1. PROXY LOCALHOST: GET-uri catre serverul HUD local (127.0.0.1:8765). Nici lumea izolata a
//    unui content script, nici lumea USER_SCRIPT nu pot atinge serverul local direct (CORS);
//    fetch-ul de aici, cu host_permissions, poate. Mesajele sosesc pe onMessage (content
//    script) sau onUserScriptMessage (USER_SCRIPT) — ascultam pe ambele.
//
// 2. AUTO-UPDATE: codul HUD actualizat de pe GitHub e pastrat in chrome.storage si injectat
//    prin chrome.userScripts. ANTI-DUBLA-INJECTARE: cand pachetul are content_scripts (cazul
//    normal), inregistram userScript-ul DOAR daca in storage exista o versiune STRICT MAI NOUA
//    decat samanta din pachet — altfel baza deja ruleaza exact acelasi cod, iar o inregistrare
//    in plus ar insemna doua injectari. La 1 minut: self-heal; GitHub cel mult o data la 10 min,
//    doar versiuni MAI NOI (fara downgrade).
//
// DIAGNOSTIC in codul injectat prin userScripts (wrap): prima linie logheaza injectarea INAINTE
// de orice cod HUD, iar un try/catch prinde si afiseaza orice crash la pornire.

// Adrese pe care puntea are voie sa le ceara. 127.0.0.1:8765 = serverul HUD local.
// renda.holdings adaugat 2026-07-24: pe ruta content_scripts, extRuntimeOk() e true, deci
// apiFetch alege PUNTEA si nu mai ajunge la fetch-ul direct; fara adresa aici, cererile
// spre API-ul RENDA erau respinse cu 'blocked' si functia murea TACUT (prins de auditul
// adversarial). Service worker-ul are host_permissions, deci ocoleste CORS-ul paginii.
const ALLOWED = /^(http:\/\/(127\.0\.0\.1|localhost):8765\/|https:\/\/renda\.holdings\/)/;
const RAW_URL = 'https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js';
// Acelasi fisier e si samanta stratului de auto-update si baza din content_scripts ⇒ versiunea
// bazei == versiunea samantei prin constructie (nu poate aparea decalaj intre ele).
const SEED_FILE = 'CHATGPT_RENDA_HUD.user.js';
const SCRIPT_ID = 'renda-vigilia-hud';
const OLD_IDS = ['renda-vigilia-hud-overlay', 'renda-canary', 'test-us', 'test-main'];
const MATCHES = ['https://chatgpt.com/*', 'https://chat.openai.com/*'];
const ALARM = 'renda-hud-tick';
const TICK_MIN = 1;                 // self-heal inregistrare la 1 min
const GITHUB_EVERY_MS = 10 * 60000; // GitHub cel mult o data la 10 min

// baza garantata: pachetul propriu declara content_scripts?
function hasContentScripts() {
  try {
    const m = chrome.runtime.getManifest();
    return !!(m && Array.isArray(m.content_scripts) && m.content_scripts.length);
  } catch (e) { return false; }
}
const BASE_OK = hasContentScripts();

// ---------- 1. proxy localhost ----------
function onHudMsg(msg, sender, sendResponse) {
  if (!msg || msg.type !== 'hud_fetch' || !ALLOWED.test(String(msg.url || ''))) {
    sendResponse({ ok: false, error: 'blocked' });
    return false;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), msg.timeout || 1500);
  fetch(msg.url, { method: 'GET', signal: ctl.signal, cache: 'no-store' })
    .then((res) => res.text().then((text) => {
      clearTimeout(timer);
      sendResponse({ ok: true, status: res.status, text });
    }))
    .catch((err) => {
      clearTimeout(timer);
      sendResponse({ ok: false, timeout: err && err.name === 'AbortError' });
    });
  return true; // raspuns asincron
}
chrome.runtime.onMessage.addListener(onHudMsg);
if (chrome.runtime.onUserScriptMessage) chrome.runtime.onUserScriptMessage.addListener(onHudMsg);

// ---------- 2. auto-update (strat optional) ----------
function ts() { return new Date().toLocaleTimeString('ro-RO'); }
function log(m) { console.log('[RENDA HUD ' + ts() + '] ' + m); }

function parseVer(src) { const m = src && src.match(/\/\/\s*@version\s+(\S+)/); return m ? m[1] : null; }
function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const x = pa[i] || 0, y = pb[i] || 0; if (x !== y) return x > y; }
  return false;
}
function wrap(code, ver) {
  return 'console.log("%c[RENDA HUD]","color:#378ADD;font-weight:600","injectat prin userScripts (auto-update), v' + String(ver) + ', pe", location.pathname);\n'
    + 'var __RENDA_VER__=' + JSON.stringify(String(ver)) + ';\n'
    + 'try {\n' + code + '\n} catch (e) { console.error("[RENDA HUD] CRASH la pornire:", e && e.message, "\\n", e && e.stack); }';
}

async function registerCode(code, ver) {
  await chrome.userScripts.configureWorld({ messaging: true });
  const def = { id: SCRIPT_ID, matches: MATCHES, js: [{ code: wrap(code, ver) }], runAt: 'document_idle', world: 'USER_SCRIPT' };
  const existing = await chrome.userScripts.getScripts({ ids: [SCRIPT_ID] });
  if (existing.length) { await chrome.userScripts.update([def]); log('userScript actualizat in registru, v' + ver); return; }
  try {
    await chrome.userScripts.register([def]);
    log('userScript INREGISTRAT, v' + ver + ' — deschide/refresh chatgpt.com');
  } catch (e) {
    if (e && /Duplicate script ID/i.test(e.message || '')) { await chrome.userScripts.update([def]); log('userScript deja inregistrat (cursa) — actualizat, v' + ver); }
    else throw e;
  }
}

// Scoate din registru o inregistrare devenita inutila (ex. pachetul de pe disc a ajuns la
// versiunea care fusese luata de pe GitHub) — altfel baza + userScript = doua injectari.
async function unregisterStale() {
  try {
    const existing = await chrome.userScripts.getScripts({ ids: [SCRIPT_ID] });
    if (existing.length) {
      await chrome.userScripts.unregister({ ids: [SCRIPT_ID] });
      log('userScript scos din registru — baza din pachet (content_scripts) acopera aceeasi versiune');
    }
  } catch (e) { log('unregister: ' + (e && e.message)); }
  registered = false;
}

let registered = false;      // exista un userScript al nostru inregistrat
let settled = false;         // stare stabila atinsa in viata acestui service worker
let ensureInFlight = null;   // anti-cursa: o singura evaluare in zbor
let warnedNoApi = false;
let seedCache = null;        // {code, ver} — fisierul din pachet, citit o data

async function readSeed() {
  if (seedCache) return seedCache;
  const code = await (await fetch(chrome.runtime.getURL(SEED_FILE))).text();
  seedCache = { code: code, ver: parseVer(code) || '0.0.0' };
  return seedCache;
}

function ensureRegistered() {
  if (settled) return Promise.resolve(true);
  if (!ensureInFlight) ensureInFlight = doEnsureRegistered().finally(() => { ensureInFlight = null; });
  return ensureInFlight;
}
async function doEnsureRegistered() {
  if (settled) return true;
  if (!chrome.userScripts) {
    if (!warnedNoApi) {
      warnedNoApi = true;
      log(BASE_OK
        ? 'userScripts indisponibil — auto-update in browser INACTIV. HUD-ul ruleaza din pachet (content_scripts), nu e nevoie de nicio setare de browser. OPTIONAL: comutatorul "Allow user scripts" pe cardul extensiei (Chrome/Edge 138+) porneste actualizarea automata de pe GitHub.'
        : 'userScripts indisponibil SI pachetul nu are content_scripts — HUD-ul nu se incarca. Activeaza "Allow user scripts" pe cardul extensiei (Chrome/Edge 138+) sau reinstaleaza un pachet complet.');
    }
    return false;
  }
  try {
    const seed = await readSeed();
    const st = await chrome.storage.local.get(['rv_code', 'rv_ver']);
    let code = st.rv_code, ver = st.rv_ver || '0.0.0';
    // anti-downgrade: samanta din pachet CASTIGA daca e mai noua decat ce e in storage
    // (ex. dupa actualizarea pachetului pe disc, storage-ul poate tine o versiune veche)
    if (!code || isNewer(seed.ver, ver)) {
      code = seed.code; ver = seed.ver;
      await chrome.storage.local.set({ rv_code: code, rv_ver: ver });
      log('samanta din pachet: v' + ver);
    }

    // BAZA acopera cazul normal: injectam prin userScripts DOAR ce e strict mai nou decat ea.
    if (BASE_OK && !isNewer(ver, seed.ver)) {
      await unregisterStale();
      log('baza garantata activa: HUD v' + seed.ver + ' din pachet (content_scripts); userScripts = doar auto-update');
      settled = true;
      return true;
    }

    await registerCode(code, ver);
    registered = true;
    settled = true;
    return true;
  } catch (e) {
    log('evaluare inregistrare ESUATA: ' + (e && e.message));
    return false;
  }
}

let lastGithub = 0;
let infoNoUpdate = false;
async function checkGithub() {
  if (!chrome.userScripts) {
    if (!infoNoUpdate) { infoNoUpdate = true; log('auto-update de pe GitHub inactiv (userScripts indisponibil) — HUD-ul ruleaza din pachet; actualizarea se face reinstalind pachetul.'); }
    return;
  }
  if (Date.now() - lastGithub < GITHUB_EVERY_MS) return;
  lastGithub = Date.now();
  try {
    const res = await fetch(RAW_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('GitHub HTTP ' + res.status);
    const code = await res.text();
    const ver = parseVer(code);
    if (!ver) throw new Error('@version negasit');
    if (!/function extHudRequest/.test(code)) throw new Error('userscript fara puntea de extensie — ignorat');
    const st = await chrome.storage.local.get('rv_ver');
    const cur = st.rv_ver || '0.0.0';
    if (!isNewer(ver, cur)) return;
    await chrome.storage.local.set({ rv_code: code, rv_ver: ver, rv_when: new Date().toISOString() });
    await registerCode(code, ver);
    registered = true;
    settled = true;
    log('ACTUALIZAT ' + cur + ' -> ' + ver + ' (activ la urmatorul refresh)');
  } catch (e) { log('self-update: ' + (e && e.message)); }
}

function ensureAlarm() { chrome.alarms.get(ALARM, (a) => { if (!a) chrome.alarms.create(ALARM, { periodInMinutes: TICK_MIN }); }); }
async function tick() { const ok = await ensureRegistered(); if (ok) checkGithub(); }

chrome.runtime.onInstalled.addListener(() => {
  settled = false; seedCache = null;   // pachet nou pe disc → re-evalueaza baza vs storage
  ensureAlarm();
  if (chrome.userScripts) chrome.userScripts.unregister({ ids: OLD_IDS }).catch(() => {});
  tick();
});
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); tick(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) tick(); });
ensureAlarm();
tick();
