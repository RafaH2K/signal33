// Manda un correo de prueba con los dos QR: el normal y el invertido, para
// comprobar con cámaras reales si el invertido se lee antes de adoptarlo.
//
//   node scripts/test-inverted-qr.mjs SR-XXXXXXXX destino@correo.com
import 'dotenv/config';
import QRCode from 'qrcode';
import { pool } from '../src/database/pool.js';
import { resend } from '../src/config/email.js';
import { env } from '../src/config/env.js';
import { ticketQrPayload } from '../src/services/qrService.js';

const [trackingCode, to] = process.argv.slice(2);
if (!trackingCode || !to) {
  console.error('Uso: node scripts/test-inverted-qr.mjs SR-XXXXXXXX destino@correo.com');
  process.exit(1);
}

const { rows } = await pool.query(
  `SELECT t.code FROM tickets t
   JOIN reservations r ON r.id = t.reservation_id
   WHERE r.tracking_code = $1 ORDER BY t.created_at LIMIT 1`,
  [trackingCode.toUpperCase()]
);
if (!rows[0]) {
  console.error(`No existe la reserva ${trackingCode}`);
  await pool.end();
  process.exit(1);
}

const payload = ticketQrPayload(env.frontendUrl, rows[0].code);
const render = (dark, light) =>
  QRCode.toBuffer(payload, { type: 'png', width: 512, margin: 2, color: { dark, light } });

const normal = await render('#000000', '#FFFFFF');
const inverted = await render('#FFFFFF', '#090909');

const card = (title, cid, background) => `
  <td width="50%" align="center" style="padding:12px">
    <p style="margin:0 0 10px;font-family:system-ui,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#a3a3a3">${title}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr><td style="background:${background};padding:12px;line-height:0">
        <img src="cid:${cid}" alt="${title}" width="200" height="200" style="display:block;width:200px;height:200px" />
      </td></tr>
    </table>
  </td>`;

const { error } = await resend.emails.send({
  from: env.resend.fromEmail,
  to,
  subject: 'PRUEBA · ¿Tu cámara lee el QR invertido?',
  html: `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#090909">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
      <tr><td style="padding:0 0 20px;font-family:system-ui,sans-serif;font-size:15px;color:#ffffff;line-height:1.6">
        Escaneá los dos con la cámara del celular. Los dos llevan al mismo boleto.
        Si el de la derecha no abre nada, tu cámara no lee códigos invertidos.
      </td></tr>
      <tr>
        ${card('Normal', 'qr-normal@signal33', '#ffffff')}
        ${card('Invertido', 'qr-inverted@signal33', '#090909')}
      </tr>
      <tr><td colspan="2" style="padding:20px 0 0;font-family:system-ui,sans-serif;font-size:12px;color:#6b6b6b;text-align:center">
        Probalo también con el brillo bajo y de lejos, como estaría en la puerta.
      </td></tr>
    </table>
  </td></tr>
</table>`,
  attachments: [
    { filename: 'qr-normal.png', content: normal.toString('base64'), contentType: 'image/png', contentId: 'qr-normal@signal33' },
    { filename: 'qr-invertido.png', content: inverted.toString('base64'), contentType: 'image/png', contentId: 'qr-inverted@signal33' },
  ],
});

console.log(error ? `Falló: ${error.message}` : `Correo de prueba enviado a ${to}`);
await pool.end();
