import { query } from '../database/query.js';

export async function create({ userId, tokenHash, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

export async function findValidByHash(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function markUsed(id) {
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
}
