-- Marca de disparos Z-API / convites
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS last_outbound_template text,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz;

-- Índice para consultas por owner + última saída (facilita filtros futuros)
CREATE INDEX IF NOT EXISTS idx_contacts_owner_last_outbound ON contacts(owner_id, last_outbound_template);

