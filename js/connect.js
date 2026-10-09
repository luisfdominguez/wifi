import { SECURITY, parseConnectHash, buildWifiString } from "./wifi.js";
import { renderQrSvg } from "./qr.js";

const $ = (id) => document.getElementById(id);

const SECURITY_LABELS = {
  [SECURITY.WPA]: "WPA / WPA2",
  [SECURITY.WPA3]: "WPA3",
  [SECURITY.WEP]: "WEP",
  [SECURITY.NONE]: "Abierta",
};

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = false;
}

function showNetwork(network) {
  const isOpen = network.security === SECURITY.NONE;
  $("ssid-value").textContent = network.ssid;
  $("security-value").textContent = SECURITY_LABELS[network.security];
  $("password-value").textContent = isOpen ? "—" : network.password;
  $("copy-password").hidden = isOpen;
  $("password-label").hidden = isOpen;
  $("password-value").hidden = isOpen;
  $("qr").innerHTML = renderQrSvg(buildWifiString(network));
  $("network").hidden = false;

  $("copy-password").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(network.password);
      $("copy-status").textContent = "✔ Clave copiada";
    } catch {
      $("copy-status").textContent = "No se pudo copiar. Mantén pulsada la clave para copiarla.";
    }
  });
}

const result = parseConnectHash(window.location.hash);
if (result.error) {
  showError(`Enlace no válido: ${result.error}`);
} else {
  showNetwork(result.network);
}
