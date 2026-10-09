import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SECURITY,
  escapeWifiField,
  validateNetwork,
  buildWifiString,
  buildConnectUrl,
  parseConnectHash,
  buildWscPayload,
} from "../js/wifi.js";

test("escapa caracteres especiales del estándar WIFI", () => {
  assert.equal(escapeWifiField('a;b,c:d"e\\f'), 'a\\;b\\,c\\:d\\"e\\\\f');
});

test("buildWifiString para WPA", () => {
  const out = buildWifiString({ ssid: "Casa;1", security: SECURITY.WPA, password: "pa:ss1234" });
  assert.equal(out, "WIFI:T:WPA;S:Casa\\;1;P:pa\\:ss1234;;");
});

test("buildWifiString abierta omite clave y soporta oculta", () => {
  const out = buildWifiString({ ssid: "Libre", security: SECURITY.NONE, password: "x", hidden: true });
  assert.equal(out, "WIFI:T:nopass;S:Libre;H:true;;");
});

test("validación: SSID vacío, largo y clave corta", () => {
  assert.equal(validateNetwork({ ssid: "", security: SECURITY.NONE }).length, 1);
  assert.equal(validateNetwork({ ssid: "a".repeat(33), security: SECURITY.NONE }).length, 1);
  assert.equal(validateNetwork({ ssid: "ok", security: SECURITY.WPA, password: "short" }).length, 1);
  assert.equal(validateNetwork({ ssid: "ok", security: SECURITY.WPA, password: "" }).length, 1);
  assert.deepEqual(validateNetwork({ ssid: "ok", security: SECURITY.WPA, password: "12345678" }), []);
});

test("validación: SSID se mide en bytes, no caracteres", () => {
  assert.equal(validateNetwork({ ssid: "ñ".repeat(17), security: SECURITY.NONE }).length, 1);
});

test("validación: PSK hexadecimal de 64 caracteres es válida", () => {
  assert.deepEqual(validateNetwork({ ssid: "ok", security: SECURITY.WPA, password: "a".repeat(64) }), []);
});

test("validación: cifrado desconocido", () => {
  assert.equal(validateNetwork({ ssid: "ok", security: "X" }).length, 1);
});

test("URL de conexión hace ida y vuelta con caracteres especiales", () => {
  const network = { ssid: "Café & Co #1", security: SECURITY.WPA, password: "p@ss;wörd=1&2", hidden: true };
  const url = new URL(buildConnectUrl("https://wifi.example.com/app/", network));
  assert.equal(url.pathname, "/app/connect.html");
  assert.equal(url.search, "");
  assert.deepEqual(parseConnectHash(url.hash), { network });
});

test("parseConnectHash rechaza datos inválidos", () => {
  assert.ok(parseConnectHash("#t=WPA").error);
  assert.ok(parseConnectHash("").error);
});

test("payload WSC contiene credencial con TLVs esperados", () => {
  const bytes = buildWscPayload({ ssid: "Casa", security: SECURITY.WPA, password: "12345678" });
  assert.deepEqual([...bytes.slice(0, 2)], [0x10, 0x0e]);
  assert.equal((bytes[2] << 8) | bytes[3], bytes.length - 4);
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.includes("Casa") && text.includes("12345678"));
});
