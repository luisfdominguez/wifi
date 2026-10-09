import { buildWscPayload, WSC_MIME_TYPE } from "./wifi.js";

export const isWebNfcSupported = () => "NDEFReader" in globalThis;

const ERROR_MESSAGES = {
  NotAllowedError: "Permiso NFC denegado o cancelado.",
  NotSupportedError: "Este dispositivo no tiene NFC o está desactivado.",
  NotReadableError: "No se pudo leer la etiqueta. Acércala de nuevo.",
  AbortError: "Operación cancelada.",
  NetworkError: "Fallo al escribir: la etiqueta es de solo lectura o no tiene capacidad suficiente.",
};

export function describeNfcError(error) {
  return ERROR_MESSAGES[error?.name] ?? `Error NFC: ${error?.message ?? "desconocido"}`;
}

async function writeRecords(records, signal) {
  const reader = new globalThis.NDEFReader();
  await reader.write({ records }, { signal, overwrite: true });
}

export const writeUrlTag = (url, signal) =>
  writeRecords([{ recordType: "url", data: url }], signal);

export const writeNativeWifiTag = (network, signal) =>
  writeRecords(
    [{ recordType: "mime", mediaType: WSC_MIME_TYPE, data: buildWscPayload(network) }],
    signal,
  );
