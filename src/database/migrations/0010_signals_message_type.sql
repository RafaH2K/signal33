ALTER TABLE signals DROP CONSTRAINT signals_type_check;
ALTER TABLE signals ADD CONSTRAINT signals_type_check CHECK (type IN ('REDIRECT', 'EFFECT', 'MESSAGE'));
