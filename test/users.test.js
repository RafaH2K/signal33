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

describe('Users', () => {
  let server;
  let base;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
  });

  after(async () => {
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('gets and updates the own profile, and changes the password', async () => {
    const user = await registerAndLogin(base, 'users-me');
    emails.push(user.email);

    const meRes = await fetch(`${base}/users/me`, { headers: jsonHeaders(user.token) });
    const me = await meRes.json();
    assert.equal(me.data.email, user.email);

    const patchRes = await fetch(`${base}/users/me`, {
      method: 'PATCH',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ name: 'Renamed' }),
    });
    const patched = await patchRes.json();
    assert.equal(patched.data.name, 'Renamed');

    const changePwRes = await fetch(`${base}/users/me/password`, {
      method: 'PATCH',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ currentPassword: 'supersecret123', newPassword: 'newpassword456' }),
    });
    assert.equal(changePwRes.status, 200);
  });

  it('blocks a non-admin from the admin routes and allows an admin', async () => {
    const user = await registerAndLogin(base, 'users-rls');
    const admin = await registerAdmin(base, 'users-admin');
    emails.push(user.email, admin.email);

    const listAsUser = await fetch(`${base}/users/`, { headers: jsonHeaders(user.token) });
    assert.equal(listAsUser.status, 403);

    const listAsAdmin = await fetch(`${base}/users/`, { headers: jsonHeaders(admin.token) });
    assert.equal(listAsAdmin.status, 200);
  });

  it('admin can soft-delete a user, who then disappears', async () => {
    const target = await registerAndLogin(base, 'users-target');
    const admin = await registerAdmin(base, 'users-deleter');
    emails.push(target.email, admin.email);

    const delRes = await fetch(`${base}/users/${target.userId}`, {
      method: 'DELETE',
      headers: jsonHeaders(admin.token),
    });
    assert.equal(delRes.status, 200);

    const meRes = await fetch(`${base}/users/me`, { headers: jsonHeaders(target.token) });
    assert.equal(meRes.status, 404);
  });
});
