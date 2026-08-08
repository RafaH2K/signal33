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

describe('Products', () => {
  let server;
  let base;
  const emails = [];
  const productIds = [];

  before(async () => {
    ({ server, base } = await startServer());
  });

  after(async () => {
    if (productIds.length) await pool.query('DELETE FROM products WHERE id = ANY($1)', [productIds]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('blocks create for a non-admin', async () => {
    const user = await registerAndLogin(base, 'products-user');
    emails.push(user.email);

    const res = await fetch(`${base}/products/`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ name: 'Remera', price: 20, stock: 5 }),
    });
    assert.equal(res.status, 403);
  });

  it('rejects an invalid payload with 400', async () => {
    const admin = await registerAdmin(base, 'products-invalid');
    emails.push(admin.email);

    const res = await fetch(`${base}/products/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ name: 'X', price: -5 }),
    });
    assert.equal(res.status, 400);
  });

  it('admin CRUD: create, deactivate hides from public, includeInactive shows it, delete', async () => {
    const admin = await registerAdmin(base, 'products-crud');
    emails.push(admin.email);

    const created = await fetch(`${base}/products/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ name: 'Gorra', price: 15, stock: 3 }),
    }).then((r) => r.json());
    assert.equal(created.success, true);
    productIds.push(created.data.id);

    const publicList = await fetch(`${base}/products/`).then((r) => r.json());
    assert.ok(publicList.data.products.some((p) => p.id === created.data.id));

    await fetch(`${base}/products/${created.data.id}`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ isActive: false }),
    });

    const publicAfter = await fetch(`${base}/products/${created.data.id}`);
    assert.equal(publicAfter.status, 404);

    const adminView = await fetch(`${base}/products/${created.data.id}`, { headers: jsonHeaders(admin.token) });
    assert.equal(adminView.status, 200);

    const del = await fetch(`${base}/products/${created.data.id}`, {
      method: 'DELETE',
      headers: jsonHeaders(admin.token),
    });
    assert.equal(del.status, 200);
  });
});
