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
  uniqueEmail,
} from './helpers.js';
import { pool } from '../src/database/pool.js';

describe('Reservations', () => {
  let server;
  let base;
  let admin;
  let eventId;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'reservations-admin');
    emails.push(admin.email);

    const res = await fetch(`${base}/events/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({
        title: 'Test Frequency',
        eventDate: '2099-10-31T22:00:00Z',
        venue: 'Club',
        reservationsEnabled: true,
        maxAccessesPerPerson: 2,
        priceGeneral: 300,
        priceOpenBar: 650,
        capacityOpenBar: 5,
      }),
    });
    eventId = (await res.json()).data.id;
  });

  after(async () => {
    if (eventId) await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  function reserve(body) {
    return fetch(`${base}/reservations/`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ eventId, fullName: 'Asistente', accessType: 'GENERAL', quantity: 1, ...body }),
    });
  }

  it('creates a reservation with one QR ticket per access and a tracking code', async () => {
    const res = await reserve({ email: uniqueEmail('res'), quantity: 2, accessType: 'OPEN_BAR' });
    assert.equal(res.status, 201);
    const { data } = await res.json();
    assert.match(data.tracking_code, /^SR-[2-9A-Z]{8}$/);
    assert.equal(data.is_paid, false);
    assert.equal(data.tickets.length, 2);
    assert.equal(Number(data.amount_due), 1300);

    const qr = await fetch(`${base}/reservations/tickets/${data.tickets[0].code}/qr.png`);
    assert.equal(qr.status, 200);
    assert.equal(qr.headers.get('content-type'), 'image/png');

    const tracked = await (await fetch(`${base}/reservations/track/${data.tracking_code}`)).json();
    assert.equal(tracked.data.full_name, 'Asistente');
  });

  it('caps accesses per email, case-insensitively, across reservations', async () => {
    const email = uniqueEmail('cap');
    assert.equal((await reserve({ email, quantity: 1 })).status, 201);
    assert.equal((await reserve({ email: email.toUpperCase(), quantity: 2 })).status, 409);
    assert.equal((await reserve({ email, quantity: 1 })).status, 201);
    assert.equal((await reserve({ email, quantity: 1 })).status, 409);
  });

  it('holds the cap under concurrent submissions', async () => {
    const email = uniqueEmail('race');
    const results = await Promise.all([1, 2, 3].map(() => reserve({ email, quantity: 1 })));
    assert.equal(results.filter((r) => r.status === 201).length, 2);
  });

  it('check-in requires payment and a QR works only once', async () => {
    const { data } = await (await reserve({ email: uniqueEmail('door') })).json();
    const code = data.tickets[0].code;
    const checkIn = () =>
      fetch(`${base}/reservations/tickets/${code}/check-in`, { method: 'POST', headers: jsonHeaders(admin.token) });

    assert.equal((await checkIn()).status, 409);

    const paid = await fetch(`${base}/reservations/${data.id}/payment`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ isPaid: true }),
    });
    assert.equal((await paid.json()).data.is_paid, true);

    const [a, b] = await Promise.all([checkIn(), checkIn()]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  });

  it('stops selling an access type when its capacity is full, even under a rush', async () => {
    const before = await (await fetch(`${base}/reservations/availability/${eventId}`)).json();
    const openBar = before.data.accessTypes.find((t) => t.type === 'OPEN_BAR');
    const results = await Promise.all(
      Array.from({ length: openBar.remaining + 3 }, () => reserve({ email: uniqueEmail('rush'), accessType: 'OPEN_BAR' }))
    );
    assert.equal(results.filter((r) => r.status === 201).length, openBar.remaining);

    const after = await (await fetch(`${base}/reservations/availability/${eventId}`)).json();
    assert.equal(after.data.accessTypes.find((t) => t.type === 'OPEN_BAR').remaining, 0);
    // general no tiene cupo, sigue abierto
    assert.equal((await reserve({ email: uniqueEmail('general') })).status, 201);
  });

  it('lets STAFF work the box office, records who collected, but not cancel', async () => {
    const staff = await registerAndLogin(base, 'res-staff');
    emails.push(staff.email);
    await fetch(`${base}/users/${staff.userId}/role`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ role: 'STAFF' }),
    });
    const { data: session } = await (
      await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ email: staff.email, password: 'supersecret123' }),
      })
    ).json();
    const token = session.accessToken;

    const { data } = await (await reserve({ email: uniqueEmail('staffed') })).json();
    await fetch(`${base}/reservations/${data.id}/payment`, {
      method: 'PATCH',
      headers: jsonHeaders(token),
      body: JSON.stringify({ isPaid: true }),
    });
    const checked = await fetch(`${base}/reservations/tickets/${data.tickets[0].code}/check-in`, {
      method: 'POST',
      headers: jsonHeaders(token),
    });
    assert.equal(checked.status, 200);

    const detail = (await (await fetch(`${base}/reservations/${data.id}`, { headers: jsonHeaders(token) })).json()).data;
    assert.equal(detail.paid_by, staff.userId);
    assert.deepEqual(detail.logs.map((l) => l.action), ['PAID', 'CHECK_IN']);

    const stats = (await (await fetch(`${base}/reservations/stats/${eventId}`, { headers: jsonHeaders(token) })).json()).data;
    assert.equal(stats.byStaff.find((s) => s.user_id === staff.userId).collected, 300);

    const cancelled = await fetch(`${base}/reservations/${data.id}`, { method: 'DELETE', headers: jsonHeaders(token) });
    assert.equal(cancelled.status, 403);
  });

  it('keeps box-office endpoints admin-only', async () => {
    const user = await registerAndLogin(base, 'res-user');
    emails.push(user.email);
    const res = await fetch(`${base}/reservations/?eventId=${eventId}`, { headers: jsonHeaders(user.token) });
    assert.equal(res.status, 403);
  });
});
