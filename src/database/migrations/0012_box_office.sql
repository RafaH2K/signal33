-- Operación de taquilla para eventos grandes: personal con acceso sólo a
-- taquilla, precios y cupo por tipo de acceso, y rastro de quién cobró qué.

-- STAFF: puede cobrar y validar accesos, pero no toca productos, usuarios, etc.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'STAFF', 'ADMIN'));

ALTER TABLE events
  ADD COLUMN price_general NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_general >= 0),
  ADD COLUMN price_open_bar NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price_open_bar >= 0),
  -- NULL = sin límite
  ADD COLUMN capacity_general INTEGER CHECK (capacity_general >= 0),
  ADD COLUMN capacity_open_bar INTEGER CHECK (capacity_open_bar >= 0);

-- el precio se congela al apartar: si el admin lo cambia después, quien ya
-- apartó paga lo que vio en la página
ALTER TABLE reservations
  ADD COLUMN unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN paid_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- bitácora para el corte de caja y para aclarar disputas en la puerta
CREATE TABLE reservation_logs (
  id BIGSERIAL PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('PAID', 'UNPAID', 'CHECK_IN', 'CANCELLED', 'EMAIL_RESENT')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservation_logs_reservation_idx ON reservation_logs(reservation_id, created_at);
CREATE INDEX reservations_paid_by_idx ON reservations(paid_by) WHERE is_paid;
