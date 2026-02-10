-- Armazena metadados de anexos recebidos/enviados via Z-API
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media jsonb;
