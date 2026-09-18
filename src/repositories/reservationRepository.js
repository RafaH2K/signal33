import { query, withTransaction } from '../database/query.js';

const RESERVATION_WITH_EVENT = `
  SELECT r.*, (r.unit_price * r.quantity) AS amount_due,
         e.title AS event_title, e.event_date, e.venue,
         pb.name AS paid_by_name
  FROM reservations r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN users pb ON pb.id = r.paid_by
`;

const CAPACITY_COLUMN = { GENERAL: 'capacity_general', OPEN_BAR: 'capacity_open_bar' };

export async function reservedByAccessType(eventId) {
  const { rows } = await query(
    `SELECT access_type, COALESCE(SUM(quantity), 0)::int AS reserved
     FROM reservations WHERE event_id = $1 AND cancelled_at IS NULL
     GROUP BY access_type`,
    [eventId]
  );
  return Object.fromEntries(rows.map((row) => [row.access_type, row.reserved]));
}

// Cupo del evento y cupo por persona se revisan adentro de la transacción,
// cada uno con su lock: sin ellos, envíos simultáneos verían el mismo conteo y
// todos pasarían. Los locks se toman siempre en el mismo orden (evento/tipo y
// luego correo) para que dos transacciones nunca se bloqueen mutuamente.
// Devuelve { rejected: 'EVENT_FULL' | 'PERSON_LIMIT', ... } sin insertar.
export async function createWithTickets({
  event,
  trackingCode,
  fullName,
  email,
  accessType,
  quantity,
  unitPrice,
  ticketCodes,
}) {
  return withTransaction(async (client) => {
    const capacity = event[CAPACITY_COLUMN[accessType]];
    if (capacity !== null && capacity !== undefined) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1 || $2))', [event.id, accessType]);
      const { rows } = await client.query(
        `SELECT COALESCE(SUM(quantity), 0)::int AS total FROM reservations
         WHERE event_id = $1 AND access_type = $2 AND cancelled_at IS NULL`,
        [event.id, accessType]
      );
      const remaining = capacity - rows[0].total;
      if (quantity > remaining) return { rejected: 'EVENT_FULL', remaining: Math.max(0, remaining) };
    }

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1 || lower($2)))', [event.id, email]);
    const { rows: countRows } = await client.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS total
       FROM reservations
       WHERE event_id = $1 AND lower(email) = lower($2) AND cancelled_at IS NULL`,
      [event.id, email]
    );
    const alreadyReserved = countRows[0].total;
    if (alreadyReserved + quantity > event.max_accesses_per_person) {
      return { rejected: 'PERSON_LIMIT', alreadyReserved };
    }

    const { rows } = await client.query(
      `INSERT INTO reservations (event_id, tracking_code, full_name, email, access_type, quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *, (unit_price * quantity) AS amount_due`,
      [event.id, trackingCode, fullName, email, accessType, quantity, unitPrice]
    );
    const reservation = rows[0];

    const { rows: tickets } = await client.query(
      `INSERT INTO tickets (reservation_id, code)
       SELECT $1, code FROM unnest($2::text[]) AS code
       RETURNING *`,
      [reservation.id, ticketCodes]
    );

    return { reservation, tickets };
  });
}

export async function findByTrackingCode(trackingCode) {
  const { rows } = await query(`${RESERVATION_WITH_EVENT} WHERE r.tracking_code = $1`, [trackingCode]);
  return rows[0] || null;
}

export async function findById(id) {
  const { rows } = await query(`${RESERVATION_WITH_EVENT} WHERE r.id = $1`, [id]);
  return rows[0] || null;
}

export async function findTickets(reservationId) {
  const { rows } = await query(
    `SELECT t.*, u.name AS checked_in_by_name
     FROM tickets t LEFT JOIN users u ON u.id = t.checked_in_by
     WHERE t.reservation_id = $1 ORDER BY t.created_at ASC`,
    [reservationId]
  );
  return rows;
}

export async function findTicketByCode(code) {
  const { rows } = await query(
    `SELECT t.*, u.name AS checked_in_by_name,
            r.tracking_code, r.full_name, r.email, r.access_type, r.quantity, r.is_paid, r.cancelled_at,
            (r.unit_price * r.quantity) AS amount_due,
            e.id AS event_id, e.title AS event_title, e.event_date, e.venue
     FROM tickets t
     JOIN reservations r ON r.id = t.reservation_id
     JOIN events e ON e.id = r.event_id
     LEFT JOIN users u ON u.id = t.checked_in_by
     WHERE t.code = $1`,
    [code]
  );
  return rows[0] || null;
}

// El UPDATE condicionado a checked_in_at IS NULL es lo que hace que un QR no se
// pueda reusar: si dos lectores escanean el mismo código a la vez, sólo uno
// actualiza una fila y el otro recibe null.
export async function checkInTicket(code, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE tickets SET checked_in_at = now(), checked_in_by = $2
       WHERE code = $1 AND checked_in_at IS NULL
       RETURNING *`,
      [code, userId]
    );
    const ticket = rows[0];
    if (ticket) await log(client, ticket.reservation_id, 'CHECK_IN', userId, code);
    return ticket || null;
  });
}

