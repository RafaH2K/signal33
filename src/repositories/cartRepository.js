import { query } from '../database/query.js';

export async function findOrCreateByUserId(userId) {
  const { rows } = await query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return rows[0];
}

export async function getItemsWithProduct(cartId) {
  const { rows } = await query(
    `SELECT
       ci.id, ci.product_id, ci.quantity,
       p.name, p.price, p.image_url, p.stock, p.is_active
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId]
  );
  return rows;
}

export async function findItem(cartId, productId) {
  const { rows } = await query('SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2', [
    cartId,
    productId,
  ]);
  return rows[0] || null;
}

export async function addItem(cartId, productId, quantity) {
  const { rows } = await query(
    `INSERT INTO cart_items (cart_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
     RETURNING *`,
    [cartId, productId, quantity]
  );
  return rows[0];
}

export async function setItemQuantity(cartId, productId, quantity) {
  const { rows } = await query(
    `UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND product_id = $3 RETURNING *`,
    [quantity, cartId, productId]
  );
  return rows[0] || null;
}

export async function removeItem(cartId, productId) {
  const { rows } = await query(
    'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING id',
    [cartId, productId]
  );
  return rows[0] || null;
}
