import { after, before, describe, it } from 'node:test';
import {
  assert,
  startServer,
  stopServer,
  closePool,
  jsonHeaders,
  authHeader,
  registerAndLogin,
  registerAdmin,
  deleteUsersByEmail,
} from './helpers.js';

const REAL_PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe('Uploads', () => {
  let server;
  let base;
  let admin;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'uploads-admin');
    emails.push(admin.email);
  });

  after(async () => {
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('blocks upload for a non-admin', async () => {
    const user = await registerAndLogin(base, 'uploads-user');
    emails.push(user.email);

    const form = new FormData();
    form.append('file', new Blob([REAL_PNG_BYTES], { type: 'image/png' }), 'a.png');
    const res = await fetch(`${base}/uploads/`, { method: 'POST', headers: authHeader(user.token), body: form });
    assert.equal(res.status, 403);
  });

  it('rejects content whose bytes do not match the declared mimetype', async () => {
    const form = new FormData();
    form.append('file', new Blob([new TextEncoder().encode('<script>alert(1)</script>')], { type: 'image/png' }), 'fake.png');
    const res = await fetch(`${base}/uploads/`, { method: 'POST', headers: authHeader(admin.token), body: form });
    assert.equal(res.status, 400);
  });

  it('rejects a disallowed mimetype', async () => {
    const form = new FormData();
    form.append('file', new Blob(['hello'], { type: 'text/plain' }), 'evil.txt');
    const res = await fetch(`${base}/uploads/`, { method: 'POST', headers: authHeader(admin.token), body: form });
    assert.equal(res.status, 400);
  });

  it('uploads a real file, lists it, and blocks path-traversal on delete', async () => {
    const form = new FormData();
    form.append('file', new Blob([REAL_PNG_BYTES], { type: 'image/png' }), 'real.png');
    const uploaded = await fetch(`${base}/uploads/`, { method: 'POST', headers: authHeader(admin.token), body: form }).then((r) =>
      r.json()
    );
    assert.equal(uploaded.success, true);

    const list = await fetch(`${base}/uploads/`, { headers: jsonHeaders(admin.token) }).then((r) => r.json());
    assert.ok(list.data.some((f) => f.filename === uploaded.data.filename));

    const traversal = await fetch(`${base}/uploads/..%2F..%2Fpackage.json`, {
      method: 'DELETE',
      headers: jsonHeaders(admin.token),
    });
    assert.equal(traversal.status, 400);

    const del = await fetch(`${base}/uploads/${uploaded.data.filename}`, {
      method: 'DELETE',
      headers: jsonHeaders(admin.token),
    });
    assert.equal(del.status, 200);
  });
});
