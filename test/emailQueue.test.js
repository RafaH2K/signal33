import { after, before, describe, it } from 'node:test';
import {
  assert,
  startServer,
  stopServer,
  closePool,
  jsonHeaders,
  registerAdmin,
  deleteUsersByEmail,
  uniqueEmail,
} from './helpers.js';
import { pool } from '../src/database/pool.js';
import { processQueue } from '../src/services/emailQueueService.js';

describe('Email queue', () => {
  let server;
  let base;
  let admin;
  let eventId;

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'queue-admin');
    const res = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({
        title: 'Queue Test',
        eventDate: '2099-01-01T22:00:00Z',
        venue: 'Club',
        reservationsEnabled: true,
      }),
    });
    eventId = (await res.json()).data.id;
  });

  after(async () => {
    if (eventId) await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    await deleteUsersByEmail(admin.email);
    await stopServer(server);
    await closePool();
  });

  function reserve() {
    return fetch(`${base}/reservations/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        eventId,
        fullName: 'Cola',
        email: uniqueEmail('queue'),
        accessType: 'GENERAL',
        quantity: 1,
      }),
    }).then((res) => res.json());
  }

  // la cola atiende todas las reservas pendientes de la base, no sólo las de
  // esta prueba: se procesa hasta que le toque a la nuestra
  async function drainUntilHandled(id, options) {
    for (let i = 0; i < 50; i += 1) {
      if ((await statusOf(id)).email_status !== 'PENDING') return;
      if ((await processQueue(options)) === 0) return;
    }
  }

  async function statusOf(id) {
    const { rows } = await pool.query(
      'SELECT email_status, email_attempts, email_last_error FROM reservations WHERE id = $1',
      [id]
    );
    return rows[0];
  }

  it('queues the email instead of blocking the reservation, then sends it', async () => {
    const { data } = await reserve();
    assert.equal((await statusOf(data.id)).email_status, 'PENDING');

    const sent = [];
    await drainUntilHandled(data.id, { send: async (payload) => sent.push(payload) });

    const after = await statusOf(data.id);
    assert.equal(after.email_status, 'SENT');
    assert.equal(sent.at(-1).tickets.length, 1);
    assert.equal(sent.at(-1).reservation.tracking_code, data.tracking_code);
  });

  it('keeps a failed email pending so it retries later, and never loses it', async () => {
    const { data } = await reserve();

    await drainUntilHandled(data.id, {
      send: async () => {
        throw new Error('Resend caído');
      },
    });

    const failed = await statusOf(data.id);
    assert.equal(failed.email_status, 'PENDING');
    assert.equal(failed.email_attempts, 1);
    assert.match(failed.email_last_error, /Resend caído/);

    // el reintento no es inmediato: se espera antes de volver a intentar
    const { rows } = await pool.query('SELECT email_next_attempt_at > now() AS waiting FROM reservations WHERE id = $1', [
      data.id,
    ]);
    assert.equal(rows[0].waiting, true);

    // cuando toca, sale
    await pool.query('UPDATE reservations SET email_next_attempt_at = now() WHERE id = $1', [data.id]);
    await drainUntilHandled(data.id, { send: async () => {} });
    assert.equal((await statusOf(data.id)).email_status, 'SENT');
  });

  it('re-queues from the box office when someone never got their email', async () => {
    const { data } = await reserve();
    await drainUntilHandled(data.id, { send: async () => {} });

    const res = await fetch(`${base}/reservations/${data.id}/resend-email`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
    });
    assert.equal(res.status, 200);
    assert.equal((await statusOf(data.id)).email_status, 'PENDING');
  });
});
