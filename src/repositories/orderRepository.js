import { query, withTransaction } from '../database/query.js';
import { AppError } from '../utils/AppError.js';

async function attachItems(orders) {
  if (orders.length === 0) return orders;
  const ids = orders.map((order) => order.id);
  const { rows: items } = await query('SELECT * FROM order_items WHERE order_id = ANY($1)', [ids]);
  return orders.map((order) => ({
    ...order,
    items: items.filter((item) => item.order_id === order.id),
  }));
}

export async function createFromCart(userId) {
  return withTransaction(async (client) => {
    const { rows: cartRows } = await client.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    const cartId = cartRows[0]?.id;

    const { rows: items } = cartId
      ? await client.query(
          `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           WHERE ci.cart_id = $1
           FOR UPDATE OF p`,
          [cartId]
        )
      : { rows: [] };

    // Validación de stock/disponibilidad in-transacción: necesita el lock FOR UPDATE
    // tomado arriba, así que vive acá en vez del service (no se puede partir la transacción entre capas).
    if (items.length === 0) throw new AppError('El carrito está vacío', 400);

    for (const item of items) {
      if (!item.is_active) throw new AppError(`"${item.name}" ya no está disponible`, 400);
      if (item.quantity > item.stock) throw new AppError(`Stock insuficiente para "${item.name}"`, 400);
    }

    const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, status, total) VALUES ($1, 'PENDING', $2) RETURNING *`,
      [userId, total]
    );
    const order = orderRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.name, item.price, item.quantity]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
        item.quantity,
        item.product_id,
      ]);
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    const { rows: orderItems } = await client.query('SELECT * FROM order_items WHERE order_id = $1', [
      order.id,
    ]);
    return { ...order, items: orderItems };
  });
}

export async function findByUser(userId, { page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const { rows } = await query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );
  const { rows: countRows } = await query('SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1', [
    userId,
  ]);
  return { orders: await attachItems(rows), total: countRows[0].total };
}

export async function findAll({ page, pageSize, status }) {
  const offset = (page - 1) * pageSize;
  const statusFilter = status ? 'WHERE status = $3' : '';
  const params = status ? [pageSize, offset, status] : [pageSize, offset];

  const { rows } = await query(
    `SELECT * FROM orders ${statusFilter} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    params
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM orders ${status ? 'WHERE status = $1' : ''}`,
    status ? [status] : []
  );
  return { orders: await attachItems(rows), total: countRows[0].total };
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const [order] = await attachItems(rows);
  return order;
}

export async function updateStatus(id, status) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    const order = rows[0];
    if (!order) return null;
    if (order.status === status) return order;

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const { rows: items } = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1 AND product_id IS NOT NULL',
        [id]
      );
      for (const item of items) {
        await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [
          item.quantity,
          item.product_id,
        ]);
      }
    }

    const { rows: updatedRows } = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return updatedRows[0];
  });
}
