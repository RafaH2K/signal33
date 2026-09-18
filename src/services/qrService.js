import QRCode from 'qrcode';

// El QR lleva la URL pública del boleto, no sólo el código: así un escáner
// cualquiera (la cámara del teléfono) abre la página de validación, y el lector
// de taquilla igual puede extraer el código del final de la URL.
export function ticketQrPayload(frontendUrl, code) {
  return `${frontendUrl.replace(/\/$/, '')}/boletos/validar/${code}`;
}

export function renderQrPng(payload) {
  return QRCode.toBuffer(payload, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
