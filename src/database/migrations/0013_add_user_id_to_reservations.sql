-- Agregamos la columna user_id para vincular la reserva con la cuenta del usuario
ALTER TABLE reservations
  ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índice para buscar rápidamente el historial de reservas de un usuario
CREATE INDEX reservations_user_id_idx ON reservations(user_id);