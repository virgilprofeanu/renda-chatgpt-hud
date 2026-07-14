// Service worker de fundal — injectare EXCLUSIV prin chrome.userScripts (fara content_scripts).
//
// 1. PROXY LOCALHOST: GET-uri catre serverul HUD local (127.0.0.1:8765). Lumea USER_SCRIPT
//    nu poate atinge serverul local direct (CORS); fetch-ul de aici, cu host_permissions,
//    poate. Mesajele din USER_SCRIPT sosesc pe onUserScriptMessage — ascultam pe ambele.
//
// 2. INJECTARE + AUTO-UPDATE: codul HUD e inregistrat dintr-un string (chrome.storage; la
//    prima rulare, samanta = fisierul din pachet). La 1 minut: self-heal inregistrare (daca
//    comutatorul "Allow user scripts" era oprit la pornire, ne revenim singuri cand e pornit);
//    GitHub e verificat cel mult o data la 10 minute, doar versiuni MAI NOI (fara downgrade).
//
// DIAGNOSTIC in codul injectat (wrap): prima linie logheaza injectarea INAINTE de orice cod
// HUD, iar un try/catch prinde si afiseaza orice crash la pornire. NECESITA: Chrome 120+ si
// comutatorul "Allow user scripts" pe cardul extensiei (Chrome 138+) — fara el HUD-ul NU se
// incarca deloc (nu mai exista plasa de siguranta content_scripts, la cererea autorului).

const ALLOWED = /^http:\/\/(127\.0\.0\.1|localhost):8765\//;
const RAW_URL = 'https://raw.githubusercontent.com/virgilprofeanu/renda-chatgpt-hud/main/CHATGPT_RENDA_HUD.user.js';
const SEED_FILE = 'CHATGPT_RENDA_HUD.user.js';
const SCRIPT_ID = 'renda-vigilia-hud';
const OLD_IDS = ['renda-vigilia-hud-overlay', 'renda-canary', 'test-us', 'test-main'];
const MATCHES = ['https://chatgpt.com/*', 'https://chat.openai.com/*'];
const ALARM = 'renda-hud-tick';
const TICK_MIN = 1;                 // self-heal inregistrare la 1 min
const GITHUB_EVERY_MS = 10 * 60000; // GitHub cel mult o data la 10 min

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

// ---------- 2. injectare + auto-update ----------
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
  return 'console.log("%c[RENDA HUD]","color:#378ADD;font-weight:600","injectat prin userScripts, v' + String(ver) + ', pe", location.pathname);\n'
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

let registered = false;
let ensureInFlight = null;   // anti-cursa: o singura inregistrare in zbor
let warnedNoApi = false;
function ensureRegistered() {
  if (registered) return Promise.resolve(true);
  if (!ensureInFlight) ensureInFlight = doEnsureRegistered().finally(() => { ensureInFlight = null; });
  return ensureInFlight;
}
async function doEnsureRegistered() {
  if (registered) return true;
  if (!chrome.userScripts) {
    if (!warnedNoApi) { warnedNoApi = true; log('userScripts INDISPONIBIL — activeaza "Allow user scripts" pe cardul extensiei (Chrome 138+). Reincerc automat la 1 minut; FARA el HUD-ul nu se incarca.'); }
    return false;
  }
  try {
    const st = await chrome.storage.local.get(['rv_code', 'rv_ver']);
    let code = st.rv_code, ver = st.rv_ver;
    // samanta din pachet CASTIGA daca e mai noua decat ce e in storage (ex. dupa
    // actualizarea pachetului pe disc, storage-ul poate tine o versiune veche)
    const seedSrc = await (await fetch(chrome.runtime.getURL(SEED_FILE))).text();
    const seedVer = parseVer(seedSrc) || '0.0.0';
    if (!code || isNewer(seedVer, ver || '0.0.0')) {
      code = seedSrc; ver = seedVer;
      await chrome.storage.local.set({ rv_code: code, rv_ver: ver });
      log('samanta din pachet: v' + ver);
    }
    await registerCode(code, ver);
    registered = true;
    return true;
  } catch (e) {
    log('register ESUAT: ' + (e && e.message));
    return false;
  }
}

let lastGithub = 0;
async function checkGithub() {
  if (!chrome.userScripts) return;
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
    log('ACTUALIZAT ' + cur + ' -> ' + ver + ' (activ la urmatorul refresh)');
  } catch (e) { log('self-update: ' + (e && e.message)); }
}

function ensureAlarm() { chrome.alarms.get(ALARM, (a) => { if (!a) chrome.alarms.create(ALARM, { periodInMinutes: TICK_MIN }); }); }
async function tick() { const ok = await ensureRegistered(); if (ok) checkGithub(); }

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  if (chrome.userScripts) chrome.userScripts.unregister({ ids: OLD_IDS }).catch(() => {});
  tick();
});
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); tick(); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) tick(); });
ensureAlarm();
tick();