export async function setPaid(id, isPaid, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE reservations SET
         is_paid = $2,
         paid_at = CASE WHEN $2 THEN now() ELSE NULL END,
         paid_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END
       WHERE id = $1 AND cancelled_at IS NULL AND is_paid <> $2
       RETURNING *`,
      [id, isPaid, userId]
    );
    if (rows[0]) await log(client, id, isPaid ? 'PAID' : 'UNPAID', userId);
    return rows[0] || null;
  });
}

export async function cancel(id, userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'UPDATE reservations SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL RETURNING *',
      [id]
    );
    if (rows[0]) await log(client, id, 'CANCELLED', userId);
    return rows[0] || null;
  });
}

export function logAction(reservationId, action, userId, detail) {
  return log({ query }, reservationId, action, userId, detail);
}

function log(client, reservationId, action, userId, detail = null) {
  return client.query(
    'INSERT INTO reservation_logs (reservation_id, action, user_id, detail) VALUES ($1, $2, $3, $4)',
    [reservationId, action, userId, detail]
  );
}

export async function findLogs(reservationId) {
  const { rows } = await query(
    `SELECT l.action, l.detail, l.created_at, u.name AS user_name
     FROM reservation_logs l LEFT JOIN users u ON u.id = l.user_id
     WHERE l.reservation_id = $1 ORDER BY l.created_at ASC`,
    [reservationId]
  );
  return rows;
}

function buildFilters({ eventId, isPaid, search }) {
  const filters = ['r.cancelled_at IS NULL'];
  const params = [];

  if (eventId) {
    params.push(eventId);
    filters.push(`r.event_id = $${params.length}`);
  }
  if (isPaid !== undefined) {
    params.push(isPaid);
    filters.push(`r.is_paid = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    filters.push(
      `(r.full_name ILIKE $${params.length} OR r.email ILIKE $${params.length} OR r.tracking_code ILIKE $${params.length})`
    );
  }
  return { where: `WHERE ${filters.join(' AND ')}`, params };
}

export async function findAll({ eventId, isPaid, search, page, pageSize }) {
  const { where, params } = buildFilters({ eventId, isPaid, search });

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM reservations r ${where}`, params);

  const offset = (page - 1) * pageSize;
  const { rows } = await query(
    `SELECT sub.*,
            (SELECT COUNT(*)::int FROM tickets t WHERE t.reservation_id = sub.id AND t.checked_in_at IS NOT NULL) AS checked_in
     FROM (${RESERVATION_WITH_EVENT} ${where}
           ORDER BY r.created_at DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}) sub
     ORDER BY sub.created_at DESC`,
    [...params, pageSize, offset]
  );

  return { reservations: rows, total: countRows[0].total };
}

// lista completa para exportar (respaldo en papel si se cae el internet)
export async function findAllForExport(eventId) {
  const { rows } = await query(
    `SELECT r.tracking_code, r.full_name, r.email, r.access_type, r.quantity,
            (r.unit_price * r.quantity) AS amount_due, r.is_paid, r.paid_at, pb.name AS paid_by_name,
            string_agg(t.code, ' ' ORDER BY t.created_at) AS ticket_codes,
            COUNT(t.checked_in_at)::int AS checked_in
     FROM reservations r
     JOIN tickets t ON t.reservation_id = r.id
     LEFT JOIN users pb ON pb.id = r.paid_by
     WHERE r.event_id = $1 AND r.cancelled_at IS NULL
     GROUP BY r.id, pb.name
     ORDER BY lower(r.full_name)`,
    [eventId]
  );
  return rows;
}

export async function eventStats(eventId) {
  const { rows: byType } = await query(
    `SELECT r.access_type,
            COALESCE(SUM(r.quantity), 0)::int AS reserved,
            COALESCE(SUM(r.quantity) FILTER (WHERE r.is_paid), 0)::int AS paid,
            COALESCE(SUM(r.unit_price * r.quantity) FILTER (WHERE r.is_paid), 0)::numeric AS collected,
            COALESCE(SUM(r.unit_price * r.quantity) FILTER (WHERE NOT r.is_paid), 0)::numeric AS pending
     FROM reservations r
     WHERE r.event_id = $1 AND r.cancelled_at IS NULL
     GROUP BY r.access_type`,
    [eventId]
  );

  const { rows: checkIns } = await query(
    `SELECT COUNT(*)::int AS checked_in FROM tickets t
     JOIN reservations r ON r.id = t.reservation_id
     WHERE r.event_id = $1 AND r.cancelled_at IS NULL AND t.checked_in_at IS NOT NULL`,
    [eventId]
  );

  // corte de caja: cuánto cobró cada persona de taquilla
  const { rows: byStaff } = await query(
    `SELECT u.id AS user_id, u.name, COUNT(*)::int AS reservations,
            SUM(r.quantity)::int AS accesses,
            SUM(r.unit_price * r.quantity)::numeric AS collected
     FROM reservations r JOIN users u ON u.id = r.paid_by
     WHERE r.event_id = $1 AND r.is_paid AND r.cancelled_at IS NULL
     GROUP BY u.id, u.name
     ORDER BY collected DESC`,
    [eventId]
  );

  return { byType, checkedIn: checkIns[0].checked_in, byStaff };
}
