// Muestra los QR de una reserva en grande, para probar el escáner de taquilla
// desde otra pantalla.
//
//   node scripts/qr-pantalla.mjs SR-XXXXXXXX
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/database/pool.js';
import { renderQrPng, ticketQrPayload } from '../src/services/qrService.js';
import { env } from '../src/config/env.js';

const trackingCode = process.argv[2];
if (!trackingCode) {
  console.error('Uso: node scripts/qr-pantalla.mjs SR-XXXXXXXX');
  process.exit(1);
}

const { rows } = await pool.query(
  `SELECT t.code, t.checked_in_at, r.full_name, r.is_paid
   FROM tickets t JOIN reservations r ON r.id = t.reservation_id
   WHERE r.tracking_code = $1 ORDER BY t.created_at`,
  [trackingCode.toUpperCase()]
);

if (rows.length === 0) {
  console.error(`No existe la reserva ${trackingCode}`);
  await pool.end();
  process.exit(1);
}

const cards = await Promise.all(
  rows.map(async (t, i) => {
    const png = (await renderQrPng(ticketQrPayload(env.frontendUrl, t.code))).toString('base64');
    const estado = t.checked_in_at ? 'YA USADO' : 'sin usar';
    return `<figure>
      <img src="data:image/png;base64,${png}" alt="QR del acceso ${i + 1}" />
      <figcaption>Acceso ${i + 1} · ${t.code}<br /><small>${estado}</small></figcaption>
    </figure>`;
  })
);

const html = `<!doctype html><meta charset="utf-8"><title>QR para escanear</title>
<style>
  body{margin:0;background:#fff;color:#111;font-family:system-ui,sans-serif;display:flex;flex-direction:column;
       align-items:center;justify-content:center;min-height:100vh;gap:20px}
  h1{font-size:14px;text-transform:uppercase;letter-spacing:.14em;color:#666;margin:0;text-align:center}
  h1 small{display:block;margin-top:6px;letter-spacing:0;text-transform:none;color:#999}
  .fila{display:flex;gap:48px;flex-wrap:wrap;justify-content:center}
  figure{margin:0;text-align:center}
  img{width:340px;height:340px;display:block}
  figcaption{font-family:ui-monospace,Consolas,monospace;font-size:13px;letter-spacing:.06em;margin-top:10px;color:#444}
  figcaption small{color:#999}
</style>
<h1>Apuntá la cámara de la taquilla a uno de estos
  <small>${rows[0].full_name} · ${rows[0].is_paid ? 'reserva pagada' : 'reserva SIN pagar'} · ${trackingCode.toUpperCase()}</small>
</h1>
<div class="fila">${cards.join('')}</div>`;

const out = path.join(process.env.TEMP ?? '.', 'qr-pantalla.html');
await writeFile(out, html, 'utf8');
console.log(out);
await pool.end();
