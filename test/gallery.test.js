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

describe('Gallery', () => {
  let server;
  let base;
  const emails = [];
  const itemIds = [];

  before(async () => {
    ({ server, base } = await startServer());
  });

  after(async () => {
    if (itemIds.length) await pool.query('DELETE FROM gallery_items WHERE id = ANY($1)', [itemIds]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('blocks create for a non-admin', async () => {
    const user = await registerAndLogin(base, 'gallery-user');
    emails.push(user.email);

    const res = await fetch(`${base}/gallery/`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ type: 'IMAGE', url: 'https://example.com/1.jpg' }),
    });
    assert.equal(res.status, 403);
  });

  it('orders the public list by sortOrder, hides inactive, and reorders in bulk', async () => {
    const admin = await registerAdmin(base, 'gallery-admin');
    emails.push(admin.email);

    const item1 = await fetch(`${base}/gallery/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ type: 'IMAGE', url: 'https://example.com/1.jpg', title: 'Uno', sortOrder: 2 }),
    }).then((r) => r.json());
    const item2 = await fetch(`${base}/gallery/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ type: 'VIDEO', url: 'https://example.com/2.mp4', title: 'Dos', sortOrder: 1 }),
    }).then((r) => r.json());
    itemIds.push(item1.data.id, item2.data.id);

    const list = await fetch(`${base}/gallery/`).then((r) => r.json());
    assert.deepEqual(
      list.data.map((i) => i.title),
      ['Dos', 'Uno']
    );

    await fetch(`${base}/gallery/${item1.data.id}`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ isActive: false }),
    });
    const afterDeactivate = await fetch(`${base}/gallery/`).then((r) => r.json());
    assert.equal(afterDeactivate.data.length, 1);

    const withInactive = await fetch(`${base}/gallery/?includeInactive=true`, {
      headers: jsonHeaders(admin.token),
    }).then((r) => r.json());
    assert.equal(withInactive.data.length, 2);

    const reorder = await fetch(`${base}/gallery/reorder`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({
        items: [
          { id: item1.data.id, sortOrder: 0 },
          { id: item2.data.id, sortOrder: 5 },
        ],
      }),
    }).then((r) => r.json());
    assert.deepEqual(
      reorder.data.map((i) => i.title),
      ['Uno', 'Dos']
    );
  });
});
