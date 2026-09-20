// Genera el correo de una reserva como archivo HTML para verlo en el navegador,
// sin mandar nada. Útil para revisar el diseño antes del evento.
//
//   node scripts/preview-email.mjs SR-XXXXXXXX
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../src/database/pool.js';
import { buildReservationEmail } from '../src/services/emailService.js';

const trackingCode = process.argv[2];
if (!trackingCode) {
  console.error('Uso: node scripts/preview-email.mjs SR-XXXXXXXX');
  process.exit(1);
}

const { rows } = await pool.query(
  `SELECT r.*, (r.unit_price * r.quantity) AS amount_due, e.title AS event_title, e.event_date, e.venue
   FROM reservations r JOIN events e ON e.id = r.event_id
   WHERE r.tracking_code = $1`,
  [trackingCode.toUpperCase()]
);
const reservation = rows[0];
if (!reservation) {
  console.error(`No existe la reserva ${trackingCode}`);
  await pool.end();
  process.exit(1);
}

const { rows: tickets } = await pool.query(
  'SELECT * FROM tickets WHERE reservation_id = $1 ORDER BY created_at',
  [reservation.id]
);
const { subject, html } = buildReservationEmail({ reservation, tickets });

const out = path.resolve(process.argv[3] ?? `correo-${reservation.tracking_code}.html`);
await writeFile(out, `<!doctype html><meta charset="utf-8"><title>${subject}</title>${html}`, 'utf8');
console.log(`Asunto: ${subject}`);
console.log(`Para:   ${reservation.email}`);
console.log(`Archivo: ${out}`);
await pool.end();
