-- Reservas de boletos con pago en taquilla: el usuario aparta, recibe un código
-- de seguimiento y sus accesos con QR, y el pago se marca en la puerta.
ALTER TABLE events
  ADD COLUMN reservations_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN max_accesses_per_person SMALLINT NOT NULL DEFAULT 2;

CREATE TYPE access_type AS ENUM ('GENERAL', 'OPEN_BAR');

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tracking_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  access_type ACCESS_TYPE NOT NULL,
  quantity SMALLINT NOT NULL CHECK (quantity > 0),
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER reservations_set_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- el cupo por persona se cuenta por (evento, correo), así que ese par se busca seguido
CREATE INDEX reservations_event_email_idx ON reservations(event_id, lower(email));
CREATE INDEX reservations_event_created_idx ON reservations(event_id, created_at DESC);

-- un acceso = una fila = un QR. Separado de la reserva para que cada entrada
-- se escanee una sola vez aunque una persona haya apartado dos.
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tickets_reservation_idx ON tickets(reservation_id);
