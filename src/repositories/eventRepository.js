import { query } from '../database/query.js';

export async function findAll({ page, pageSize, includeInactive }) {
  const offset = (page - 1) * pageSize;
  const activeFilter = includeInactive ? '' : 'AND is_active = true';

  const { rows } = await query(
    `SELECT * FROM events WHERE deleted_at IS NULL ${activeFilter}
     ORDER BY event_date ASC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM events WHERE deleted_at IS NULL ${activeFilter}`
  );
  return { events: rows, total: countRows[0].total };
}

export async function findById(id, { includeInactive } = {}) {
  const activeFilter = includeInactive ? '' : 'AND is_active = true';
  const { rows } = await query(
    `SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL ${activeFilter}`,
    [id]
  );
  return rows[0] || null;
}

export async function create({
  title,
  description,
  eventDate,
  venue,
  coverImageUrl,
  ticketUrl,
  isActive,
  reservationsEnabled,
  maxAccessesPerPerson,
  priceGeneral,
  priceOpenBar,
  capacityGeneral,
  capacityOpenBar,
}) {
  const { rows } = await query(
    `INSERT INTO events (title, description, event_date, venue, cover_image_url, ticket_url, is_active,
                         reservations_enabled, max_accesses_per_person,
                         price_general, price_open_bar, capacity_general, capacity_open_bar)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true), COALESCE($8, false), COALESCE($9, 2),
             COALESCE($10, 0), COALESCE($11, 0), $12, $13)
     RETURNING *`,
    [
      title,
      description ?? null,
      eventDate,
      venue,
      coverImageUrl ?? null,
      ticketUrl ?? null,
      isActive,
      reservationsEnabled ?? null,
      maxAccessesPerPerson ?? null,
      priceGeneral ?? null,
      priceOpenBar ?? null,
      capacityGeneral ?? null,
      capacityOpenBar ?? null,
    ]
  );
  return rows[0];
}

export async function update(
  id,
  {
    title,
    description,
    eventDate,
    venue,
    coverImageUrl,
    ticketUrl,
    isActive,
    reservationsEnabled,
    maxAccessesPerPerson,
    priceGeneral,
    priceOpenBar,
    capacityGeneral,
    capacityOpenBar,
  }
) {
  const { rows } = await query(
    `UPDATE events SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       event_date = COALESCE($3, event_date),
       venue = COALESCE($4, venue),
       cover_image_url = COALESCE($5, cover_image_url),
       ticket_url = COALESCE($6, ticket_url),
       is_active = COALESCE($7, is_active),
       reservations_enabled = COALESCE($8, reservations_enabled),
       max_accesses_per_person = COALESCE($9, max_accesses_per_person),
       price_general = COALESCE($10, price_general),
       price_open_bar = COALESCE($11, price_open_bar),
       -- el cupo admite null ("sin límite"), así que COALESCE no sirve: el
       -- flag dice si el campo vino en el request, aunque venga en null
       capacity_general = CASE WHEN $12 THEN $13 ELSE capacity_general END,
       capacity_open_bar = CASE WHEN $14 THEN $15 ELSE capacity_open_bar END
     WHERE id = $16 AND deleted_at IS NULL
     RETURNING *`,
    [
      title ?? null,
      description ?? null,
      eventDate ?? null,
      venue ?? null,
      coverImageUrl ?? null,
      ticketUrl ?? null,
      isActive ?? null,
      reservationsEnabled ?? null,
      maxAccessesPerPerson ?? null,
      priceGeneral ?? null,
      priceOpenBar ?? null,
      capacityGeneral !== undefined,
      capacityGeneral ?? null,
      capacityOpenBar !== undefined,
      capacityOpenBar ?? null,
      id,
    ]
  );
  return rows[0] || null;
}

export async function softDelete(id) {
  const { rows } = await query(
    'UPDATE events SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  return rows[0] || null;
}
