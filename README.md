# wifi · Generador de etiquetas NFC para WiFi

Web app estática (sin backend ni dependencias de runtime) que genera la URL para grabar en una etiqueta NFC con los datos de una red WiFi.

## Cómo funciona

| Etiqueta | iPhone (XS o posterior) | Android |
|---|---|---|
| **URL** → `connect.html#s=…&t=…&p=…` | Al tocar abre la página con SSID, clave (botón copiar) y QR | Igual |
| **WiFi nativo** (registro `application/vnd.wfa.wsc`) | No soportado por iOS | Conecta al tocar |

> iOS no puede unirse a una red WiFi directamente desde una etiqueta NFC. La página `connect.html` es el camino más corto sin app nativa. Para conexión en un toque en iPhone hay que crear un Atajo con automatización NFC.

## Seguridad

- Los datos van en el fragmento `#`: el navegador no lo envía a ningún servidor.
- `vercel.json` aplica CSP estricta (`connect-src 'none'`) y `Referrer-Policy: no-referrer`.
- La clave queda en claro en la etiqueta: cualquiera con un móvil puede leerla. Usa una red de invitados.
- Etiquetas recomendadas: NTAG213 (144 B), NTAG215 o NTAG216.

## Desarrollo

```bash
npm test      # tests del núcleo (Node >= 20)
npm start     # servidor local
```

Escritura directa en etiqueta (Web NFC): solo Chrome en Android y sobre HTTPS. Alternativa: app «NFC Tools», registro «URL».

## Despliegue en Vercel

Importa el repo, framework «Other», sin build ni directorio de salida.

## Estructura

- `js/wifi.js`: escape, validación, cadena `WIFI:`, URL y payload WSC (testeado).
- `js/nfc.js`: escritura Web NFC.
- `js/qr.js` + `vendor/qrcode.js`: QR (qrcode-generator, MIT).
- `index.html` / `connect.html`: generador y página receptora.
