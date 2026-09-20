import { query, withTransaction } from '../database/query.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import * as emailService from './emailService.js';

const BATCH_SIZE = 20;
// Resend permite 2 envíos por segundo en el plan gratuito y más en los de pago:
// subilo con EMAIL_QUEUE_CONCURRENCY cuando tengas plan, o el proveedor
// rechazará la ráfaga entera.
const CONCURRENCY = env.email.queueConcurrency;
const POLL_MS = 5000;
const MAX_ATTEMPTS = 6;
// 1, 2, 4, 8, 16 y 32 minutos: si Resend se cae un rato, los correos salen solos
const BACKOFF_MINUTES = (attempts) => 2 ** (attempts - 1);

let timer = null;
let running = false;
// los tests lo apagan para controlar cuándo se procesa la cola
let kickEnabled = true;

export function setKickEnabled(enabled) {
  kickEnabled = enabled;
}

// FOR UPDATE SKIP LOCKED: si mañana corren dos instancias del servidor, cada
// una toma reservas distintas y ningún correo se manda dos veces.
async function claimBatch() {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT r.id FROM reservations r
       WHERE r.email_status = 'PENDING' AND r.email_next_attempt_at <= now() AND r.cancelled_at IS NULL
       ORDER BY r.email_next_attempt_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );
    if (rows.length === 0) return [];

    const ids = rows.map((row) => row.id);
    // se marcan lejos en el tiempo mientras se envían: si el proceso muere a
    // medias, vuelven a intentarse solas más tarde en vez de quedarse trabadas
    await client.query(
      `UPDATE reservations
       SET email_attempts = email_attempts + 1,
           email_next_attempt_at = now() + interval '10 minutes'
       WHERE id = ANY($1)`,
      [ids]
    );

    const { rows: claimed } = await client.query(
      `SELECT r.*, (r.unit_price * r.quantity) AS amount_due, e.title AS event_title, e.event_date, e.venue
       FROM reservations r JOIN events e ON e.id = r.event_id
       WHERE r.id = ANY($1)`,
      [ids]
    );
    return claimed;
  });
}

async function deliver(reservation, send) {
  const { rows: tickets } = await query(
    'SELECT * FROM tickets WHERE reservation_id = $1 ORDER BY created_at',
    [reservation.id]
  );

  try {
    await send({ reservation, tickets });
    await query(
      `UPDATE reservations SET email_status = 'SENT', email_sent_at = now(), email_last_error = NULL WHERE id = $1`,
      [reservation.id]
    );
  } catch (error) {
    const attempts = reservation.email_attempts + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await query(
      `UPDATE reservations SET
         email_status = $2,
         email_next_attempt_at = now() + ($3 || ' minutes')::interval,
         email_last_error = $4
       WHERE id = $1`,
      [reservation.id, giveUp ? 'FAILED' : 'PENDING', BACKOFF_MINUTES(attempts), String(error.message).slice(0, 500)]
    );
    logger.error({ err: error, reservationId: reservation.id, attempts, giveUp }, 'Reservation email failed');
  }
}

// `send` se inyecta en los tests; en producción siempre es el envío real
export async function processQueue({ send = emailService.sendReservationEmail } = {}) {
  if (running) return 0;
  running = true;
  try {
    const batch = await claimBatch();
    // de a poquitos: los proveedores limitan envíos por segundo y una ráfaga
    // en paralelo se rechaza entera
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      await Promise.all(batch.slice(i, i + CONCURRENCY).map((reservation) => deliver(reservation, send)));
    }
    return batch.length;
  } catch (error) {
    logger.error({ err: error }, 'Email queue failed');
    return 0;
  } finally {
    running = false;
  }
}

// se llama después de apartar para que el correo salga al instante, sin esperar
// al siguiente ciclo, pero sin bloquear la respuesta
export function kick() {
  if (!kickEnabled) return;
  setImmediate(() => {
    processQueue().catch(() => {});
  });
}

export function startEmailQueue() {
  if (timer) return;
  timer = setInterval(() => {
    processQueue().catch(() => {});
  }, POLL_MS);
  timer.unref?.();
  logger.info('Email queue started');
}

export function stopEmailQueue() {
  if (timer) clearInterval(timer);
  timer = null;
}
