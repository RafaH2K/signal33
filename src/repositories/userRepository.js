import { query } from '../database/query.js';

export async function findByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
  return rows[0] || null;
}

export async function create({ name, email, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, email, passwordHash]
  );
  return rows[0];
}

export async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
}

export async function updateProfile(id, { name, email }) {
  const { rows } = await query(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email)
     WHERE id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [name ?? null, email ?? null, id]
  );
  return rows[0] || null;
}

export async function findAll({ page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const { rows } = await query(
    `SELECT * FROM users WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await query('SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL');
  return { users: rows, total: countRows[0].total };
}

export async function softDelete(id) {
  await query('UPDATE users SET deleted_at = now() WHERE id = $1', [id]);
}
