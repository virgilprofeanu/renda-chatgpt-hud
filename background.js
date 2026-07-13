// Service worker de fundal — singurul rol: GET-uri către serverul HUD local (127.0.0.1:8765).
// Content script-urile MV3 sunt supuse CORS-ului paginii, deci nu pot atinge serverul local
// direct (serverul HUD nu trimite Access-Control-*); fetch-ul din service worker, acoperit de
// host_permissions, poate. Echivalentul GM_xmlhttpRequest + @connect 127.0.0.1 din userscript.
// Confidențialitate neschimbată: doar URL-urile 127.0.0.1/localhost:8765 sunt permise aici.

const ALLOWED = /^http:\/\/(127\.0\.0\.1|localhost):8765\//;

// --- AUTO-UPDATE (extensie unpacked) ---------------------------------------
// update.ps1 (Task Scheduler, la 10 min) rescrie fisierele pe disc cand apare
// o versiune noua in repo si scrie version.txt ULTIMUL. Aici, tot la 10 min,
// citim version.txt DE PE DISC (la extensiile unpacked, chrome-extension://
// se serveste direct din folder) si, daca difera de versiunea care RULEAZA,
// ne reincarcam singuri — echivalentul butonului Reload din chrome://extensions.
const UPDATE_ALARM = 'renda-hud-update-check';

function ensureUpdateAlarm() {
  chrome.alarms.get(UPDATE_ALARM, (a) => {
    if (!a) chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: 10 });
  });
}
chrome.runtime.onInstalled.addListener(ensureUpdateAlarm);
chrome.runtime.onStartup.addListener(ensureUpdateAlarm);
ensureUpdateAlarm();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== UPDATE_ALARM) return;
  fetch(chrome.runtime.getURL('version.txt'), { cache: 'no-store' })
    .then((r) => r.text())
    .then((t) => {
      const onDisk = t.trim();
      const running = chrome.runtime.getManifest().version;
      if (onDisk && onDisk !== running) chrome.runtime.reload();
    })
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
  return true; // răspuns asincron
});
