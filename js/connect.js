import {
  SECURITY,
  parseConnectHash,
  buildWifiString,
  buildMobileConfig,
  MOBILECONFIG_MIME_TYPE,
} from "./wifi.js";
import { renderQrSvg } from "./qr.js";

// Revocar de inmediato cancelaría la descarga en Safari.
const PROFILE_URL_REVOKE_DELAY_MS = 60_000;

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

  $("install-profile").addEventListener("click", () => {
    try {
      const profile = buildMobileConfig(network);
      const blob = new Blob([profile], { type: MOBILECONFIG_MIME_TYPE });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "wifi.mobileconfig";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), PROFILE_URL_REVOKE_DELAY_MS);
      $("profile-status").textContent = "Perfil generado. Sigue los pasos de arriba en Ajustes.";
    } catch {
      $("profile-status").textContent = "No se pudo generar el perfil en este navegador.";
    }
  });
}

const result = parseConnectHash(window.location.hash);
if (result.error) {
  showError(`Enlace no válido: ${result.error}`);
} else {
  showNetwork(result.network);
}
