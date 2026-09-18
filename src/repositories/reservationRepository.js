import { query, withTransaction } from '../database/query.js';

const RESERVATION_WITH_EVENT = `
  SELECT r.*, e.title AS event_title, e.event_date, e.venue
  FROM reservations r
  JOIN events e ON e.id = r.event_id
`;

// La reserva y sus accesos se crean juntos: una reserva sin tickets no sirve
// para nada y dejaría al cupo contando accesos que nadie puede escanear.
// El cupo por persona se revisa adentro de la transacción con un lock por
// (evento, correo): sin él, dos envíos simultáneos verían el mismo conteo y
// ambos pasarían. Devuelve { alreadyReserved } sin insertar si se excede.
export async function createWithTickets({
  eventId,
  trackingCode,
  fullName,
  email,
  accessType,
  quantity,
  ticketCodes,
  maxAccesses,
}) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1 || lower($2)))', [eventId, email]);

    const { rows: countRows } = await client.query(
      `SELECT COALESCE(SUM(quantity), 0)::int AS total
       FROM reservations
       WHERE event_id = $1 AND lower(email) = lower($2) AND cancelled_at IS NULL`,
      [eventId, email]
    );
    const alreadyReserved = countRows[0].total;
    if (alreadyReserved + quantity > maxAccesses) return { alreadyReserved };

    const { rows } = await client.query(
      `INSERT INTO reservations (event_id, tracking_code, full_name, email, access_type, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [eventId, trackingCode, fullName, email, accessType, quantity]
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
    'SELECT * FROM tickets WHERE reservation_id = $1 ORDER BY created_at ASC',
    [reservationId]
  );
  return rows;
}

export async function findTicketByCode(code) {
  const { rows } = await query(
    `SELECT t.*, r.tracking_code, r.full_name, r.email, r.access_type, r.is_paid, r.cancelled_at,
            e.id AS event_id, e.title AS event_title, e.event_date, e.venue
     FROM tickets t
     JOIN reservations r ON r.id = t.reservation_id
     JOIN events e ON e.id = r.event_id
     WHERE t.code = $1`,
    [code]
  );
  return rows[0] || null;
}

// El UPDATE condicionado a checked_in_at IS NULL es lo que hace que un QR no se
// pueda reusar: si dos lectores escanean el mismo código a la vez, sólo uno
// actualiza una fila y el otro recibe null.
export async function checkInTicket(code, userId) {
  const { rows } = await query(
    `UPDATE tickets SET checked_in_at = now(), checked_in_by = $2
     WHERE code = $1 AND checked_in_at IS NULL
     RETURNING *`,
    [code, userId]
  );
  return rows[0] || null;
}

export async function setPaid(id, isPaid) {
  const { rows } = await query(
    `UPDATE reservations SET is_paid = $2, paid_at = CASE WHEN $2 THEN now() ELSE NULL END
     WHERE id = $1 AND cancelled_at IS NULL
     RETURNING *`,
    [id, isPaid]
  );
  return rows[0] || null;
}

export async function cancel(id) {
  const { rows } = await query(
    'UPDATE reservations SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL RETURNING *',
    [id]
  );
  return rows[0] || null;
}

export async function findAll({ eventId, isPaid, search, page, pageSize }) {
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
  const where = `WHERE ${filters.join(' AND ')}`;

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM reservations r ${where}`,
    params
  );

  const offset = (page - 1) * pageSize;
  const { rows } = await query(
    `${RESERVATION_WITH_EVENT} ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  return { reservations: rows, total: countRows[0].total };
}

export async function eventStats(eventId) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(r.quantity), 0)::int AS reserved,
       COALESCE(SUM(r.quantity) FILTER (WHERE r.is_paid), 0)::int AS paid,
       (SELECT COUNT(*)::int FROM tickets t
          JOIN reservations r2 ON r2.id = t.reservation_id
         WHERE r2.event_id = $1 AND t.checked_in_at IS NOT NULL) AS checked_in
     FROM reservations r
     WHERE r.event_id = $1 AND r.cancelled_at IS NULL`,
    [eventId]
  );
  return rows[0];
}
