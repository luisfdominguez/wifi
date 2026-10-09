export const SECURITY = Object.freeze({
  WPA: "WPA", // WPA/WPA2/WPA3 mixto: lo que iOS/Android entienden como "WPA"
  WPA3: "SAE",
  WEP: "WEP",
  NONE: "nopass",
});

const SSID_MAX_BYTES = 32;
const WPA_PASSWORD_MIN = 8;
const WPA_PASSWORD_MAX = 63;
const WPA_HEX_PSK_LENGTH = 64;

const encoder = new TextEncoder();

export function byteLength(text) {
  return encoder.encode(text).length;
}

// El estándar WIFI: exige escapar estos caracteres con "\" para no romper el parseo.
export function escapeWifiField(value) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function validateNetwork({ ssid = "", security, password = "" }) {
  const errors = [];

  if (!Object.values(SECURITY).includes(security)) {
    errors.push("Tipo de cifrado no válido.");
    return errors;
  }
  if (ssid.length === 0) {
    errors.push("El SSID es obligatorio.");
  } else if (byteLength(ssid) > SSID_MAX_BYTES) {
    errors.push(`El SSID no puede superar ${SSID_MAX_BYTES} bytes.`);
  }

  if (security === SECURITY.NONE) return errors;

  if (password.length === 0) {
    errors.push("La clave es obligatoria para redes cifradas.");
  } else if (security !== SECURITY.WEP) {
    const isHexPsk = password.length === WPA_HEX_PSK_LENGTH && /^[0-9a-fA-F]+$/.test(password);
    const isPassphrase = password.length >= WPA_PASSWORD_MIN && password.length <= WPA_PASSWORD_MAX;
    if (!isHexPsk && !isPassphrase) {
      errors.push(`La clave WPA debe tener entre ${WPA_PASSWORD_MIN} y ${WPA_PASSWORD_MAX} caracteres.`);
    }
  }
  return errors;
}

export function buildWifiString({ ssid, security, password = "", hidden = false }) {
  const parts = [`T:${security}`, `S:${escapeWifiField(ssid)}`];
  if (security !== SECURITY.NONE) parts.push(`P:${escapeWifiField(password)}`);
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

// Los datos van en el fragmento (#): el navegador nunca lo envía al servidor.
export function buildConnectUrl(baseUrl, { ssid, security, password = "", hidden = false }) {
  const params = new URLSearchParams({ s: ssid, t: security });
  if (security !== SECURITY.NONE) params.set("p", password);
  if (hidden) params.set("h", "1");
  const url = new URL("connect.html", baseUrl);
  url.hash = params.toString();
  return url.toString();
}

export function parseConnectHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const network = {
    ssid: params.get("s") ?? "",
    security: params.get("t") ?? "",
    password: params.get("p") ?? "",
    hidden: params.get("h") === "1",
  };
  const errors = validateNetwork(network);
  return errors.length ? { error: errors[0] } : { network };
}

// --- Registro NDEF "Wi-Fi Simple Configuration" (Android conecta al tocar) ---

const WSC_AUTH_AND_ENCRYPTION = {
  [SECURITY.NONE]: { auth: 0x0001, encryption: 0x0001 },
  [SECURITY.WEP]: { auth: 0x0001, encryption: 0x0002 },
  [SECURITY.WPA]: { auth: 0x0022, encryption: 0x000c },
  [SECURITY.WPA3]: { auth: 0x0040, encryption: 0x0008 },
};

function tlv(type, valueBytes) {
  const out = new Uint8Array(4 + valueBytes.length);
  out[0] = type >> 8;
  out[1] = type & 0xff;
  out[2] = valueBytes.length >> 8;
  out[3] = valueBytes.length & 0xff;
  out.set(valueBytes, 4);
  return out;
}

const uint16 = (value) => Uint8Array.of(value >> 8, value & 0xff);

function concat(chunks) {
  const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export const WSC_MIME_TYPE = "application/vnd.wfa.wsc";

export function buildWscPayload({ ssid, security, password = "" }) {
  const { auth, encryption } = WSC_AUTH_AND_ENCRYPTION[security];
  const credential = concat([
    tlv(0x1026, Uint8Array.of(1)),
    tlv(0x1045, encoder.encode(ssid)),
    tlv(0x1003, uint16(auth)),
    tlv(0x100f, uint16(encryption)),
    tlv(0x1027, encoder.encode(security === SECURITY.NONE ? "" : password)),
    tlv(0x1020, new Uint8Array(6).fill(0xff)),
  ]);
  return tlv(0x100e, credential);
}

// --- Perfil de configuración de iOS (.mobileconfig) ---

export const MOBILECONFIG_MIME_TYPE = "application/x-apple-aspen-config";

const MOBILECONFIG_ENCRYPTION = {
  [SECURITY.NONE]: "None",
  [SECURITY.WEP]: "WEP",
  [SECURITY.WPA]: "WPA",
  [SECURITY.WPA3]: "WPA3",
};

const escapeXml = (value) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

const xmlBoolean = (value) => (value ? "<true/>" : "<false/>");

// createUuid es inyectable para que los tests sean deterministas.
export function buildMobileConfig(
  { ssid, security, password = "", hidden = false },
  createUuid = () => globalThis.crypto.randomUUID().toUpperCase(),
) {
  const passwordEntry =
    security === SECURITY.NONE ? "" : `\n      <key>Password</key><string>${escapeXml(password)}</string>`;
  const displayName = `WiFi ${escapeXml(ssid)}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>AutoJoin</key><true/>
      <key>EncryptionType</key><string>${MOBILECONFIG_ENCRYPTION[security]}</string>
      <key>HIDDEN_NETWORK</key>${xmlBoolean(hidden)}${passwordEntry}
      <key>SSID_STR</key><string>${escapeXml(ssid)}</string>
      <key>PayloadType</key><string>com.apple.wifi.managed</string>
      <key>PayloadIdentifier</key><string>com.wifi.profile.network</string>
      <key>PayloadUUID</key><string>${createUuid()}</string>
      <key>PayloadVersion</key><integer>1</integer>
      <key>PayloadDisplayName</key><string>${displayName}</string>
    </dict>
  </array>
  <key>PayloadDisplayName</key><string>${displayName}</string>
  <key>PayloadIdentifier</key><string>com.wifi.profile</string>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${createUuid()}</string>
  <key>PayloadVersion</key><integer>1</integer>
  <key>PayloadRemovalDisallowed</key><false/>
</dict>
</plist>
`;
}
