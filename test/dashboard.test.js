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

describe('Dashboard', () => {
  let server;
  let base;
  let admin;
  const emails = [];
  const signalIds = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'dashboard-admin');
    emails.push(admin.email);
  });

  after(async () => {
    for (const id of signalIds) {
      await fetch(`${base}/dashboard/signals/${id}`, { method: 'DELETE', headers: jsonHeaders(admin.token) });
    }
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('summary is admin-only', async () => {
    const user = await registerAndLogin(base, 'dashboard-user');
    emails.push(user.email);

    const asUser = await fetch(`${base}/dashboard/summary`, { headers: jsonHeaders(user.token) });
    assert.equal(asUser.status, 403);

    const asAdmin = await fetch(`${base}/dashboard/summary`, { headers: jsonHeaders(admin.token) });
    const body = await asAdmin.json();
    assert.equal(asAdmin.status, 200);
    assert.ok(typeof body.data.totalUsers === 'number');
  });

  it('validates signal payloads against their type and blocks duplicates', async () => {
    const created = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ command: `test-cmd-${Date.now()}`, type: 'REDIRECT', payload: { url: 'https://example.com' } }),
    }).then((r) => r.json());
    assert.equal(created.success, true);
    signalIds.push(created.data.id);

    const wrongShape = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ command: `bad-${Date.now()}`, type: 'REDIRECT', payload: { effect: 'oops' } }),
    });
    assert.equal(wrongShape.status, 400);

    const duplicate = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ command: created.data.command, type: 'REDIRECT', payload: { url: 'https://other.com' } }),
    });
    assert.equal(duplicate.status, 409);
  });
});
