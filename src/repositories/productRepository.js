import { query } from '../database/query.js';

export async function findAll({ page, pageSize, includeInactive }) {
  const offset = (page - 1) * pageSize;
  const activeFilter = includeInactive ? '' : 'AND is_active = true';

  const { rows } = await query(
    `SELECT * FROM products WHERE deleted_at IS NULL ${activeFilter}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM products WHERE deleted_at IS NULL ${activeFilter}`
  );
  return { products: rows, total: countRows[0].total };
}

export async function findById(id, { includeInactive } = {}) {
  const activeFilter = includeInactive ? '' : 'AND is_active = true';
  const { rows } = await query(
    `SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL ${activeFilter}`,
    [id]
  );
  return rows[0] || null;
}

export async function create({ name, description, price, stock, imageUrl, isActive }) {
  const { rows } = await query(
    `INSERT INTO products (name, description, price, stock, image_url, is_active)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, true))
     RETURNING *`,
    [name, description ?? null, price, stock ?? 0, imageUrl ?? null, isActive]
  );
  return rows[0];
}

export async function update(id, { name, description, price, stock, imageUrl, isActive }) {
  const { rows } = await query(
    `UPDATE products SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       price = COALESCE($3, price),
       stock = COALESCE($4, stock),
       image_url = COALESCE($5, image_url),
       is_active = COALESCE($6, is_active)
     WHERE id = $7 AND deleted_at IS NULL
     RETURNING *`,
    [name ?? null, description ?? null, price ?? null, stock ?? null, imageUrl ?? null, isActive ?? null, id]
  );
  return rows[0] || null;
}

export async function softDelete(id) {
  const { rows } = await query(
    'UPDATE products SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  return rows[0] || null;
}
