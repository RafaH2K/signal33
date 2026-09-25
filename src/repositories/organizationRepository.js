import { query, withTransaction } from '../database/query.js';

export async function findMine(userId) {
  const { rows } = await query(
    `SELECT o.*, m.role AS membership_role
     FROM organizations o
     JOIN organization_memberships m ON m.organization_id = o.id
     WHERE m.user_id = $1
     ORDER BY o.created_at ASC`,
    [userId]
  );
  return rows;
}

export async function findAll() {
  const { rows } = await query(
    `SELECT o.*, 'ADMIN'::text AS membership_role
     FROM organizations o
     ORDER BY o.created_at ASC`
  );
  return rows;
}

export async function findMembership(organizationId, userId) {
  const { rows } = await query(
    `SELECT role FROM organization_memberships
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId]
  );
  return rows[0] ?? null;
}

export async function findBySlug(slug) {
  const { rows } = await query('SELECT id, name, slug FROM organizations WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}

export async function create({ name, slug, userId }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    const organization = rows[0];
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role)
       VALUES ($1, $2, 'OWNER')`,
      [organization.id, userId]
    );
    return { ...organization, membership_role: 'OWNER' };
  });
}

export async function listEvents(organizationId) {
  const { rows } = await query(
    `SELECT e.*,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', t.id, 'name', t.name, 'price', t.price, 'capacity', t.capacity,
                'position', t.position
              ) ORDER BY t.position, t.created_at)
              FROM event_ticket_types t
              WHERE t.event_id = e.id AND t.is_active = true
            ), '[]'::json) AS ticket_types
     FROM events e
     WHERE e.organization_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.event_date ASC`,
    [organizationId]
  );
  return rows;
}

export async function createEvent({ organizationId, data }) {
  const {
    title, description, eventDate, venue, coverImageUrl, ticketUrl,
    isActive, reservationsEnabled, maxAccessesPerPerson,
    ticketTypes = [{ name: 'General', price: 0, capacity: null }],
  } = data;
  return withTransaction(async (client) => {
    const primaryType = ticketTypes[0];
    const { rows } = await client.query(
    `INSERT INTO events
       (organization_id, title, description, event_date, venue, cover_image_url, ticket_url,
        is_active, reservations_enabled, max_accesses_per_person,
        price_general, price_open_bar, capacity_general, capacity_open_bar)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true), COALESCE($9, true),
             COALESCE($10, 2), $11, 0, $12, NULL)
     RETURNING *`,
    [organizationId, title, description ?? null, eventDate, venue, coverImageUrl ?? null,
      ticketUrl ?? null, isActive, reservationsEnabled, maxAccessesPerPerson,
      primaryType.price, primaryType.capacity ?? null]
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

export async function listReservations(organizationId, eventId) {
  const { rows } = await query(
    `SELECT r.id, r.tracking_code, r.full_name, r.email, r.access_type, r.ticket_type_name, r.quantity,
            r.unit_price, (r.unit_price * r.quantity) AS amount_due, r.is_paid, r.paid_at,
            r.created_at, e.title AS event_title,
            COUNT(t.id)::int AS ticket_count,
            COUNT(t.checked_in_at)::int AS checked_in
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     LEFT JOIN tickets t ON t.reservation_id = r.id
     WHERE e.organization_id = $1 AND ($2::uuid IS NULL OR e.id = $2)
       AND r.cancelled_at IS NULL
     GROUP BY r.id, e.title
     ORDER BY r.created_at DESC
     LIMIT 200`,
    [organizationId, eventId ?? null]
  );
  return rows;
}

export async function findReservation(organizationId, reservationId) {
  const { rows } = await query(
    `SELECT r.id, r.event_id FROM reservations r
     JOIN events e ON e.id = r.event_id
     WHERE e.organization_id = $1 AND r.id = $2 AND r.cancelled_at IS NULL`,
    [organizationId, reservationId]
  );
  return rows[0] ?? null;
}

export async function findPublicOrganizationEvents(slug) {
  const { rows } = await query(
    `SELECT o.id AS public_organization_id, o.name AS organizer_name, o.slug AS organization_slug,
            e.*
     FROM organizations o
     LEFT JOIN events e ON e.organization_id = o.id AND e.deleted_at IS NULL AND e.is_active = true
     WHERE o.slug = $1
     ORDER BY e.event_date ASC`,
    [slug]
  );
  return rows;
}

export async function updateEvent(organizationId, eventId, data) {
  const {
    title, description, eventDate, venue, coverImageUrl, ticketUrl,
    isActive, reservationsEnabled, maxAccessesPerPerson,
    priceGeneral, priceOpenBar, capacityGeneral, capacityOpenBar, ticketTypes,
  } = data;
  const primaryType = ticketTypes?.[0];
  return withTransaction(async (client) => {
    const { rows } = await client.query(
    `UPDATE events SET
       title = COALESCE($1, title), description = COALESCE($2, description),
       event_date = COALESCE($3, event_date), venue = COALESCE($4, venue),
       cover_image_url = COALESCE($5, cover_image_url), ticket_url = COALESCE($6, ticket_url),
       is_active = COALESCE($7, is_active),
       reservations_enabled = COALESCE($8, reservations_enabled),
       max_accesses_per_person = COALESCE($9, max_accesses_per_person),
       price_general = COALESCE($10, price_general),
       price_open_bar = CASE WHEN $18 THEN 0 ELSE COALESCE($11, price_open_bar) END,
       capacity_general = CASE WHEN $12 THEN $13 ELSE capacity_general END,
       capacity_open_bar = CASE WHEN $18 THEN NULL WHEN $14 THEN $15 ELSE capacity_open_bar END
     WHERE organization_id = $16 AND id = $17 AND deleted_at IS NULL
     RETURNING *`,
    [title ?? null, description ?? null, eventDate ?? null, venue ?? null,
      coverImageUrl ?? null, ticketUrl ?? null, isActive ?? null,
      reservationsEnabled ?? null, maxAccessesPerPerson ?? null,
      priceGeneral ?? primaryType?.price ?? null, priceOpenBar ?? null,
      capacityGeneral !== undefined || ticketTypes !== undefined,
      capacityGeneral ?? primaryType?.capacity ?? null,
      capacityOpenBar !== undefined, capacityOpenBar ?? null,
      organizationId, eventId, ticketTypes !== undefined]
    );
    if (!rows[0]) return null;
    if (ticketTypes) {
      const ids = ticketTypes.map((type) => type.id).filter(Boolean);
      await client.query(
        `UPDATE event_ticket_types SET is_active = false, updated_at = now()
         WHERE event_id = $1 AND is_active = true AND NOT (id = ANY($2::uuid[]))`,
        [eventId, ids]
      );
      for (const [position, type] of ticketTypes.entries()) {
        if (type.id) {
          const { rows: updated } = await client.query(
            `UPDATE event_ticket_types
             SET name = $1, price = $2, capacity = $3, position = $4,
                 is_active = true, updated_at = now()
             WHERE event_id = $5 AND id = $6
             RETURNING id`,
            [type.name, type.price, type.capacity ?? null, position, eventId, type.id]
          );
          if (updated.length) continue;
        }
        await client.query(
          `INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [eventId, type.name, type.price, type.capacity ?? null, position]
        );
      }
    }
    return rows[0];
  });
}

export async function deleteEvent(organizationId, eventId) {
  const { rows } = await query(
    `UPDATE events SET deleted_at = now()
     WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [organizationId, eventId]
  );
  return rows[0] ?? null;
}
