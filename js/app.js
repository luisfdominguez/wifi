import {
  SECURITY,
  validateNetwork,
  buildConnectUrl,
  byteLength,
} from "./wifi.js";
import { renderQrSvg } from "./qr.js";
import {
  isWebNfcSupported,
  writeUrlTag,
  writeNativeWifiTag,
  describeNfcError,
} from "./nfc.js";

const NTAG_CAPACITY_BYTES = { NTAG213: 144, NTAG215: 504, NTAG216: 888 };
const NFC_WRITE_TIMEOUT_MS = 30_000;

const $ = (id) => document.getElementById(id);
const form = $("network-form");
const fields = {
  ssid: $("ssid"),
  security: $("security"),
  password: $("password"),
  hidden: $("hidden"),
};

const readNetwork = () => ({
  ssid: fields.ssid.value,
  security: fields.security.value,
  password: fields.password.value,
  hidden: fields.hidden.checked,
});

function formatSizeInfo(url) {
  const size = byteLength(url);
  const fitting = Object.entries(NTAG_CAPACITY_BYTES)
    .filter(([, capacity]) => size + 10 <= capacity) // ~10 B de cabecera NDEF
    .map(([name]) => name);
  return fitting.length
    ? `${size} bytes · cabe en ${fitting.join(", ")}`
    : `${size} bytes · excede todas las NTAG`;
}

let currentUrl = "";

function render() {
  const network = readNetwork();
  const isOpen = network.security === SECURITY.NONE;
  $("password-group").hidden = isOpen;

  const touched = network.ssid !== "" || network.password !== "";
  const errors = validateNetwork(network);

  $("errors").hidden = !(touched && errors.length);
  $("errors").textContent = errors.join(" ");
  $("result").hidden = errors.length > 0 || !touched;
  if ($("result").hidden) return;

  currentUrl = buildConnectUrl(window.location.href, network);
  $("url-output").value = currentUrl;
  $("size-info").textContent = formatSizeInfo(currentUrl);
  $("qr-preview").innerHTML = renderQrSvg(currentUrl);
}

async function copyToClipboard(text, statusElement, message) {
  try {
    await navigator.clipboard.writeText(text);
    statusElement.textContent = message;
  } catch {
    statusElement.textContent = "No se pudo copiar. Selecciónala y cópiala manualmente.";
  }
}

async function runNfcWrite(write) {
  const status = $("nfc-status");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NFC_WRITE_TIMEOUT_MS);
  status.textContent = "Acerca la etiqueta NFC al dispositivo…";
  try {
    await write(controller.signal);
    status.textContent = "✔ Etiqueta grabada correctamente.";
  } catch (error) {
    status.textContent = describeNfcError(error);
  } finally {
    clearTimeout(timeout);
  }
}

form.addEventListener("input", render);
form.addEventListener("submit", (event) => event.preventDefault());

$("toggle-password").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const shouldShow = fields.password.type === "password";
  fields.password.type = shouldShow ? "text" : "password";
  button.textContent = shouldShow ? "Ocultar" : "Mostrar";
  button.setAttribute("aria-pressed", String(shouldShow));
});

$("copy-url").addEventListener("click", () =>
  copyToClipboard(currentUrl, $("size-info"), "✔ URL copiada"),
);

if (isWebNfcSupported()) {
  $("write-url").addEventListener("click", () =>
    runNfcWrite((signal) => writeUrlTag(currentUrl, signal)),
  );
  $("write-native").addEventListener("click", () =>
    runNfcWrite((signal) => writeNativeWifiTag(readNetwork(), signal)),
  );
} else {
  $("write-url").disabled = true;
  $("write-native").disabled = true;
  $("nfc-unsupported").hidden = false;
}

render();
