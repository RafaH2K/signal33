import { query } from '../database/query.js';

export async function findAll({ includeInactive }) {
  const activeFilter = includeInactive ? '' : 'WHERE is_active = true';
  const { rows } = await query(`SELECT * FROM signals ${activeFilter} ORDER BY command ASC`);
  return rows;
}

export async function findByCommandAny(command) {
  const { rows } = await query('SELECT * FROM signals WHERE command = $1', [command]);
  return rows[0] || null;
}

export async function findByCommand(command) {
  const { rows } = await query('SELECT * FROM signals WHERE command = $1 AND is_active = true', [command]);
  return rows[0] || null;
}

export async function create({ command, type, payload, isActive }) {
  const { rows } = await query(
    `INSERT INTO signals (command, type, payload, is_active)
     VALUES ($1, $2, $3, COALESCE($4, true))
     RETURNING *`,
    [command, type, payload, isActive]
  );
  return rows[0];
}

export async function update(id, { command, type, payload, isActive }) {
  const { rows } = await query(
    `UPDATE signals SET
       command = COALESCE($1, command),
       type = COALESCE($2, type),
       payload = COALESCE($3, payload),
       is_active = COALESCE($4, is_active)
     WHERE id = $5
     RETURNING *`,
    [command ?? null, type ?? null, payload ?? null, isActive ?? null, id]
  );
  return rows[0] || null;
}

export async function remove(id) {
  const { rows } = await query('DELETE FROM signals WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}
