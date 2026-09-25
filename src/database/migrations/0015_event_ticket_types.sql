CREATE TABLE event_ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  capacity INTEGER CHECK (capacity >= 0),
  position SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_ticket_types_event_idx
  ON event_ticket_types(event_id, position)
  WHERE is_active;

ALTER TABLE reservations
  ADD COLUMN ticket_type_id UUID REFERENCES event_ticket_types(id) ON DELETE SET NULL,
  ADD COLUMN ticket_type_name TEXT;

WITH general_types AS (
  INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
  SELECT id, 'General', price_general, capacity_general, 0
  FROM events
  RETURNING id, event_id
)
UPDATE reservations r
SET ticket_type_id = t.id,
    ticket_type_name = 'General'
FROM general_types t
WHERE r.event_id = t.event_id AND r.access_type = 'GENERAL';

WITH bar_types AS (
  INSERT INTO event_ticket_types (event_id, name, price, capacity, position)
  SELECT e.id, 'Barra libre', e.price_open_bar, e.capacity_open_bar, 1
  FROM events e
  WHERE e.price_open_bar > 0
     OR e.capacity_open_bar IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM reservations r
       WHERE r.event_id = e.id AND r.access_type = 'OPEN_BAR'
     )
  RETURNING id, event_id
)
UPDATE reservations r
SET ticket_type_id = t.id,
    ticket_type_name = 'Barra libre'
FROM bar_types t
WHERE r.event_id = t.event_id AND r.access_type = 'OPEN_BAR';

UPDATE reservations
SET ticket_type_name = CASE
  WHEN access_type = 'OPEN_BAR' THEN 'Barra libre'
  ELSE 'General'
END
WHERE ticket_type_name IS NULL;

CREATE INDEX reservations_ticket_type_capacity_idx
  ON reservations(event_id, ticket_type_id)
  WHERE cancelled_at IS NULL;
