const QR_ERROR_CORRECTION = "M";
const AUTO_TYPE_NUMBER = 0;

// Devuelve SVG con zona de silencio, para que los móviles lo escaneen bien en cualquier fondo.
export function renderQrSvg(text) {
  const qr = globalThis.qrcode(AUTO_TYPE_NUMBER, QR_ERROR_CORRECTION);
  qr.addData(text, "Byte");
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 16, scalable: true });
}
