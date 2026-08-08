import { query } from '../database/query.js';

export async function getAbout() {
  const { rows } = await query('SELECT * FROM about LIMIT 1');
  return rows[0] || null;
}

export async function updateAbout({ story, bio, influences, career }) {
  const { rows } = await query(
    `UPDATE about SET
       story = COALESCE($1, story),
       bio = COALESCE($2, bio),
       influences = COALESCE($3, influences),
       career = COALESCE($4, career)
     RETURNING *`,
    [story ?? null, bio ?? null, influences ?? null, career ?? null]
  );
  return rows[0];
}
