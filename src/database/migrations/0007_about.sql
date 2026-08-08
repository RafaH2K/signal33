CREATE TABLE about (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story TEXT,
  bio TEXT,
  influences TEXT,
  career TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER about_set_updated_at
  BEFORE UPDATE ON about
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- singleton: siempre existe exactamente una fila
INSERT INTO about DEFAULT VALUES;
