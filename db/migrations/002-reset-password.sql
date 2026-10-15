ALTER TABLE comptes
  ADD COLUMN IF NOT EXISTS reset_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_comptes_reset_token ON comptes(reset_token);
