import { sendToken, tokenExpiry } from "./ha.js";

const PORTAL = "https://balcaodigital.e-redes.pt/";
const COOKIE = "aat";

async function settings() {
  const { haUrl, haToken, lastSent } = await chrome.storage.local.get(["haUrl", "haToken", "lastSent"]);
  return { haUrl: haUrl || "http://homeassistant.local:8123", haToken, lastSent };
}

function notify(title, message) {
  chrome.notifications.create({ type: "basic", iconUrl: "icon.png", title, message });
}

// Desktop notifications can be blocked, so the toolbar icon always shows the
// outcome too: OK (green), EXP (orange, token since expired), ERR (red),
// ... (sending). Hover it for the details.
function badge(text, color, detail) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setTitle({ title: detail || "Send E-Redes token to Home Assistant now" });
}

async function push(aat, { force = false } = {}) {
  const { haUrl, haToken, lastSent } = await settings();
  if (!haToken) {
    notify("E-Redes → HA: not configured", "Open the extension options and enter your Home Assistant token.");
    badge("SET", "#c62828", "Not configured: open the extension options");
    chrome.runtime.openOptionsPage();
    return;
  }
  if (!force && aat === lastSent) return; // already delivered this token
  badge("...", "#888888", "Sent; Home Assistant is validating the token with E-Redes (can take 1-2 minutes)…");
  try {
    const r = await sendToken(haUrl, haToken, aat);
    if (r.ok) {
      await chrome.storage.local.set({ lastSent: aat, lastResult: `OK ${new Date().toLocaleString()}` });
      notify("E-Redes token sent to Home Assistant ✓", `${r.title} updated; missing data will be backfilled.`);
      const exp = tokenExpiry(aat);
      await chrome.storage.local.set({ expiresAt: exp ? exp.getTime() : null });
      badge("OK", "#2e7d32", `Token accepted by Home Assistant (${new Date().toLocaleString()})` +
        (exp ? `; it expires at ${exp.toLocaleTimeString()}` : ""));
      if (exp) chrome.alarms.create("token-expired", { when: exp.getTime() });
    } else {
      await chrome.storage.local.set({ lastResult: `${r.error} (${new Date().toLocaleString()})` });
      notify("E-Redes → HA: token rejected", r.error);
      badge("ERR", "#c62828", r.error);
    }
  } catch (e) {
    await chrome.storage.local.set({ lastResult: `${e.message} (${new Date().toLocaleString()})` });
    notify("E-Redes → HA: failed", e.message);
    badge("ERR", "#c62828", e.message);
  }
}

// The aat cookie may be set on the portal host or on the parent domain
// (.e-redes.pt); look in both and take the newest.
async function currentToken() {
  const all = await chrome.cookies.getAll({ domain: "e-redes.pt", name: COOKIE });
  all.sort((a, b) => (b.expirationDate || 0) - (a.expirationDate || 0));
  return all.length ? all[0].value : null;
}

// A fresh login sets a new aat cookie.
chrome.cookies.onChanged.addListener(({ cookie, removed }) => {
  if (!removed && cookie.name === COOKIE && cookie.domain.endsWith("e-redes.pt") && cookie.value) push(cookie.value);
});

// Toolbar button: send whatever token Chrome holds right now.
chrome.action.onClicked.addListener(async () => {
  const aat = await currentToken();
  if (aat) push(aat, { force: true });
  else {
    await chrome.storage.local.set({ lastResult: `No aat cookie found in Chrome (${new Date().toLocaleString()})` });
    notify("E-Redes → HA: no token", "Log in to balcaodigital.e-redes.pt first, then click again.");
    badge("?", "#c62828", "No E-Redes token in Chrome: log in to balcaodigital.e-redes.pt, then click again");
    chrome.tabs.create({ url: PORTAL });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg === "send-now") currentToken().then((aat) => (aat ? push(aat, { force: true }) : null)).then(() => reply(true));
  return true;
});

// The token lives about 90 minutes; after that Home Assistant cannot fetch
// until the next login, so OK would be misleading.
function showExpired(expiresAt) {
  badge("EXP", "#ef6c00",
    `Token expired at ${new Date(expiresAt).toLocaleString()}: Home Assistant cannot fetch E-Redes data ` +
    "until you log in to balcaodigital.e-redes.pt again");
}

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name !== "token-expired") return;
  const { expiresAt } = await chrome.storage.local.get("expiresAt");
  if (expiresAt && expiresAt <= Date.now()) showExpired(expiresAt);
});

// The badge does not survive a browser restart or an extension update/reload;
// restore it from the last delivered token.
async function restoreBadge() {
  const { expiresAt, lastSent } = await chrome.storage.local.get(["expiresAt", "lastSent"]);
  const exp = expiresAt || (lastSent && tokenExpiry(lastSent)?.getTime());
  if (!exp) return;
  if (exp <= Date.now()) showExpired(exp);
  else {
    badge("OK", "#2e7d32", `Token accepted by Home Assistant; it expires at ${new Date(exp).toLocaleTimeString()}`);
    chrome.alarms.create("token-expired", { when: exp });
  }
}

chrome.runtime.onStartup.addListener(restoreBadge);
chrome.runtime.onInstalled.addListener(restoreBadge);
