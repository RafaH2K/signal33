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

describe('About', () => {
  let server;
  let base;
  let original;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
    const current = await fetch(`${base}/about/`).then((r) => r.json());
    original = current.data;
  });

  after(async () => {
    const admin = await registerAdmin(base, 'about-restore');
    await fetch(`${base}/about/`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({
        story: original.story ?? '',
        bio: original.bio ?? '',
        influences: original.influences ?? '',
        career: original.career ?? '',
      }),
    });
    await deleteUsersByEmail(admin.email, ...emails);
    await stopServer(server);
    await closePool();
  });

  it('is public to read and admin-only to write', async () => {
    const user = await registerAndLogin(base, 'about-user');
    emails.push(user.email);

    const writeAsUser = await fetch(`${base}/about/`, {
      method: 'PATCH',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ bio: 'hackeado' }),
    });
    assert.equal(writeAsUser.status, 403);

    const noAuth = await fetch(`${base}/about/`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ bio: 'x' }),
    });
    assert.equal(noAuth.status, 401);
  });

  it('partial updates preserve untouched fields', async () => {
    const admin = await registerAdmin(base, 'about-admin');
    emails.push(admin.email);

    const first = await fetch(`${base}/about/`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ bio: 'DJ desde 2010', story: 'Empezo en un garage' }),
    }).then((r) => r.json());
    assert.equal(first.data.bio, 'DJ desde 2010');

    const second = await fetch(`${base}/about/`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ influences: 'Daft Punk' }),
    }).then((r) => r.json());
    assert.equal(second.data.bio, 'DJ desde 2010');
    assert.equal(second.data.story, 'Empezo en un garage');
    assert.equal(second.data.influences, 'Daft Punk');
  });
});
