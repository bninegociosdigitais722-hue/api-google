-- Índices para consultas mais frequentes por tenant (owner_id) e ordenação

CREATE INDEX IF NOT EXISTS idx_contacts_owner_last_message_at
  ON contacts (owner_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_owner_created_at
  ON messages (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_owner_contact_created_at
  ON messages (owner_id, contact_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_contact_created_at
  ON messages (contact_id, created_at ASC);
