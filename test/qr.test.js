import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { renderQrPng, ticketQrPayload } from '../src/services/qrService.js';
import { generateTicketCode } from '../src/utils/codes.js';

// Comprueba la cadena completa del escáner sin cámara: el PNG que genera el
// servidor se decodifica con jsQR, la misma librería que corre en el celular
// del personal, y el código que sale es el que se manda a validar.
const TICKET_CODE = /([2-9A-Z]{16})\/?$/;

function decode(buffer) {
  const png = PNG.sync.read(buffer);
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

describe('QR de boleto', () => {
  it('se genera y se vuelve a leer, devolviendo el código del boleto', async () => {
    const code = generateTicketCode();
    const payload = ticketQrPayload('https://findyourfrequency.com', code);

    const decoded = decode(await renderQrPng(payload));

    assert.equal(decoded, payload);
    assert.equal(decoded.match(TICKET_CODE)?.[1], code);
  });

  it('sigue leyéndose con códigos de cualquier forma', async () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateTicketCode();
      const payload = ticketQrPayload('https://findyourfrequency.com', code);
      assert.equal(decode(await renderQrPng(payload)), payload);
    }
  });
});
