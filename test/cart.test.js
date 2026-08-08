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

describe('Cart', () => {
  let server;
  let base;
  let admin;
  let productId;
  const emails = [];

  before(async () => {
    ({ server, base } = await startServer());
    admin = await registerAdmin(base, 'cart-admin');
    emails.push(admin.email);
    const product = await fetch(`${base}/products/`, {
      method: 'POST',
      headers: jsonHeaders(admin.token),
      body: JSON.stringify({ name: 'Gorra DJ', price: 15, stock: 3 }),
    }).then((r) => r.json());
    productId = product.data.id;
  });

  after(async () => {
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    await deleteUsersByEmail(...emails);
    await stopServer(server);
    await closePool();
  });

  it('adds items, increments quantity, and blocks over-stock', async () => {
    const user = await registerAndLogin(base, 'cart-flow');
    emails.push(user.email);

    const empty = await fetch(`${base}/cart/`, { headers: jsonHeaders(user.token) }).then((r) => r.json());
    assert.equal(empty.data.items.length, 0);

    const add1 = await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 2 }),
    }).then((r) => r.json());
    assert.equal(add1.data.items[0].quantity, 2);

    const add2 = await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 1 }),
    }).then((r) => r.json());
    assert.equal(add2.data.items[0].quantity, 3);

    const overStock = await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 5 }),
    });
    assert.equal(overStock.status, 400);
  });

  it('isolates carts per user (RLS)', async () => {
    const userA = await registerAndLogin(base, 'cart-a');
    const userB = await registerAndLogin(base, 'cart-b');
    emails.push(userA.email, userB.email);

    await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(userA.token),
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    const cartB = await fetch(`${base}/cart/`, { headers: jsonHeaders(userB.token) }).then((r) => r.json());
    assert.equal(cartB.data.items.length, 0);
  });

  it('removes an item, and removing it again is a 404', async () => {
    const user = await registerAndLogin(base, 'cart-remove');
    emails.push(user.email);

    await fetch(`${base}/cart/items`, {
      method: 'POST',
      headers: jsonHeaders(user.token),
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    const remove = await fetch(`${base}/cart/items/${productId}`, {
      method: 'DELETE',
      headers: jsonHeaders(user.token),
    });
    assert.equal(remove.status, 200);

    const removeAgain = await fetch(`${base}/cart/items/${productId}`, {
      method: 'DELETE',
      headers: jsonHeaders(user.token),
    });
    assert.equal(removeAgain.status, 404);
  });
});
