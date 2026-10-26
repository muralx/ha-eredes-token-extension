// Tests for extension/ha.js against an in-memory fake of Home Assistant's REST API.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { sendToken } from "../extension/ha.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Routes "METHOD /path" to a handler returning [status, body]; records every call.
function fakeHa(routes) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const { pathname, search } = new URL(url);
    const key = `${init.method || "GET"} ${pathname}${search}`;
    calls.push({ key, headers: init.headers, body: init.body && JSON.parse(init.body) });
    const handler = routes[key];
    if (!handler) return new Response("not found", { status: 404 });
    const [status, body] = handler();
    return new Response(body === undefined ? "" : JSON.stringify(body), { status });
  };
  return calls;
}

const ENTRY = [{ entry_id: "e1", title: "E-REDES (12345678)" }];
const FORM = { type: "form", flow_id: "f1", data_schema: [{ name: "access_token" }, { name: "cpe", default: "PT0000000000000000XX" }] };

test("submits the token with the stored CPE and reports success", async () => {
  const calls = fakeHa({
    "GET /api/config/config_entries/entry?domain=eredes": () => [200, ENTRY],
    "POST /api/config/config_entries/flow": () => [200, FORM],
    "POST /api/config/config_entries/flow/f1": () => [200, { type: "abort", reason: "reconfigure_successful" }],
  });
  const result = await sendToken("http://ha.local:8123/", "secret", "aat-value");
  assert.deepEqual(result, { ok: true, title: "E-REDES (12345678)" });
  assert.deepEqual(calls[1].body, { handler: "eredes", entry_id: "e1" });
  assert.deepEqual(calls[2].body, { access_token: "aat-value", cpe: "PT0000000000000000XX" });
  assert.equal(calls[0].headers.Authorization, "Bearer secret");
});

test("a rejected token is reported and its flow closed", async () => {
  const calls = fakeHa({
    "GET /api/config/config_entries/entry?domain=eredes": () => [200, ENTRY],
    "POST /api/config/config_entries/flow": () => [200, FORM],
    "POST /api/config/config_entries/flow/f1": () => [200, { ...FORM, errors: { base: "invalid_auth" } }],
    "DELETE /api/config/config_entries/flow/f1": () => [200, { message: "ok" }],
  });
  const result = await sendToken("http://ha.local:8123", "secret", "bad");
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid_auth/);
  assert.equal(calls.at(-1).key, "DELETE /api/config/config_entries/flow/f1");
});

test("fails clearly when the E-REDES integration is not installed", async () => {
  fakeHa({ "GET /api/config/config_entries/entry?domain=eredes": () => [200, []] });
  await assert.rejects(sendToken("http://ha.local:8123", "secret", "aat"), /No E-REDES integration/);
});

test("fails clearly on an HTTP error (e.g. a wrong Home Assistant token)", async () => {
  fakeHa({ "GET /api/config/config_entries/entry?domain=eredes": () => [401, { message: "Unauthorized" }] });
  await assert.rejects(sendToken("http://ha.local:8123", "wrong", "aat"), /HTTP 401/);
});

test("fails clearly when the form has no CPE to reuse", async () => {
  fakeHa({
    "GET /api/config/config_entries/entry?domain=eredes": () => [200, ENTRY],
    "POST /api/config/config_entries/flow": () => [200, { type: "form", flow_id: "f1", data_schema: [] }],
  });
  await assert.rejects(sendToken("http://ha.local:8123", "secret", "aat"), /CPE/);
});
