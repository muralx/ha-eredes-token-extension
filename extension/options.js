const $ = (id) => document.getElementById(id);

async function load() {
  const { haUrl, haToken, lastResult } = await chrome.storage.local.get(["haUrl", "haToken", "lastResult"]);
  $("url").value = haUrl || "http://homeassistant.local:8123";
  $("token").value = haToken || "";
  $("status").textContent = lastResult ? `Last result: ${lastResult}` : "";
}

$("save").onclick = async () => {
  const haUrl = $("url").value.trim().replace(/\/+$/, "");
  let origin;
  try {
    origin = new URL(haUrl).origin;
  } catch {
    $("status").textContent = "That is not a valid address (example: http://homeassistant.local:8123).";
    return;
  }
  // Chrome only lets the extension reach the Home Assistant address you enter.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) {
    $("status").textContent = `Permission to reach ${origin} was not granted; nothing saved.`;
    return;
  }
  await chrome.storage.local.set({ haUrl, haToken: $("token").value.trim() });
  $("status").textContent = "Saved.";
};

$("send").onclick = async () => {
  $("status").textContent = "Sending…";
  await chrome.runtime.sendMessage("send-now");
  load();
};

load();
