import { query } from '../database/query.js';

export async function findActiveByEvent(eventId) {
  const { rows } = await query(
    `SELECT id, name, price, capacity, position
     FROM event_ticket_types
     WHERE event_id = $1 AND is_active = true
     ORDER BY position ASC, created_at ASC`,
    [eventId]
  );
  return rows;
}

export async function findAllByEvent(eventId) {
  const { rows } = await query(
    `SELECT id, name, price, capacity, position, is_active
     FROM event_ticket_types
     WHERE event_id = $1
     ORDER BY position ASC, created_at ASC`,
    [eventId]
  );
  return rows;
}

export async function findActiveById(eventId, id) {
  const { rows } = await query(
    `SELECT id, event_id, name, price, capacity
     FROM event_ticket_types
     WHERE event_id = $1 AND id = $2 AND is_active = true`,
    [eventId, id]
  );
  return rows[0] ?? null;
}

export async function findActiveLegacy(eventId, accessType) {
  const name = accessType === 'OPEN_BAR' ? 'Barra libre' : null;
  const { rows } = await query(
    `SELECT id, event_id, name, price, capacity
     FROM event_ticket_types
     WHERE event_id = $1 AND is_active = true
       AND (($2::text IS NULL AND position = 0) OR name = $2)
     ORDER BY position ASC
     LIMIT 1`,
    [eventId, name]
  );
  return rows[0] ?? null;
}
