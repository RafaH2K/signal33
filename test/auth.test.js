import { after, before, describe, it } from 'node:test';
import {
  assert,
  startServer,
  stopServer,
  closePool,
  uniqueEmail,
  jsonHeaders,
  registerUser,
  login,
  deleteUsersByEmail,
} from './helpers.js';

describe('Auth', () => {
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

  it('registers a new user and returns tokens', async () => {
    const email = uniqueEmail('auth-register');
    emails.push(email);
    const { status, body } = await registerUser(base, { email });
    assert.equal(status, 201);
    assert.equal(body.data.user.email, email);
    assert.equal(body.data.user.role, 'USER');
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.equal(body.data.user.password_hash, undefined);
  });

  it('rejects a duplicate email on register', async () => {
    const email = uniqueEmail('auth-dup');
    emails.push(email);
    await registerUser(base, { email });
    const { status, body } = await registerUser(base, { email });
    assert.equal(status, 409);
    assert.equal(body.success, false);
  });

  it('rejects login with a wrong password', async () => {
    const email = uniqueEmail('auth-badpw');
    emails.push(email);
    await registerUser(base, { email });
    const body = await login(base, email, 'wrong-password');
    assert.equal(body.success, false);
  });

  it('returns 401 on /me without a token, and the profile with one', async () => {
    const email = uniqueEmail('auth-me');
    emails.push(email);
    await registerUser(base, { email });
    const { data } = await login(base, email);

    const noAuth = await fetch(`${base}/auth/me`);
    assert.equal(noAuth.status, 401);

    const withAuth = await fetch(`${base}/auth/me`, { headers: jsonHeaders(data.accessToken) });
    const withAuthBody = await withAuth.json();
    assert.equal(withAuth.status, 200);
    assert.equal(withAuthBody.data.email, email);
  });

  it('rotates refresh tokens and blocks reuse of the old one', async () => {
    const email = uniqueEmail('auth-refresh');
    emails.push(email);
    await registerUser(base, { email });
    const { data: loginData } = await login(base, email);

    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ refreshToken: loginData.refreshToken }),
    });
    const refreshBody = await refreshRes.json();
    assert.equal(refreshRes.status, 200);
    assert.notEqual(refreshBody.data.refreshToken, loginData.refreshToken);

    const reuseRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ refreshToken: loginData.refreshToken }),
    });
    assert.equal(reuseRes.status, 401);
  });

  it('logout revokes the refresh token', async () => {
    const email = uniqueEmail('auth-logout');
    emails.push(email);
    await registerUser(base, { email });
    const { data } = await login(base, email);

    const logoutRes = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ refreshToken: data.refreshToken }),
    });
    assert.equal(logoutRes.status, 200);

    const refreshRes = await fetch(`${base}/auth/refresh`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ refreshToken: data.refreshToken }),
    });
    assert.equal(refreshRes.status, 401);
  });

  it('forgot-password never reveals whether the email exists', async () => {
    const res = await fetch(`${base}/auth/forgot-password`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ email: uniqueEmail('does-not-exist') }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
  });
});
