import { query, withTransaction } from '../database/query.js';
import { AppError } from '../utils/AppError.js';

export async function findAll({ includeInactive }) {
  const activeFilter = includeInactive ? '' : 'AND is_active = true';
  const { rows } = await query(
    `SELECT * FROM gallery_items WHERE deleted_at IS NULL ${activeFilter}
     ORDER BY sort_order ASC, created_at ASC`
  );
  return rows;
}

export async function findById(id, { includeInactive } = {}) {
  const activeFilter = includeInactive ? '' : 'AND is_active = true';
  const { rows } = await query(
    `SELECT * FROM gallery_items WHERE id = $1 AND deleted_at IS NULL ${activeFilter}`,
    [id]
  );
  return rows[0] || null;
}

export async function create({ type, url, title, sortOrder, isActive }) {
  const { rows } = await query(
    `INSERT INTO gallery_items (type, url, title, sort_order, is_active)
     VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, true))
     RETURNING *`,
    [type, url, title ?? null, sortOrder, isActive]
  );
  return rows[0];
}

export async function update(id, { type, url, title, sortOrder, isActive }) {
  const { rows } = await query(
    `UPDATE gallery_items SET
       type = COALESCE($1, type),
       url = COALESCE($2, url),
       title = COALESCE($3, title),
       sort_order = COALESCE($4, sort_order),
       is_active = COALESCE($5, is_active)
     WHERE id = $6 AND deleted_at IS NULL
     RETURNING *`,
    [type ?? null, url ?? null, title ?? null, sortOrder ?? null, isActive ?? null, id]
  );
  return rows[0] || null;
}

export async function softDelete(id) {
  const { rows } = await query(
    'UPDATE gallery_items SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  return rows[0] || null;
}

export async function reorder(items) {
  return withTransaction(async (client) => {
    for (const { id, sortOrder } of items) {
      const { rows } = await client.query(
        'UPDATE gallery_items SET sort_order = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id',
        [sortOrder, id]
      );
      if (!rows[0]) throw new AppError(`Elemento de galería no encontrado: ${id}`, 404);
    }
  });
}
