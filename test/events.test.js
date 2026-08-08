import { after, before, describe, it } from 'node:test';
import {
  assert,
  startServer,
  stopServer,
  closePool,
  jsonHeaders,
  registerAndLogin,
  registerAdmin,
  deleteUsersByEmail,
} from './helpers.js';
import { pool } from '../src/database/pool.js';

describe('Events', () => {
  let server;
  let base;
  const emails = [];
  const eventIds = [];

  before(async () => {
    ({ server, base } = await startServer());
  });

  after(async () => {
    if (eventIds.length) await pool.query('DELETE FROM events WHERE id = ANY($1)', [eventIds]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('blocks create for a non-admin', async () => {
    const user = await registerAndLogin(base, 'events-user');
    emails.push(user.email);

    const res = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ title: 'Show', eventDate: '2026-12-01T22:00:00Z', venue: 'Club' }),
    });
    assert.equal(res.status, 403);
  });

  it('orders by date, and deactivating hides it from the public list', async () => {
    const admin = await registerAdmin(base, 'events-admin');
    emails.push(admin.email);

    const summer = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ title: 'Fiesta Verano', eventDate: '2026-12-20T22:00:00Z', venue: 'Playa' }),
    }).then((r) => r.json());
    const winter = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ title: 'Fiesta Invierno', eventDate: '2026-07-15T22:00:00Z', venue: 'Warehouse' }),
    }).then((r) => r.json());
    eventIds.push(summer.data.id, winter.data.id);

    const list = await fetch(`${base}/events/`).then((r) => r.json());
    const titles = list.data.events.map((e) => e.title);
    assert.ok(titles.indexOf('Fiesta Invierno') < titles.indexOf('Fiesta Verano'));

    await fetch(`${base}/events/${summer.data.id}`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ isActive: false }),
    });
    const afterDeactivate = await fetch(`${base}/events/`).then((r) => r.json());
    assert.ok(!afterDeactivate.data.events.some((e) => e.id === summer.data.id));
  });

  it('rejects an invalid date with 400', async () => {
    const admin = await registerAdmin(base, 'events-invalid');
    emails.push(admin.email);

    const res = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ title: 'Show', eventDate: 'not-a-date', venue: 'Club' }),
    });
    assert.equal(res.status, 400);
  });
});
