import { query, withTransaction } from '../database/query.js';

export async function findAll({ page, pageSize, includeInactive }) {
  const offset = (page - 1) * pageSize;
  const activeFilter = includeInactive ? '' : 'AND is_active = true';

  const { rows } = await query(
    `SELECT e.*, o.name AS organizer_name, o.slug AS organization_slug
     FROM events e LEFT JOIN organizations o ON o.id = e.organization_id
     WHERE e.deleted_at IS NULL ${activeFilter}
     ORDER BY e.event_date ASC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM events e WHERE e.deleted_at IS NULL ${activeFilter}`
  );
  return { events: rows, total: countRows[0].total };
}

export async function findById(id, { includeInactive } = {}) {
  const activeFilter = includeInactive ? '' : 'AND is_active = true';
  const { rows } = await query(
    `SELECT e.*, o.name AS organizer_name, o.slug AS organization_slug
     FROM events e LEFT JOIN organizations o ON o.id = e.organization_id
     WHERE e.id = $1 AND e.deleted_at IS NULL ${activeFilter}`,
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
  capacityGeneral,
  ticketTypes = [{ name: 'General', price: priceGeneral ?? 0, capacity: capacityGeneral ?? null }],
}) {
  return withTransaction(async (client) => {
    const primaryType = ticketTypes[0];
    const { rows } = await client.query(
    `INSERT INTO events (title, description, event_date, venue, cover_image_url, ticket_url, is_active,
                         reservations_enabled, max_accesses_per_person,
                         price_general, price_open_bar, capacity_general, capacity_open_bar)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, true), COALESCE($8, false), COALESCE($9, 2),
             $10, 0, $11, NULL)
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
      primaryType.price,
      primaryType.capacity ?? null,
    ]
    );
    const event = rows[0];
    for (const [position, type] of ticketTypes.entries()) {
      await client.query(
        `INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.id, type.name, type.price, type.capacity ?? null, position]
      );
    }
    return event;
  });
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
    ticketTypes,
  }
) {
  return withTransaction(async (client) => {
    const primaryType = ticketTypes?.[0];
    const { rows } = await client.query(
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
       price_open_bar = CASE WHEN $17 THEN 0 ELSE COALESCE($11, price_open_bar) END,
       -- el cupo admite null ("sin límite"), así que COALESCE no sirve: el
       -- flag dice si el campo vino en el request, aunque venga en null
       capacity_general = CASE WHEN $12 THEN $13 ELSE capacity_general END,
       capacity_open_bar = CASE WHEN $17 THEN NULL WHEN $14 THEN $15 ELSE capacity_open_bar END
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
      priceGeneral ?? primaryType?.price ?? null,
      priceOpenBar ?? null,
      capacityGeneral !== undefined || ticketTypes !== undefined,
      capacityGeneral ?? primaryType?.capacity ?? null,
      capacityOpenBar !== undefined,
      capacityOpenBar ?? null,
      id,
      ticketTypes !== undefined,
    ]
    );
    if (!rows[0]) return null;
    if (ticketTypes) {
      const ids = ticketTypes.map((type) => type.id).filter(Boolean);
      await client.query(
        `UPDATE event_ticket_types SET is_active = false, updated_at = now()
         WHERE event_id = $1 AND is_active = true AND NOT (id = ANY($2::uuid[]))`,
        [id, ids]
      );
      for (const [position, type] of ticketTypes.entries()) {
        if (type.id) {
          const { rows: updated } = await client.query(
            `UPDATE event_ticket_types
             SET name = $1, price = $2, capacity = $3, position = $4,
                 is_active = true, updated_at = now()
             WHERE event_id = $5 AND id = $6
             RETURNING id`,
            [type.name, type.price, type.capacity ?? null, position, id, type.id]
          );
          if (updated.length) continue;
        }
        await client.query(
          `INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, type.name, type.price, type.capacity ?? null, position]
        );
      }
    } else if (priceGeneral !== undefined || capacityGeneral !== undefined) {
      await client.query(
        `UPDATE event_ticket_types
         SET price = COALESCE($1, price),
             capacity = CASE WHEN $2 THEN $3 ELSE capacity END,
             updated_at = now()
         WHERE event_id = $4 AND position = 0 AND is_active = true`,
        [priceGeneral ?? null, capacityGeneral !== undefined, capacityGeneral ?? null, id]
      );
    }
    if (!ticketTypes && (priceOpenBar !== undefined || capacityOpenBar !== undefined)) {
      const { rows: barRows } = await client.query(
        `SELECT id FROM event_ticket_types
         WHERE event_id = $1 AND name = 'Barra libre' AND is_active = true
         ORDER BY position LIMIT 1`,
        [id]
      );
      if (barRows[0]) {
        await client.query(
          `UPDATE event_ticket_types
           SET price = COALESCE($1, price),
               capacity = CASE WHEN $2 THEN $3 ELSE capacity END,
               updated_at = now()
           WHERE id = $4`,
          [priceOpenBar ?? null, capacityOpenBar !== undefined, capacityOpenBar ?? null, barRows[0].id]
        );
      } else if ((priceOpenBar ?? 0) > 0 || capacityOpenBar != null) {
        await client.query(
          `INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
           VALUES ($1, 'Barra libre', $2, $3, 1)`,
          [id, priceOpenBar ?? 0, capacityOpenBar ?? null]
        );
      }
    }
    return rows[0];
  });
}

export async function softDelete(id) {
  const { rows } = await query(
    'UPDATE events SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  return rows[0] || null;
}
