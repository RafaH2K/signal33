import { after, before, describe, it } from 'node:test';
import { assert, startServer, stopServer, closePool, jsonHeaders, registerAdmin, deleteUsersByEmail } from './helpers.js';

describe('Signal', () => {
  let server;
  let base;
  let admin;
  const emails = [];
  const signalIds = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'signal-admin');
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

  it('resolves REDIRECT/EFFECT/MESSAGE commands publicly, case-insensitively, without a token', async () => {
    const suffix = Date.now();
    const redirect = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ command: `tour-${suffix}`, type: 'REDIRECT', payload: { url: 'https://example.com/tour' } }),
    }).then((r) => r.json());
    const message = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ command: `hola-${suffix}`, type: 'MESSAGE', payload: { message: 'Bienvenido!' } }),
    }).then((r) => r.json());
    signalIds.push(redirect.data.id, message.data.id);

    const resolvedRedirect = await fetch(`${base}/signal/${redirect.data.command.toUpperCase()}`).then((r) => r.json());
    assert.equal(resolvedRedirect.data.type, 'REDIRECT');
    assert.equal(resolvedRedirect.data.payload.url, 'https://example.com/tour');

    const resolvedMessage = await fetch(`${base}/signal/${message.data.command}`).then((r) => r.json());
    assert.equal(resolvedMessage.data.payload.message, 'Bienvenido!');
  });

  it('treats an inactive or missing command as 404', async () => {
    const suffix = Date.now();
    const inactive = await fetch(`${base}/dashboard/signals`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({
        command: `oculto-${suffix}`,
        type: 'MESSAGE',
        payload: { message: 'no deberias verme' },
        isActive: false,
      }),
    }).then((r) => r.json());
    signalIds.push(inactive.data.id);

    const resInactive = await fetch(`${base}/signal/${inactive.data.command}`);
    assert.equal(resInactive.status, 404);

    const resMissing = await fetch(`${base}/signal/no-existe-${suffix}`);
    assert.equal(resMissing.status, 404);
  });
});
