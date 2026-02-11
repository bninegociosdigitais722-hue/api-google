-- Índices para consultas do atendimento e ordenações por tenant

CREATE INDEX IF NOT EXISTS idx_contacts_owner_last_message_at
  ON contacts (owner_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_owner_contact_created_at_desc
  ON messages (owner_id, contact_id, created_at DESC);
