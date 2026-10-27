// Talks to Home Assistant's REST API: replaces the E-REDES integration's
// access token through its reconfigure flow. HA validates the token against
// E-Redes before saving it, so a bad token changes nothing.

export async function sendToken(haUrl, haToken, aat) {
  const base = haUrl.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${haToken}`, "Content-Type": "application/json" };
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) throw new Error(`HA ${method} ${path}: HTTP ${res.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };

  const entries = await call("GET", "/api/config/config_entries/entry?domain=eredes");
  if (!entries || entries.length === 0) throw new Error("No E-REDES integration found in Home Assistant");
  const entry = entries[0];

  // Reconfigure form, pre-filled with the stored CPE.
  const form = await call("POST", "/api/config/config_entries/flow", { handler: "eredes", entry_id: entry.entry_id });
  const cpeField = (form.data_schema || []).find((f) => f.name === "cpe");
  if (!cpeField || !cpeField.default) throw new Error("Could not read the CPE from the reconfigure form");

  const result = await call("POST", `/api/config/config_entries/flow/${form.flow_id}`, {
    access_token: aat,
    cpe: cpeField.default,
  });
  if (result.type === "abort" && result.reason === "reconfigure_successful") return { ok: true, title: entry.title };
  // Still a form → HA rejected the token; close the flow so nothing is left open.
  if (result.flow_id && result.type === "form") {
    await fetch(`${base}/api/config/config_entries/flow/${result.flow_id}`, { method: "DELETE", headers }).catch(() => {});
  }
  const why = result.errors ? JSON.stringify(result.errors) : result.reason || result.type;
  return { ok: false, error: `Home Assistant did not accept the token: ${why}` };
}

// When the aat (a JWT) expires, from its `exp` claim; null if unreadable.
// Not verified — only used to tell the user when Home Assistant will stop
// being able to fetch data.
export function tokenExpiry(aat) {
  try {
    const part = aat.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=")));
    return Number.isFinite(exp) ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}
