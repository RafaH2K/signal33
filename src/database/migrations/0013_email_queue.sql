-- Cola de correos: el envío deja de bloquear la respuesta al que aparta y, si
-- el proveedor falla, se reintenta en vez de perderse.
ALTER TABLE reservations
  ADD COLUMN email_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (email_status IN ('PENDING', 'SENT', 'FAILED')),
  ADD COLUMN email_attempts SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN email_sent_at TIMESTAMPTZ,
  ADD COLUMN email_next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN email_last_error TEXT;

-- las reservas viejas ya recibieron (o no) su correo antes de existir la cola
UPDATE reservations SET email_status = 'SENT', email_sent_at = created_at;

-- el worker busca justo por esto, y el índice parcial se mantiene chico porque
-- lo normal es que casi todas estén en SENT
CREATE INDEX reservations_email_queue_idx
  ON reservations(email_next_attempt_at)
  WHERE email_status = 'PENDING';
