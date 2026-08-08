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

describe('Orders', () => {
  let server;
  let base;
  let admin;
  let productId;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'orders-admin');
    emails.push(admin.email);
    const product = await fetch(`${base}/products/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ name: 'Vinilo', price: 40, stock: 5 }),
    }).then((r) => r.json());
    productId = product.data.id;
  });

  after(async () => {
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('rejects checkout with an empty cart', async () => {
    const user = await registerAndLogin(base, 'orders-empty');
    emails.push(user.email);

    const res = await fetch(`${base}/orders/`, { method: 'POST', headers: jsonHeaders(user.token) });
    assert.equal(res.status, 400);
  });

  it('checks out atomically: decrements stock, empties the cart, and RLS blocks other users', async () => {
    const user = await registerAndLogin(base, 'orders-checkout');
    const intruder = await registerAndLogin(base, 'orders-intruder');
    emails.push(user.email, intruder.email);

    await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 2 }),
    });

    const order = await fetch(`${base}/orders/`, { method: 'POST', headers: jsonHeaders(user.token) }).then((r) =>
      r.json()
    );
    assert.equal(order.data.status, 'PENDING');
    assert.equal(order.data.items.length, 1);

    const product = await fetch(`${base}/products/${productId}`).then((r) => r.json());
    assert.equal(product.data.stock, 3);

    const cart = await fetch(`${base}/cart/`, { headers: jsonHeaders(user.token) }).then((r) => r.json());
    assert.equal(cart.data.items.length, 0);

    const intruderView = await fetch(`${base}/orders/${order.data.id}`, { headers: jsonHeaders(intruder.token) });
    assert.equal(intruderView.status, 404);

    const ownerView = await fetch(`${base}/orders/${order.data.id}`, { headers: jsonHeaders(user.token) });
    assert.equal(ownerView.status, 200);
  });

  it('admin cancelling an order restocks the products', async () => {
    const user = await registerAndLogin(base, 'orders-cancel');
    emails.push(user.email);

    await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const order = await fetch(`${base}/orders/`, { method: 'POST', headers: jsonHeaders(user.token) }).then((r) =>
      r.json()
    );

    const statusAsUser = await fetch(`${base}/orders/${order.data.id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    assert.equal(statusAsUser.status, 403);

    const before = await fetch(`${base}/products/${productId}`).then((r) => r.json());

    await fetch(`${base}/orders/${order.data.id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    const after = await fetch(`${base}/products/${productId}`).then((r) => r.json());
    assert.equal(after.data.stock, before.data.stock + 1);
  });
});
